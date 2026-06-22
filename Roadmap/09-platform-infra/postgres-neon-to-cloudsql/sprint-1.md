# Postgres → Cloud SQL — Sprint 1: Provision Cloud SQL + rehearse on staging

**Status:** 🏗️ **Code complete; live provisioning + rehearsal owed to Daniel** (paid gcloud writes).
Infra (root repo `infra/gcp`) + a `medusa-web-staging` repoint. Risk: **MED** — additive; nothing prod is cut
over. Daniel runs the gcloud writes (Cloud SQL **bills on creation**). The point of this sprint is to **prove
the entire migration pattern on the low-risk staging service** before touching prod.

**Shipped (code):**
- 1.1 — `infra/gcp/provision-cloudsql.sh`: idempotent PG17 / private-IP / single-zone / 7-day-PITR provisioner
  (PSA on the `default` VPC → instance `medusa-pg` → `medusa` + `medusa_staging` DBs → `medusa_app` user →
  DSN versions on `DATABASE_URL` / `DATABASE_URL_STAGING`). `db-g1-small` shared-core, PITR-fallback note.
- 1.3 (repoint half) — `infra/gcp/deploy-staging.sh`: `medusa-web-staging` now egresses `private-ranges-only`
  through the shared `medusa-conn` connector so it can reach the Cloud SQL private IP. Redis stays OFF.
- 1.4 — `infra/gcp/test/deploy-invariants.test.js`: new invariant locks the VPC-connector + private-egress
  flags on **both** deploy scripts. `node --test 'infra/gcp/test/*.test.js'` green (17/17).

**Owed to Daniel (live, paid):** run `provision-cloudsql.sh` (1.1); the version/extension parity read (1.2)
and the staging dump→restore→repoint→smoke (1.3) run against the live instance once it exists — see the smoke
walkthrough below.

## Why
Co-locating Postgres on GCP kills the egress problem at the root (see epic README). Before the prod cutover, we
stand up Cloud SQL and run the full dump→restore→repoint→verify loop against **staging** — so the S2 prod
cutover is a rehearsed, known-good runbook, not a first attempt on money data.

## Stories

### Story 1.1 — Provision Cloud SQL (PG17, private IP, single-zone + PITR)
**As** the platform, **I want** a managed Postgres on GCP co-located with the backend, **so that** commerce
DB traffic stays inside the VPC (no cross-cloud egress) and the DB is reachable like Redis already is.
**Acceptance:**
- Cloud SQL for PostgreSQL **17** instance in **us-east4**, **private IP** on the existing VPC via Private
  Service Access (the network the `medusa-conn` connector + Redis `10.x` already use), **single-zone**,
  **7-day PITR + automated backups** enabled, smallest practical tier (document the choice + ~$/mo).
- A **prod** database and a **staging** database on the instance; a DB user/password stored as a secret (or the
  `DATABASE_URL` value composed for each service).
- Provisioning captured as an **idempotent script** under `infra/gcp` (create-if-absent, same shape as
  `provision-monitoring.sh`); `sqladmin.googleapis.com` enablement included.
- The backend VPC can **reach** the instance's private IP (a connectivity probe from a VPC context succeeds).
**Risk:** med (new paid infra; networking). Reversible (delete the instance).

### Story 1.2 — Verify version + extension parity (blocker check)
**As** the migrator, **I want** to confirm Cloud SQL supports everything Neon's schema uses, **so that** the
restore can't fail mid-cutover on an unsupported extension.
**Acceptance:**
- Enumerate Neon `main`'s installed extensions (`\dx`) + server version; confirm each is available + enabled on
  Cloud SQL PG17 (Cloud SQL has an allow-list). Any gap is surfaced as a **blocker** with a remediation note.
**Risk:** low (read-only investigation) — but gates S2.

### Story 1.3 — Rehearse the full migration on staging
**As** the platform, **I want** the dump→restore→repoint→verify loop proven on `medusa-web-staging`, **so that**
the prod cutover runbook is known-good.
**Acceptance:**
- `pg_dump` Neon **staging** → restore into the Cloud SQL **staging** DB (record the exact commands + timing).
- Repoint `medusa-web-staging`'s `DATABASE_URL` to the Cloud SQL private DSN; redeploy; confirm Medusa **boots
  clean**, migrations are a **no-op**, and a **catalog read** smoke passes against staging.
- The proven commands + timings are written into this sprint's smoke walkthrough → become the S2 runbook.
**Risk:** med (staging only; no money path).

## Sprint QA
- **deterministic gate:** `node --test 'infra/gcp/test/*.test.js'` green (any new invariant for the staging
  `DATABASE_URL` home stays consistent); provisioning script `bash -n` clean.
- **live confirmation:** staging Medusa boots + catalog smoke against Cloud SQL (agent-runnable); the gcloud
  provisioning writes are **owed to Daniel** (paid infra).
- **no prod change** this sprint.

## Sprint 1 — Smoke walkthrough
_Numbered steps, one action + one expected result each, real commands. Steps tagged **[OWED-DANIEL]** create
paid infra / need creds the build session doesn't hold; the rest are agent-runnable once the instance exists.
This walkthrough doubles as the proven command list the S2 prod runbook is derived from._

