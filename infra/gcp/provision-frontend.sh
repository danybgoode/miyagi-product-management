#!/usr/bin/env bash
# Provision GCP infrastructure for the Next.js frontend (Cloud Run, us-east4),
# co-located with the Medusa backend in the SAME project. Idempotent-ish: each
# step checks for existence before creating. Review before running.
# (09-platform-infra frontend-vercel-to-cloudrun, S1.3.)
#
#   PROJECT_ID=miyagisanchez-prod bash infra/gcp/provision-frontend.sh
#
# Unlike the backend, the frontend does NOT need the medusa-conn VPC
# connector — it never talks to Cloud SQL or Redis directly (Supabase and
# Upstash are both plain HTTPS/REST; Medusa is reached over MEDUSA_STORE_URL,
# not the DB). No VPC egress config here.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchez-prod}"
REGION="${REGION:-us-east4}"
AR_REPO="${AR_REPO:-frontend}"
RUN_SA="${RUN_SA:-miyagi-web-run}"
RUN_SA_EMAIL="${RUN_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

# Secrets ALREADY in this project (backend's), reused as-is — same live Clerk
# instance / Stripe account / Supabase project / MercadoPago account / ML app
# / Telegram bot, so no new value, no "copying": just an IAM grant on the
# EXISTING secret (Daniel confirmed this approach, 2026-07-09).
REUSED_SECRETS=(
  CLERK_SECRET_KEY
  STRIPE_SECRET_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  MP_ACCESS_TOKEN
  MEDUSA_INTERNAL_SECRET
  TELEGRAM_BOT_TOKEN
  ML_APP_SECRET
)

# NEW secret shells this script creates (EMPTY — values populated separately,
# never by this script). Some are frontend-only (no backend equivalent
# exists); STRIPE_WEBHOOK_SECRET is frontend-only because
# app/api/webhooks/stripe/route.ts is its own registered Stripe webhook
# endpoint (endpoint-specific secret, not shareable with the backend's).
NEW_SECRETS=(
  STRIPE_WEBHOOK_SECRET   # frontend's own Stripe webhook endpoint — new value once the endpoint is registered against the Cloud Run URL
  RESEND_API_KEY
  VAPID_PRIVATE_KEY       # fresh keypair generated for this deploy (Daniel confirmed: existing Vercel push subscriptions are accepted as a one-time regression during the dark shadow-soak — not user-facing while Vercel serves prod)
  TELEGRAM_CHAT_ID_APP    # the app's own admin-notification chat (distinct from the backend CI/CD chat's TELEGRAM_CICD_CHAT_ID)
  VERCEL_API_TOKEN
  # SERPAPI_KEY retired here (gcp-account-migration S1): the secret was an empty shell even in
  # the old project and live miyagi-web never bound it — an unresolvable :latest would
  # fail-close every fresh-project revision. Re-add to BOTH this array and deploy-frontend.sh's
  # --set-secrets (same change) if the SerpAPI feature ever gets a real key.
  # Real credential material only — bucket names / account IDs / public URLs
  # aren't sensitive and go in deploy-frontend.sh's plain --set-env-vars instead.
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_DIGITAL_ACCESS_KEY_ID
  R2_DIGITAL_SECRET_ACCESS_KEY
  UPSTASH_REDIS_REST_TOKEN
  # The following four are NOT auto-rotatable like JWT_SECRET/COOKIE_SECRET
  # were for the backend — flagged to Daniel rather than assumed:
  #   ADMIN_SECRET / CLAIM_JWT_SECRET gate live admin/claim-link auth; a fresh
  #   random value invalidates any outstanding claim links.
  #   ENCRYPTION_KEY / ENCRYPTION_SECRET may protect data at rest — a fresh
  #   value could make already-encrypted data unreadable if it's not the same
  #   key already in use. Left as empty shells; Daniel decides fresh vs copied.
  ADMIN_SECRET
  CLAIM_JWT_SECRET
  ENCRYPTION_KEY
  ENCRYPTION_SECRET
  CRON_SECRET             # still read by the vercel.json crons until S3.1 moves them to Cloud Scheduler
  GROWTH_ENGINE_API_KEY   # golden-beans Growth Engine per-project credential (growth-engine-v1 S1.3)
)

