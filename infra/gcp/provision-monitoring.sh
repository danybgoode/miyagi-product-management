#!/usr/bin/env bash
# provision-monitoring.sh — Backend Production Readiness, Sprint 4 (Story 4.1);
# extended for the frontend in frontend-vercel-to-cloudrun Sprint 3 (Story 3.5).
#
# Stands up the proactive observability the backend lacked (audit gaps #2/#7): an
# uptime check + Cloud Run alert policies (5xx, p95 latency, memory, saturation) +
# an ERROR-log alert (Error Reporting auto-groups the same logs), ALL routed to the
# existing MiyagiDevopsTele notification channel. Deploy-event pings already ship via
# the cicd-telegram-build-notifier Cloud Function (verified ACTIVE — not rebuilt here;
# the frontend gets its OWN second instance, see deploy-cicd-telegram-notifier-frontend.sh).
#
# Idempotent: every resource is create-if-absent (matched by displayName), so a re-run
# is safe and only fills gaps. To change a threshold, delete the policy and re-run.
#
# TWO orthogonal axes: SERVICE_NAME (which app) × TARGET (which environment) — not a single
# combined switch, so every existing helper (policy_id/apply_policy/threshold_json/
# matched_log_json) stays shared verbatim between backend and frontend.
#
# Rehearse on staging FIRST, then prod (prod run + live alert delivery owed to Daniel):
#   SERVICE_NAME=backend  TARGET=staging bash infra/gcp/provision-monitoring.sh   # default
#   SERVICE_NAME=backend  TARGET=prod    bash infra/gcp/provision-monitoring.sh
#   SERVICE_NAME=frontend TARGET=staging bash infra/gcp/provision-monitoring.sh   # dark *.run.app URL
#   SERVICE_NAME=frontend TARGET=prod    bash infra/gcp/provision-monitoring.sh   # miyagisanchez.com (post-cutover)
#
# Thresholds are deliberately conservative (avoid flapping); tune after observing live.
# Needs: gcloud + python3 (JSON assembly only — handles filter-string escaping).

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
SERVICE_NAME="${SERVICE_NAME:-backend}"   # backend | frontend
TARGET="${TARGET:-staging}"
CHANNEL_DISPLAY="${CHANNEL_DISPLAY:-MiyagiDevopsTele}"
P=(--project="$PROJECT_ID")   # passed to every gcloud call (no global `config set`)

case "$SERVICE_NAME" in
  backend)
    UPTIME_PATH="/health"
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
    ;;
  frontend)
    SERVICE="miyagi-web"          # one Cloud Run service for both TARGETs — no separate
    UPTIME_PATH="/api/health"     # frontend staging deployment exists (unlike the backend)
    case "$TARGET" in
      prod)
        # Only meaningful once Sprint 3 Story 3.4 cuts miyagisanchez.com over to this rail.
        UPTIME_HOST="${UPTIME_HOST:-miyagisanchez.com}"
        MAX_INSTANCES=4          # matches deploy-frontend.sh --max-instances
        ;;
      staging)
        # Pre-cutover: the dark *.run.app URL is the only live host (min=0, may cold-start).
        UPTIME_HOST="${UPTIME_HOST:-$(gcloud run services describe miyagi-web \
          --region="$REGION" "${P[@]}" --format='value(status.url)' | sed 's#^https://##')}"
        MAX_INSTANCES=4          # matches deploy-frontend.sh --max-instances
        ;;
      *) echo "TARGET must be 'staging' or 'prod' (got '$TARGET')" >&2; exit 1;;
    esac
    ;;
  *) echo "SERVICE_NAME must be 'backend' or 'frontend' (got '$SERVICE_NAME')" >&2; exit 1;;
esac

echo "▶ Provisioning monitoring for $SERVICE (service_name=$SERVICE_NAME, target=$TARGET, host=$UPTIME_HOST, path=$UPTIME_PATH)"

# Resolve the notification channel id by display name (don't hardcode the numeric id).
# Require EXACTLY ONE match — refuse to silently guess if the name is duplicated
# (bash-3.2-portable: count non-empty lines with grep -c, no mapfile).
_CH_LIST="$(gcloud beta monitoring channels list "${P[@]}" \
  --filter="displayName='${CHANNEL_DISPLAY}'" --format='value(name)')"
