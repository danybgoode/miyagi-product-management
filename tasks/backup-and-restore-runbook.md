# Backup & Restore Runbook — miyagisanchez backend

> **Scope:** the four data stores behind the backend — **Neon** (Medusa commerce, system of record),
> **Supabase** (non-commerce: conversations/offers/favorites/supply/UCP identities), **Cloudflare R2**
> (image + digital-goods buckets), **GCP Secret Manager** (16 prod credentials). Written for
> [Backend Production Readiness, Sprint 2](../Roadmap/09-platform-infra/backend-production-readiness/sprint-2.md).
> **Drills run on staging, never prod.**

## RPO / RTO at a glance
| Store | What's in it | Backup mechanism | **RPO** | **RTO** | Status after S2 |
|---|---|---|---|---|---|
| **Neon** | Medusa products/orders/customers/carts/payments | PITR (free-tier history) **+ daily `pg_dump`→R2** | **≤6h** (PITR) · ≤24h (escrow floor) | minutes (branch restore) / minutes (escrow `pg_restore`) | retention at free **ceiling 6h**; **restore drilled** on staging ✅; escrow **LIVE** (first dump verified 2026-06-12) |
| **Supabase** | conversations, offers, favorites, supply, UCP ids | **daily `pg_dump`→R2** (was: zero backups) | ≤24h | minutes–<1h (`pg_restore`) | escrow **LIVE** (first dump verified 2026-06-12); restore drill owed |
| **R2** | product images, digital goods | escrow bucket: **lock (WORM 30d) + lifecycle** (R2 has no versioning) | n/a (object store; per-object) | per-object | escrow bucket configured ✅; app bucket lock optional |
| **Secret Manager** | Stripe/MP/Clerk/DB/JWT… (16 secrets) | versioned by GCP **+ encrypted offline escrow** | — (change-driven) | minutes | escrow procedure documented |

RPO = max data loss window; RTO = time to restore service. Figures are **targets**; the Neon PITR figure is
the live free-tier maximum (see below), the daily job is **live** (cron 09:00 UTC; first run verified 2026-06-12 — supabase 185,242 B + neon 179,760 B, read back from R2, gzip-clean, `PGDMP` magic); the Supabase restore drill was **executed 2026-06-12** (see §2) — every store's restore path is now rehearsed.

---

## 1 · Neon (commerce — system of record)
- **Project** `shiny-paper-72860331` (`medusa-bonsai`, aws-us-east-1, **Postgres 17**). Prod branch
  `main` `br-lively-cell-aqp2ivty`; staging branch `staging` `br-lucky-thunder-aqn9gj6a` (S1).
- **PITR / history retention — FREE-TIER CEILING IS 6h.** Live `history_retention_seconds = 21600` (6h).
  This is not a lowered setting: the Neon API **rejects** any higher value on this plan
  (`requested history retention seconds exceeds allowed maximum … max:"21600"`). So **24h is NOT free** —
  it needs a paid plan (Neon Launch ≈ $19/mo → 7-day history). **Decision (2026-06-11):** keep PITR at the
  free 6h ceiling **and** add Neon to the daily `pg_dump`→R2 escrow for a ~24h RPO floor at ~$0 (matches the
  Supabase anti-lock-in choice). Revisit Launch if 6h PITR proves too loose.
- **Restore options.** (a) **PITR / branch restore** within 6h — fast, in-place:
  `neonctl branches restore <branch> "^self@<ISO-ts>" --preserve-under-name <backup>` (preserves the
  pre-restore head as a new branch → reversible). (b) **Escrow `pg_restore`** from R2 for anything older
  than 6h. **Never restore prod in place without a preserved backup branch.**

### ✅ Neon restore drill — EXECUTED on the staging branch (2026-06-11)
Proved PITR restore works end-to-end, on `staging` only; prod (`br-lively-cell`) never targeted (Neon
branches are copy-on-write isolated and the command named the staging branch by id).
1. **Baseline** (staging, T0 `2026-06-11T14:27:43Z`): `product=60, "order"=17, customer=7, region=2`;
   known record `prod_01KSRYC2HZWPGEQEVN3PJ0KN4S | "Soy Miyagi"`.
