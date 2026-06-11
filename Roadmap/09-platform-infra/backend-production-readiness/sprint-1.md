# Backend Production Readiness — Sprint 1: Backend staging environment

**Status:** ⬜ not started · **Risk:** HIGH (Daniel authorizes — new prod-adjacent infra + secrets)

> ✅ **Finalized by Sprint 0 (approved 2026-06-11).** Platform decided: **Cloud Run `medusa-web-staging`
> (min=0) + Neon DB branch**, reject Render — see [`tasks/backend-production-readiness-audit.md`](../../../tasks/backend-production-readiness-audit.md).
> Two reshape deltas folded in below: **Redis starts OFF** (Medusa in-memory fallback — a documented parity
> trade-off; add a Memorystore DB-index only if job-queue parity is later needed) and **rotate prod
> `JWT_SECRET`/`COOKIE_SECRET` in the same motion** (gap #8 — never rotated since 2026-05-28).

## Stories

### Story 1.1 — Stand up `medusa-web-staging`
**As a** builder, **I want** a `medusa-web-staging` Cloud Run service on its own Neon DB branch, deployed by
a staging-branch Cloud Build trigger, **so that** I can exercise backend changes against a prod-parity
environment before merging to `main`.
**Acceptance:**
- A staging URL serves a healthy Medusa (`/health` 200; admin reachable per the chosen exposure policy).
- Staging uses **isolated** secrets (its own `JWT_SECRET`/`COOKIE_SECRET`, sandbox Stripe/MP keys) and a
  **Neon branch** DB — never prod's.
- A push to the staging branch deploys **only** staging; `main` still deploys only prod.
- Staging CORS + webhook endpoints point at staging, not prod.
- Staging runs **without Redis** (no VPC connector / Memorystore needed) — Medusa falls back to in-memory
  cache/event-bus/workflow; this parity gap is noted in the staging runbook.
**Risk:** HIGH

### Story 1.2 — Rotate prod `JWT_SECRET` / `COOKIE_SECRET` + document the procedure
**As the** owner, **I want** the prod session/cookie secrets rotated (they've been single-version since the
2026-05-28 migration) and a rotation procedure written, **so that** long-lived secrets aren't indefinite.
**Acceptance:**
- New `JWT_SECRET` + `COOKIE_SECRET` versions added to Secret Manager (`openssl rand -hex 32`); `medusa-web`
  picks them up on next deploy; the rotation steps + cadence are written into the runbook.
- ⚠️ Rotating `COOKIE_SECRET` invalidates live sessions — coordinate timing with Daniel.
**Risk:** HIGH

## Sprint QA
- **api spec(s):** none (infra). A scripted `curl` health probe + a deploy-from-staging-branch smoke instead.
- **browser smoke owed:** yes, to Daniel — confirm the staging URL serves + a staging-branch push deploys only staging (he holds GCP/Neon creds).
- **deterministic gate:** the backend image still builds (`cloudbuild.yaml`); staging deploy succeeds; prod path unchanged.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: staging · (staging Cloud Run URL, set in S0/S1)

1. `curl https://<staging-url>/health` → 200; the service responds.
2. Push a trivial commit to the staging branch → only `medusa-web-staging` redeploys (prod `medusa-web` untouched). **[owed to Daniel — GCP creds]**
3. Confirm staging reads the **Neon branch** DB and **staging** secrets (not prod). **[owed to Daniel — secrets]**

If any step fails, note the step number + what you saw.
