#!/usr/bin/env bash
# One-time CI/CD wiring: grant the Cloud Build SA deploy rights and create a
# push-to-main trigger on the backend repo. Run AFTER provision.sh + first deploy.
#
#   bash infra/gcp/cicd-setup.sh
#
# ⚠️ Prerequisite that must be done in the console ONCE (OAuth handshake):
#   Cloud Build ▸ Repositories ▸ 2nd gen ▸ "Connect host" → GitHub → install the
#   Cloud Build GitHub App on danybgoode/medusa-bonsai-backend.
#   Then set GH_CONNECTION + GH_REPO below to the created connection/repo links.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchez-prod}"
REGION="${REGION:-us-east4}"
RUN_SA="${RUN_SA:-medusa-run}"
RUN_SA_EMAIL="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
TRIGGER_NAME="${TRIGGER_NAME:-backend-main-deploy}"

# Set these from the console connection (2nd-gen GitHub):
GH_CONNECTION="${GH_CONNECTION:-}"      # e.g. projects/PROJECT/locations/us-east4/connections/github
GH_REPO="${GH_REPO:-}"                  # e.g. the repository resource under that connection

gcloud config set project "$PROJECT_ID"

# Dedicated CI/CD service account. Newer GCP projects no longer auto-create the
# legacy Cloud Build SA, so triggers must specify a user-managed --service-account.
CICD_SA="${CICD_SA:-medusa-cicd}"
CICD_SA_EMAIL="${CICD_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "▶ Service account: $CICD_SA_EMAIL"
if ! gcloud iam service-accounts describe "$CICD_SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$CICD_SA" --display-name="Medusa CI/CD (Cloud Build)"
fi

echo "▶ Granting deploy rights"
# Deploy to Cloud Run + push to Artifact Registry + write build logs.
for role in roles/run.admin roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CICD_SA_EMAIL}" --role="$role" --condition=None >/dev/null
done
# Act as the Cloud Run runtime SA when deploying.
gcloud iam service-accounts add-iam-policy-binding "$RUN_SA_EMAIL" \
  --member="serviceAccount:${CICD_SA_EMAIL}" --role="roles/iam.serviceAccountUser" --condition=None >/dev/null

if [ -z "$GH_CONNECTION" ] || [ -z "$GH_REPO" ]; then
  cat <<EOF

⚠ GH_CONNECTION / GH_REPO not set — skipping trigger creation.
  1) Console: connect danybgoode/medusa-bonsai-backend (Cloud Build ▸ Repositories ▸ 2nd gen).
  2) Re-run with:
       GH_CONNECTION=projects/${PROJECT_ID}/locations/${REGION}/connections/<name> \\
       GH_REPO=<repo-resource> bash infra/gcp/cicd-setup.sh
EOF
  exit 0
fi

echo "▶ Creating push-to-main trigger: $TRIGGER_NAME"
gcloud builds triggers create github \
  --name="$TRIGGER_NAME" \
  --region="$REGION" \
  --repository="$GH_REPO" \
  --branch-pattern='^main$' \
  --build-config='cloudbuild.yaml' \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${CICD_SA_EMAIL}"

echo "✅ CI/CD wired. Push to main → build → deploy ${RUN_SA%-run}."
