# DB → R2 escrow backups — runbook

Daily `pg_dump` of the **Supabase** (non-commerce) and **Neon** (commerce) databases to a **Cloudflare R2**
bucket, as off-platform, vendor-neutral, immutable escrow. Built in
[Backend Production Readiness, Sprint 2](../../../Roadmap/09-platform-infra/backend-production-readiness/sprint-2.md).
The cross-store RPO/RTO + restore procedures live in the central
[`tasks/backup-and-restore-runbook.md`](../../../tasks/backup-and-restore-runbook.md); this file is the
pipeline's own operate doc.

## Why this shape (the runner decision)
Evaluated **GitHub Action** vs. **Cloud Run Job + Cloud Scheduler**; chose the latter because it keeps the
architectural surface smaller:
- **Credentials** stay in **GCP Secret Manager** (the platform's existing store, per-secret least-privilege
  SA bindings, Cloud Audit Logs) — *not* a second store (GitHub Secrets), and the Supabase/R2 keys aren't
  GCP-issued so OIDC/WIF couldn't remove them from GitHub anyway.
- **Image** is purpose-built and **PG17-pinned** (`postgres:17-alpine`), solving the version-mismatch that
  bites any host with an older `pg_dump`; it lives in Artifact Registry and is CVE-scannable (S4).
- **Observability** is one rail: failures land in Cloud Logging and ping the same Telegram channel
  (`MiyagiDevopsTele` / `TELEGRAM_CICD_CHAT_ID`) the rest of the backend uses. GitHub cron is also
  best-effort (can be delayed/skipped) and the backend code is a separate repo from these `infra/` scripts.

Immutability + anti-lock-in come from the **destination and format** (R2 with a **bucket lock** (WORM
retention — R2 has no object versioning) + lifecycle + a bucket-scoped token, and a plain `pg_dump`
custom-format dump restorable by any PG17 client) — independent of the runner.

## Topology
| | |
|---|---|
| Runner | Cloud Run **Job** `db-backup` (region `us-east4`, SA `medusa-backup`, max-retries 1, 900s, 512Mi) |
| Schedule | Cloud Scheduler `db-backup-daily`, cron `0 9 * * *` UTC (≈ 03:00 CDMX) → `:run` the job |
| Image | `us-east4-docker.pkg.dev/<project>/medusa-ops/db-backup:<tag>` (`postgres:17-alpine` + rclone) |
| Targets | `supabase` + `neon` (env `BACKUP_TARGETS`) |
| Destination | `r2:<bucket>/<target>/YYYY/MM/DD/<target>-<ts>.dump.gz` |
| Alerts | non-zero exit → Cloud Run Job failure (S4 alert) + best-effort Telegram |

## Secret map (Secret Manager, populated by Daniel)
| Secret | Value |
|---|---|
| `SUPABASE_BACKUP_DSN` | a **read-only** role DSN on the Supabase DB (`postgresql://backup_ro:…@db.<ref>.supabase.co:5432/postgres`) |
| `NEON_BACKUP_DSN` | a **read-only** role DSN on the Neon prod branch (`…?sslmode=require`) |
| `R2_BACKUP_ACCESS_KEY_ID` / `R2_BACKUP_SECRET_ACCESS_KEY` | an R2 API token scoped to **only the escrow bucket**, permission **Object Read & Write** (R2 has no write-only level; the read half powers the job's upload verification — escrow immutability comes from the bucket **lock rule** (WORM): even this credential cannot delete/overwrite objects younger than the retention age) |
| `R2_BACKUP_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CICD_CHAT_ID` | reused (already exist) for failure alerts |

`R2_BACKUP_BUCKET`, `BACKUP_TARGETS`, `RETENTION_DAYS` are plain job env (not secret).

## Stand it up (owed to Daniel — needs R2 + Supabase access I don't hold)
```bash
# 0. (Cloudflare) Create bucket `miyagi-db-escrow`; add a LOCK rule (WORM retention, e.g. 30d
#    — R2 has NO object versioning; the lock is the immutability guarantee) + a LIFECYCLE
#    rule (expire after the lock window, e.g. 35d). Create an API token scoped to ONLY this
#    bucket with permission "Object Read & Write" (R2's least object-level grant).
#    Done 2026-06-12 via wrangler: lock worm-30d + lifecycle expire-after-35d + token.
# 1. (Supabase + Neon) Create a read-only role on each DB:
#       CREATE ROLE backup_ro LOGIN PASSWORD '…';
#       GRANT pg_read_all_data TO backup_ro;     -- PG14+; else GRANT SELECT on schemas
#    Build the two DSNs.
# 2. Provision (creates SA + secret shells + image + Job + Scheduler; idempotent):
gcloud config configurations activate bonsai-profile
export R2_BACKUP_BUCKET='miyagi-db-escrow'
export R2_ACCESS_KEY_ID='…' R2_SECRET_ACCESS_KEY='…' R2_ENDPOINT='https://<acct>.r2.cloudflarestorage.com'
export SUPABASE_DSN='postgresql://backup_ro:…@db.<ref>.supabase.co:5432/postgres'
export NEON_DSN='postgresql://backup_ro:…@<neon-host>/neondb?sslmode=require'
bash infra/gcp/backups/provision-db-backup.sh
# 3. First run on-demand + confirm objects land in R2:
gcloud run jobs execute db-backup --region=us-east4 --wait
gcloud run jobs executions list --job=db-backup --region=us-east4 --limit=1   # expect Succeeded
#    Then confirm r2:miyagi-db-escrow/{supabase,neon}/<today>/… exist (Cloudflare dashboard).
```

## Restore from an escrow dump
The dump is `--format=custom`, so use `pg_restore` (NOT psql). **Restore into a staging/scratch DB first** —
never straight over prod.
```bash
# Pull the object from R2 (any S3 client / rclone), then:
gunzip -c supabase-<ts>.dump.gz > restore.dump
# Full restore into an empty target DB:
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$TARGET_DSN" restore.dump
# Selective (single table) restore:
pg_restore --no-owner --data-only --table=marketplace_offers --dbname="$TARGET_DSN" restore.dump
```
Use a **PG17** `pg_restore` (matches the dump). RTO is a few minutes for the non-commerce volume.

## Status
Pipeline **built** (scripts + image recipe + provisioning). **Not yet live** — the R2 bucket/token + the two
read-only DSNs are owed to Daniel (no Cloudflare access from the build session). Until provisioned + a first
run confirmed, treat Supabase/Neon escrow as *designed, not yet running*.
