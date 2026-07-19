#!/usr/bin/env bash
# Provision the Cloud SQL backup-FAILURE alert (DevOps reliability cleanup, Sprint 2 / Story 2b):
# a small Cloud Run JOB (cloudsql-backup-check) on a daily Cloud Scheduler cron that lists the
# `medusa-pg` backups and pings the ops Telegram chat ONLY when the latest automated backup is
# missing or not SUCCESSFUL within ~26h. Failure-only; no success heartbeat.
#
# Idempotent — safe to re-run. Mirrors provision-db-backup.sh (same SA/secret/scheduler shape).
# The Telegram secrets already exist (reused for failure alerts); this only grants the new SA
# read access to them + Cloud SQL.
#
# Owed to Daniel — these gcloud writes touch live GCP infra (he holds the creds):
#   gcloud config configurations activate bonsai-profile     # leroytramafat@gmail.com
#   bash infra/gcp/backups/provision-cloudsql-backup-check.sh
# Then smoke it (see BACKUPS.md → "Cloud SQL backup-failure check"):
#   gcloud run jobs execute cloudsql-backup-check --region=us-east4 --wait                 # real → silent
#   gcloud run jobs execute cloudsql-backup-check --region=us-east4 \
#     --args=... not needed; force a failure by pointing INSTANCE at a bogus name:
#   gcloud run jobs update  cloudsql-backup-check --region=us-east4 --update-env-vars=INSTANCE=does-not-exist
#   gcloud run jobs execute cloudsql-backup-check --region=us-east4 --wait                 # → Telegram alert
#   gcloud run jobs update  cloudsql-backup-check --region=us-east4 --update-env-vars=INSTANCE=medusa-pg

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
AR_REPO="${AR_REPO:-medusa-ops}"                 # reuse the db-backup ops-image repo
JOB="${JOB:-cloudsql-backup-check}"
SCHED_JOB="${SCHED_JOB:-cloudsql-backup-check-daily}"
CRON="${CRON:-0 12 * * *}"                       # 12:00 UTC — a few h after the 09:00 backup window
CHECK_SA="${CHECK_SA:-medusa-backup-check}"
CHECK_SA_EMAIL="${CHECK_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
INSTANCE="${INSTANCE:-medusa-pg}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/cloudsql-backup-check:${TAG}"

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

gcloud config set project "$PROJECT_ID" >/dev/null

say "Enabling APIs (cloudscheduler, run, artifactregistry, sqladmin)"
gcloud services enable cloudscheduler.googleapis.com run.googleapis.com \
  artifactregistry.googleapis.com sqladmin.googleapis.com >/dev/null

say "Artifact Registry repo $AR_REPO"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION" \
    --description="Ops images (db-backup, cloudsql-backup-check etc.)"

say "Least-privilege job SA $CHECK_SA_EMAIL"
gcloud iam service-accounts describe "$CHECK_SA_EMAIL" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$CHECK_SA" --display-name="cloudsql-backup-check job (read-only backup health)"
  # Bounded wait: a just-created SA is eventually consistent — an immediate IAM grant can 400
  # ("does not exist"; hit live 3x in gcp-account-migration S0-S2 fresh-project runs).
  for _ in $(seq 1 12); do
    gcloud iam service-accounts describe "${CHECK_SA_EMAIL}" >/dev/null 2>&1 && break
    sleep 5
  done

say "Granting the SA read access to Cloud SQL backups (roles/cloudsql.viewer)"
# cloudsql.viewer is read-only — it can LIST backups/instances but cannot mutate the DB.
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CHECK_SA_EMAIL}" \
  --role="roles/cloudsql.viewer" --condition=None >/dev/null

say "Reusing the Telegram secrets — granting the SA accessor"
for s in TELEGRAM_BOT_TOKEN TELEGRAM_CICD_CHAT_ID; do
  gcloud secrets describe "$s" >/dev/null 2>&1 || gcloud secrets create "$s" --replication-policy=automatic
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${CHECK_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

say "Building $IMAGE (context infra/gcp/backups/cloudsql-check)"
gcloud builds submit infra/gcp/backups/cloudsql-check --tag "$IMAGE"

say "Creating/updating Cloud Run Job $JOB"
# env values carry no commas → a plain comma-separated --set-env-vars is fine (unlike db-backup's BACKUP_TARGETS).
JOB_ACTION=create; gcloud run jobs describe "$JOB" --region="$REGION" >/dev/null 2>&1 && JOB_ACTION=update
gcloud run jobs "$JOB_ACTION" "$JOB" \
  --image="$IMAGE" --region="$REGION" \
  --service-account="$CHECK_SA_EMAIL" \
  --set-env-vars="INSTANCE=${INSTANCE},PROJECT=${PROJECT_ID},MAX_AGE_HOURS=${MAX_AGE_HOURS}" \
  --set-secrets="TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,TELEGRAM_CICD_CHAT_ID=TELEGRAM_CICD_CHAT_ID:latest" \
  --max-retries=1 --task-timeout=120s --memory=512Mi   # gen2 floor is 512Mi (always-allocated CPU)

say "Daily Cloud Scheduler $SCHED_JOB ($CRON UTC) → runs the job"
# Same trust shape as provision-db-backup.sh: Scheduler invokes the :run endpoint with an OAuth
# token from the job's own least-priv SA (granted run.invoker), and that SA must be mintable by
# Scheduler's service agent.
gcloud run jobs add-iam-policy-binding "$JOB" --region="$REGION" \
  --member="serviceAccount:${CHECK_SA_EMAIL}" --role="roles/run.invoker" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding "$CHECK_SA_EMAIL" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-cloudscheduler.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator" >/dev/null
RUN_URI="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB}:run"
SCHED_ACTION=create; gcloud scheduler jobs describe "$SCHED_JOB" --location="$REGION" >/dev/null 2>&1 && SCHED_ACTION=update
gcloud scheduler jobs "$SCHED_ACTION" http "$SCHED_JOB" --location="$REGION" \
  --schedule="$CRON" --uri="$RUN_URI" --http-method=POST \
  --oauth-service-account-email="$CHECK_SA_EMAIL"

cat <<EOF

✅ cloudsql-backup-check provisioned (image ${IMAGE}).
   Instance: ${INSTANCE}  ·  window: ${MAX_AGE_HOURS}h  ·  cron: ${CRON} UTC  ·  SA: ${CHECK_SA_EMAIL}
   Smoke:
     gcloud run jobs execute ${JOB} --region=${REGION} --wait        # real instance → silent (Succeeded)
     # force a failure (bogus instance) → expect a Telegram alert, then restore:
     gcloud run jobs update  ${JOB} --region=${REGION} --update-env-vars=INSTANCE=does-not-exist
     gcloud run jobs execute ${JOB} --region=${REGION} --wait
     gcloud run jobs update  ${JOB} --region=${REGION} --update-env-vars=INSTANCE=${INSTANCE}
EOF
