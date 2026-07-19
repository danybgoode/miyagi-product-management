#!/usr/bin/env bash
# Provision the DB → R2 escrow backup pipeline (Backend Production Readiness,
# Sprint 2): a Cloud Run JOB (db-backup) on a daily Cloud Scheduler cron that
# dumps the Supabase + Neon databases to Cloudflare R2.
#
# Idempotent — safe to re-run. Mirrors the style of provision.sh / provision-staging.sh.
# Secret VALUES are read from env and piped via stdin (never echoed). The secret
# *shells* are always created so they can be populated later if a value is absent.
#
# Prereqs you (Daniel) own first — see infra/gcp/backups/BACKUPS.md:
#   • An R2 bucket (lock+lifecycle) + a bucket-scoped Object R&W API token → R2_* values below
#   • A read-only Postgres role on each DB                  → *_BACKUP_DSN values below
#
# Run:
#   gcloud config configurations activate bonsai-profile     # leroytramafat@gmail.com
#   export R2_BACKUP_BUCKET='miyagi-db-escrow'
#   export R2_ACCESS_KEY_ID='…' R2_SECRET_ACCESS_KEY='…'
#   export R2_ENDPOINT='https://<accountid>.r2.cloudflarestorage.com'
#   export SUPABASE_DSN='postgresql://backup_ro:…@db.<ref>.supabase.co:5432/postgres'
#   export NEON_DSN='postgresql://backup_ro:…@<neon-host>/neondb?sslmode=require'
#   bash infra/gcp/backups/provision-db-backup.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
AR_REPO="${AR_REPO:-medusa-ops}"                 # dedicated ops-image repo (separate CVE surface from the app)
JOB="${JOB:-db-backup}"
SCHED_JOB="${SCHED_JOB:-db-backup-daily}"
CRON="${CRON:-0 9 * * *}"                        # 09:00 UTC ≈ 03:00 CDMX, daily
BACKUP_SA="${BACKUP_SA:-medusa-backup}"
BACKUP_SA_EMAIL="${BACKUP_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/db-backup:${TAG}"
BACKUP_TARGETS="${BACKUP_TARGETS:-supabase,neon}"
R2_BUCKET="${R2_BACKUP_BUCKET:-miyagi-db-escrow}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Secret shells (values populated from env below, or left empty for later).
SECRETS=(SUPABASE_BACKUP_DSN NEON_BACKUP_DSN R2_BACKUP_ACCESS_KEY_ID R2_BACKUP_SECRET_ACCESS_KEY R2_BACKUP_ENDPOINT)
# Reused (already exist): TELEGRAM_BOT_TOKEN, TELEGRAM_CICD_CHAT_ID — accessor granted below.

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
add_version() { printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null; }

gcloud config set project "$PROJECT_ID" >/dev/null

say "Enabling APIs (cloudscheduler; run/artifactregistry already on)"
gcloud services enable cloudscheduler.googleapis.com run.googleapis.com artifactregistry.googleapis.com >/dev/null

say "Artifact Registry repo $AR_REPO"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION" \
    --description="Ops images (db-backup etc.)"

say "Least-privilege job SA $BACKUP_SA_EMAIL"
gcloud iam service-accounts describe "$BACKUP_SA_EMAIL" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$BACKUP_SA" --display-name="db-backup job (R2 escrow)"
  # Bounded wait: a just-created SA is eventually consistent — an immediate IAM grant can 400
  # ("does not exist"; hit live 3x in gcp-account-migration S0-S2 fresh-project runs).
  for _ in $(seq 1 12); do
    gcloud iam service-accounts describe "${BACKUP_SA_EMAIL}" >/dev/null 2>&1 && break
    sleep 5
  done

