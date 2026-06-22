# Retrospective — Postgres migration: Neon (AWS) → Cloud SQL (GCP co-location)

**Area:** 09-platform-infra · **Risk:** high (production commerce DB migration) · **Closed:** 2026-06-22 ·
**Sprints:** 3 (S1 provision + parity · S2 prod cutover · S3 decommission + reconcile)

## What shipped
- **S1 — Provision** (PR #20 `637dd6e`, HIGH-merge). Cloud SQL `medusa-pg` (`POSTGRES_17 · db-g1-small ·
  ZONAL · PITR 7/7 · PRIVATE 172.25.0.3`) on the `default` VPC — the same network the `medusa-conn` connector
  + Redis (10.x) reach via Private Service Access. DBs `medusa` (prod) + `medusa_staging`. Version/extension
  parity verified (Neon main PG17.10, only ext `plpgsql` → no cutover blocker). New idempotent
  `infra/gcp/provision-cloudsql.sh`; `deploy-staging.sh` gained the connector + `private-ranges-only` egress;
  `deploy-invariants.test.js` locks those flags.
- **S2 — Production cutover** (PR #22 `8d0bacc`, executed live 2026-06-22, Daniel authorized + present).
  Kill-switch off → in-VPC dump Neon → restore into Cloud SQL → `DATABASE_URL` swapped to the private DSN →
  redeploy → verify → kill-switch on. Prod commerce now on Cloud SQL (rev `medusa-web-00106-x66`, `min=1`).
  Row-count parity verified; `db:migrate` a no-op; `/health` 200; catalog 49 products; MCP 10 listings. Neon
  kept **read-only** as the ~1-week rollback (`DATABASE_URL` v1 = Neon, v3 = Cloud SQL).
- **S3 — Decommission + reconcile** (this PR). Closed the superseded egress-symptom PRs #19 + #32; archived
  the `neon-egress-and-db-isolation` epic; reconciled `BACKUPS.md` to Cloud SQL-native (automated backups +
  PITR backup-of-record, backup `1782097256693` SUCCESSFUL) with the `neon` R2-target retirement sequenced;
  recorded the egress success signal; epic DoD.

## What went well
- **Medusa-first held — zero schema change.** This was a host relocation, not a model change: Medusa kept
  owning commerce, Supabase/UCP/MCP/Clerk untouched, the only app-visible change was the `DATABASE_URL` value.
- **Reused the existing VPC plumbing.** Cloud SQL private IP plugged into the **same** `medusa-conn` connector
  + `private-ranges-only` egress that Redis already used — no new networking primitive.
- **The kill-switch + Neon-read-only rollback de-risked a HIGH cutover.** The `checkout.stripe_enabled`
  flag (fail-open) closed the money path during the swap; the `DATABASE_URL` swap-back was the instant revert.
- **The drift guard absorbed the change cleanly.** `deploy-invariants.test.js` already locked connector +
  `private-ranges-only` + `min=1`, so S3's reconcile was verification, not new guard code.
- **VALIDATE-FIRST paid off at close.** S3 confirmed a `SUCCESSFUL` Cloud SQL backup *before* writing the
  backup reconcile or gating the Neon demote — coverage was never narrowed on an unverified claim.

## What we learned (promoted to LEARNINGS.md)
- **Co-locate compute + DB.** A cross-cloud DB (GCP compute ↔ Neon/AWS, 43 MB) is a *metered egress tax* +
  fragility, not just a latency footnote — and an always-on `min=1` backend **is** the traffic (background
  loops + `/health` probes keep the cross-cloud link ~84% active even with zero shoppers). The original spike
  under-weighted this and proposed treating the symptom (`minScale:0`); the root fix was relocation.
- **A `:latest` secret binding re-resolves per revision** — staging a future-cutover value as enabled-`latest`
  is a deploy-time landmine (image-only Cloud Run deploys re-resolve it too).
- **Secret-Manager `latest` = highest-NUMBER, not highest-ENABLED** — disabling/destroying a too-high version
  does **not** restore `:latest`; you must add a fresh higher *enabled* version. Pin `:N` for determinism.
- **In-VPC private-IP Postgres ops need a connector-attached Cloud Run Job** running a version-matched client
  (`postgres:17-alpine` + `--vpc-connector` + `--vpc-egress=private-ranges-only`) — a laptop/sandbox can't
  reach a private IP and a local `pg_dump` 14 refuses a PG17 server. `gcloud --args` splits on commas → use a
  `^@^` delimiter for SQL containing commas.

## Gaps / owed
- **Neon demote** (Daniel's decision: demote to dev-only sandbox, not delete) — destructive + gated on the
  rollback window closing + a confirmed Cloud SQL backup; runbook in `sprint-3.md` steps 6–7. Owed to Daniel.
- **`neon` R2 backup-target drop** — one-line `gcloud run jobs update` once the window closes. Owed to Daniel.
- **Real money-path test checkout on Cloud SQL** — the S2 checkout proof was read-only. Owed to Daniel.
- **Staging half-migrated** — `medusa-web-staging` still on Neon (S1 never ran the staging rehearsal; the
  classifier blocked a self-initiated staging op, and the empty `medusa_staging` Cloud SQL DB exists). Deferred
  per Daniel to a standalone fix-or-retire follow-up; steps documented in `sprint-3.md`.

## Egress outcome
Re-read at cutover (`scripts/neon-egress.mjs`, 2026-06-22): commerce 4330 MB (86.6% of the 5 GB org cap) —
the cumulative billing-period total. With the backend now reading Cloud SQL over the private VPC (unmetered),
this should **plateau** and reset low next period. The standing measurement is `node scripts/neon-egress.mjs`;
the win is the rate → ≈0, confirmed over the days after cutover.