2. **Introduced loss-marker** at `~14:28:33Z`: `CREATE TABLE _restore_drill` + 1 sentinel row.
   Captured pre-change timestamp **T_PRE `2026-06-11T14:28:30Z`**.
3. **Restore:** `neonctl branches restore staging "^self@2026-06-11T14:28:30Z" --preserve-under-name
   s2-drill-prerestore-20260611` → staging reset (Last Reset `15:30:06Z`); pre-restore state preserved as
   branch `s2-drill-prerestore-20260611` (`br-restless-sun-aqt5e1n4`).
4. **Verify** (staging, `15:30:20Z`): `product=60, "order"=17, customer=7, region=2` (== baseline), known
   product present, and `_restore_drill` table **gone** (`exists=false`) → PITR rolled the branch back to T_PRE.
5. **Prod untouched:** the restore named only `staging`; copy-on-write isolation guarantees `main` is
   unaffected. (Prod was not queried — honoring the "never prod" boundary.)
- **Artifact left behind:** backup branch `s2-drill-prerestore-20260611` could not be deleted ("has children"
  — staging now descends from it post-restore); harmless (~0 cost). Prune later via the Neon console if desired.

---

## 2 · Supabase (non-commerce)
- **Project** `bonsaiClerk` (`xljxqymsuyhlnorfrnno`, us-west-2, **Postgres 17**), org plan **free** →
  historically **zero backups / no PITR**: conversations, offers, favorites, supply staging, UCP identities
  were unrecoverable. ⚠️ Free projects also **auto-pause after ~7 days inactivity**.
