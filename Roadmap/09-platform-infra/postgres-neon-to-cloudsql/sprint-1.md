# Postgres → Cloud SQL — Sprint 1: Provision Cloud SQL + rehearse on staging

**Status:** ✅ **Merged (PR #20).** Code complete; instance provisioned + validated live; Story 1.2 parity
done (no blocker). **Story 1.3 rehearsal is the one in-VPC step that carries to S2** — it can't run from a
laptop/sandbox (private-IP-only instance, needs a PG17 client inside the VPC), so its exact command sequence
(steps 7b–13) is the **ready S2 runbook**. Infra (root repo `infra/gcp`) + a `medusa-web-staging` repoint.
Risk: **MED** — additive; nothing prod cut over. The point of this sprint was to **stand up + de-risk the
migration pattern** before touching prod; the dump/restore numbers get captured when S2 runs the runbook in-VPC.

**Shipped (code):**
- 1.1 — `infra/gcp/provision-cloudsql.sh`: idempotent PG17 / private-IP / single-zone / 7-day-PITR provisioner
  (PSA on the `default` VPC → instance `medusa-pg` → `medusa` + `medusa_staging` DBs → `medusa_app` user →
  DSN versions on `DATABASE_URL` / `DATABASE_URL_STAGING`). `db-g1-small` shared-core, PITR-fallback note.
- 1.3 (repoint half) — `infra/gcp/deploy-staging.sh`: `medusa-web-staging` now egresses `private-ranges-only`
  through the shared `medusa-conn` connector so it can reach the Cloud SQL private IP. Redis stays OFF.
- 1.4 — `infra/gcp/test/deploy-invariants.test.js`: new invariant locks the VPC-connector + private-egress
  flags on **both** deploy scripts. `node --test 'infra/gcp/test/*.test.js'` green (17/17).

**Live state (validated 2026-06-22):** Daniel ran `provision-cloudsql.sh`. Instance `medusa-pg` is **RUNNABLE**
— `POSTGRES_17 · db-g1-small · ZONAL · PITR=True (7 backups / 7 log-days) · PRIVATE IP 172.25.0.3` on the
`default` VPC, with databases `medusa` + `medusa_staging` and user `medusa_app`. Story 1.2 parity read done
(below): **no extension blocker.**

**⚠️ Owed to Daniel — restore prod-backend deployability (do before any backend `main` deploy):**
The first version of `provision-cloudsql.sh` wrote the Cloud SQL **prod** DSN as `DATABASE_URL` **version 2**.
prod `medusa-web` binds `DATABASE_URL:latest` and **re-resolves `:latest` on every new revision**, so an
image-only deploy would have silently cut prod over to the **empty** `medusa` DB. The script is now fixed to
never write the prod DSN in S1.

**Key Secret-Manager fact (learned 2026-06-22):** the `latest` *alias* is the **highest version NUMBER**,
**not** the highest *enabled* version — so neither **disabling** nor **destroying** v2 makes `:latest` fall
back to v1; `access latest` keeps erroring on v2 ("DISABLED"/"DESTROYED"), which **blocks new prod revisions**
(fail-closed — the running revision is unaffected, prod still serves on Neon). v2 has been **destroyed** (a
destroyed slot can't be reclaimed). The **only** remediation is to **add a new version** carrying the current
Neon DSN so `:latest` = that enabled version:
```bash
PROJECT=miyagisanchezback-497722
gcloud secrets versions access 1 --secret=DATABASE_URL --project=$PROJECT \
  | gcloud secrets versions add DATABASE_URL --project=$PROJECT --data-file=-   # → v3 = Neon, enabled
gcloud secrets versions access latest --secret=DATABASE_URL --project=$PROJECT >/dev/null && echo "latest OK (Neon)"
```
_Safe to defer if S2 is imminent_ — the blocked-deploy state **self-heals at the S2 cutover** (which adds the
Cloud SQL prod DSN as the new latest). The only exposure is a backend **hotfix** deploy in the meantime.

At S2, the prod DSN is composed fresh: create a **separate `medusa_app`** prod role with its own password,
apply the mirror grants on the `medusa` DB, add the DSN as a new `DATABASE_URL` version, then redeploy at
cutover. No credential is shared across envs.

**Owed to Daniel — staging rehearsal (1.3) needs a PG17 client + VPC access:** the instance is **private-IP
only**, so the dump→restore can't run from a laptop/sandbox outside the VPC, and `pg_dump` must be **PG17**
(local default is often 14, which refuses a PG17 server). Run it from a VPC-context PG17 client — `gcloud sql
connect` with a temporary client, or a one-off connector-attached Cloud Run Job. Steps 8–13 below are the
exact commands; the agent has proven the Neon-side read (step 6) and prepared the staging repoint (deploy
script + connector).

> **Role reconciliation (cross-review hardening, applied to the script):** the live instance was first
> provisioned by the v1 script with a single `medusa_app` role and a staging DSN using it. The script now
> creates a **separate, DB-scoped `medusa_staging_app`** role (so the staging secret can't reach prod) and
> writes the staging DSN with it. **Re-run `provision-cloudsql.sh`** (idempotent) to create the new role +
> a fresh `DATABASE_URL_STAGING` version, then apply the **step 7b** grants. The old `medusa_app` role can
> stay (unused) — S2 repurposes it as the prod role with a fresh password.

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
   → ends with `✅ Cloud SQL provisioned (private IP <addr>).` where `<addr>` is an RFC-1918 private IP
   (the live instance is `172.25.0.3`); a re-run prints `= exists:` / role-create lines only.
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
   | `plpgsql` | 1.0 | ✅ built-in (default) | Always present on Cloud SQL PG17 — no action needed |

   **Result (read 2026-06-22):** Neon `main` is **PostgreSQL 17.10**; the *only* installed extension is
   `plpgsql 1.0` (Postgres' built-in default, present on every Cloud SQL PG17 database). **No extension
   blocker for S2.** (Cloud SQL-side `pg_available_extensions` confirmation is moot for a built-in, and the
   instance is private-IP-only so it isn't reachable from outside the VPC anyway — see the rehearsal note.)

### D · Rehearse the migration on staging — Story 1.3
7b. **Grant staging-role privileges** (run ONCE, as the `postgres` admin, from a VPC-context psql —
    `gcloud sql connect`). Cloud SQL DBs are owned by `cloudsqlsuperuser`; on PG15+ the `public` schema
    grants no CREATE to a plain role, so the restore/migrations fail without this. Also revokes cross-DB
    CONNECT so the staging role can't reach the prod DB on the shared instance:
    ```sql
    ALTER DATABASE medusa_staging OWNER TO medusa_staging_app;
    \c medusa_staging
    GRANT ALL ON SCHEMA public TO medusa_staging_app;
    ALTER SCHEMA public OWNER TO medusa_staging_app;
    REVOKE CONNECT ON DATABASE medusa FROM PUBLIC;
    REVOKE CONNECT ON DATABASE medusa_staging FROM PUBLIC;
    GRANT  CONNECT ON DATABASE medusa_staging TO medusa_staging_app;
    ```
    → no errors; `\l medusa_staging` shows owner `medusa_staging_app`.
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
