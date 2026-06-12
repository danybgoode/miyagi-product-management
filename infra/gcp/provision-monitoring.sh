#!/usr/bin/env bash
# provision-monitoring.sh — Backend Production Readiness, Sprint 4 (Story 4.1).
#
# Stands up the proactive observability the backend lacked (audit gaps #2/#7): an
# uptime check + Cloud Run alert policies (5xx, p95 latency, memory, saturation) +
# an ERROR-log alert (Error Reporting auto-groups the same logs), ALL routed to the
# existing MiyagiDevopsTele notification channel. Deploy-event pings already ship via
# the cicd-telegram-build-notifier Cloud Function (verified ACTIVE — not rebuilt here).
#
# Idempotent: every resource is create-if-absent (matched by displayName), so a re-run
# is safe and only fills gaps. To change a threshold, delete the policy and re-run.
#
# Rehearse on staging FIRST, then prod (prod run + live alert delivery owed to Daniel):
#   TARGET=staging bash infra/gcp/provision-monitoring.sh
#   TARGET=prod    bash infra/gcp/provision-monitoring.sh
#
# Thresholds are deliberately conservative (avoid flapping); tune after observing live.
# Needs: gcloud + python3 (JSON assembly only — handles filter-string escaping).

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
TARGET="${TARGET:-staging}"
CHANNEL_DISPLAY="${CHANNEL_DISPLAY:-MiyagiDevopsTele}"
P=(--project="$PROJECT_ID")   # passed to every gcloud call (no global `config set`)

case "$TARGET" in
  prod)
    SERVICE="medusa-web"
    UPTIME_HOST="${UPTIME_HOST:-api.miyagisanchez.com}"
    MAX_INSTANCES=4          # matches deploy.sh --max-instances
    ;;
  staging)
    SERVICE="medusa-web-staging"
    # staging has no custom domain → resolve the run.app host live (min=0, may cold-start)
    UPTIME_HOST="${UPTIME_HOST:-$(gcloud run services describe medusa-web-staging \
      --region="$REGION" "${P[@]}" --format='value(status.url)' | sed 's#^https://##')}"
    MAX_INSTANCES=2          # matches deploy-staging.sh --max-instances
    ;;
  *) echo "TARGET must be 'staging' or 'prod' (got '$TARGET')" >&2; exit 1;;
esac

echo "▶ Provisioning monitoring for $SERVICE (target=$TARGET, host=$UPTIME_HOST)"

# Resolve the notification channel id by display name (don't hardcode the numeric id).
CHANNEL="$(gcloud beta monitoring channels list "${P[@]}" \
  --filter="displayName='${CHANNEL_DISPLAY}'" --format='value(name)' | head -n1)"
[ -n "$CHANNEL" ] || { echo "✗ notification channel '${CHANNEL_DISPLAY}' not found" >&2; exit 1; }
echo "▶ channel: $CHANNEL"

PFX="[${SERVICE}]"
# Plain (un-escaped) filter fragment; python json.dumps escapes the quotes for us.
RES_FILTER="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\""

# --- helpers ---------------------------------------------------------------
policy_id() {  # $1 = displayName → policy name or empty
  gcloud alpha monitoring policies list "${P[@]}" \
    --filter="displayName=\"$1\"" --format='value(name)' 2>/dev/null | head -n1
}

apply_policy() {  # $1 = displayName ; full policy JSON (sans channels) on stdin
  local name="$1"
  if [ -n "$(policy_id "$name")" ]; then echo "  = exists: $name"; return 0; fi
  local f; f="$(mktemp)"; cat > "$f"
  gcloud alpha monitoring policies create "${P[@]}" \
    --policy-from-file="$f" --notification-channels="$CHANNEL" >/dev/null
  rm -f "$f"; echo "  + created: $name"
}

# Emit a threshold alert-policy as JSON. python handles all quote-escaping in the filter.
threshold_json() {  # name cond filter aligner reducer comparison value
  NAME="$1" COND="$2" FILTER="$3" ALIGNER="$4" REDUCER="$5" CMP="$6" VAL="$7" python3 - <<'PY'
import json, os
print(json.dumps({
  "displayName": os.environ["NAME"], "combiner": "OR",
  "conditions": [{
    "displayName": os.environ["COND"],
    "conditionThreshold": {
      "filter": os.environ["FILTER"],
      "aggregations": [{"alignmentPeriod": "300s",
                        "perSeriesAligner": os.environ["ALIGNER"],
                        "crossSeriesReducer": os.environ["REDUCER"]}],
      "comparison": os.environ["CMP"],
      "thresholdValue": float(os.environ["VAL"]),
      "duration": "300s", "trigger": {"count": 1},
    },
  }],
}))
PY
}

