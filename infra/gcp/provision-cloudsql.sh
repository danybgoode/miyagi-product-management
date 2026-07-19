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
#   PROJECT_ID=miyagisanchez-prod bash infra/gcp/provision-cloudsql.sh
#
# Needs: gcloud + openssl (password generation). Reversible: `gcloud sql instances delete medusa-pg`.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-miyagisanchez-prod}"
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
PROD_DB="${PROD_DB:-medusa}"
STAGING_DB="${STAGING_DB:-medusa_staging}"
# Per-environment login roles — NOT a shared credential. The staging secret carries the
# staging role only, scoped (by the grants below) to medusa_staging, so it can never reach
# the prod DB even on the shared instance. The prod role + password + DSN are created by S2
# at cutover (not in S1) — so no prod-capable credential exists until the cutover itself.
STAGING_USER="${STAGING_USER:-medusa_staging_app}"
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
  # `connect` creates the peering if none exists. If a peering ALREADY exists with other
  # ranges, `update --ranges` REPLACES the set — passing only our range would sever any
  # other managed-service connectivity (e.g. another private service). So when updating,
  # read the existing ranges and APPEND ours (dedup), never replace blindly.
  if gcloud services vpc-peerings connect \
       --service=servicenetworking.googleapis.com \
       --ranges="$PSA_RANGE_NAME" --network="$NETWORK" "${P[@]}" 2>/dev/null; then
    echo "  + created peering"
  else
    EXISTING_RANGES="$(gcloud services vpc-peerings list --network="$NETWORK" "${P[@]}" \
      --format='value(reservedPeeringRanges)' 2>/dev/null | tr ';,' '\n' | grep -v '^$' || true)"
    MERGED="$(printf '%s\n%s\n' "$EXISTING_RANGES" "$PSA_RANGE_NAME" | sort -u | paste -sd, -)"
    gcloud services vpc-peerings update \
      --service=servicenetworking.googleapis.com \
      --ranges="$MERGED" --network="$NETWORK" --force "${P[@]}"
    echo "  ~ updated peering ranges (appended $PSA_RANGE_NAME → $MERGED)"
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

# STAGING login role only (the prod role is S2's job — see the note at the end of this block).
# Password generated here (never echoed), persisted ONLY via the DATABASE_URL_STAGING DSN.
# Re-running with the role present leaves the password as-is (idempotent); to rotate, use
# `gcloud sql users set-password` then add a fresh DATABASE_URL_STAGING version by hand.
if gcloud sql users list --instance="$INSTANCE" "${P[@]}" \
     --format='value(name)' | grep -qw "$STAGING_USER"; then
  say "Role $STAGING_USER exists — keeping current password / staging DSN"
else
  # -base64 48 then strip non-alphanumerics and take 32 chars → GUARANTEED 32-char password
  # (stripping is lossy, so over-generate; 48 base64 bytes ≈ 64 chars pre-strip).
  STAGING_PW="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32)"
  say "Creating role $STAGING_USER + composing the STAGING DSN secret"
  gcloud sql users create "$STAGING_USER" --instance="$INSTANCE" --password="$STAGING_PW" "${P[@]}"

  # Private-IP DSN (direct TCP over the VPC; no Auth Proxy needed when egressing
  # private-ranges-only through the connector). sslmode=disable is acceptable on a
  # private VPC path; tighten to verify-full with the server CA later if desired.
  STAGING_DSN="postgres://${STAGING_USER}:${STAGING_PW}@${PRIVATE_IP}:5432/${STAGING_DB}?sslmode=disable"

  # Add a NEW version to the EXISTING DATABASE_URL_STAGING secret (created by
  # provision-staging.sh) — never rename, so the deploy-invariants name-parity guard
  # stays green. Staging is repointed to Cloud SQL THIS sprint (Story 1.3).
  printf '%s' "$STAGING_DSN" | gcloud secrets versions add DATABASE_URL_STAGING --data-file=- "${P[@]}" >/dev/null
  echo "  + added DATABASE_URL_STAGING (Cloud SQL DSN) version"
fi

# ── 5. Privileges (MUST run via a VPC-context psql — gcloud has no grant verb) ─
# A Cloud SQL DB is owned by cloudsqlsuperuser; on PG15+ the `public` schema does NOT grant
# CREATE to all roles, so a plain login role's pg_restore / Medusa migrations FAIL with
# permission errors. Grant the staging role ownership of its schema, and (defence in depth
# on the shared instance) REVOKE cross-DB CONNECT from PUBLIC so the staging role can't even
# connect to the prod DB. Run this ONCE, connected as the `postgres` admin user from a VPC
# context (the rehearsal session in sprint-1.md, steps 7–8):
#
#   ALTER DATABASE medusa_staging OWNER TO medusa_staging_app;
#   \c medusa_staging
#   GRANT ALL ON SCHEMA public TO medusa_staging_app;
#   ALTER SCHEMA public OWNER TO medusa_staging_app;
#   REVOKE CONNECT ON DATABASE medusa FROM PUBLIC;          -- staging role can't reach prod DB
#   REVOKE CONNECT ON DATABASE medusa_staging FROM PUBLIC;
#   GRANT  CONNECT ON DATABASE medusa_staging TO medusa_staging_app;
#
# ⚠️ DELIBERATELY no prod DATABASE_URL version + no prod role here. prod medusa-web binds
# DATABASE_URL:latest and re-resolves :latest on EVERY new revision (image-only deploys
# included), so an enabled Cloud SQL prod DSN as :latest would silently cut prod over to an
# EMPTY `medusa` DB on the next deploy. S1 is additive — prod stays on Neon. The S2 cutover
# creates a SEPARATE prod role (`medusa_app`) with its own fresh password, composes the prod
# DSN, adds it as a new DATABASE_URL version, applies the mirror grants on the `medusa` DB,
# and redeploys — all inside the maintenance window. No credential is shared across envs.

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
