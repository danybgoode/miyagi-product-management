#!/usr/bin/env bash
# provision-scheduler-frontend.sh — Frontend off Vercel → Cloud Run, Sprint 3, Story 3.1.
#
# Creates the 4 Cloud Scheduler jobs that replace vercel.json's `crons` block, each hitting
# the frontend's dark *.run.app URL directly (outside Cloudflare/the public edge path) with
# the SAME CRON_SECRET shared-secret each route already validates today for Vercel Cron —
# no OIDC, no new app code, no new dependency (decided 2026-07-10: the routes are already
# host-agnostic, Cloud Run stays --allow-unauthenticated for the Sprint 1.4 shadow-soak, and
# per-route IAM lockdown isn't possible on a Cloud Run *service* anyway).
#
# Idempotent: every job is create-if-absent, update-if-present (matches the
# infra/gcp/backups/provision-db-backup.sh create/update idiom). CRITICAL: every job is
# PAUSED immediately after create/update, EVERY run — a re-run of this script must never
# silently re-enable a job Daniel has since disabled for a real reason. Jobs are only ever
# enabled by the separate `--enable` flag, run exactly once, in the same PR/deploy window
# that removes vercel.json's crons block (Story 3.1's "one swap" requirement).
#
# order-autoconfirm is the money-path cron — rehearse ALL 4 jobs manually (see sprint-3.md)
# BEFORE ever passing --enable.
#
# Usage:
#   bash infra/gcp/provision-scheduler-frontend.sh              # create/update, always paused
#   bash infra/gcp/provision-scheduler-frontend.sh --enable      # + resume all 4 (the ONE swap step)
#   bash infra/gcp/provision-scheduler-frontend.sh --disable     # pause all 4 (rollback)
#
# Needs: gcloud. CRON_SECRET must already have a real value in Secret Manager (Sprint 1 left
# it as an empty shell) — this script reads it once at provision time, never prints it.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchez-prod}"
REGION="${REGION:-us-east4}"
SERVICE="${SERVICE:-miyagi-web}"

MODE="provision"
for arg in "$@"; do
  case "$arg" in
    --enable) MODE="enable" ;;
    --disable) MODE="disable" ;;
    *) echo "Unknown argument: $arg (expected --enable or --disable)" >&2; exit 1 ;;
  esac
done

P=(--project="$PROJECT_ID")

RUN_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" "${P[@]}" --format='value(status.url)')"
[ -n "$RUN_URL" ] || { echo "✗ could not resolve the live URL for Cloud Run service '$SERVICE'" >&2; exit 1; }
echo "▶ Target Cloud Run URL: $RUN_URL"

CRON_SECRET_VALUE="$(gcloud secrets versions access latest --secret=CRON_SECRET "${P[@]}" 2>/dev/null || true)"
if [ "$MODE" = "provision" ] && [ -z "$CRON_SECRET_VALUE" ]; then
  echo "✗ CRON_SECRET has no value in Secret Manager yet — populate it first (Daniel), then re-run." >&2
  exit 1
fi

# job name : cron schedule (verbatim from apps/miyagisanchez/vercel.json) : header shape
# Header shapes match each route's actual, individually-verified auth check:
#   order-autoconfirm    → x-cron-secret only (no Bearer fallback in that route)
#   print-pending        → x-cron-secret (also accepts Bearer, either works)
#   domain-lapse-sweep   → Authorization: Bearer ONLY — this route is fail-closed, Bearer-only
#   launchpad-campaigns  → x-cron-secret (also accepts Bearer or x-internal-secret)
declare -a JOBS=(
  "frontend-order-autoconfirm|0 9 * * *|/api/cron/order-autoconfirm|x-cron-secret"
  "frontend-print-pending|0 8 * * *|/api/cron/print-pending|x-cron-secret"
  "frontend-domain-lapse-sweep|0 7 * * *|/api/cron/domain-lapse-sweep|bearer"
  "frontend-launchpad-campaigns|0 6 * * *|/api/cron/launchpad-campaigns|x-cron-secret"
)

for entry in "${JOBS[@]}"; do
  IFS='|' read -r NAME SCHEDULE PATH_ HEADER_SHAPE <<< "$entry"
  URI="${RUN_URL}${PATH_}"

  case "$MODE" in
    enable)
      gcloud scheduler jobs resume "$NAME" --location="$REGION" "${P[@]}" >/dev/null
      echo "  ▶ enabled: $NAME"
      continue
      ;;
    disable)
      gcloud scheduler jobs pause "$NAME" --location="$REGION" "${P[@]}" >/dev/null
      echo "  ▶ disabled: $NAME"
      continue
      ;;
  esac

  if [ "$HEADER_SHAPE" = "bearer" ]; then
    HEADERS="Authorization=Bearer ${CRON_SECRET_VALUE}"
  else
    HEADERS="x-cron-secret=${CRON_SECRET_VALUE}"
  fi

  ACTION=create
  gcloud scheduler jobs describe "$NAME" --location="$REGION" "${P[@]}" >/dev/null 2>&1 && ACTION=update

  # `create http` takes --headers; `update http` takes --update-headers instead (confirmed via
  # `gcloud scheduler jobs update http --help` — the only flag name that differs between the two
  # subcommands). Using the wrong one on update errors "unrecognized arguments" and gcloud echoes
  # the full invocation — including the secret value — back in that error text, so getting this
  # right isn't just a functionality fix, it avoids a credential-exposure footgun.
  HEADERS_FLAG="--headers"
  [ "$ACTION" = "update" ] && HEADERS_FLAG="--update-headers"

  gcloud scheduler jobs "$ACTION" http "$NAME" --location="$REGION" "${P[@]}" \
    --schedule="$SCHEDULE" \
    --uri="$URI" \
    --http-method=GET \
    --time-zone="Etc/UTC" \
    --attempt-deadline=300s \
    "${HEADERS_FLAG}=${HEADERS}" >/dev/null
  echo "  + ${ACTION}d: $NAME ($SCHEDULE UTC → $PATH_)"

  # Always pause right after create/update — this script never enables on its own.
  gcloud scheduler jobs pause "$NAME" --location="$REGION" "${P[@]}" >/dev/null 2>&1 || true
done

echo "▶ Done."
case "$MODE" in
  provision)
    echo "  All 4 jobs created/updated and PAUSED. Rehearse each manually before ever passing --enable:"
    echo "    gcloud scheduler jobs run <name> --location=$REGION --project=$PROJECT_ID"
    echo "  Verify state: gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID --format='table(name,schedule,state)'"
    ;;
  enable)
    echo "  All 4 jobs RESUMED. This must land in the same PR/deploy window as removing"
    echo "  apps/miyagisanchez/vercel.json's crons block — never days apart."
    ;;
  disable)
    echo "  All 4 jobs PAUSED (rollback). Re-add vercel.json's crons block if reverting fully."
    ;;
esac
