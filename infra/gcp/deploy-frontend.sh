#!/usr/bin/env bash
# Build the Next.js frontend image with Cloud Build and deploy the Cloud Run
# service. Run AFTER provision-frontend.sh and AFTER the NEW secret shells
# have real values. (09-platform-infra frontend-vercel-to-cloudrun, S1.3.)
#
#   PROJECT_ID=miyagisanchezback-497722 bash infra/gcp/deploy-frontend.sh
#
# No VPC connector (see provision-frontend.sh) — the frontend never talks to
# Cloud SQL/Redis directly. --allow-unauthenticated: same posture as
# medusa-web, this is the public-facing app. Dark for all of Sprint 1 — no DNS
# points at this service yet; reachable only via its own *.run.app URL.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
AR_REPO="${AR_REPO:-frontend}"
RUN_SA="${RUN_SA:-miyagi-web-run}"
RUN_SA_EMAIL="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_WEB="${SERVICE_WEB:-miyagi-web}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${IMAGE:-${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/frontend:${TAG}}"

# --- Public, non-secret config (plain --set-env-vars) ------------------------
# Same values Vercel prod already uses — this is a second rail for the SAME
# app, not a new environment, so these mirror what is already live.
MEDUSA_STORE_URL="${MEDUSA_STORE_URL:-https://api.miyagisanchez.com}"
NEXT_PUBLIC_MEDUSA_STORE_URL="${NEXT_PUBLIC_MEDUSA_STORE_URL:-$MEDUSA_STORE_URL}"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://miyagisanchez.com}"
MEDUSA_PUBLISHABLE_KEY="${MEDUSA_PUBLISHABLE_KEY:?set to the live Medusa publishable API key}"
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-$MEDUSA_PUBLISHABLE_KEY}"
MEDUSA_MXN_REGION_ID="${MEDUSA_MXN_REGION_ID:?set to the live MXN region id}"
NEXT_PUBLIC_MEDUSA_MXN_REGION_ID="${NEXT_PUBLIC_MEDUSA_MXN_REGION_ID:-$MEDUSA_MXN_REGION_ID}"
MEDUSA_SALES_CHANNEL_ID="${MEDUSA_SALES_CHANNEL_ID:-sc_01KSK1J0V81P4EPY9G0JAPX353}"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:?set to the live Clerk publishable key}"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="${NEXT_PUBLIC_CLERK_SIGN_IN_URL:-/sign-in}"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="${NEXT_PUBLIC_CLERK_SIGN_UP_URL:-/sign-up}"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="${NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:-/}"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="${NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:-/}"
NEXT_PUBLIC_MP_PUBLIC_KEY="${NEXT_PUBLIC_MP_PUBLIC_KEY:?set to the live MercadoPago public key}"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:?set to the live Stripe publishable key}"
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?set to the Supabase project URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?set to the Supabase anon key}"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="${NEXT_PUBLIC_VAPID_PUBLIC_KEY:?set to the fresh VAPID keypair public half (see provision-frontend.sh note)}"
VAPID_SUBJECT="${VAPID_SUBJECT:-mailto:despachobonsai@gmail.com}"
ML_APP_ID="${ML_APP_ID:-5089915168138245}"
ML_REDIRECT_URI="${ML_REDIRECT_URI:-https://miyagisanchez.com/api/sell/ml/callback}"
MIYAGI_ADMIN_EMAILS="${MIYAGI_ADMIN_EMAILS:-despachobonsai@gmail.com,champion327@gmail.com}"
DESPACHOBONSAI_URL="${DESPACHOBONSAI_URL:-https://miyagisanchez.com}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_NZkDpgA685HgJy1myvdXLTznImTQ}"
# golden-beans Growth Engine (growth-engine-v1 S1.3) — non-secret target URL.
GROWTH_ENGINE_URL="${GROWTH_ENGINE_URL:-https://golden-beans-gamma.vercel.app}"
# Var names here MUST match what lib/r2.ts actually reads (two separate
# Cloudflare accounts — images vs. private digital-files bucket):
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
R2_BUCKET_IMAGES="${R2_BUCKET_IMAGES:-}"
R2_PUBLIC_URL="${R2_PUBLIC_URL:-}"
R2_DIGITAL_ACCOUNT_ID="${R2_DIGITAL_ACCOUNT_ID:-}"
R2_BUCKET_DIGITAL="${R2_BUCKET_DIGITAL:-}"
UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL:-}"

gcloud config set project "$PROJECT_ID"