say "Secret shells + accessor for $BACKUP_SA"
for s in "${SECRETS[@]}" TELEGRAM_BOT_TOKEN TELEGRAM_CICD_CHAT_ID; do
  gcloud secrets describe "$s" >/dev/null 2>&1 || gcloud secrets create "$s" --replication-policy=automatic
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${BACKUP_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

say "Populating sourced credentials (missing ones stay empty — populate before first run)"
MISSING=0
maybe() { local v="${!2:-}"; if [ -n "$v" ]; then add_version "$1" "$v"; echo "  ✓ $1 set"; else
  echo "  • $1 NOT set ($2 unset) — set later: printf '%s' '<value>' | gcloud secrets versions add $1 --data-file=-"; MISSING=$((MISSING+1)); fi; }
maybe SUPABASE_BACKUP_DSN        SUPABASE_DSN
maybe NEON_BACKUP_DSN            NEON_DSN
maybe R2_BACKUP_ACCESS_KEY_ID    R2_ACCESS_KEY_ID
maybe R2_BACKUP_SECRET_ACCESS_KEY R2_SECRET_ACCESS_KEY
maybe R2_BACKUP_ENDPOINT         R2_ENDPOINT

say "Building $IMAGE (context infra/gcp/backups)"
gcloud builds submit infra/gcp/backups --tag "$IMAGE"

say "Creating/updating Cloud Run Job $JOB"
SECRET_FLAGS="SUPABASE_BACKUP_DSN=SUPABASE_BACKUP_DSN:latest,NEON_BACKUP_DSN=NEON_BACKUP_DSN:latest,R2_BACKUP_ACCESS_KEY_ID=R2_BACKUP_ACCESS_KEY_ID:latest,R2_BACKUP_SECRET_ACCESS_KEY=R2_BACKUP_SECRET_ACCESS_KEY:latest,R2_BACKUP_ENDPOINT=R2_BACKUP_ENDPOINT:latest,TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,TELEGRAM_CICD_CHAT_ID=TELEGRAM_CICD_CHAT_ID:latest"
# BACKUP_TARGETS itself contains a comma ("supabase,neon"), so use gcloud's
# custom-delimiter syntax (^|^ -> "|" separates the k=v pairs) or the comma is
# parsed as a dict separator and job create fails with "Bad syntax for dict arg".
ENV_FLAGS="^|^BACKUP_TARGETS=${BACKUP_TARGETS}|R2_BACKUP_BUCKET=${R2_BUCKET}|RETENTION_DAYS=${RETENTION_DAYS}"
JOB_ACTION=create; gcloud run jobs describe "$JOB" --region="$REGION" >/dev/null 2>&1 && JOB_ACTION=update
gcloud run jobs "$JOB_ACTION" "$JOB" \
  --image="$IMAGE" --region="$REGION" \
  --service-account="$BACKUP_SA_EMAIL" \
  --set-env-vars="$ENV_FLAGS" \
  --set-secrets="$SECRET_FLAGS" \
  --max-retries=1 --task-timeout=900s --memory=512Mi

say "Daily Cloud Scheduler $SCHED_JOB ($CRON UTC) → runs the job"
# Scheduler invokes the Run Admin :run endpoint with an OAuth token from the same
# least-priv SA (granted run.invoker on the job). Scheduler's own service agent must
# also be able to MINT tokens for that SA — usually auto-granted when the API is
# enabled, but ensure it explicitly so a scheduled run can't fail where a manual
# `gcloud run jobs execute` succeeds.
gcloud run jobs add-iam-policy-binding "$JOB" --region="$REGION" \
  --member="serviceAccount:${BACKUP_SA_EMAIL}" --role="roles/run.invoker" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding "$BACKUP_SA_EMAIL" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-cloudscheduler.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator" >/dev/null
RUN_URI="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB}:run"
SCHED_ACTION=create; gcloud scheduler jobs describe "$SCHED_JOB" --location="$REGION" >/dev/null 2>&1 && SCHED_ACTION=update
gcloud scheduler jobs "$SCHED_ACTION" http "$SCHED_JOB" --location="$REGION" \
  --schedule="$CRON" --uri="$RUN_URI" --http-method=POST \
  --oauth-service-account-email="$BACKUP_SA_EMAIL"

cat <<EOF

✅ db-backup pipeline provisioned (image ${IMAGE}).
   Targets: ${BACKUP_TARGETS} → r2:${R2_BUCKET}  ·  cron: ${CRON} UTC  ·  SA: ${BACKUP_SA_EMAIL}
EOF
if [ "$MISSING" -gt 0 ]; then
  echo "⚠️  ${MISSING} secret value(s) still empty — populate them, then test on-demand:"
fi
cat <<EOF
   On-demand run + watch:
     gcloud run jobs execute ${JOB} --region=${REGION} --wait
     gcloud run jobs executions list --job=${JOB} --region=${REGION} --limit=1
EOF
