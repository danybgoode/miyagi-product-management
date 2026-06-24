#!/usr/bin/env bash
# check-cloudsql-backup.sh — the Cloud SQL backup-FAILURE alert (DevOps reliability
# cleanup, Sprint 2 / Story 2b). Runs INSIDE the `cloudsql-backup-check` Cloud Run Job.
#
# Commerce moved Neon→Cloud SQL (`medusa-pg`), whose backup-of-record is Cloud SQL's own
# automated daily backups + PITR (BACKUPS.md). Those have NO Telegram alert of their own,
# so this job is the observability: once a day it lists the instance's backups and pings
# the ops Telegram chat ONLY when the latest automated backup is missing or not SUCCESSFUL
# within ~26h. Failure-only — no success heartbeat (declined by Daniel).
#
# It deliberately reuses db-backup.sh's shape: `set -euo pipefail`, the same best-effort
# alert() → TELEGRAM_BOT_TOKEN/TELEGRAM_CICD_CHAT_ID, and the "a result nobody checks can
# silently die" discipline (every step's exit is checked; a gcloud failure ALSO alerts).
# The freshness decision is the pure backup-freshness.py (unit-tested); this file does only
# the gcloud fetch + the alert relay.
#
#   Env (optional — sane prod defaults):
#     INSTANCE        Cloud SQL instance to check        (default medusa-pg)
#     PROJECT         GCP project                        (default miyagisanchezback-497722)
#     MAX_AGE_HOURS   freshness window, hours            (default 26 — read by the predicate)
#     TELEGRAM_BOT_TOKEN / TELEGRAM_CICD_CHAT_ID         best-effort failure alert (from Secret Manager)

set -euo pipefail

INSTANCE="${INSTANCE:-medusa-pg}"
PROJECT="${PROJECT:-miyagisanchezback-497722}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
alert() {
  log "ALERT: $*"
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CICD_CHAT_ID:-}" ]; then
    curl -s -m 10 -o /dev/null \
      --data-urlencode "chat_id=${TELEGRAM_CICD_CHAT_ID}" \
      --data-urlencode "text=🛑 cloudsql-backup-check (${INSTANCE}): $*" \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" || true
  fi
}

log "listing Cloud SQL backups for ${INSTANCE} (project ${PROJECT}) …"
# Capture stdout + exit without tripping `set -e` so a bogus instance / permission error
# becomes an ALERT, not a silent non-zero exit. (A failed listing is itself a backup blind
# spot worth paging on.)
set +e
JSON="$(gcloud sql backups list --instance="$INSTANCE" --project="$PROJECT" --format=json 2>/tmp/gcloud.err)"
GCLOUD_RC=$?
set -e
if [ "$GCLOUD_RC" -ne 0 ]; then
  ERR="$(tail -n1 /tmp/gcloud.err 2>/dev/null || true)"
  alert "could not list backups (gcloud rc=${GCLOUD_RC}): ${ERR:-unknown error}"
  exit 1
fi

# Pure freshness predicate: exit 0 healthy / non-zero unhealthy; prints a one-line reason.
set +e
REASON="$(printf '%s' "$JSON" | MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}" python3 "${SCRIPT_DIR}/backup-freshness.py")"
PRED_RC=$?
set -e
if [ "$PRED_RC" -ne 0 ]; then
  alert "${REASON:-backup health check failed (rc=${PRED_RC})}"
  exit 1
fi

log "✅ ${REASON} — no alert"