- **Mechanism (S2): daily `pg_dump`→R2 escrow** — see
  [`infra/gcp/backups/BACKUPS.md`](../infra/gcp/backups/BACKUPS.md). Chose a hand-rolled dump over a Pro
  upgrade for a true immutable, vendor-neutral escrow (Daniel's call, 2026-06-11).
- **Restore:** pull the dated `supabase-<ts>.dump.gz` from R2 → `gunzip` → `pg_restore --no-owner
  --no-privileges --clean --if-exists` into a **scratch/staging** DB first; selective table restore via
  `pg_restore --data-only --table=<t>`. PG17 client. RTO minutes–<1h.
- **Status:** **LIVE 2026-06-12** — `backup_ro` (with `BYPASSRLS`; without it the 6 RLS tables dumped EMPTY)
  over the IPv4 session pooler; first dump verified in R2.

### ✅ Supabase restore drill — EXECUTED from the R2 escrow (2026-06-12, Daniel-authorized)
Proved the full escrow→restore path into a scratch DB (local Docker `postgres:17-alpine` — PG17
client+server, fully isolated; no cloud resources, prod untouched).
1. **Fetch:** `wrangler r2 object get "miyagi-db-escrow/supabase/2026/06/12/supabase-…dump.gz" --file … --remote`
   (185,242 B → 504,504 B unpacked).
2. **Scratch server:** `docker run -d --name sb-drill -p 127.0.0.1:54329:5432 postgres:17-alpine`; create
   `scratch_drill` DB; **pre-create the Supabase platform roles** (`anon`, `authenticated`, `service_role`, …
   as `NOLOGIN`) so RLS-policy restores don't error.
3. **Restore:** `pg_restore --no-owner --no-privileges --clean --if-exists` (PG17 binary). Exit 1 with
   **5 ignorable platform errors** — 3× the Supabase-managed `supabase_vault` extension (absent in vanilla
   Postgres; we store nothing in vault) + 2× RLS policies naming `authenticated` (cosmetic in a scratch
   verify; the role exists in real Supabase). **No data errors.**
4. **Verify — exact match against the live DB on every metric:** 49 public tables; rows
   `convs=3 · conv_events=7 · offers=3 · favs=3 · supply_batches=8 · supply_items=44`; known record
   (conversation `5a61dce0-…cb497`, 2026-05-29) present in both.
5. **Teardown:** container + image + dump deleted.
- **Gotchas for the next operator:** `docker exec` needs **`-i`** for heredoc stdin (without it psql
  silently runs nothing); expect ~5 platform errors as above — count them, don't fear them; a *real*
  recovery restores into a Supabase project (roles/extensions present), where they vanish.

---

## 3 · Cloudflare R2 (images + digital goods)
- **⚠️ Fact correction (verified live via wrangler, 2026-06-12): R2 has NO object versioning.** The
  original posture assumed S3-style versioning; R2's real immutability primitive is the **bucket lock**
  (a WORM retention rule — objects cannot be deleted or overwritten until the retention age passes), which
  is *stronger* than versioning.
- **Live config (applied via wrangler OAuth, account `f64b1f7d…`, 2026-06-12):**
  - **Escrow bucket `miyagi-db-escrow`:** created · lock rule `worm-30d` (30-day WORM retention) ·
    lifecycle rule `expire-after-35d` (auto-expire after the lock window) · API token
    `miyagi-db-escrow-backup` scoped to **only this bucket**, **Object Read & Write** (R2's least
    object-level grant; no write-only level exists), TTL forever → Secret Manager
    `R2_BACKUP_ACCESS_KEY_ID`/`R2_BACKUP_SECRET_ACCESS_KEY` v1. Net: even the backup credential itself
    cannot destroy escrow younger than 30 days.
  - **App bucket `miyagicommerce`** (the account's only other bucket — images + digital goods):
    **no lock/lifecycle** — a delete there is permanent. Optional follow-up for Daniel: a lock rule for
    the digital-goods prefix (paid files aren't re-uploadable the way images are).
- **Restore:** object store — objects under lock are recoverable by definition (undeletable); no DB-style
  restore. For `miyagicommerce`, restore = re-upload (no versioning to recover from).

---

## 4 · GCP Secret Manager (export / escrow)
- **Inventory:** 16 prod secrets (+ 10 `*_STAGING`), e.g. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `MP_ACCESS_TOKEN`, `MP_CLIENT_ID/SECRET`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `JWT_SECRET`,
  `COOKIE_SECRET`, `MEDUSA_INTERNAL_SECRET`, `ENVIA_API_KEY`, `REDIS_URL`, `TELEGRAM_BOT_TOKEN`,
  `FLAGSMITH_ENVIRONMENT_KEY`. (Names only — values never read in the audit.)
- **Risk:** losing the GCP project = losing the keys to Stripe/MP/Clerk/DB at once. GCP versions secrets, but
  there is no **off-platform** escrow.
- **Escrow procedure (quarterly, or after any rotation):**
  ```bash
  gcloud config configurations activate bonsai-profile
  PROJECT=miyagisanchezback-497722
  OUT=secrets-escrow-$(date +%Y%m%d)
  mkdir -p "$OUT" && chmod 700 "$OUT"
  for s in $(gcloud secrets list --project="$PROJECT" --format='value(name)'); do
    gcloud secrets versions access latest --secret="$s" --project="$PROJECT" > "$OUT/$s.txt"
  done
  # Encrypt the bundle with a key held OUTSIDE GCP, then delete the plaintext:
  tar -cf - "$OUT" | age -r <age-public-key> -o "$OUT.tar.age"    # or: … | gpg -e -r <you> -o "$OUT.tar.gpg"
  rm -rf "$OUT"
  # Store $OUT.tar.age in an offline/separate-account vault (NOT this GCP project).
  ```
- **Restore:** decrypt the bundle → `printf '%s' "<value>" | gcloud secrets versions add <NAME> --data-file=-`.
- **Rotation cadence** (see also `infra/gcp/STAGING.md`): `JWT_SECRET`/`COOKIE_SECRET` ≥ every 6 months (last
  rotated 2026-06-11, v1→v2) and immediately on suspected exposure; re-escrow after each rotation.

---

## Appendix — the daily escrow pipeline
Built in S2: a **Cloud Run Job `db-backup`** on a **Cloud Scheduler** daily cron dumps Supabase + Neon to R2.
Scripts + the runner-choice rationale (Cloud Run Job vs. GitHub Action) + stand-up + restore steps:
[`infra/gcp/backups/BACKUPS.md`](../infra/gcp/backups/BACKUPS.md).