if [ -n "${SKIP_BUILD:-}" ]; then
  echo "▶ Skipping build; deploying existing image: $IMAGE"
else
  echo "▶ Building $IMAGE via Cloud Build (context apps/miyagisanchez)…"
  gcloud builds submit apps/miyagisanchez --tag "$IMAGE"
fi

echo "▶ Deploying $SERVICE_WEB…"
gcloud run deploy "$SERVICE_WEB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="$RUN_SA_EMAIL" \
  --min-instances=0 \
  --max-instances=4 \
  --cpu=1 \
  --memory=1Gi \
  --port=8080 \
  --startup-probe="httpGet.path=/api/health,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=5,periodSeconds=10,failureThreshold=24" \
  --liveness-probe="httpGet.path=/api/health,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=5,periodSeconds=30,failureThreshold=3" \
  --allow-unauthenticated \
  --set-env-vars="^~^NODE_ENV=production~MEDUSA_STORE_URL=${MEDUSA_STORE_URL}~NEXT_PUBLIC_MEDUSA_STORE_URL=${NEXT_PUBLIC_MEDUSA_STORE_URL}~NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}~MEDUSA_PUBLISHABLE_KEY=${MEDUSA_PUBLISHABLE_KEY}~NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}~MEDUSA_MXN_REGION_ID=${MEDUSA_MXN_REGION_ID}~NEXT_PUBLIC_MEDUSA_MXN_REGION_ID=${NEXT_PUBLIC_MEDUSA_MXN_REGION_ID}~MEDUSA_SALES_CHANNEL_ID=${MEDUSA_SALES_CHANNEL_ID}~NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}~NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL}~NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL}~NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}~NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL}~NEXT_PUBLIC_MP_PUBLIC_KEY=${NEXT_PUBLIC_MP_PUBLIC_KEY}~NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}~NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}~NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}~NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}~VAPID_SUBJECT=${VAPID_SUBJECT}~ML_APP_ID=${ML_APP_ID}~ML_REDIRECT_URI=${ML_REDIRECT_URI}~MIYAGI_ADMIN_EMAILS=${MIYAGI_ADMIN_EMAILS}~DESPACHOBONSAI_URL=${DESPACHOBONSAI_URL}~VERCEL_PROJECT_ID=${VERCEL_PROJECT_ID}~R2_ACCOUNT_ID=${R2_ACCOUNT_ID}~R2_BUCKET_IMAGES=${R2_BUCKET_IMAGES}~R2_PUBLIC_URL=${R2_PUBLIC_URL}~R2_DIGITAL_ACCOUNT_ID=${R2_DIGITAL_ACCOUNT_ID}~R2_BUCKET_DIGITAL=${R2_BUCKET_DIGITAL}~UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}~GROWTH_ENGINE_URL=${GROWTH_ENGINE_URL}" \
  --set-secrets="CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,MP_ACCESS_TOKEN=MP_ACCESS_TOKEN:latest,MEDUSA_INTERNAL_SECRET=MEDUSA_INTERNAL_SECRET:latest,TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,ML_APP_SECRET=ML_APP_SECRET:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,RESEND_API_KEY=RESEND_API_KEY:latest,VAPID_PRIVATE_KEY=VAPID_PRIVATE_KEY:latest,TELEGRAM_CHAT_ID=TELEGRAM_CHAT_ID_APP:latest,VERCEL_API_TOKEN=VERCEL_API_TOKEN:latest,SERPAPI_KEY=SERPAPI_KEY:latest,R2_ACCESS_KEY_ID=R2_ACCESS_KEY_ID:latest,R2_SECRET_ACCESS_KEY=R2_SECRET_ACCESS_KEY:latest,R2_DIGITAL_ACCESS_KEY_ID=R2_DIGITAL_ACCESS_KEY_ID:latest,R2_DIGITAL_SECRET_ACCESS_KEY=R2_DIGITAL_SECRET_ACCESS_KEY:latest,UPSTASH_REDIS_REST_TOKEN=UPSTASH_REDIS_REST_TOKEN:latest,ADMIN_SECRET=ADMIN_SECRET:latest,CLAIM_JWT_SECRET=CLAIM_JWT_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest,ENCRYPTION_SECRET=ENCRYPTION_SECRET:latest,CRON_SECRET=CRON_SECRET:latest,GROWTH_ENGINE_API_KEY=GROWTH_ENGINE_API_KEY:latest"

echo "▶ Service URL (dark — no DNS points here yet):"
gcloud run services describe "$SERVICE_WEB" --region="$REGION" --format='value(status.url)'
