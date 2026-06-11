# Backend Production Readiness — Sprint 3: Graceful recovery & health

**Status:** ⬜ not started · **Risk:** HIGH (touches prod Cloud Run config; rehearsed on staging first)

> ✅ **Finalized by Sprint 0 (2026-06-11).** Concrete deltas from the audit: the startup probe is currently a
> bare **TCP socket on :8080** while **`GET /health` already returns 200** — so the probe upgrade is real and
> cheap (point startup at HTTP `/health` + add a liveness probe). Plus two security riders folded in (gaps
> #11/#14): make the **admin-exposure** an explicit decision (`/app` is currently reachable in prod) and
> confirm **ADMIN_CORS** carries only intended origins. See the audit doc.

## Stories

### Story 3.1 — Rollback runbook + health checks + migration posture
**As the** owner, **I want** a documented, rehearsed rollback (Cloud Run revision + `git revert`),
startup/liveness health checks on the service, and a written migration-rollback posture, **so that** a bad
deploy is reversible in minutes and a sick instance is recycled automatically.
**Acceptance:**
- A **rollback runbook** covers: roll Cloud Run to the prior revision; `git revert` on `main`; when to use
  which; expected time-to-recover. A rollback is **rehearsed on staging**.
- **Startup + liveness health checks** are configured on the Cloud Run service (sick instances restart;
  failed-startup revisions don't take traffic).
- A **migration-rollback posture** is written (Medusa migrations are forward-only — the strategy is
  forward-fix / backup-restore, not a one-click down-migration; say so explicitly).
- **Startup probe switched from TCP:8080 → HTTP `/health`**; a **liveness probe** on `/health` added.
- **Admin-exposure decision recorded** (keep `/app` + harden, or set `DISABLE_MEDUSA_ADMIN=true`); **ADMIN_CORS**
  confirmed to list only intended origins.
**Risk:** HIGH

## Sprint QA
- **api spec(s):** none (infra). A health-probe `curl` + a rehearsed staging rollback are the verification.
- **browser smoke owed:** yes, to Daniel — the live rollback rehearsal + confirming health-check restart behavior (prod creds).
- **deterministic gate:** the service still builds/deploys with health checks attached; staging rollback succeeds.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: staging Cloud Run

1. Open the rollback runbook → revision-rollback + `git revert` steps + time-to-recover are clear.
2. Deploy a deliberately-broken revision to **staging**, then roll back to the prior revision per the runbook → staging serves healthy again within the stated time. **[owed to Daniel — GCP creds]**
3. Confirm the liveness check recycles a hung instance (or the startup check blocks a bad revision from taking traffic). **[owed to Daniel]**

If any step fails, note the step number + what you saw.
