---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: postgres-neon-to-cloudsql
---

# Epic: Postgres migration — Neon (AWS) → Cloud SQL (GCP co-location) 🏗️

> **Area:** 09-platform-infra · **Risk:** high (production commerce DB migration: money data, cutover) ·
> **Supersedes** the spike's "keep commerce on Neon" call in
> [`00-ideas/2. readyforscope/db-egress-and-account-strategy.md`](../../00-ideas/2.%20readyforscope/db-egress-and-account-strategy.md)
> and the symptom-treating sprints of [`neon-egress-and-db-isolation`](../neon-egress-and-db-isolation/README.md).

## Why
A Neon usage email warned the org was near its **5 GB/mo egress cap** — with **zero traffic and no
development for a week**. The [neon-egress spike](../neon-egress-and-db-isolation/README.md) traced the cause to
the always-on backend, and Sprint 2 proposed idling it (`minScale:0`) to shrink the cross-cloud chatter. While
building S2 we stepped back and found the **root architectural smell** the spike under-weighted:

**The compute is on Google Cloud; the database is on Neon, which runs on AWS — a cross-cloud split with no
upside for this usage.** (Verified live, 2026-06-22.)

- **Compute:** Cloud Run, **GCP us-east4**. No Cloud SQL, no Compute Engine VM exists today (the "server" *is*
  Cloud Run, serverless).
- **Redis:** already **inside the GCP VPC** (private `10.24.218.107`, via the `medusa-conn` connector) — zero
  egress.
- **Postgres:** **Neon on `aws-us-east-1`** — the *only* thing in the stack that crosses clouds. The main DB is
  **43 MB** (`logical_size` 43.3 MB; staging 43.3, dev 42.0).
- **Mechanism of the idle egress:** production hardening set the backend **always-on** (`min=1` + a `/health`
  probe every 30 s + a 5-min uptime check). So even with no shoppers, a Medusa instance runs 24/7 issuing
  background queries, and **every query result crosses AWS→GCP over the public internet = the metered egress.**
  "No traffic" ≠ "no egress" — the always-on backend *is* the traffic, talking to a DB in another cloud.

**Decision:** move Postgres **onto Google Cloud, co-located with the backend** (Cloud SQL, us-east4, private IP
on the existing VPC). This **eliminates the egress problem at the root** (intra-GCP private traffic isn't
metered — no 5 GB cap to dodge, no `minScale:0` latency tradeoff), and lets the backend stay **`min=1` (warm,
fast)**. Neon's serverless/branching value props aren't being used to justify the cross-cloud tax at 43 MB.

