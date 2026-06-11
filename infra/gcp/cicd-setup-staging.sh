#!/usr/bin/env bash
# Create the STAGING Cloud Build trigger — Backend Production Readiness, Sprint 1.
# A push to the 'staging' branch builds the backend image and deploys it to
# medusa-web-staging (NOT prod). Reuses the backend repo's existing cloudbuild.yaml
# via the _SERVICE substitution, the existing medusa-cicd SA, and the same GitHub
# repo connection as the prod backend-main-deploy trigger.
#
#   bash infra/gcp/cicd-setup-staging.sh
#
# Run AFTER the first deploy-staging.sh (so the service + secrets already exist).
# No new IAM is needed: medusa-cicd already holds run.admin + serviceAccountUser
# on medusa-run, which covers deploying medusa-web-staging too.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
CICD_SA="${CICD_SA:-medusa-cicd}"
CICD_SA_EMAIL="${CICD_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
TRIGGER_NAME="${TRIGGER_NAME:-backend-staging-deploy}"
PROD_TRIGGER="${PROD_TRIGGER:-backend-main-deploy}"
SERVICE_STAGING="${SERVICE_STAGING:-medusa-web-staging}"

gcloud config set project "$PROJECT_ID" >/dev/null

# Reuse the prod trigger's connected GitHub repo resource unless GH_REPO is set.
GH_REPO="${GH_REPO:-$(gcloud builds triggers describe "$PROD_TRIGGER" --region="$REGION" \
  --format='value(repositoryEventConfig.repository)' 2>/dev/null || true)}"
if [ -z "$GH_REPO" ]; then
  cat >&2 <<EOF
✗ Could not derive the GitHub repo resource from trigger '$PROD_TRIGGER'.
  Find it with:
    gcloud builds triggers describe $PROD_TRIGGER --region=$REGION \\
      --format='value(repositoryEventConfig.repository)'
  Then re-run:  GH_REPO=<repo-resource> bash infra/gcp/cicd-setup-staging.sh
EOF
  exit 1
fi
echo "▶ Repo resource: $GH_REPO"

echo "▶ Creating staging trigger: $TRIGGER_NAME  (^staging\$ → _SERVICE=$SERVICE_STAGING)"
gcloud builds triggers create github \
  --name="$TRIGGER_NAME" \
  --region="$REGION" \
  --repository="$GH_REPO" \
  --branch-pattern='^staging$' \
  --build-config='cloudbuild.yaml' \
  --substitutions=_SERVICE="$SERVICE_STAGING" \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${CICD_SA_EMAIL}"

cat <<EOF

✅ Staging trigger wired.
   Push to 'staging'  → build → deploy $SERVICE_STAGING   (prod medusa-web untouched).
   Push to 'main'     → unchanged: backend-main-deploy still deploys prod only.
EOF
