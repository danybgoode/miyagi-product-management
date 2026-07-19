# GCP account migration — Sprint 2: CI/CD, schedulers, monitoring — all switched off

**Status:** ⬜ not started

> ⚠️ **The single most likely self-inflicted outage in this whole epic:** two projects both
> deploying on a push to `main`, or both running the same cron against the same database.
> **Everything provisioned in this sprint ships DISABLED / PAUSED.** Nothing here is enabled until
> Sprint 3 flips it in the same change that disables the old side.

## Stories

### Story 2.1 — Cloud Build triggers on both repos (left disabled)
**As** the team, **I want** push-to-main auto-deploy wired on the new project, **so that** after
cutover the normal cadence just works.
**Acceptance:** triggers exist for both repos on the new project, mirroring the old ones' config
(`apps/backend/cloudbuild.yaml`, the frontend equivalent). **Both created in a disabled state.**
`infra/gcp/test/frontend-build-args.test.js` green — the frontend build args are the thing most
likely to differ silently between projects.
**Daniel's manual step:** the **GitHub OAuth connection is a console step and cannot be scripted**
(`cicd-setup.sh`'s own header says so). Daniel does this one; the agent runs `cicd-setup.sh` after.
**Risk:** LOW while disabled.

### Story 2.2 — Schedulers, monitoring, ALB (schedulers paused)
**As** Daniel, **I want** the periodic jobs and alerting standing by on the new project, **so that**
cutover doesn't silently drop a cron or leave us blind.
**Acceptance:** all four scheduler jobs exist on the new project — `frontend-order-autoconfirm`
(`0 9 * * *`) · `frontend-print-pending` (`0 8`) · `frontend-domain-lapse-sweep` (`0 7`) ·
`frontend-launchpad-campaigns` (`0 6`) — pointing at the **new** frontend Cloud Run URL and **all
paused**. Monitoring policies and the ALB provisioned via the existing scripts.
`infra/gcp/test/scheduler-invariants.test.mjs` and `alb-invariants.test.mjs` green.
**Note:** `frontend-order-autoconfirm` touches orders. Running it from two projects at once against
one database is exactly the failure this sprint's "everything paused" rule exists to prevent.
**Risk:** LOW while paused.

## Sprint QA
- **Deterministic:** `infra/gcp/test/scheduler-invariants.test.mjs`, `alb-invariants.test.mjs`,
  `frontend-build-args.test.js`, `deploy-invariants.test.js` — all against the new project.
- **Owed to Daniel:** the GitHub OAuth console connection (Story 2.1). Blocking; nothing else in
  this sprint depends on it, so do it early.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the **new** project · production still on the old project

1. Run `gcloud builds triggers list --project=<new-project-id>`.
   → Both triggers listed, and each shows **disabled**.
2. Run `gcloud scheduler jobs list --location=us-east4 --project=<new-project-id> --format='table(name,schedule,state)'`.
   → All four jobs listed, every `state` is **PAUSED**, and each URI points at the **new** frontend
   Cloud Run URL (not the old one, not the custom domain).
3. Run the same command against the **old** project.
   → All four still **ENABLED** there. *(Prod crons must keep running — we haven't cut over yet.)*
4. Push a trivial commit to a branch (not `main`) in either repo.
   → **No build fires** on the new project.
5. Check the monitoring policies exist on the new project.
   → Present, targeting the new services.
6. Open `https://miyagisanchez.com`.
   → **Still the old project.** Unchanged.

If any step fails, note the step number + what you saw — that's the bug report.
