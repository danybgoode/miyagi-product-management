---
status: archived   # SUPERSEDED by postgres-neon-to-cloudsql (S3 close, 2026-06-22). Durable keepers: scripts/neon-egress.mjs + lib/cache-policy.ts SSOT.
slug: neon-egress-and-db-isolation
---

# Epic: Neon egress reduction + DB account isolation + site-wide Clarity 🏗️

> ⚠️ **SUPERSEDED (2026-06-22) by [`postgres-neon-to-cloudsql`](../postgres-neon-to-cloudsql/README.md).**
> While building S2 we found the real fix: the egress is a **cross-cloud tax** (compute on GCP, Postgres on
> Neon/AWS). Co-locating Postgres on Cloud SQL (GCP) eliminates it at the root, so the symptom-treating sprints
> here (S2 `minScale:0`, S3 Neon org-split) are **dropped**. **Durable keepers that shipped:** S1's measurement
> harness (`scripts/neon-egress.mjs`) + the `lib/cache-policy.ts` SSOT. **Disposition:** PRs #19/#32 to be
> closed; this README's `status` flips to `archived` at the new epic's S3 close (board regen). S4 (Clarity) /
> S5 (housekeeping) can be re-homed as standalone chores if still wanted.

> **Area:** 09-platform-infra · **Risk:** high (infra: DB hosting org · `minScale` · backup/secrets) ·
> **Scope seed / decision:** [`00-ideas/2. readyforscope/db-egress-and-account-strategy.md`](../../00-ideas/2.%20readyforscope/db-egress-and-account-strategy.md)
> (spike COMPLETE + APPROVED 2026-06-21 — every number validated against the live Neon/GCP/Supabase/Clarity consoles).

**This epic executes the approved spike decision.** It does **not** re-investigate — the root cause is
nailed down. It pulls the levers that decision selected.

## Why
A Neon usage email warned the org is at 80% of its **5 GB/month public-network-transfer** allowance. The
spike proved the cause is **not** traffic and **not** the daily backup (the two things the original framing
blamed):

- **Root cause (validated, ~97–98% / ~4.0 GB / ~190 MB/day):** the `medusa-web` Cloud Run backend runs
  **`minScale: 1`** → a permanent Neon connection pool + Medusa background loops (scheduled jobs, event-bus
  polling, `livenessProbe GET /health` every 30 s) keep Neon's `main` endpoint **~84% active**, reading over
  a **cross-cloud public endpoint** (GCP us-east4 ↔ Neon AWS us-east-1). Every query result is egress. Plus
  every **uncached** storefront/Store-API read (incl. bots/crawlers/CI) cascades FE→Cloud Run→Neon.
- **Projection:** ~190 MB/day × 30 ≈ **5.7 GB/mo → exceeds the 5 GB org cap.** Action needed.
- **Non-causes (do NOT spend effort here):** the daily backup is **~1–2%** (neon dump is 176 KB gzipped — the
  43 MiB DB is mostly empty Medusa schema); staging is idle/suspended; private networking **does not exist**
  for GCP↔AWS cross-cloud.
- **Decision:** **keep commerce on Neon** (branching is used — escrow drill + staging branch). Escalation if
  the free levers don't hold us under 5 GB = **Neon Launch ($19/mo, 500 GB)**, *not* a migration.

## Medusa-first note
N/A for the data model — no commerce primitive changes. One sprint adjusts a Medusa **scheduled-job cadence**
+ the backend's Cloud Run `minScale` (infra config, `apps/backend` / `infra/gcp`); the rest is Next.js caching,
a frontend analytics loader, and Neon/console housekeeping. **AGENTS five rules:** no violation — Neon stays
commerce Postgres (#1), Supabase stays non-commerce (#2), Clerk untouched (#4), Clarity is invisible
instrumentation (no new bilingual surface, #5), UCP/MCP untouched (#3).

## What already exists (reuse, don't rebuild)
- **Egress facts:** the spike's Decision section — per-project egress, the `minScale:1` mechanism, dump sizes,
  branch states — all already measured. Re-read it, don't re-measure from scratch.
- **Backend scaling/probes:** `medusa-web` Cloud Run service (`minScale:1`, `livenessProbe /health@30s`);
  `infra/gcp/deploy.sh` (image-only deploys preserve scaling/secrets) + `infra/gcp/test/deploy-invariants.test.js`
  (the parity guard that must stay green through any change).
- **Backend jobs:** `apps/backend/src/jobs/*` (the scheduled-job cadence audit target — same surface
  vercel-function-cost-reduction S1 tuned).
- **Storefront read paths:** `app/s/[slug]/page.tsx`, `app/l/[id]/page.tsx`, `lib/medusa` Store-API reads
  (the caching targets); the `s-maxage` cache-header idiom already in `app/robots.txt/route.ts` + `app/llms.txt/route.ts`.
- **Neon:** `neonctl` + the project API (`GET /projects/{id}.data_transfer_bytes`) for measuring deltas;
  Neon **project transfer between orgs** keeps host/DSN stable (no secret rotation).
- **Clarity:** `app/vende/_components/SellerAcquisitionVariantTag.tsx` (the existing `window.clarity?.('set',…)`
  calls that currently no-op); `lib/print-qr.ts` (UTM tagging; its "wired site-wide" comment is **false** — fix it).
  The seasonal-theme channel-gating pattern (`app/layout.tsx` channel detection) for where to mount/skip the loader.
- **Housekeeping:** idle Neon branches (`s2-drill-prerestore-20260611`, archived `dev`, `prewipe-backup-*`);
  `infra/gcp/backups/BACKUPS.md` (stale "not yet live" status line — backup IS live since 06-12).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Egress measurement baseline + cache storefront/Store-API reads | low–med |
| 2 | Backend quiet — `minScale` trial + Medusa job-cadence audit | **high** |
| 3 | Neon org split — move side-projects off the commerce org | med |
| 4 | Site-wide Clarity loader (channel-gated) + UTM | low |
| 5 | Housekeeping — idle branches + stale-doc fixes | low |

## Deploy order
- **S1** frontend (Vercel preview/PR) — ship first; it's safe and establishes the measurement baseline every
  later sprint's egress delta is read against.
- **S2** backend + infra (Cloud Run, ~12 min, no preview) — **HIGH, Daniel-merges/executes.** `minScale` change
  is shared infra affecting all storefront latency; trial + measure the egress delta before committing.
- **S3** Neon console/CLI (no app deploy) — **Daniel-executes** (his Neon account/side-projects). medusa-bonsai's
  own DB is **not** moved (the side-projects leave); host/DSN stable → `deploy-invariants` untouched.
- **S4** frontend (Vercel) — independent of the egress sprints (orthogonal); ship any time.
- **S5** console/docs housekeeping — any time.
No cross-slice data dependency; each is independently shippable.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** N/A — infra-config epic, no new always-on user-facing money/auth seam (the `minScale`
      trial is reversible by redeploy; caching by revalidate). None planned at grooming.
- [ ] **Egress verified back under 5 GB/mo** (or the decision to pay Neon Launch recorded) — the epic's success signal.
- [ ] Feature branch(es) deleted; **this README's frontmatter `status: shipped`** (SSOT — run `node scripts/build-order.mjs`)
