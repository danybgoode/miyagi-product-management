---
epic: gcp-account-migration
sprint: 1
title: secrets + the data rehearsal
risk: high
phase: Shipped
stories_total: 2
stories:
  - id: S1.1
    title: Copy the secret values
    as_a: the new stack
    i_want: every secret the old one has, with identical values
    so_that: sessions, webhooks, and integrations keep working across the cutover
    risk: high
    status: done
  - id: S1.2
    title: Restore a backup and boot against it
    as_a: Daniel
    i_want: proof the new stack runs on our real data shape before any cutover
    so_that: Sprint 3 is a flip, not an experiment
    risk: high
    status: done
---
# GCP account migration — Sprint 1: secrets + the data rehearsal

**Status:** ✅ done 2026-07-19 — both stories; awaiting Daniel's read of the measured window + row counts (Sprint QA "owed" item)

**Story 1.1 record:** **56 secrets copied** old→new (of 60: excluded `github-github-oauthtoken-*`
account-scoped; `DATABASE_URL`/`REDIS_URL` env-specific, set fresh; `SERPAPI_KEY` turned out to be
an **empty shell even in the old project** — which retroactively explains why live `miyagi-web`
never bound it). Zero rotation. Verified per-secret by byte-length equality; values never printed
nor written to disk (direct `access | add` pipe). `medusa-run` granted accessor on all 16 of
`deploy.sh`'s bindings.

**Story 1.2 record:** path = **export→GCS→import** (not cross-project backup-restore): DB is tiny,
it avoids granting old-account identities on the new instance, and it rehearses the exact S3
final-sync mechanism. Bucket `gs://miyagisanchez-prod-db-migration` (Daniel approved the two
cross-project service-agent grants). **Measured: export (`--offload`, zero prod load) 178s +
import 19s ≈ 3.5 min** — that is the S3 write-quiet window, plus flip overhead. Row counts from
the dump (exact old-side truth at export time, 154 tables): product **106** · product_variant
**106** · `"order"` **17** · order_line_item **18** · payment **17** · payment_collection **49** ·
cart **68** · customer **7** · seller **25** · region **2**. Full per-table list in the session
scratchpad; re-derive the same way at S3. `medusa-web` deployed
(`medusa-web-00001-6ml`, image `backend:20260719-102613`) and **boots against the imported DB** —
`/health` 200 (startup probe gates traffic, so serving = booted), `/store/listings` returns real
rows with the copied publishable key. Smoke steps 1–7 all pass; prod untouched (200, old project).
Infra suite: **147/147**. One script fix shipped: `deploy.sh`/`deploy-frontend.sh` had
`"$SERVICE_WEB…"` — under a C-locale shell bash swallows the UTF-8 ellipsis into the identifier
("unbound variable"); braced to `${SERVICE_WEB}…`.

> **Still zero production exposure** — this sprint restores a **backup**, never the live database,
> and nothing in prod points at the new project. But it is tagged HIGH because it handles production
> secret material and a copy of real commerce data.

> 🚫 **Do not rotate any secret in this epic.** The temptation is real — `infra/gcp/README.md` even
> tells you to rotate `JWT_SECRET`/`COOKIE_SECRET` on a *fresh* install. **That advice does not apply
> to a migration.** Rotating those invalidates every live session and token at cutover, and combining
> a rotation with a migration makes any failure undiagnosable. Rotation is a separate change.

## Stories

### Story 1.1 — Copy the secret values
**As** the new stack, **I want** every secret the old one has, with identical values, **so that**
sessions, webhooks, and integrations keep working across the cutover.
**Acceptance:** all ~40 secrets from Sprint 0's verified inventory exist in the new project's Secret
Manager with **identical values**. The account-scoped items identified in Story 0.2 (service-account
keys, the Cloud Build↔GitHub connection) are **re-created**, not copied, and listed separately.
`deploy.sh`'s `--set-secrets` list and `deploy-frontend.sh`'s resolve without error against the new
project.
**QA:** for each secret name, assert presence and non-empty latest version. **Never log or echo a
secret value** — assert on presence and length, not content.
**Risk:** **HIGH — Daniel merges.** Production secret material.

### Story 1.2 — Restore a backup and boot against it
**As** Daniel, **I want** proof the new stack runs on our real data shape before any cutover,
**so that** Sprint 3 is a flip, not an experiment.
**Acceptance:** a Cloud SQL **backup** (not the live DB) is restored into the new project's instance;
`medusa-web` deploys and boots against it; the backend serves a catalog (`/store/listings` returns
rows). Row counts on the key commerce tables are recorded in this doc for the Sprint 3 comparison.
**The number that matters:** **measure and write down how long the restore/sync actually takes.**
That duration *is* the Sprint 3 cutover window. **Measure it; do not estimate it.** Also confirm
which path we're using (export→GCS→import vs cross-project backup restore) and record why.
**QA:** `infra/gcp/test/cloudsql-backup-check.test.js` green against the new instance.
**Risk:** **HIGH — Daniel merges.** Real commerce data, even as a copy.

## Sprint QA
- **Deterministic:** `infra/gcp/test/*` against the new project; backend `medusa build` → `tsc` →
  `npm run test:unit` unchanged (no app code changes in this epic).
- **No per-branch backend preview** — this is validated directly against the new project's Cloud
  Run, which is safe precisely because nothing routes to it yet.
- **Owed to Daniel:** review the row-count record and the measured sync duration before Sprint 3 is
  scheduled. That number decides the cutover window.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the **new** project's Cloud Run URL (not a custom domain) · production still on the old project

1. Run `gcloud secrets list --project=<new-project-id> | wc -l`.
   → Matches the count from Sprint 0's inventory.
2. Run `gcloud sql instances describe medusa-pg --project=<new-project-id>`.
   → State `RUNNABLE`.
3. Run `gcloud run services list --project=<new-project-id>`.
   → `medusa-web` exists and its latest revision is serving.
4. `curl https://<new-medusa-web-url>/health` (or the runbook's health path).
   → 200.
5. `curl` the store listings endpoint on the new backend URL with the publishable key.
   → Returns real listing rows — **the new stack is serving our data shape.**
6. Compare the recorded row counts for the key commerce tables against the old project.
   → They match (allowing for writes since the backup was taken — note the delta, don't ignore it).
7. Open `https://miyagisanchez.com`.
   → **Still the old project.** Unchanged, unaffected.

If any step fails, note the step number + what you saw — that's the bug report.