_CH_COUNT="$(printf '%s\n' "$_CH_LIST" | grep -c .)"
[ "$_CH_COUNT" -ge 1 ] || { echo "✗ notification channel '${CHANNEL_DISPLAY}' not found" >&2; exit 1; }
[ "$_CH_COUNT" -eq 1 ] || { echo "✗ $_CH_COUNT channels named '${CHANNEL_DISPLAY}' — refusing to guess; dedupe or set CHANNEL_DISPLAY" >&2; exit 1; }
CHANNEL="$(printf '%s\n' "$_CH_LIST" | head -n1)"
echo "▶ channel: $CHANNEL"

PFX="[${SERVICE}]"
# Plain (un-escaped) filter fragment; python json.dumps escapes the quotes for us.
# Scoped to the region too, so a same-named service in another region can't mix signals.
RES_FILTER="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\" AND resource.labels.location=\"${REGION}\""

# --- helpers ---------------------------------------------------------------
# Alert policies are GA (`gcloud monitoring policies`); use it over `alpha` (alpha can
# be org-blocked / breaking). Notification channels are still beta-only.
policy_id() {  # $1 = displayName → policy name or empty
  gcloud monitoring policies list "${P[@]}" \
    --filter="displayName=\"$1\"" --format='value(name)' 2>/dev/null | head -n1
}

apply_policy() {  # $1 = displayName ; full policy JSON (sans channels) on stdin
  local name existing f; name="$1"
  existing="$(policy_id "$name")"
  if [ -n "$existing" ]; then
    # Idempotent + self-healing: guarantee the channel is wired even on a policy that
    # predates this run (a partial earlier run / a manually-created policy could
    # otherwise sit UNWIRED while we exit green). --add-notification-channels is a
    # no-op if already present. NOTE: thresholds are NOT reconciled on exists — to
    # change one, delete the policy and re-run.
    gcloud monitoring policies update "$existing" "${P[@]}" \
      --add-notification-channels="$CHANNEL" >/dev/null
    echo "  = exists (channel ensured): $name"; return 0
  fi
  f="$(mktemp)"; cat > "$f"
  if ! gcloud monitoring policies create "${P[@]}" \
        --policy-from-file="$f" --notification-channels="$CHANNEL" >/dev/null; then
    rm -f "$f"; echo "  ✗ failed to create: $name" >&2; return 1
  fi
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
    --protocol=https --path="$UPTIME_PATH" --port=443 \
    --validate-ssl=true \
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

# Reduce across series with MAX (worst instance/revision), not MEAN — a single slow or
# memory-pressured instance must not be averaged away by healthy ones.
apply_policy "${PFX} p95 latency" < <(threshold_json \
  "${PFX} p95 latency" "p95 request latency > 2000ms (5m)" \
  "${RES_FILTER} AND metric.type=\"run.googleapis.com/request_latencies\"" \
  "ALIGN_PERCENTILE_95" "REDUCE_MAX" "COMPARISON_GT" "2000")

apply_policy "${PFX} memory utilization" < <(threshold_json \
  "${PFX} memory utilization" "container memory p99 > 90% (5m)" \
  "${RES_FILTER} AND metric.type=\"run.googleapis.com/container/memory/utilizations\"" \
  "ALIGN_PERCENTILE_99" "REDUCE_MAX" "COMPARISON_GT" "0.9")

# Monitoring threshold conditions support only COMPARISON_LT/GT, so "active >= max"
# is expressed as GT (max-1) — integer instance counts make this exact.
apply_policy "${PFX} instance saturation" < <(threshold_json \
  "${PFX} instance saturation" "active instances >= max ($MAX_INSTANCES) (5m)" \
  "${RES_FILTER} AND metric.type=\"run.googleapis.com/container/instance_count\" AND metric.labels.state=\"active\"" \
  "ALIGN_MAX" "REDUCE_SUM" "COMPARISON_GT" "$((MAX_INSTANCES - 1))")

# --- 4 · error-log alert (Error Reporting groups the same ERROR logs) ---
# NOTE: keep this displayName string EXACTLY as-is ("backend errors") even for
# SERVICE_NAME=frontend — apply_policy's idempotency matches on displayName, so
# renaming it would orphan the already-live backend policy in prod and create a
# duplicate rather than reconcile it. PFX already makes the full name service-unique
# ("[miyagi-web] backend errors (logs)" vs "[medusa-web] backend errors (logs)").
apply_policy "${PFX} backend errors (logs)" < <(matched_log_json \
  "${PFX} backend errors (logs)" "Cloud Run severity>=ERROR" \
  "${RES_FILTER} AND severity>=ERROR")

echo "▶ Done. Verify:"
echo "    gcloud monitoring uptime list-configs ${P[*]} --format='value(displayName)'"
echo "    gcloud monitoring policies list ${P[*]} --filter='displayName~\"$SERVICE\"' --format='value(displayName)'"
