# Backend Production Readiness — Sprint 3: Graceful recovery & health

**Status:** ✅ **LIVE ON PROD 2026-06-12** (`feat/backend-prod-readiness-s3`, PR #12) — recovery runbook +
HTTP `/health` startup/liveness probes (`deploy.sh` + `deploy-staging.sh`) + forward-only migration posture +
admin-exposure decision (KEEP `/app` + harden) + ADMIN_CORS confirmed (and a `deploy.sh` default bug fixed).
**Staging rollback drill executed** (repin ~9 s; startup-probe gate rejects a bad revision — runbook §6).
**Probes APPLIED to live `medusa-web`** (rev `…00101`, health 200, preserved across image-only CI). Residual:
optional liveness-hang confirmation + ADMIN_CORS-tightening + secret-list-drift reconcile (all owed/optional).
· **Risk:** HIGH (touches prod Cloud Run config; rehearsed on staging first)

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
Env: staging Cloud Run — **✅ EXECUTED 2026-06-12** (results in `tasks/backend-recovery-runbook.md` §6)

1. ✅ Open the rollback runbook → revision-rollback + `git revert` steps + time-to-recover are clear.
2. ✅ Repin staging traffic to the prior revision per the runbook → switched in **~9 s**, `/health` 200, restored to latest. *(Agent executed on staging — was owed to Daniel; done.)*
3. ✅ **Startup check blocks a bad revision:** a deliberately-broken revision (bad startup path) was **rejected, took 0% traffic**, prior kept serving, health 200 throughout. ⏳ The liveness-recycle-of-a-hung-instance half is a **residual** (can't be forced without an app hang; probe verified attached) — optional, owed to Daniel.

**✅ Probes applied to live prod 2026-06-12** (`medusa-web` rev `…00101`, health 200). **Residual (owed/optional to Daniel):** the optional liveness-hang confirmation; the ADMIN_CORS tightening decision; reconcile the `deploy.sh`↔live drift (3 missing secrets + `ENVIA_SANDBOX` secret→plain — a full prod `deploy.sh` currently errors) before any full re-run (runbook §5 ⚠️, scoped into Story 4.2).

If any step fails, note the step number + what you saw.
