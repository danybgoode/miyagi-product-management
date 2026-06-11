#!/usr/bin/env bash
# Deploy the STAGING Medusa service (medusa-web-staging) — Backend Production
# Readiness, Sprint 1. A min=0, Redis-OFF, isolated-secrets twin of deploy.sh.
# Run AFTER provision-staging.sh has populated the *_STAGING secrets.
#
#   CLERK_PUBLISHABLE_KEY=pk_test_… bash infra/gcp/deploy-staging.sh
#
# The FIRST deploy sets staging's env + secrets. Afterwards the ^staging$ Cloud
# Build trigger (cicd-setup-staging.sh) only swaps the image — Cloud Run preserves
# env/secrets across image-only deploys, exactly like prod.
#
# Differences from prod deploy.sh (deploy.sh stays the prod source of truth):
#   • service        medusa-web-staging   (not medusa-web)
#   • min-instances  0                    (scale to zero, ~$0 idle; prod is 1)
#   • NO --vpc-connector / --vpc-egress   (Redis OFF — in-memory fallback)
#   • NO REDIS_URL secret binding
#   • secrets        *_STAGING            (isolated; never prod's)
#   • CORS           localhost / staging URL (not the prod origins)

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
AR_REPO="${AR_REPO:-medusa}"
RUN_SA="${RUN_SA:-medusa-run}"
RUN_SA_EMAIL="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_WEB="${SERVICE_WEB:-medusa-web-staging}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${IMAGE:-${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/backend:${TAG}}"

# Staging CORS. Default = local frontend → staging backend; admin is same-origin.
# After the first deploy, re-run with the printed staging URL added (see footer).
STORE_CORS="${STORE_CORS:-http://localhost:3001}"
ADMIN_CORS="${ADMIN_CORS:-http://localhost:3001}"
AUTH_CORS="${AUTH_CORS:-http://localhost:3001}"
# Clerk DEV publishable key (pk_test_…). Baked into the admin bundle; not a secret.
CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY:?set CLERK_PUBLISHABLE_KEY to the Clerk DEV pk_test_ key}"
# Rides the Neon branch (copy of prod) → the prod sales-channel id resolves on staging.
MEDUSA_SALES_CHANNEL_ID="${MEDUSA_SALES_CHANNEL_ID:-sc_01KSK1J0V81P4EPY9G0JAPX353}"

gcloud config set project "$PROJECT_ID" >/dev/null

# Set SKIP_BUILD=1 and IMAGE=<existing tag> to redeploy an already-built image
# (e.g. to update only CORS without a fresh build).
if [ -n "${SKIP_BUILD:-}" ]; then
  echo "▶ Skipping build; deploying existing image: $IMAGE"
else
  echo "▶ Building $IMAGE via Cloud Build (context apps/backend)…"
  gcloud builds submit apps/backend --tag "$IMAGE"
fi

echo "▶ Deploying $SERVICE_WEB (min=0, Redis-OFF, no VPC connector)…"
# MEDUSA_BACKEND_URL is intentionally unset → the admin bundle defaults to
# same-origin ("/"), avoiding a chicken-and-egg with the not-yet-known URL.
gcloud run deploy "$SERVICE_WEB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="$RUN_SA_EMAIL" \
  --min-instances=0 \
  --max-instances=2 \
  --cpu=1 \
  --memory=1Gi \
  --port=8080 \
  --allow-unauthenticated \
  --set-env-vars="^@^NODE_ENV=production@MEDUSA_WORKER_MODE=shared@STORE_CORS=${STORE_CORS}@ADMIN_CORS=${ADMIN_CORS}@AUTH_CORS=${AUTH_CORS}@NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}@MEDUSA_SALES_CHANNEL_ID=${MEDUSA_SALES_CHANNEL_ID}" \
  --set-secrets="DATABASE_URL=DATABASE_URL_STAGING:latest,JWT_SECRET=JWT_SECRET_STAGING:latest,COOKIE_SECRET=COOKIE_SECRET_STAGING:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_STAGING:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_STAGING:latest,MP_ACCESS_TOKEN=MP_ACCESS_TOKEN_STAGING:latest,CLERK_SECRET_KEY=CLERK_SECRET_KEY_STAGING:latest,MEDUSA_INTERNAL_SECRET=MEDUSA_INTERNAL_SECRET_STAGING:latest,ENVIA_API_KEY=ENVIA_API_KEY_STAGING:latest,ENVIA_SANDBOX=ENVIA_SANDBOX_STAGING:latest"

URL="$(gcloud run services describe "$SERVICE_WEB" --region="$REGION" --format='value(status.url)')"
echo "▶ Staging URL: $URL"

cat <<EOF

Redis is intentionally unset → Medusa uses in-memory cache / event-bus / workflow
/ locking (documented parity gap; fine for change rehearsal). With min=0 the
scheduled jobs (reconcile-checkouts, sweepstakes-draw) only fire while an instance
is warm — acceptable on staging.

If STORE/ADMIN/AUTH_CORS still shows localhost only, append the staging URL:
  STORE_CORS=$URL ADMIN_CORS=$URL AUTH_CORS=http://localhost:3001,$URL \\
  CLERK_PUBLISHABLE_KEY=<dev pk_test> SKIP_BUILD=1 IMAGE=$IMAGE \\
  bash infra/gcp/deploy-staging.sh

Verify:  curl -s -o /dev/null -w '%{http_code}\\n' $URL/health   # expect 200
EOF
