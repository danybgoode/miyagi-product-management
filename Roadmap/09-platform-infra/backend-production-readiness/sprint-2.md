# Backend Production Readiness — Sprint 2: Backups verified + restore drill

**Status:** ⬜ not started · **Risk:** HIGH (data; drill runs against staging, never prod)

> ✅ **Finalized by Sprint 0 (2026-06-11) — the HIGHEST-VALUE sprint of the epic.** Both DBs sit on **free
> tiers**: **Supabase free = ZERO backups** (conversations/offers/favorites/supply unrecoverable — the
> sharpest gap) and **Neon free = ~24h PITR only**, never drilled (commerce RPO ≤ 24h). The cheapest lever
> may be a **paid-tier upgrade** (Supabase Pro = daily backups + PITR add-on; Neon paid = longer retention)
> vs. a hand-rolled `pg_dump` — **weigh cost-vs-effort explicitly as the first task.** See the audit doc.

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

## Sprint 2 — Smoke walkthrough (do these in order)
Env: staging / data consoles

1. Open the backup-and-restore runbook → every store (Neon · Supabase · R2 · Secret Manager) has a cadence + RPO/RTO + restore steps.
2. Execute the Neon restore drill onto the **staging branch** → the restored DB matches the expected snapshot (spot-check a known record). **[owed to Daniel — Neon creds]**
3. Confirm no prod data was touched by the drill. **[owed to Daniel — verify on prod console]**

If any step fails, note the step number + what you saw.