> **Note — this does NOT fix the ~30 s cold load.** That's a separate problem: the **Vercel frontend**
> cold-starting the dynamic (personalized) homepage. AWS us-east-1 and GCP us-east4 are both in Virginia, so
> the cross-cloud hop is *milliseconds*, not seconds. Co-location fixes **egress**, not frontend cold-start
> (that's the S1-deferred "static signed-out homepage" refactor, tracked separately).

## Medusa-first note
No commerce **model** change — this relocates the Postgres *host*, not the schema. Medusa keeps owning all
commerce (AGENTS rule #1); Supabase untouched (#2); UCP/MCP untouched (#3); Clerk untouched (#4); no new
user-facing surface (#5). The only app-visible change is the `DATABASE_URL` secret value.

## What already exists (reuse, don't rebuild)
- **VPC + private-IP pattern:** Redis is already reached privately (`10.x`) through `medusa-conn` with the
  backend's `--vpc-egress=private-ranges-only`. Cloud SQL private IP plugs into the **same** plumbing.
- **Kill-switch for the cutover window:** the Flagsmith `checkout.stripe_enabled` flag (fail-open, already
  enforced across UI + agents + `start-checkout`) gates checkout off during the swap — no new mechanism needed.
- **Infra scripts + drift guard:** `infra/gcp/deploy.sh` (image-only deploys preserve secrets/scaling) +
  `infra/gcp/test/deploy-invariants.test.js` (env/secret/minScale parity) — the provisioning + the
  `DATABASE_URL` change land here and stay guarded.
- **Backups to fold in:** `infra/gcp/backups/` + `BACKUPS.md` (the custom Neon dump machinery) — **replaced**
  by Cloud SQL native automated backups + PITR (reconciled in S3).
- **Measurement:** `scripts/neon-egress.mjs` — read egress before/after to prove it goes to zero.
- **Superseded work to close out (S3):** the egress-symptom PRs **#19** (root, `minScale:0` + cron
  externalize) and **#32** (backend, in-process jobs removed). With co-location we stay `min=1`, so these are
  no longer wanted — close with a pointer here.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Provision Cloud SQL (PG17, private IP, single-zone + PITR) + **rehearse the full migration on staging** | med |
| 2 | **Production cutover** — kill-switch → dump → restore → `DATABASE_URL` swap → verify → reopen | **high** |
| 3 | Decommission + reconcile — close #19/#32, fold backups into Cloud SQL-native, demote Neon, epic DoD | low–med |

## Deploy order / topology
- **S1** infra (root repo `infra/gcp` + a `medusa-web-staging` repoint) — additive, nothing prod cut over;
  Daniel runs the gcloud writes (Cloud SQL bills on creation). Proves the pattern on the low-risk service.
- **S2** prod cutover (Cloud Run `medusa-web` + the `DATABASE_URL` secret) — **HIGH, Daniel executes** in a
  short maintenance window; Neon kept read-only as instant rollback (`DATABASE_URL` swap-back).
- **S3** cleanup (docs + console + PR closes) — any time after S2 holds.

## Open decisions (Daniel)
- **HA posture:** default is **single-zone + 7-day PITR** (~$10–15/mo). Regional HA (~2× cost) is a later
  toggle — decide at S1 if you want it from day one.
- **Neon afterlife:** demote the commerce project to a **dev-only sandbox**, or **delete** it (S3).

## Definition of Done (epic)
- [ ] Cloud SQL live (private IP, us-east4), Medusa booting clean against it on prod
- [ ] **Egress verified ≈ 0 / well under cap** (`scripts/neon-egress.mjs`) — the success signal
- [ ] Neon kept ≥1 week read-only as rollback, then demoted/deleted per the decision above
- [ ] Backups reconciled to Cloud SQL-native (PITR + automated); `BACKUPS.md` updated
- [ ] #19 + #32 closed (superseded); the `neon-egress-and-db-isolation` epic README marked `archived`/superseded
- [ ] `deploy.sh` + `deploy-invariants.test.js` reflect the new `DATABASE_URL` home and stay green
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough (real commands); money/cutover steps flagged owed-to-Daniel
- [ ] `RETROSPECTIVE.md`; product poster (`Roadmap/README.md`) updated; team memory + `MEMORY.md` updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (cross-cloud DB = egress tax; co-locate compute+DB)
- [ ] Feature branch(es) deleted; this README's frontmatter `status: shipped`

## Session kickoffs
Run each in a **fresh session** (one per sprint). Each enters plan mode, confirms stories with Daniel, then builds.

**Sprint 1 — Provision Cloud SQL + rehearse on staging:**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/09-platform-infra/postgres-neon-to-cloudsql/README.md and .../sprint-1.md. You're building
> Sprint 1 (MED — additive infra, nothing prod cut over; Daniel runs the gcloud writes, which bill on Cloud SQL
> creation). Enter plan mode, confirm stories with me, branch off latest main in the monorepo-root repo
> (infra/gcp). Provision a Cloud SQL Postgres 17 instance in us-east4 on a **private IP** on the existing VPC
> (the same one Redis 10.x uses, via the medusa-conn connector + Private Service Access), single-zone + 7-day
> PITR, smallest practical tier; create prod + staging databases; prove the backend VPC can reach it. Verify
> Postgres **version + extension parity** (Neon PG17 → Cloud SQL PG17 — surface any unsupported extension as a
> blocker). Then **rehearse the whole migration on STAGING**: pg_dump Neon staging → restore into the staging
> DB → repoint medusa-web-staging's DATABASE_URL → confirm Medusa boots clean + a catalog smoke. Make
> provisioning an idempotent script under infra/gcp; keep infra/gcp/deploy.sh + deploy-invariants.test.js green.
> No prod cutover. Write the smoke walkthrough into sprint-1.md before done.

**Sprint 2 — Production cutover (HIGH):**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/09-platform-infra/postgres-neon-to-cloudsql/README.md and .../sprint-2.md (and sprint-1.md
> for what S1 proved). You're building Sprint 2 (HIGH — production commerce DB cutover, money data; Daniel
> executes the cutover + merges, no autonomous anything). Enter plan mode, confirm the runbook with me. Branch
> off latest main. Plan a short maintenance window: flip the Flagsmith checkout kill-switch
> (checkout.stripe_enabled) OFF → pg_dump Neon main → restore into the prod Cloud SQL database → swap the
> DATABASE_URL secret to the Cloud SQL private DSN → redeploy medusa-web and confirm the new revision picked up
> the new secret version → verify Medusa boots, runs migrations as a no-op, a catalog read, and a test checkout
> → flip the kill-switch back ON. Keep Neon read-only as rollback ~1 week (the DATABASE_URL swap-back is the
> instant revert). Keep deploy.sh + deploy-invariants green with the new DATABASE_URL parity. Write the cutover
> runbook + smoke walkthrough into sprint-2.md before done. This is HIGH — I run the live cutover with you.

**Sprint 3 — Decommission + reconcile (LOW–MED):**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/09-platform-infra/postgres-neon-to-cloudsql/README.md and .../sprint-3.md. You're building
> Sprint 3 (LOW–MED — reconcile + decommission; runs after the S2 cutover has held). Enter plan mode, confirm
> with me. Branch off latest main. Now that commerce runs on Cloud SQL: (1) close the superseded neon-egress PRs
> #19 (root) + #32 (backend) with a pointer to this epic, and retire the minScale:0 + cron-externalization
> direction (we stay min=1); (2) reconcile backups — Cloud SQL native automated backups + PITR replace the
> custom infra/gcp/backups/ dumps; update BACKUPS.md; (3) demote Neon to dev-only or delete the commerce
> project per Daniel's call, mark the neon-egress-and-db-isolation epic README archived/superseded; (4) update
> deploy.sh/secret docs + deploy-invariants for the new DATABASE_URL home. Keep all gates green, then run the
> epic Definition of Done (poster, RETROSPECTIVE, LEARNINGS, memory, build-order regen). Write the smoke
> walkthrough into sprint-3.md before done.
