#!/usr/bin/env bash
# Provision ISOLATED staging secrets for medusa-web-staging (Backend Production
# Readiness, Sprint 1). Creates *_STAGING secret shells in the SAME project,
# grants the runtime SA (medusa-run) secretAccessor on each, and populates values.
# Redis is OFF on staging → there is deliberately NO REDIS_URL_STAGING secret.
#
#   # export the sourced dev/test creds first (see below), then:
#   PROJECT_ID=miyagisanchez-prod bash infra/gcp/provision-staging.sh
#
# Values are read from env vars — NEVER hard-coded here, never echoed.
#   Auto-generated fresh (openssl rand -hex 32): JWT / COOKIE / MEDUSA_INTERNAL.
#   Sourced (export before running, e.g. from apps/*/.env*):
#     STAGING_DATABASE_URL          Neon BRANCH pooled string (host contains -pooler)
#     STAGING_STRIPE_SECRET_KEY     Stripe TEST key (sk_test_…)
#     STAGING_MP_ACCESS_TOKEN       MercadoPago sandbox token
#     STAGING_CLERK_SECRET_KEY      Clerk DEV instance secret (sk_test_…)
#     STAGING_ENVIA_API_KEY         Envia sandbox key (optional → placeholder)
#     STAGING_STRIPE_WEBHOOK_SECRET (optional → placeholder; webhooks deferred)
#
# Staging is a no-real-money environment: Stripe test / MP sandbox keys only.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchez-prod}"
RUN_SA="${RUN_SA:-medusa-run}"
RUN_SA_EMAIL="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

# Secret shells. NOTE: no REDIS_URL — staging runs Redis-off (in-memory fallback).
SECRETS=(
  DATABASE_URL_STAGING
  JWT_SECRET_STAGING
  COOKIE_SECRET_STAGING
  STRIPE_SECRET_KEY_STAGING
  STRIPE_WEBHOOK_SECRET_STAGING
  MP_ACCESS_TOKEN_STAGING
  CLERK_SECRET_KEY_STAGING
  MEDUSA_INTERNAL_SECRET_STAGING
  ENVIA_API_KEY_STAGING
  ENVIA_SANDBOX_STAGING
)

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
# add_version SECRET VALUE — pipes via stdin so the value never lands in argv/logs.
add_version() { printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null; }

gcloud config set project "$PROJECT_ID" >/dev/null

say "Creating *_STAGING secret shells + granting $RUN_SA_EMAIL accessor"
for s in "${SECRETS[@]}"; do
  if ! gcloud secrets describe "$s" >/dev/null 2>&1; then
    gcloud secrets create "$s" --replication-policy=automatic
  fi
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUN_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

say "Auto-generating fresh, isolated staging JWT / COOKIE / INTERNAL secrets"
add_version JWT_SECRET_STAGING             "$(openssl rand -hex 32)"
add_version COOKIE_SECRET_STAGING          "$(openssl rand -hex 32)"
add_version MEDUSA_INTERNAL_SECRET_STAGING "$(openssl rand -hex 32)"

say "Setting staging constants (Envia sandbox on; webhook placeholder — deferred)"
add_version ENVIA_SANDBOX_STAGING         "true"
add_version ENVIA_API_KEY_STAGING         "${STAGING_ENVIA_API_KEY:-envia_staging_placeholder}"
add_version STRIPE_WEBHOOK_SECRET_STAGING "${STAGING_STRIPE_WEBHOOK_SECRET:-whsec_staging_placeholder}"

say "Populating sourced staging credentials"
# require SECRET ENVVAR — these are load-bearing. If any is unset the script
# FAILS (exit 1) rather than leaving a shell with no version: a later deploy would
# otherwise bind an empty/absent secret and boot half-configured.
MISSING=0
require() {
  local v="${!2:-}"
  if [ -n "$v" ]; then add_version "$1" "$v"; echo "  ✓ $1 set"; else
    echo "  ✗ $1 NOT set ($2 unset) — export it and re-run, or: printf '%s' '<value>' | gcloud secrets versions add $1 --data-file=-"
    MISSING=$((MISSING + 1)); fi
}
require DATABASE_URL_STAGING      STAGING_DATABASE_URL
require STRIPE_SECRET_KEY_STAGING STAGING_STRIPE_SECRET_KEY
require MP_ACCESS_TOKEN_STAGING   STAGING_MP_ACCESS_TOKEN
require CLERK_SECRET_KEY_STAGING  STAGING_CLERK_SECRET_KEY

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "✗ $MISSING required staging secret(s) have no value — NOT ready to deploy. Set them and re-run (idempotent)." >&2
  exit 1
fi

cat <<EOF

✅ Staging secrets provisioned. Deploy:
     CLERK_PUBLISHABLE_KEY=<dev pk_test> bash infra/gcp/deploy-staging.sh
EOF
