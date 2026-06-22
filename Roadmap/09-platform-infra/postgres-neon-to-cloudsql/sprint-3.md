# Postgres → Cloud SQL — Sprint 3: Decommission + reconcile

**Status:** ⬜ Not started. Docs + GCP/Neon console + PR closes. Risk: **LOW–MED**. Runs after the S2 cutover
has held (Neon's ~1-week rollback window can still be open). Closes the loop and both epics.

## Why
With commerce on Cloud SQL, the egress-symptom work is moot and several docs/consoles now lie about reality.
This sprint reconciles them, retires the superseded direction, and closes the books.

## Stories

### Story 3.1 — Retire the superseded egress-symptom work
**As** a future reader, **I want** the abandoned `minScale:0` direction closed, **so that** no one merges it
later and breaks the warm-backend assumption.
**Acceptance:**
- Close PR **#19** (root, `minScale:0` + cron externalize) and **#32** (backend, in-process jobs removed) with a
  comment pointing here — co-location means we **stay `min=1`** (warm), so these are unwanted.
- Mark the [`neon-egress-and-db-isolation`](../neon-egress-and-db-isolation/README.md) epic README
  **`archived`** (frontmatter SSOT) with a one-line "superseded by postgres-neon-to-cloudsql; S1 measurement
  harness + cache-policy SSOT were the durable keepers." Regenerate the board (`node scripts/build-order.mjs`).
**Risk:** low (docs + PR hygiene).

### Story 3.2 — Reconcile backups to Cloud SQL-native
**As** the platform, **I want** one backup story, **so that** the custom Neon-dump machinery doesn't rot.
**Acceptance:**
- Confirm Cloud SQL **automated backups + PITR** are the backup of record; update `infra/gcp/backups/BACKUPS.md`
  (the stale Neon-dump runbook) to point at Cloud SQL backup/restore + clone (the escrow-drill replacement for
  Neon branching). Retire/neutralize the now-redundant dump scripts.
**Risk:** low–med (don't drop backup coverage in the swap — verify the Cloud SQL backup exists before retiring the old one).

### Story 3.3 — Demote/delete Neon + epic close
**As** the platform, **I want** Neon off the commerce path, **so that** the cross-cloud tax is gone for good.
**Acceptance:**
- Per Daniel's call: demote the Neon commerce project to a **dev-only sandbox** or **delete** it (only after the
  rollback window closes + a Cloud SQL backup is confirmed).
- `scripts/neon-egress.mjs` re-read recorded showing commerce egress ≈ 0 (the epic success signal).
- Epic Definition of Done: README `status: shipped`, `RETROSPECTIVE.md`, product poster (`Roadmap/README.md`)
  updated, team memory + `MEMORY.md`, and **`LEARNINGS.md`** (the durable rule: co-locate compute + DB; a
  cross-cloud DB is an egress tax + a fragility, not just a latency footnote).
**Risk:** med (deleting a DB project — gate on a confirmed Cloud SQL backup + closed rollback window).

## Sprint QA
- **deterministic gate:** all gates green; board regenerated (`build-order.mjs --check` clean).
- **live confirmation:** egress re-read ≈ 0 (agent); the Neon demote/delete is **owed to Daniel** (destructive).

## Sprint 3 — Smoke walkthrough
_Written at build time — numbered steps; flag the Neon delete + any destructive step as owed-to-Daniel, gated
on a confirmed Cloud SQL backup._
