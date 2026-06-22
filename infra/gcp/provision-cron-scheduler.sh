#!/usr/bin/env bash
# provision-cron-scheduler.sh — Neon Egress reduction, Sprint 2 (Story 2.2).
#
# Externalize the two money-adjacent cron jobs OFF the Medusa instance and onto
# Cloud Scheduler, so they fire independent of Cloud Run instance warmth. This is
# the prerequisite for the S2.3 `minScale: 0` trial: with min=0 an idle backend is
# scaled to zero, and an in-process Medusa scheduled job cannot fire while the
# instance is down. reconcile-checkouts is a payment safety-net and sweepstakes-draw
# is fairness-adjacent, so neither may depend on the instance being awake.
#
# These jobs already only did `fetch(SITE_URL/api/cron/<name>)` with the internal
# secret — the real logic lives in the Next.js (Vercel) routes — so Cloud Scheduler
# calls those Vercel routes DIRECTLY, fully decoupling them from the Medusa instance.
# Same trust boundary as before: the route authenticates the `x-internal-secret`
# header against MEDUSA_INTERNAL_SECRET. After this runs, delete the in-process jobs
# (apps/backend/src/jobs/{reconcile-checkouts,sweepstakes-draw}.ts) — both target
# routes are idempotent, so a brief overlap while the backend is still warm is safe.
#
# Idempotent: each job is create-if-absent then update (schedule/uri/header kept
# current + the secret re-bound), so a re-run is safe and self-healing.
#
#   bash infra/gcp/provision-cron-scheduler.sh
#
# Needs: gcloud + Secret Manager read on MEDUSA_INTERNAL_SECRET (the runtime SA / your
# user). The secret value is never echoed.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"          # Cloud Scheduler is regional; co-locate with Cloud Run
SITE_URL="${SITE_URL:-https://miyagisanchez.com}"   # Vercel app — matches the jobs' old default
SECRET_NAME="${SECRET_NAME:-MEDUSA_INTERNAL_SECRET}"
TIME_ZONE="${TIME_ZONE:-Etc/UTC}"     # interval crons (*/N) are tz-agnostic
P=(--project="$PROJECT_ID")           # passed to every gcloud call (no global `config set`)

echo "▶ Provisioning Cloud Scheduler crons for $SITE_URL (project=$PROJECT_ID, region=$REGION)"

# Cloud Scheduler API must be enabled (idempotent — no-op if already on).
gcloud services enable cloudscheduler.googleapis.com "${P[@]}" >/dev/null

# Fetch the internal secret from Secret Manager (same value Cloud Run binds). Captured
# into a shell var in THIS process; never printed. The header lands in the job config
# (visible to anyone with scheduler.jobs.get — identical exposure to the Cloud Run env).
SECRET="$(gcloud secrets versions access latest --secret="$SECRET_NAME" "${P[@]}")"
[ -n "$SECRET" ] || { echo "✗ ${SECRET_NAME} resolved empty — refusing to create unauth'd crons" >&2; exit 1; }

# create-or-update one HTTP GET scheduler job hitting a Vercel cron route.
ensure_cron() {  # $1 = job name (== route segment) ; $2 = cron schedule
  local name="$1" schedule="$2" uri="${SITE_URL}/api/cron/$1"
  local common=(
    --location="$REGION" "${P[@]}"
    --schedule="$schedule"
    --time-zone="$TIME_ZONE"
    --uri="$uri"
    --http-method=GET
    --update-headers="x-internal-secret=${SECRET}"
    --attempt-deadline=300s
  )
  if gcloud scheduler jobs describe "$name" --location="$REGION" "${P[@]}" >/dev/null 2>&1; then
    gcloud scheduler jobs update http "$name" "${common[@]}" >/dev/null
    echo "  = updated: $name ($schedule) → $uri"
  else
    gcloud scheduler jobs create http "$name" "${common[@]}" >/dev/null
    echo "  + created: $name ($schedule) → $uri"
  fi
}

# Cadences mirror the retired Medusa jobs (right-sized in the vercel-cost-reduction epic):
ensure_cron "reconcile-checkouts" "*/30 * * * *"   # payment safety-net — not time-critical
ensure_cron "sweepstakes-draw"    "*/15 * * * *"   # idempotent draw — ≤15 min latency is fine

echo "▶ Done. Verify (and force a test run):"
echo "    gcloud scheduler jobs list --location=${REGION} ${P[*]} --format='table(name,schedule,state)'"
echo "    gcloud scheduler jobs run reconcile-checkouts --location=${REGION} ${P[*]}"
echo "    gcloud scheduler jobs run sweepstakes-draw    --location=${REGION} ${P[*]}"
