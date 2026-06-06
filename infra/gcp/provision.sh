#!/usr/bin/env bash
# Provision GCP infrastructure for the Medusa backend (Cloud Run, us-east4).
# Idempotent-ish: each step checks for existence before creating. Review before running.
#
#   PROJECT_ID=miyagisanchez-prod BILLING_ACCOUNT=01C846-E72139-7338AB bash infra/gcp/provision.sh
#
# Prereqs: authenticated as an identity with Project Creator + Billing User on
# the chosen billing account (see infra/gcp/README.md — billing must be OPEN).

set -euo pipefail

# ── Variables ────────────────────────────────────────────────────────────────
PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
# OPEN billing account under leroytramafat@gmail.com. Project + link already done;
# the create/link steps below are idempotent and will be skipped.
BILLING_ACCOUNT="${BILLING_ACCOUNT:-01BCB8-AA3451-6EC373}"
REGION="${REGION:-us-east4}"            # N. Virginia — adjacent to Neon AWS us-east-1
AR_REPO="${AR_REPO:-medusa}"
NETWORK="${NETWORK:-default}"
REDIS_NAME="${REDIS_NAME:-medusa-redis}"
REDIS_TIER="${REDIS_TIER:-basic}"       # 'basic' = single node; 'standard_ha' for HA later
REDIS_SIZE_GB="${REDIS_SIZE_GB:-1}"
REDIS_VERSION="${REDIS_VERSION:-redis_7_0}"
CONNECTOR="${CONNECTOR:-medusa-conn}"
CONNECTOR_RANGE="${CONNECTOR_RANGE:-10.8.0.0/28}"   # must not overlap existing subnets
RUN_SA="${RUN_SA:-medusa-run}"
RUN_SA_EMAIL="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

# Secret shells to create (values populated in step 2, NOT here).
SECRETS=(
  DATABASE_URL          # Neon POOLED connection string (host contains -pooler)
  REDIS_URL             # set automatically below from Memorystore host
  JWT_SECRET            # ROTATE — do not reuse 'supersecret'
  COOKIE_SECRET         # ROTATE
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  MP_ACCESS_TOKEN
  CLERK_SECRET_KEY
  MEDUSA_INTERNAL_SECRET
)

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

# ── 1. Project ────────────────────────────────────────────────────────────────
say "Project: $PROJECT_ID"
if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud projects create "$PROJECT_ID" --name="miyagisanchezback"
fi
gcloud config set project "$PROJECT_ID"

say "Linking billing account $BILLING_ACCOUNT"
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"

# ── 2. Enable APIs ────────────────────────────────────────────────────────────
say "Enabling APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  redis.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com

# ── 3. Artifact Registry (Docker) ─────────────────────────────────────────────
say "Artifact Registry repo: $AR_REPO ($REGION)"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker --location="$REGION" \
    --description="Medusa backend images"
fi

# ── 4. Serverless VPC Access connector (Cloud Run → Memorystore) ──────────────
say "VPC connector: $CONNECTOR ($REGION, $CONNECTOR_RANGE)"
if ! gcloud compute networks vpc-access connectors describe "$CONNECTOR" --region="$REGION" >/dev/null 2>&1; then
  gcloud compute networks vpc-access connectors create "$CONNECTOR" \
    --region="$REGION" --network="$NETWORK" --range="$CONNECTOR_RANGE"
fi

# ── 5. Memorystore (Redis) ────────────────────────────────────────────────────
say "Memorystore: $REDIS_NAME ($REGION, ${REDIS_SIZE_GB}GB, $REDIS_TIER)"
if ! gcloud redis instances describe "$REDIS_NAME" --region="$REGION" >/dev/null 2>&1; then
  gcloud redis instances create "$REDIS_NAME" \
    --region="$REGION" --size="$REDIS_SIZE_GB" --tier="$REDIS_TIER" \
    --redis-version="$REDIS_VERSION" --network="$NETWORK" --connect-mode=DIRECT_PEERING \
    --redis-config maxmemory-policy=noeviction   # Medusa uses Redis as a job queue — don't evict jobs
fi
REDIS_HOST="$(gcloud redis instances describe "$REDIS_NAME" --region="$REGION" --format='value(host)')"
REDIS_PORT="$(gcloud redis instances describe "$REDIS_NAME" --region="$REGION" --format='value(port)')"
REDIS_URL_VALUE="redis://${REDIS_HOST}:${REDIS_PORT}"
say "Memorystore endpoint: $REDIS_URL_VALUE"

# ── 6. Runtime service account ────────────────────────────────────────────────
say "Service account: $RUN_SA_EMAIL"
if ! gcloud iam service-accounts describe "$RUN_SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUN_SA" --display-name="Medusa Cloud Run"
fi

# ── 7. Secret shells + grant accessor ─────────────────────────────────────────
say "Creating secret shells (values added in step 2)"
for s in "${SECRETS[@]}"; do
  if ! gcloud secrets describe "$s" >/dev/null 2>&1; then
    gcloud secrets create "$s" --replication-policy=automatic
  fi
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUN_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

# REDIS_URL value is known now — add it automatically.
printf '%s' "$REDIS_URL_VALUE" | gcloud secrets versions add REDIS_URL --data-file=-

cat <<EOF

✅ Provisioned. Next:
  1) Populate secret values (rotate JWT/COOKIE, use Neon POOLED DATABASE_URL):
       printf '%s' "<value>" | gcloud secrets versions add DATABASE_URL --data-file=-
       printf '%s' "\$(openssl rand -hex 32)" | gcloud secrets versions add JWT_SECRET --data-file=-
       printf '%s' "\$(openssl rand -hex 32)" | gcloud secrets versions add COOKIE_SECRET --data-file=-
       # …STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MP_ACCESS_TOKEN, CLERK_SECRET_KEY, MEDUSA_INTERNAL_SECRET
  2) Deploy:  PROJECT_ID=$PROJECT_ID bash infra/gcp/deploy.sh
EOF
