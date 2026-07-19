# GCP account migration — Sprint 1: secrets + the data rehearsal

**Status:** ⬜ not started

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
