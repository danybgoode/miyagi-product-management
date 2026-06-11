# Backend staging environment — runbook

Stands up and operates **`medusa-web-staging`**: a prod-parity place to rehearse backend changes
(migrations, dependency bumps, payment-provider tweaks) before they touch prod. Built in
[Backend Production Readiness, Sprint 1](../../Roadmap/09-platform-infra/backend-production-readiness/sprint-1.md).

Pairs with the prod scripts in this directory (`provision.sh` / `deploy.sh` / `cicd-setup.sh`) — staging
is a **parameterized re-run**, not new architecture.

## Topology

| | **prod** | **staging** |
|---|---|---|
| Cloud Run service | `medusa-web` | `medusa-web-staging` |
| Region / project | us-east4 · `miyagisanchezback-497722` | same |
| Deploy trigger | `backend-main-deploy` on `^main$` | `backend-staging-deploy` on `^staging$` |
| min / max instances | 1 / 4 | **0** / 2 (scale-to-zero, ~$0 idle) |
| Database | Neon prod (pooled) | **Neon `staging` branch** (pooled, copy-on-write of prod) |
| Redis | Memorystore via VPC connector | **OFF** — in-memory fallback (see parity gap) |
| Secrets | base names | **`*_STAGING`** isolated set |
| Runtime SA | `medusa-run` | same (`secretAccessor` on `*_STAGING`) |
| CI/CD SA | `medusa-cicd` | same |
| Image | `medusa/backend:<sha>` | same AR repo, same image (SHA-pinned deploy) |
| Money | live Stripe / MP | **Stripe test + MP sandbox — no real money** |

Both triggers reuse the backend repo's single `cloudbuild.yaml`; the staging trigger overrides
`_SERVICE=medusa-web-staging` so the image-only deploy step lands on the staging service.

## Secret map (`*_STAGING`, same project)

`provision-staging.sh` creates these shells + grants `medusa-run` accessor. **No `REDIS_URL_STAGING`** (Redis off).

