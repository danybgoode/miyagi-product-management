# Backend Production Readiness — Sprint 2: Backups verified + restore drill

**Status:** ✅ **BUILT 2026-06-11** — Neon restore **drill executed** on staging (PITR proven); Supabase+Neon
`pg_dump`→R2 escrow pipeline **built** (live activation owed to Daniel); R2 + Secret-Manager posture +
RPO/RTO runbook written. · **Risk:** HIGH (data; drill ran against staging, never prod). · Daniel merges.

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

### Owed to Daniel (live activation — access not held by the build session)
- **R2:** create the escrow bucket + a bucket-scoped Object Read & Write token + versioning/lifecycle;
  enable versioning/lifecycle on the existing image + digital buckets.
- ~~**Neon** read-only role + DSN~~ — ✅ done in-session (Daniel-authorized 2026-06-11): `backup_ro` on prod
  (verified read-ok/write-denied), DSN stored as Secret Manager `NEON_BACKUP_DSN` v1.
- **Supabase:** create the **read-only** role + session-pooler DSN (SQL in `BACKUPS.md`) → `SUPABASE_BACKUP_DSN`.
- Then: drop the R2 values into Secret Manager; run `infra/gcp/backups/provision-db-backup.sh`;
  `gcloud run jobs execute db-backup --wait` and confirm the first objects land in R2; drill one
  **Supabase** `pg_restore` into a scratch DB.
- Decide later whether 6h Neon PITR warrants Neon Launch ($19/mo, 7-day history) on top of the escrow.
- **Cross-agent audit (Codex, PR #9):** all 3 findings addressed in-branch — R2 token model corrected
  (no write-only level exists; bucket-scoped R&W + versioning), Scheduler service-agent
  `serviceAccountTokenCreator` grant added, escrow `age` pipe fixed.
