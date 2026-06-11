# Backend Production Readiness — Sprint 1: Backend staging environment

**Status:** ✅ **BOTH STORIES LIVE 2026-06-11** — Story 1.1 (staging stood up + auto-deploy proven) · Story 1.2
(prod `JWT_SECRET`/`COOKIE_SECRET` rotated v1→v2, `medusa-web` rolled `00099`→`00100`) · **Risk:** HIGH (Daniel merges)

> **Build:** scripts + runbook on `feat/backend-staging-s1` (PR pending). Live infra (this session):
> Neon branch `staging` `br-lucky-thunder-aqn9gj6a` (off prod `main` `br-lively-cell-aqp2ivty`, project
> `shiny-paper-72860331`) · Cloud Run `medusa-web-staging`
> (`https://medusa-web-staging-oehqqtyoia-uk.a.run.app`, min=0/max=2, no VPC, image `:20260611-002321`) ·
> 10 `*_STAGING` secrets in `miyagisanchezback-497722` · trigger `backend-staging-deploy` (`f1af149c`, `^staging$`).

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

## Sprint 1 — Smoke walkthrough (executed 2026-06-11)
Env: staging · URL `https://medusa-web-staging-oehqqtyoia-uk.a.run.app` · scripts in `infra/gcp/`.

**Story 1.1 — all green (agent-run CLI/API probes):**
1. **Neon branch.** `neonctl branches create --name staging --project-id shiny-paper-72860331` →
   `br-lucky-thunder-aqn9gj6a`, parent = prod `main` `br-lively-cell-aqp2ivty`. Pooled DSN captured
   (host `ep-damp-hat-aqbntyog-pooler…us-east-1.aws.neon.tech`).
2. **Isolated secrets.** `provision-staging.sh` → 10 `*_STAGING` secrets created + `medusa-run` accessor;
   fresh `openssl` JWT/COOKIE/INTERNAL; sourced dev/test creds (Stripe `sk_test`, MP sandbox, Clerk **dev**
   `sk_test`); `ENVIA_SANDBOX=true`; webhook placeholder. **No `REDIS_URL`** (Redis off). `describe` confirms
   every container secret resolves to a `*_STAGING` name — never prod's.
3. **First deploy.** `deploy-staging.sh` → Cloud Build `0ffc35f3` SUCCESS (16m53s) → `medusa-web-staging`
   revision `00001-b4w`, **min=0 / max=2, no VPC connector** (`describe`: no `minScale`/`vpc-access` annotations).
   Build log confirms the Redis-off path: `redisUrl not found. A fake redis instance will be used`.
4. **Health.** `curl …/health` → **HTTP 200** (0.59s).
5. **Auto-deploy isolation (the key acceptance).** `cicd-setup-staging.sh` → trigger `backend-staging-deploy`
   (`f1af149c`, `^staging$`, `_SERVICE=medusa-web-staging`). Created the backend `staging` branch at
   `origin/main` (working tree left on the sibling's branch). That push fired **only**
   `backend-staging-deploy` (build `3edf057c` SUCCESS) → new staging revision `00002-8mf` (inheriting the
   `*_STAGING` secrets via image-only deploy); prod trigger `backend-main-deploy` stayed **silent** and prod
   `medusa-web` stayed at `00099-vv7` — **untouched**.
6. **Neon-branch + staging-secrets read.** Confirmed by (2)+(3) above: `DATABASE_URL` resolves to
   `DATABASE_URL_STAGING` (the Neon branch DSN), and the service boots healthy against it.

**Story 1.2 — prod secret rotation: ✅ DONE 2026-06-11** (Daniel-authorized, confirmed no traffic).
- Added fresh `JWT_SECRET` v2 + `COOKIE_SECRET` v2 (`openssl rand -hex 32`, values never echoed). Rolled
  `medusa-web` via a **targeted** `gcloud run services update --update-secrets=…:2` (NOT a `deploy.sh` re-run,
  which would have clobbered prod's extra `ADMIN_CORS` origin) → revision **`00100-859`**; `/health` 200; all
  13 secret bindings + `ADMIN_CORS` preserved. Live sessions invalidated as expected (one-time re-auth).
  Procedure + cadence: [`infra/gcp/STAGING.md`](../../../infra/gcp/STAGING.md#prod-secret-rotation-procedure-story-12).

**Owed to Daniel (he holds prod creds / sessions):**
- A live eyeball of the staging URL + admin `/app` if desired (cosmetic; `/health` already green).

If any step is re-run and fails, note the step number + what you saw.