Set up the shell once:
```bash
gcloud config configurations activate bonsai-profile   # leroytramafat@gmail.com
PROJECT=miyagisanchezback-497722
REGION=us-east4
INSTANCE=medusa-pg
```

### A · Deterministic gate (agent-runnable, pre-merge — already green)
1. **Run the infra guard.**
   `node --test 'infra/gcp/test/*.test.js'`
   → **17/17 pass**, including `deploy.sh` + `deploy-staging.sh` "egresses … via the medusa-conn VPC connector".
2. **Syntax-check the scripts.**
   `bash -n infra/gcp/provision-cloudsql.sh && bash -n infra/gcp/deploy-staging.sh`
   → no output, exit 0.

### B · Provision Cloud SQL — Story 1.1 **[OWED-DANIEL · paid: Cloud SQL bills on creation]**
3. **Provision (idempotent).**
   `PROJECT_ID=$PROJECT bash infra/gcp/provision-cloudsql.sh`
   → ends with `✅ Cloud SQL provisioned (private IP 10.x.x.x).`; a re-run prints `= exists:` lines only.
4. **Confirm the instance shape.**
   ```bash
   gcloud sql instances describe $INSTANCE --project=$PROJECT \
     --format='value(databaseVersion,settings.tier,settings.availabilityType,settings.backupConfiguration.pointInTimeRecoveryEnabled,ipAddresses[0].type)'
   ```
   → `POSTGRES_17  db-g1-small  ZONAL  True  PRIVATE`.
   _(If step 3 errored that the shared-core tier can't enable PITR: re-run with `TIER=db-custom-1-3840`
   and expect that tier instead — note the swap here.)_
5. **Confirm the databases + user.**
   `gcloud sql databases list --instance=$INSTANCE --project=$PROJECT --format='value(name)'`
   → includes `medusa` and `medusa_staging`.

### C · Version + extension parity — Story 1.2 (blocker check; gates S2)
6. **Read Neon's server version + extensions** (Neon commerce project `shiny-paper-72860331`, `main` branch).
   Connect with any PG17 client to the Neon `main` DSN, then:
   `SHOW server_version;` → **17.x**.
   `SELECT extname, extversion FROM pg_extension ORDER BY extname;` → record every row.
7. **Confirm each extension is available on Cloud SQL PG17.**
   `gcloud sql connect $INSTANCE --user=medusa_app --database=medusa --project=$PROJECT` then
   `SELECT name FROM pg_available_extensions WHERE name = ANY(ARRAY[<neon ext names>]);`
   → every Neon extension appears. **Any missing one is a HARD BLOCKER for S2** — record it + a remediation
   note in the table below.

   | Neon extension | version | On Cloud SQL PG17? | Note |
   |---|---|---|---|
   | _(fill in at run time — Medusa core is typically extension-light: expect `plpgsql` only)_ | | | |

### D · Rehearse the migration on staging — Story 1.3
8. **Dump Neon staging** (PG17 client; record timing).
   `time pg_dump --format=custom --no-owner --no-privileges "$NEON_STAGING_DSN" -f /tmp/staging.dump`
   → a `/tmp/staging.dump` file; note the elapsed time.
9. **Restore into Cloud SQL `medusa_staging`** (from a VPC-context client — `gcloud sql connect`, or a
   one-off connector-attached Cloud Run Job; record which).
   `time pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$CLOUDSQL_STAGING_DSN" /tmp/staging.dump`
   → completes; row counts on a spot table match Neon. Note the elapsed time.
10. **Repoint + redeploy staging** (image-only — the new `DATABASE_URL_STAGING` Cloud SQL version is picked up,
    and the connector flags from this sprint now attach).
    `CLERK_PUBLISHABLE_KEY='pk_test_…' SKIP_BUILD=1 IMAGE=<current staging image> bash infra/gcp/deploy-staging.sh`
    → a new revision rolls; `gcloud run services describe medusa-web-staging --region=$REGION --format='value(status.latestReadyRevisionName)'` advances.
11. **Confirm Medusa boots clean against Cloud SQL.**
    `curl -s -o /dev/null -w '%{http_code}\n' https://<staging-url>/health`
    → **200**.
12. **Confirm migrations are a no-op** (schema already current from the restore). In the backend repo / a
    connector-attached context: `npx medusa db:migrate`
    → "No migrations to run" (or equivalent); no schema changes.
13. **Catalog read smoke** (proves real data round-trips from Cloud SQL).
    `curl -s "https://<staging-url>/store/products?limit=1" -H "x-publishable-api-key: <staging pak>" | head -c 200`
    → a JSON product payload (not an error), confirming the restored catalog reads back.

### Result
After D, `medusa-web-staging` runs entirely on **Cloud SQL** (private IP, intra-VPC) and is **left there** as
the canary for the target architecture. The exact dump/restore commands + timings from steps 8–9 become the
**S2 prod cutover runbook**. **No prod change occurred** — `medusa-web` and its live `DATABASE_URL` are untouched.