# NEXT_PUBLIC_* real-key shells (EMPTY — values populated separately, never by
# this script) read at DOCKER BUILD TIME by cloudbuild.yaml's availableSecrets
# (nextpublic-docker-buildargs-hardening), so `next build` can inline them
# into the client bundle instead of baking in `undefined` — see the two prior
# incidents this class of bug caused (home-dynamic-rows-restore-and-polish S1,
# checkout-cloudrun-localhost-fallback-outage). These are publishable/anon/
# public keys, public by design once shipped — NOT secrets in the security
# sense, but Secret Manager is still the source (matches how every other
# credential in this repo rotates) rather than a literal value in
# cloudbuild.yaml. IAM access is granted to the CI/CD build SA, not the
# runtime RUN_SA — see cicd-setup-frontend.sh. Kept in parity with
# cloudbuild.yaml's availableSecrets by infra/gcp/test/frontend-build-args.test.js.
# NEXT_PUBLIC_SUPABASE_URL deliberately reuses the existing SUPABASE_URL
# secret above rather than a second copy of the same value.
PUBLIC_BUILD_SECRETS=(
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  NEXT_PUBLIC_MEDUSA_MXN_REGION_ID
  NEXT_PUBLIC_MP_PUBLIC_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_VAPID_PUBLIC_KEY
)

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

gcloud config set project "$PROJECT_ID"

say "Artifact Registry repo: $AR_REPO ($REGION)"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker --location="$REGION" \
    --description="Next.js frontend images"
fi

say "Runtime service account: $RUN_SA_EMAIL"
if ! gcloud iam service-accounts describe "$RUN_SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUN_SA" --display-name="Frontend Cloud Run (miyagi-web)"
  # A just-created SA is eventually consistent — an immediate IAM grant against it can 400
  # ("Service account … does not exist"). Hit for real on the first miyagisanchez-prod run
  # (gcp-account-migration S0.1). Bounded wait until the SA is visible before granting.
  for _ in $(seq 1 12); do
    gcloud iam service-accounts describe "$RUN_SA_EMAIL" >/dev/null 2>&1 && break
    sleep 5
  done
fi

say "Granting access to REUSED (backend-owned) secrets"
for s in "${REUSED_SECRETS[@]}"; do
  # On a FRESH project only provision.sh's shells pre-exist — the rest of the reused set
  # (SUPABASE_*, TELEGRAM_BOT_TOKEN, ML_APP_SECRET) accumulated live in the old project, so
  # create the empty shell here if absent (values populated separately, never by this script).
  if ! gcloud secrets describe "$s" >/dev/null 2>&1; then
    gcloud secrets create "$s" --replication-policy=automatic
  fi
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUN_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

say "Creating NEW (empty) secret shells + granting access"
for s in "${NEW_SECRETS[@]}"; do
  if ! gcloud secrets describe "$s" >/dev/null 2>&1; then
    gcloud secrets create "$s" --replication-policy=automatic
  fi
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUN_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

say "Creating PUBLIC_BUILD_SECRETS (empty) shells — build-time only, no RUN_SA grant here"
for s in "${PUBLIC_BUILD_SECRETS[@]}"; do
  if ! gcloud secrets describe "$s" >/dev/null 2>&1; then
    gcloud secrets create "$s" --replication-policy=automatic
  fi
done

cat <<EOF

✅ Provisioned. Next:
  1) Populate the NEW secret shells (see the comments above for which need a
     fresh value vs Daniel's judgment call):
       printf '%s' "<value>" | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
       # …RESEND_API_KEY, VAPID_PRIVATE_KEY, TELEGRAM_CHAT_ID_APP,
       #   VERCEL_API_TOKEN, R2_*_ACCESS_KEY_ID, R2_*_SECRET_ACCESS_KEY,
       #   UPSTASH_REDIS_REST_TOKEN, ADMIN_SECRET, CLAIM_JWT_SECRET,
       #   ENCRYPTION_KEY, ENCRYPTION_SECRET, CRON_SECRET
  2) Populate the PUBLIC_BUILD_SECRETS shells with the SAME live values already
     typed into deploy-frontend.sh's NEXT_PUBLIC_* vars (they're the same
     publishable/anon/public keys, just also readable at Docker build time now):
       printf '%s' "<value>" | gcloud secrets versions add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --data-file=-
       # …NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
       #   NEXT_PUBLIC_MEDUSA_MXN_REGION_ID, NEXT_PUBLIC_MP_PUBLIC_KEY,
       #   NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY
  3) Grant the CI/CD build SA access to PUBLIC_BUILD_SECRETS (+ the existing
     SUPABASE_URL secret, reused for NEXT_PUBLIC_SUPABASE_URL) — run
     infra/gcp/cicd-setup-frontend.sh, which does this grant.
  4) Deploy:  PROJECT_ID=$PROJECT_ID bash infra/gcp/deploy-frontend.sh
EOF
