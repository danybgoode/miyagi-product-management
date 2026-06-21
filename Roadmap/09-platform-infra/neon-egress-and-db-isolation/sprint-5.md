# Neon egress reduction — Sprint 5: Housekeeping (idle branches + stale docs)

**Status:** ⬜ Not started. Neon console + docs. Risk: low. Tidy-up; no egress or behaviour impact.

## Why
The spike surfaced cruft worth clearing while we're in here: idle/archived Neon branches that add storage (not
egress) clutter, and a `BACKUPS.md` status line that wrongly says the backup is "not yet live" (it has run daily
since 2026-06-12). Cheap to fix, prevents the next reader chasing a false trail.

## Stories

### Story 5.1 — Delete idle/archived Neon branches
**As** the platform, **I want** the dead Neon branches removed, **so that** the project's branch list reflects
only live branches (main + staging).
**Acceptance:**
- `s2-drill-prerestore-20260611` (drill leftover), archived `dev`, and `prewipe-backup-20260528-2030` are deleted
  after confirming none is an active restore target. `main` + `staging` remain.
- `neonctl branches list` shows only the live branches.
**Risk:** low (confirm-before-delete; these are idle/archived).

### Story 5.2 — Refresh stale infra docs
**As** a future reader, **I want** `infra/gcp/backups/BACKUPS.md` to say the backup is **live**, **so that** the
doc tracks reality.
**Acceptance:**
- The `BACKUPS.md` "Status" section is updated: pipeline LIVE since 2026-06-12, daily `0 9 * * *` UTC, verified
  (neon dump ~176 KB, supabase ~185 KB), R2 escrow confirmed.
- Any other doc found asserting the backup is "not yet live" is corrected.
**Risk:** low (docs only).

## Sprint QA
- **api spec(s):** none (console + docs).
- **browser smoke owed:** no.
- **deterministic gate:** N/A for the branch delete; docs change rides the normal commit.

## Sprint 5 — Smoke walkthrough (do these in order)
Env: Neon Console / `neonctl` · repo docs

1. `neonctl branches list --project-id shiny-paper-72860331`.
   → only `main` + `staging` remain (idle/archived branches gone).
2. Open `infra/gcp/backups/BACKUPS.md`.
   → the Status section says the pipeline is LIVE (daily since 2026-06-12), not "not yet live".
3. Confirm the daily backup still runs (it was never touched).
   → `gcloud run jobs executions list --job=db-backup --region=us-east4 --limit=1` shows a recent success.

If any step fails, note the step number + what you saw — that's the bug report.
