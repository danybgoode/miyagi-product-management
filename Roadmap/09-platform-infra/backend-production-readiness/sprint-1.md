# Backend Production Readiness — Sprint 1: Backend staging environment

**Status:** ⬜ not started · **Risk:** HIGH (Daniel authorizes — new prod-adjacent infra + secrets)

> ⚠️ **Candidate slice — finalized by Sprint 0.** The staging *platform* is decided in S0; this sprint
> assumes the recommended Cloud Run + Neon-branch path and is rewritten if S0 chooses otherwise.

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
