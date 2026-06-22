#!/usr/bin/env bash
# Build the Medusa image with Cloud Build and deploy the Cloud Run web service.
# Run AFTER provision.sh and AFTER secret values are populated.
#
#   PROJECT_ID=miyagisanchez-prod bash infra/gcp/deploy.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
AR_REPO="${AR_REPO:-medusa}"
CONNECTOR="${CONNECTOR:-medusa-conn}"
RUN_SA="${RUN_SA:-medusa-run}"
RUN_SA_EMAIL="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_WEB="${SERVICE_WEB:-medusa-web}"
BACKEND_URL="${BACKEND_URL:-https://api.miyagisanchez.com}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${IMAGE:-${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/backend:${TAG}}"

# Public, non-secret config:
STORE_CORS="${STORE_CORS:-https://miyagisanchez.com,https://www.miyagisanchez.com}"
# ADMIN_CORS lists the origins Medusa accepts admin-dashboard requests from. Live medusa-web
# includes api.miyagisanchez.com (the admin SPA's own serving origin, /app). This default
# previously OMITTED it — and because the deploy uses --set-env-vars (replace, not merge), a
# re-run would reset live ADMIN_CORS to the default and DROP that origin, diverging from the
# known-good live config. S3 corrected the default to match live. (Same-origin requests don't
# strictly need CORS, but Medusa still validates the Origin header against adminCors — so the
# live list, not CORS theory, is the source of truth.) The two storefront origins are likely
# vestigial (storefront uses STORE_CORS); kept for now, flagged to Daniel for a tightening
# decision. Admin-exposure posture: KEEP /app + harden (see tasks/backend-recovery-runbook.md).
ADMIN_CORS="${ADMIN_CORS:-https://miyagisanchez.com,https://www.miyagisanchez.com,https://api.miyagisanchez.com}"
AUTH_CORS="${AUTH_CORS:-https://miyagisanchez.com,https://www.miyagisanchez.com}"
CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY:?set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY value (publishable, not secret)}"

gcloud config set project "$PROJECT_ID"

# Set SKIP_BUILD=1 and IMAGE=<existing tag> to deploy an already-built image.
if [ -n "${SKIP_BUILD:-}" ]; then
  echo "▶ Skipping build; deploying existing image: $IMAGE"
else
  echo "▶ Building $IMAGE via Cloud Build (context apps/backend)…"
  gcloud builds submit apps/backend --tag "$IMAGE"
fi

echo "▶ Deploying $SERVICE_WEB…"
# Health probes (Backend Production Readiness S3): replace the bare TCP:8080 startup
# probe with an HTTP GET /health check (Medusa's built-in 200) so traffic only reaches
# a *ready* instance, and add a liveness probe so a wedged instance is auto-recycled.
#   startup : 24 × 10s = up to 240s to become ready (matches the old TCP budget) before
#             the revision is marked failed and is denied traffic.
#   liveness: 3 × 30s of failed /health (~90s) recycles a hung-but-listening instance;
#             generous on purpose so transient blips don't kill healthy instances.
#
# Env/secret parity (Backend Production Readiness S4, Story 4.2 — reconcile to live
# medusa-web, see tasks/backend-recovery-runbook.md §5). Because CI is image-only it
# never re-applies the full config, so this script had silently drifted from live and a
# full re-run would ERROR. Reconciled 2026-06-12 against the live describe:
#   • ENVIA_SANDBOX is a PLAIN env var live ('false') — it was wrongly bound as a
#     secret here (and no ENVIA_SANDBOX secret shell exists → a full run failed
#     "secret not found"). Moved to --set-env-vars.
#   • Added the 3 secrets live binds that the script omitted (would have been DROPPED
#     by --set-secrets' replace semantics): MP_CLIENT_ID, MP_CLIENT_SECRET,
#     FLAGSMITH_ENVIRONMENT_KEY.
# Net: 9 plain env + 15 secrets ≡ live. The drift guard (infra/gcp/test/) locks this in.
#   • SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY added 2026-06-22 (marketplace-static-shell
#     S3): the GCP-hosted GET /store/home/personalization read endpoint reads the frontend's
#     Supabase (favorites/offers) READ-ONLY. Provision the two secret shells + grant the
#     runtime SA secretAccessor BEFORE the merge that reads them (image-only deploys preserve
#     them); a missing value degrades the endpoint to empty personalization (stub), never a crash.
#
# DATABASE_URL home (Postgres → Cloud SQL co-location, Sprint 2 cutover): the secret
# NAME + binding (DATABASE_URL:latest) are unchanged, but at the S2 cutover its VALUE
# was swapped from the Neon (AWS) DSN to the Cloud SQL PRIVATE DSN — reached intra-VPC
# over the medusa-conn connector (--vpc-egress=private-ranges-only, below), the same
# path Redis uses. Co-location kills the cross-cloud egress at the root, so the backend
# STAYS --min-instances=1 (warm/fast): the superseded neon-egress epic's minScale:0
# direction is explicitly NOT applied here. The drift guard locks min-instances=1 in.
gcloud run deploy "$SERVICE_WEB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="$RUN_SA_EMAIL" \
  --vpc-connector="$CONNECTOR" \
  --vpc-egress=private-ranges-only \
  --min-instances=1 \
  --max-instances=4 \
  --cpu=1 \
  --memory=1Gi \
  --port=8080 \
  --startup-probe="httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=5,periodSeconds=10,failureThreshold=24" \
  --liveness-probe="httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=5,periodSeconds=30,failureThreshold=3" \
  --allow-unauthenticated \
  --set-env-vars="^@^NODE_ENV=production@MEDUSA_WORKER_MODE=shared@MEDUSA_BACKEND_URL=${BACKEND_URL}@STORE_CORS=${STORE_CORS}@ADMIN_CORS=${ADMIN_CORS}@AUTH_CORS=${AUTH_CORS}@NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}@MEDUSA_SALES_CHANNEL_ID=${MEDUSA_SALES_CHANNEL_ID:-sc_01KSK1J0V81P4EPY9G0JAPX353}@ENVIA_SANDBOX=${ENVIA_SANDBOX:-false}" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,REDIS_URL=REDIS_URL:latest,JWT_SECRET=JWT_SECRET:latest,COOKIE_SECRET=COOKIE_SECRET:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,MP_ACCESS_TOKEN=MP_ACCESS_TOKEN:latest,CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,MEDUSA_INTERNAL_SECRET=MEDUSA_INTERNAL_SECRET:latest,ENVIA_API_KEY=ENVIA_API_KEY:latest,MP_CLIENT_ID=MP_CLIENT_ID:latest,MP_CLIENT_SECRET=MP_CLIENT_SECRET:latest,FLAGSMITH_ENVIRONMENT_KEY=FLAGSMITH_ENVIRONMENT_KEY:latest,SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"

echo "▶ Service URL:"
gcloud run services describe "$SERVICE_WEB" --region="$REGION" --format='value(status.url)'

cat <<'EOF'

Next: map api.miyagisanchez.com to this service (or route via Cloudflare tunnel),
then repoint Vercel MEDUSA_STORE_URL + CORS + Stripe/MP webhook URLs.
EOF
