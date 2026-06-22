#!/usr/bin/env bash
# provision-cloudsql.sh — Postgres → Cloud SQL co-location, Sprint 1 (Story 1.1).
#
# Stands up a managed Cloud SQL for PostgreSQL 17 instance on a PRIVATE IP inside the
# SAME GCP VPC the backend already uses to reach Redis (`default` network, via the
# `medusa-conn` connector + Private Service Access). Co-locating Postgres with the
# Cloud Run compute eliminates the cross-cloud (AWS Neon → GCP) egress at the root —
# intra-VPC private traffic isn't metered, so the backend can stay min=1 (warm). See
# Roadmap/09-platform-infra/postgres-neon-to-cloudsql/README.md for the why.
#
# Idempotent: every resource is create-if-absent (matched by name/existence), so a
# re-run is safe and only fills gaps. Mirrors the shape of provision-monitoring.sh
# (env-overridable, `P=(--project=…)` passed to every call — no global `config set`).
#
# This is ADDITIVE — it does NOT touch prod `medusa-web` or its live DATABASE_URL.
# It creates the instance + a prod database (`medusa`, used at the S2 cutover) and a
# staging database (`medusa_staging`, repointed THIS sprint to rehearse the migration).
#
# Cloud SQL BILLS ON CREATION → this script is owed to Daniel (paid infra).
#   PROJECT_ID=miyagisanchezback-497722 bash infra/gcp/provision-cloudsql.sh
#
# Needs: gcloud + openssl (password generation). Reversible: `gcloud sql instances delete medusa-pg`.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchezback-497722}"
REGION="${REGION:-us-east4}"
NETWORK="${NETWORK:-default}"            # same VPC as the medusa-conn connector + Redis
INSTANCE="${INSTANCE:-medusa-pg}"
DB_VERSION="${DB_VERSION:-POSTGRES_17}"  # parity with Neon PG17 (verify extensions — Story 1.2)
# Smallest practical SHARED-CORE tier — ample for the ~43 MB DB (confirmed with Daniel).
# If a shared-core tier rejects PITR/backups, set TIER=db-custom-1-3840 and re-run
# (the smallest DEDICATED tier; ~2× cost) — see the PITR guard in step 3.
TIER="${TIER:-db-g1-small}"
EDITION="${EDITION:-enterprise}"         # Enterprise edition (Enterprise Plus is the costly tier)
PSA_RANGE_NAME="${PSA_RANGE_NAME:-google-managed-services-${NETWORK}}"
APP_USER="${APP_USER:-medusa_app}"
PROD_DB="${PROD_DB:-medusa}"
STAGING_DB="${STAGING_DB:-medusa_staging}"
P=(--project="$PROJECT_ID")

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

# ── 1. Enable APIs ────────────────────────────────────────────────────────────
say "Enabling APIs (sqladmin, servicenetworking)"
gcloud services enable sqladmin.googleapis.com servicenetworking.googleapis.com "${P[@]}"

# ── 2. Private Service Access on the VPC (so Cloud SQL gets a private IP) ──────
# Cloud SQL's private IP is allocated from a range PEERED to your VPC via the
# servicenetworking connection. Both steps are create-if-absent.
say "Private Service Access range: $PSA_RANGE_NAME (network=$NETWORK)"
if ! gcloud compute addresses describe "$PSA_RANGE_NAME" --global "${P[@]}" >/dev/null 2>&1; then
  gcloud compute addresses create "$PSA_RANGE_NAME" \
    --global --purpose=VPC_PEERING --prefix-length=16 \
    --network="$NETWORK" "${P[@]}"
else
  echo "  = exists: $PSA_RANGE_NAME"
fi

say "VPC peering: servicenetworking ↔ $NETWORK"
if gcloud services vpc-peerings list --network="$NETWORK" "${P[@]}" \
     --format='value(reservedPeeringRanges)' 2>/dev/null | grep -qw "$PSA_RANGE_NAME"; then
  echo "  = exists: peering already advertises $PSA_RANGE_NAME"
else
  # `connect` creates it; if a peering already exists with other ranges, `update` merges.
  if gcloud services vpc-peerings connect \
       --service=servicenetworking.googleapis.com \
       --ranges="$PSA_RANGE_NAME" --network="$NETWORK" "${P[@]}" 2>/dev/null; then
    echo "  + created peering"
  else
    gcloud services vpc-peerings update \
      --service=servicenetworking.googleapis.com \
      --ranges="$PSA_RANGE_NAME" --network="$NETWORK" --force "${P[@]}"
    echo "  ~ updated peering ranges"
  fi
fi

# ── 3. The Cloud SQL instance (PG17, private IP, single-zone, 7-day PITR) ─────
say "Cloud SQL instance: $INSTANCE ($DB_VERSION, $TIER, $REGION)"
if gcloud sql instances describe "$INSTANCE" "${P[@]}" >/dev/null 2>&1; then
  echo "  = exists: $INSTANCE (not reconciling settings — delete + re-run to change tier/HA)"
