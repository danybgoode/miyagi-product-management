# Backend Production Readiness — Sprint 2: Backups verified + restore drill

**Status:** ✅ **COMPLETE — PIPELINE LIVE 2026-06-12, both restore drills executed.** Built 2026-06-11
(PR #9 `8d8d311`); activated 2026-06-12 (PR #10 `c010bf8`): daily `pg_dump`→R2 escrow live for Supabase+Neon
(first dumps verified by read-back), Neon PITR drill on staging ✅, **Supabase escrow→scratch restore drill ✅**
(exact match vs live). Nothing owed. · **Risk:** HIGH (data; drills on staging/scratch, never prod).

> **Build:** branch `feat/backend-prod-readiness-s2`. Artifacts: `tasks/backup-and-restore-runbook.md`
> (RPO/RTO per store + the executed Neon drill log) · `infra/gcp/backups/` (`db-backup.sh`, `Dockerfile`,
> `provision-db-backup.sh`, `BACKUPS.md`). Executed live: Neon staging PITR restore drill (✅) — the prod
> Neon retention "bump to 24h" was attempted and **the free tier caps at 6h** (API rejected 86400).

> ✅ **Finalized by Sprint 0 (2026-06-11) — the HIGHEST-VALUE sprint of the epic.** Both DBs sit on **free
> tiers**: **Supabase free = ZERO backups** (conversations/offers/favorites/supply unrecoverable — the
> sharpest gap) and **Neon free PITR is actually ~6h** (a live probe corrected the audit's ≤24h assumption;
> the API rejects any higher value on the free plan), never drilled.
> **Decisions (Daniel, 2026-06-11):** (1) close both gaps with a **hand-rolled `pg_dump`→R2 escrow** (true
> immutable, vendor-neutral) rather than a paid upgrade; (2) keep Neon PITR at the free 6h ceiling and add
> Neon to the same escrow for a ~24h RPO floor at ~$0; (3) the staging restore drill executed this session.

## Stories

### Story 2.1 — Tested restore path
**As the** owner, **I want** a **rehearsed** restore for the data stores (Neon primary; Supabase, R2, and
Secret Manager posture documented), **so that** a data-loss event is recoverable in practice, not in theory.
**Acceptance:**
- **The Supabase zero-backup gap is closed** — a backup mechanism exists (plan upgrade or scheduled
  `pg_dump`) with documented cadence + restore steps. (This is the priority, not a footnote.)
- Neon PITR / backup window confirmed (free-tier figure verified with Daniel); a restore is **executed
  against the staging branch** and verified (row counts / a known record).
- R2 bucket versioning/durability documented; **Secret Manager export/escrow** + rotation documented.
- A **backup-and-restore runbook** with **RPO/RTO per store** is written into the epic / `tasks/`.
**Risk:** HIGH

## Sprint QA
- **api spec(s):** none (infra/data). Verification is the executed drill + the written runbook.
- **browser smoke owed:** yes, to Daniel — the live restore drill on staging + confirming the recovered data (he holds Neon/Supabase/GCP creds).
- **deterministic gate:** n/a (no app code) — the runbook + a successful staging restore are the artifacts.

## Sprint 2 — Smoke walkthrough (results)
Env: staging / data consoles

1. ✅ `tasks/backup-and-restore-runbook.md` covers all four stores (Neon · Supabase · R2 · Secret Manager)
   with mechanism + cadence + **RPO/RTO** + restore steps.
2. ✅ **Neon restore drill executed on the `staging` branch** (`br-lucky-thunder`): baseline (product=60,
   order=17, customer=7, region=2; known `prod_01KSRYC2HZWPGEQEVN3PJ0KN4S "Soy Miyagi"`) → introduced a
   sentinel table → PITR-restored to `T_PRE 2026-06-11T14:28:30Z` → sentinel **gone**, real counts + known
   record **intact**. Pre-restore state preserved as branch `s2-drill-prerestore-20260611`. (Drill log in the runbook.)
3. ✅ Prod untouched **by construction** — the restore named only `staging`; Neon branches are copy-on-write
   isolated. Prod was deliberately **not queried** (honoring the "never prod" boundary).

### ✅ ACTIVATED 2026-06-12 (in-session, Daniel-authorized step by step)
- **Neon:** `backup_ro` on prod (read-ok/write-denied verified) → `NEON_BACKUP_DSN` v1. *(2026-06-11)*
- **Supabase:** `backup_ro` via the Supabase MCP (password passed as a SCRAM verifier — no plaintext in any
  artifact) **+ `BYPASSRLS`** (Daniel-authorized; without it the 6 RLS tables dumped EMPTY — verified 3
  convs/offers/favs visible after) → session-pooler DSN (IPv4; direct `db.*` host is IPv6-only) as
  `SUPABASE_BACKUP_DSN` v1.
- **R2 (via wrangler OAuth + Chrome-driven dashboard):** bucket `miyagi-db-escrow` + lock `worm-30d` +
  lifecycle `expire-after-35d` + bucket-scoped Object R&W token → 4 `R2_BACKUP_*` secrets.
  **Fact fix: R2 has NO versioning — bucket LOCK (WORM) is the immutability primitive** (stronger).
- **Pipeline:** `provision-db-backup.sh` run (after fixing a real bug: `BACKUP_TARGETS=supabase,neon`'s
  comma broke `--set-env-vars` — needs gcloud `^|^` delimiter syntax, patched); Cloud Run Job `db-backup` +
  Scheduler `db-backup-daily` (09:00 UTC) + IAM grants live; **first execution ran green and both dumps
  verified in R2** (see runbook for sizes).

### Still owed to Daniel
- ~~Drill one **Supabase** `pg_restore` from the R2 escrow~~ — ✅ **EXECUTED 2026-06-12** (Daniel-authorized):
  R2 dump → Docker PG17 scratch → exact row-count + known-record match vs live (drill log in the runbook).
  **Every S2 restore path is now rehearsed; nothing remains owed on this sprint.**
- Optional: a lock rule on `miyagicommerce` for digital goods; revisit Neon Launch ($19/mo) if 6h PITR
  proves too loose.
- **Cross-agent audit (Codex, PR #9):** all 3 findings addressed in-branch — R2 token model corrected
  (no write-only level exists; bucket-scoped R&W + versioning), Scheduler service-agent
  `serviceAccountTokenCreator` grant added, escrow `age` pipe fixed.
