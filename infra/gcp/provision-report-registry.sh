#!/usr/bin/env bash
# provision-report-registry.sh — reporthub-as-notion, Sprint 1 (Story 1.1).
#
# The GCS report registry behind the hub's /r/<slug> short links: a bucket mapping
# slug → immutable markdown payload. Decisions (Daniel, 2026-07-14, epic README):
# storage = Cloud Storage bucket; retention = forever for packets, 90d TTL for
# objects under the daily/ prefix. Writes: the report-writer service account only.
# Reads: public (reports are shared links by design; nothing sensitive lands here —
# the same content already travels in public URL-hash links today).
#
# Idempotent: every resource is create-if-absent; a re-run is safe and only fills
# gaps (same discipline as provision-monitoring.sh). Rehearse on staging first:
#   TARGET=staging bash infra/gcp/provision-report-registry.sh   # default
#   TARGET=prod    bash infra/gcp/provision-report-registry.sh
#
# Config-guard: infra/gcp/test/report-registry-invariants.test.js asserts the
# constants below — bucket naming, lifecycle shape, IAM roles — so drift between
# this script and what the epic's docs/scripts assume is a red `node --test`.
#
# Needs: gcloud (storage + iam) authed on the project; python3 for JSON assembly.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchez-prod}"
REGION="us-east4"
TARGET="${TARGET:-staging}"

case "$TARGET" in
  prod)    BUCKET="miyagi-pmo-reports" ;;
  staging) BUCKET="miyagi-pmo-reports-staging" ;;
  *) echo "TARGET must be prod|staging (got: $TARGET)" >&2; exit 1 ;;
esac

WRITER_SA_NAME="pmo-report-writer"
WRITER_SA="${WRITER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DAILY_PREFIX="daily/"
DAILY_TTL_DAYS=90

echo "== report registry · project=$PROJECT_ID target=$TARGET bucket=gs://$BUCKET"

# -- bucket: create-if-absent ------------------------------------------------
if gcloud storage buckets describe "gs://$BUCKET" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "bucket exists: gs://$BUCKET"
else
  gcloud storage buckets create "gs://$BUCKET" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access \
    --no-public-access-prevention
  echo "bucket created: gs://$BUCKET"
fi

# -- lifecycle: daily/ objects expire at 90d; everything else kept forever ----
LIFECYCLE_JSON="$(python3 - <<PY
import json
print(json.dumps({"rule": [{
  "action": {"type": "Delete"},
  "condition": {"age": ${DAILY_TTL_DAYS}, "matchesPrefix": ["${DAILY_PREFIX}"]},
}]}))
PY
)"
TMP_LC="$(mktemp)"
printf '%s' "$LIFECYCLE_JSON" > "$TMP_LC"
gcloud storage buckets update "gs://$BUCKET" --project="$PROJECT_ID" --lifecycle-file="$TMP_LC"
rm -f "$TMP_LC"
echo "lifecycle applied: ${DAILY_PREFIX}* → delete at ${DAILY_TTL_DAYS}d; all else kept"

# -- public reads (bucket-level, uniform access) -------------------------------
# roles/storage.legacyObjectReader, NOT roles/storage.objectViewer: objectViewer's permission set
# includes storage.objects.list, which lets anyone enumerate every report ever written (slugs, filenames,
# object count) via the bucket's public XML/JSON listing API — reports are meant to be reachable only by
# whoever holds a specific /r/<slug> link, not browsable. legacyObjectReader grants storage.objects.get
# (read a KNOWN object) without storage.objects.list, matching the "unlisted, not private" model every
# report already has today via its URL-hash link.
#
# Best-effort remove of the old (over-broad) binding first — `|| true` because a from-scratch bucket
# never had it and remove-iam-policy-binding fails loud on a no-op removal; this line only matters when
# converging a bucket that was provisioned before this fix.
gcloud storage buckets remove-iam-policy-binding "gs://$BUCKET" \
  --project="$PROJECT_ID" \
  --member="allUsers" \
  --role="roles/storage.objectViewer" >/dev/null 2>&1 || true
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --project="$PROJECT_ID" \
  --member="allUsers" \
  --role="roles/storage.legacyObjectReader" >/dev/null
echo "public read: allUsers → roles/storage.legacyObjectReader (read-only, no bucket listing)"

# -- writer service account: create-if-absent + bucket-scoped write -----------
if gcloud iam service-accounts describe "$WRITER_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "writer SA exists: $WRITER_SA"
else
  gcloud iam service-accounts create "$WRITER_SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="PMO report registry writer (reporthub-as-notion S1.1)"
  echo "writer SA created: $WRITER_SA"
fi
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:$WRITER_SA" \
  --role="roles/storage.objectUser" >/dev/null
echo "writer bound: $WRITER_SA → roles/storage.objectUser (bucket-scoped)"

echo "== done. Round-trip check:"
echo "   echo '# hola' | gcloud storage cp - gs://$BUCKET/daily/provision-smoke-\$(date +%s).md"
echo "   curl -s https://storage.googleapis.com/$BUCKET/daily/<that-object>"