else
  # --no-assign-ip + --network → PRIVATE IP only (no public surface).
  # --availability-type=zonal → single-zone (HA is a later toggle, ~2× cost).
  # PITR: --enable-point-in-time-recovery + 7-day backup/WAL retention.
  # PITR GUARD: if this fails on a shared-core tier, re-run with TIER=db-custom-1-3840.
  gcloud sql instances create "$INSTANCE" "${P[@]}" \
    --database-version="$DB_VERSION" \
    --edition="$EDITION" \
    --tier="$TIER" \
    --region="$REGION" \
    --availability-type=zonal \
    --network="projects/${PROJECT_ID}/global/networks/${NETWORK}" \
    --no-assign-ip \
    --enable-google-private-path \
    --backup \
    --backup-start-time=08:00 \
    --enable-point-in-time-recovery \
    --retained-backups-count=7 \
    --retained-transaction-log-days=7 \
    --storage-auto-increase
  echo "  + created: $INSTANCE"
fi

PRIVATE_IP="$(gcloud sql instances describe "$INSTANCE" "${P[@]}" \
  --format='value(ipAddresses[0].ipAddress)')"
say "Instance PRIVATE IP: $PRIVATE_IP"

# ── 4. Databases + application user ───────────────────────────────────────────
say "Databases: $PROD_DB (prod, S2) + $STAGING_DB (staging, this sprint)"
for d in "$PROD_DB" "$STAGING_DB"; do
  if gcloud sql databases describe "$d" --instance="$INSTANCE" "${P[@]}" >/dev/null 2>&1; then
    echo "  = exists: db $d"
  else
    gcloud sql databases create "$d" --instance="$INSTANCE" "${P[@]}"
    echo "  + created: db $d"
  fi
done

# One login role for the app. Password generated here (never echoed), stored in
# Secret Manager via the composed DSNs below. Re-running with the user present
# leaves the password as-is (idempotent); to rotate, `gcloud sql users set-password`.
if gcloud sql users list --instance="$INSTANCE" "${P[@]}" \
     --format='value(name)' | grep -qw "$APP_USER"; then
  say "User $APP_USER exists — keeping current password"
  echo "  (to rotate: gcloud sql users set-password $APP_USER --instance=$INSTANCE --prompt-for-password)"
  echo "  ⚠ DSN secrets are only (re)written when the user is CREATED. If you need fresh DSNs"
  echo "    after a password rotation, add the new DATABASE_URL / DATABASE_URL_STAGING versions by hand."
else
  APP_PW="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  say "Creating user $APP_USER + composing the STAGING DSN secret"
  gcloud sql users create "$APP_USER" --instance="$INSTANCE" --password="$APP_PW" "${P[@]}"

  # Private-IP DSN (direct TCP over the VPC; no Auth Proxy needed when egressing
  # private-ranges-only through the connector). sslmode=disable is acceptable on a
  # private VPC path; tighten to verify-full with the server CA later if desired.
  STAGING_DSN="postgres://${APP_USER}:${APP_PW}@${PRIVATE_IP}:5432/${STAGING_DB}?sslmode=disable"

  # Add a NEW version to the EXISTING DATABASE_URL_STAGING secret (created by
  # provision-staging.sh) — never rename, so the deploy-invariants name-parity guard
  # stays green. Staging is repointed to Cloud SQL THIS sprint (Story 1.3).
  printf '%s' "$STAGING_DSN" | gcloud secrets versions add DATABASE_URL_STAGING --data-file=- "${P[@]}" >/dev/null
  echo "  + added DATABASE_URL_STAGING (Cloud SQL DSN) version"

  # ⚠️ DELIBERATELY do NOT write the prod DATABASE_URL version here. prod medusa-web binds
  # DATABASE_URL:latest and re-resolves :latest on EVERY new revision (image-only deploys
  # included), so an enabled Cloud SQL prod DSN sitting as :latest would silently cut prod
  # over to an EMPTY `medusa` DB on the next deploy — before the restore. S1 is additive:
  # prod stays on Neon. The S2 cutover composes the prod DSN at swap time by reusing the
  # SAME medusa_app password (recoverable from the DATABASE_URL_STAGING value: swap the db
  # name medusa_staging → medusa), adds it as a new DATABASE_URL version, and redeploys.
fi

cat <<EOF

✅ Cloud SQL provisioned (private IP $PRIVATE_IP).

Verify:
  gcloud sql instances describe $INSTANCE --project=$PROJECT_ID \\
    --format='value(databaseVersion,settings.tier,settings.availabilityType,settings.backupConfiguration.pointInTimeRecoveryEnabled,ipAddresses[0].type)'
  # expect: POSTGRES_17  $TIER  ZONAL  True  PRIVATE

Connectivity probe (from a VPC context — e.g. the connector-attached staging service,
or `gcloud sql connect $INSTANCE`):
  pg_isready -h $PRIVATE_IP -p 5432

Next (Story 1.3 — rehearse on staging): pg_dump Neon staging → pg_restore into
$STAGING_DB → add the connector to medusa-web-staging → redeploy → smoke /health.
See Roadmap/09-platform-infra/postgres-neon-to-cloudsql/sprint-1.md.
EOF
