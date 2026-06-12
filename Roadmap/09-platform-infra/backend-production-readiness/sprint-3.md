# Backend Production Readiness — Sprint 3: Graceful recovery & health

**Status:** 🏗️ **BUILT 2026-06-12** (`feat/backend-prod-readiness-s3`) — recovery runbook + HTTP `/health`
startup/liveness probes (`deploy.sh` + `deploy-staging.sh`) + forward-only migration posture + admin-exposure
decision (KEEP `/app` + harden) + ADMIN_CORS confirmed (and a `deploy.sh` default bug fixed). **Live staging
rollback rehearsal + prod re-deploy owed to Daniel.** · **Risk:** HIGH (touches prod Cloud Run config; rehearsed on staging first)

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
- ✅ A **rollback runbook** covers: roll Cloud Run to the prior revision; `git revert` on `main`; when to use
  which; expected time-to-recover — [`tasks/backend-recovery-runbook.md`](../../../tasks/backend-recovery-runbook.md)
  (decision table + §1 repin + §2 revert). A rollback **rehearsed on staging — owed to Daniel** (§6 / smoke #2–3).
- ✅ **Startup + liveness health checks** configured in `deploy.sh` + `deploy-staging.sh` (failed-startup
  revisions denied traffic; hung instances auto-recycled). **Applies to live prod on next deploy — owed to Daniel.**
- ✅ A **migration-rollback posture** is written (forward-only → forward-fix / backup-restore; a repin can't
  fix a bad migration — runbook §3).
- ✅ **Startup probe switched TCP:8080 → HTTP `/health`** + a **liveness probe** on `/health` added (both scripts,
  `failureThreshold`-budgeted; bash-syntax-checked; gcloud `--startup-probe`/`--liveness-probe` flags).
- ✅ **Admin-exposure decision recorded: KEEP `/app` + harden** (runbook §5 + `infra/gcp/README.md`); **ADMIN_CORS**
  confirmed against live config — `api.miyagisanchez.com` is the intended admin origin, and a **`deploy.sh`
  default bug was found + fixed** (it omitted that origin → a re-run would have broken the admin UI).
**Risk:** HIGH

**Built (commit refs added on merge):**
- `tasks/backend-recovery-runbook.md` (NEW) · `infra/gcp/deploy.sh` + `deploy-staging.sh` (probes + ADMIN_CORS default) · `infra/gcp/README.md` (pointer).

**Owed to Daniel (live, prod creds):** apply the probe + ADMIN_CORS-default fixes to live `medusa-web` (next prod
deploy); run the staging rollback rehearsal (smoke #2–3); decide whether to drop the two vestigial storefront
origins from ADMIN_CORS (runbook §5).

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