| Secret | Value on staging |
|---|---|
| `DATABASE_URL_STAGING` | Neon **branch** pooled string (host contains `-pooler`) |
| `JWT_SECRET_STAGING` / `COOKIE_SECRET_STAGING` | fresh `openssl rand -hex 32` (isolated from prod) |
| `MEDUSA_INTERNAL_SECRET_STAGING` | fresh `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY_STAGING` | Stripe **test** key (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET_STAGING` | placeholder — webhooks deferred (see boundary) |
| `MP_ACCESS_TOKEN_STAGING` | MercadoPago sandbox token |
| `CLERK_SECRET_KEY_STAGING` | Clerk **dev** instance (`honest-eel-39`) secret |
| `ENVIA_API_KEY_STAGING` / `ENVIA_SANDBOX_STAGING` | sandbox key (or placeholder) / `true` |

## Stand it up (first time)

```bash
gcloud config configurations activate bonsai-profile   # leroytramafat@gmail.com

# 1. Neon staging branch — capture its POOLED connection string.
neonctl branches create --name staging --project-id <medusa-neon-project>
#   then read the pooled DSN (host has -pooler) for STAGING_DATABASE_URL.

# 2. Provision + populate staging secrets (export the sourced dev/test creds first).
export STAGING_DATABASE_URL='<neon staging pooled DSN>'
export STAGING_STRIPE_SECRET_KEY='sk_test_…'           # apps/backend/.env
export STAGING_MP_ACCESS_TOKEN='APP_USR-…'             # MP sandbox
export STAGING_CLERK_SECRET_KEY='sk_test_…'            # Clerk dev (honest-eel-39)
bash infra/gcp/provision-staging.sh

# 3. First deploy (builds the image, sets staging env+secrets).
CLERK_PUBLISHABLE_KEY='pk_test_…' bash infra/gcp/deploy-staging.sh
#   → prints the staging URL; re-run per the footer to add the URL to CORS.

# 4. Health probe.
curl -s -o /dev/null -w '%{http_code}\n' https://<staging-url>/health   # expect 200

# 5. Wire the staging-branch auto-deploy trigger.
bash infra/gcp/cicd-setup-staging.sh

# 6. Create the 'staging' branch on the backend repo; push there to auto-deploy staging.
#    (in the backend repo)  git switch -c staging main && git push -u origin staging
```

After step 5, a push to `staging` deploys **only** `medusa-web-staging`; `main` still deploys **only** prod.

## Parity gap — Redis OFF (deliberate)

Staging sets no `REDIS_URL`, so Medusa (`medusa-config.ts` gates all four Redis modules on its presence)
falls back to **in-memory** cache / event bus / workflow engine / locking. Consequences, all acceptable for
change rehearsal:
- No **durable/retryable** workflows or cross-instance event bus; state is per-instance and lost on restart.
- No **distributed locking** — but with `min=0`/`max=2` and scale-to-zero, scheduled jobs
  (`reconcile-checkouts` 15-min, `sweepstakes-draw` 1-min) only fire while an instance is warm.

If true job-queue parity is later needed, add a **Memorystore DB-index** (a separate logical DB on the
existing instance) rather than a second Redis — that keeps cost flat. Until then: documented, not a defect.

## No-real-money boundary

Staging uses **Stripe test** + **MP sandbox** keys, so no charge is ever real. Webhooks are **not wired** in
S1: `STRIPE_WEBHOOK_SECRET_STAGING` is a placeholder. Don't point a live Stripe/MP webhook at staging. If a
test-mode endpoint is wanted later, create a Stripe **test-mode** webhook → `https://<staging-url>/hooks/payment/...`
and store its signing secret as a new `STRIPE_WEBHOOK_SECRET_STAGING` version (then redeploy).

## Image-tag note (cosmetic)

Staging shares the `medusa` Artifact Registry repo and `cloudbuild.yaml` pushes `:latest` alongside
`:<sha>`, so staging builds also move `:latest`. Deploys are **SHA-pinned**, so running services are
unaffected — `:latest` is convenience only. For fully isolated images, pass `_AR_REPO=medusa-staging` on the
staging trigger (already a substitution) and provision that repo.

---

## Prod secret rotation procedure (Story 1.2)

`JWT_SECRET` and `COOKIE_SECRET` (prod) have been single-version since the 2026-05-28 GCP migration. Rotate
them, and on a cadence thereafter.

> ⚠️ **Rotating `COOKIE_SECRET` invalidates every live session** (all users signed out). Rotate in a
> **low-traffic window**, coordinated with the owner.

```bash
gcloud config configurations activate bonsai-profile
PROJECT=miyagisanchezback-497722

# 1. Add a new version to each prod secret (values never echoed).
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets versions add JWT_SECRET    --project="$PROJECT" --data-file=-
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets versions add COOKIE_SECRET --project="$PROJECT" --data-file=-

# 2. Roll the prod service so it picks up :latest of each secret.
#    Image-only no-op redeploy (fast — no rebuild):
CUR=$(gcloud run services describe medusa-web --region=us-east4 --format='value(spec.template.spec.containers[0].image)')
SKIP_BUILD=1 IMAGE="$CUR" CLERK_PUBLISHABLE_KEY='<prod pk_live>' bash infra/gcp/deploy.sh
#    (deploy.sh binds JWT_SECRET/COOKIE_SECRET=:latest, so the new versions take effect.)

# 3. Verify.
gcloud secrets versions list JWT_SECRET    --project="$PROJECT"   # ≥2 versions, newest enabled
gcloud secrets versions list COOKIE_SECRET --project="$PROJECT"
curl -s -o /dev/null -w '%{http_code}\n' https://api.miyagisanchez.com/health   # 200
```

**Cadence:** rotate `JWT_SECRET` / `COOKIE_SECRET` at least **every 6 months**, and immediately on any
suspected exposure. Disable (don't destroy) the prior version after confirming the new one is healthy, so a
fast rollback stays available for a short window. Apply the same procedure to `MEDUSA_INTERNAL_SECRET` if it
is ever suspected exposed (it gates `/internal/*` and the frontend must be updated in lock-step).