matched_log_json() {  # name cond filter
  NAME="$1" COND="$2" FILTER="$3" python3 - <<'PY'
import json, os
print(json.dumps({
  "displayName": os.environ["NAME"], "combiner": "OR",
  "conditions": [{
    "displayName": os.environ["COND"],
    "conditionMatchedLog": {"filter": os.environ["FILTER"]},
  }],
  "alertStrategy": {"notificationRateLimit": {"period": "3600s"}},
}))
PY
}

# --- 1 · uptime check on /health -------------------------------------------
UPTIME_NAME="${PFX} health"
if gcloud monitoring uptime list-configs "${P[@]}" \
     --filter="displayName=\"$UPTIME_NAME\"" --format='value(name)' | grep -q .; then
  echo "  = exists: uptime $UPTIME_NAME"
else
  gcloud monitoring uptime create "$UPTIME_NAME" "${P[@]}" \
    --resource-type=uptime-url \
    --resource-labels=host="$UPTIME_HOST",project_id="$PROJECT_ID" \
    --protocol=https --path=/health --port=443 \
    --period=5 --timeout=10 >/dev/null
  echo "  + created: uptime $UPTIME_NAME"
fi
CHECK_ID="$(gcloud monitoring uptime list-configs "${P[@]}" \
  --filter="displayName=\"$UPTIME_NAME\"" --format='value(name)' | head -n1 | sed 's#.*/##')"

# --- 2 · uptime-failure alert ----------------------------------------------
apply_policy "${PFX} uptime check failing" < <(threshold_json \
  "${PFX} uptime check failing" "/health not passing" \
  "resource.type=\"uptime_url\" AND metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id=\"${CHECK_ID}\"" \
  "ALIGN_FRACTION_TRUE" "REDUCE_MEAN" "COMPARISON_LT" "1")

# --- 3 · Cloud Run threshold alerts ----------------------------------------
apply_policy "${PFX} 5xx error rate" < <(threshold_json \
  "${PFX} 5xx error rate" "5xx responses > 0.05/s (5m)" \
  "${RES_FILTER} AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\"" \
  "ALIGN_RATE" "REDUCE_SUM" "COMPARISON_GT" "0.05")

apply_policy "${PFX} p95 latency" < <(threshold_json \
  "${PFX} p95 latency" "p95 request latency > 2000ms (5m)" \
  "${RES_FILTER} AND metric.type=\"run.googleapis.com/request_latencies\"" \
  "ALIGN_PERCENTILE_95" "REDUCE_MEAN" "COMPARISON_GT" "2000")

apply_policy "${PFX} memory utilization" < <(threshold_json \
  "${PFX} memory utilization" "container memory p99 > 90% (5m)" \
  "${RES_FILTER} AND metric.type=\"run.googleapis.com/container/memory/utilizations\"" \
  "ALIGN_PERCENTILE_99" "REDUCE_MEAN" "COMPARISON_GT" "0.9")

# Monitoring threshold conditions support only COMPARISON_LT/GT, so "active >= max"
# is expressed as GT (max-1) — integer instance counts make this exact.
apply_policy "${PFX} instance saturation" < <(threshold_json \
  "${PFX} instance saturation" "active instances >= max ($MAX_INSTANCES) (5m)" \
  "${RES_FILTER} AND metric.type=\"run.googleapis.com/container/instance_count\" AND metric.labels.state=\"active\"" \
  "ALIGN_MAX" "REDUCE_SUM" "COMPARISON_GT" "$((MAX_INSTANCES - 1))")

# --- 4 · backend error-log alert (Error Reporting groups the same ERROR logs) ---
apply_policy "${PFX} backend errors (logs)" < <(matched_log_json \
  "${PFX} backend errors (logs)" "Cloud Run severity>=ERROR" \
  "${RES_FILTER} AND severity>=ERROR")

echo "▶ Done. Verify:"
echo "    gcloud monitoring uptime list-configs ${P[*]} --format='value(displayName)'"
echo "    gcloud alpha monitoring policies list ${P[*]} --filter='displayName~\"$SERVICE\"' --format='value(displayName)'"
