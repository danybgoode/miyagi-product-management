# Backend Production Readiness — Sprint 2: Backups verified + restore drill

**Status:** ⬜ not started · **Risk:** HIGH (data; drill runs against staging, never prod)

> ⚠️ **Candidate slice — finalized by Sprint 0.** Exact backup gaps come from the S0 findings.

## Stories

### Story 2.1 — Tested restore path
**As the** owner, **I want** a **rehearsed** restore for the data stores (Neon primary; Supabase, R2, and
Secret Manager posture documented), **so that** a data-loss event is recoverable in practice, not in theory.
**Acceptance:**
- Neon PITR / backup window confirmed; a restore is **executed against the staging branch** and verified
  (row counts / a known record).
- Supabase backup cadence + restore steps documented; R2 bucket versioning/durability documented; Secret
  Manager export + rotation documented.
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
