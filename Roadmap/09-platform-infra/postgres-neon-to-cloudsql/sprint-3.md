# Postgres → Cloud SQL — Sprint 3: Decommission + reconcile

**Status:** ✅ **Built 2026-06-22** (docs + PR hygiene + backup reconcile; no app code). Risk: **LOW–MED**.
Ran after the S2 cutover held. Closes the loop and **both** epics. The one destructive act (Neon demote) +
the `BACKUP_TARGETS` env drop are **owed to Daniel** (gated on the rollback window closing + a confirmed
Cloud SQL backup).

## Why
With commerce on Cloud SQL, the egress-symptom work is moot and several docs/consoles now lie about reality.
This sprint reconciles them, retires the superseded direction, and closes the books.

## Stories

### Story 3.1 — Retire the superseded egress-symptom work ✅
**As** a future reader, **I want** the abandoned `minScale:0` direction closed, **so that** no one merges it
later and breaks the warm-backend assumption.
**Done:**
- ✅ Closed **PR #19** (root, `minScale:0` + cron externalize) and **PR #32** (backend, in-process jobs
  removed) with a pointer comment: co-location means we **stay `min=1`** (warm), so these are unwanted;
  durable keepers were S1's egress harness + cache-policy SSOT.
- ✅ Marked [`neon-egress-and-db-isolation`](../neon-egress-and-db-isolation/README.md) README frontmatter
  **`status: archived`** ("superseded by postgres-neon-to-cloudsql; S1 measurement harness +
  `lib/cache-policy.ts` SSOT were the durable keepers"). Board regenerated (`node scripts/build-order.mjs`);
  `--check` clean. (An advisory status-drift line appears for it — frontmatter `archived` vs sprint-derived
  `in-progress` — which is the correct, non-gating signature of an abandoned/superseded epic.)

### Story 3.2 — Reconcile backups to Cloud SQL-native ✅
**As** the platform, **I want** one backup story, **so that** the custom Neon-dump machinery doesn't rot.
**Done:**
- ✅ Verified a Cloud SQL **automated backup** exists before touching coverage:
  `gcloud sql backups list --instance=medusa-pg` → `1782097256693` **SUCCESSFUL** (2026-06-22T03:00Z).
- ✅ Updated [`infra/gcp/backups/BACKUPS.md`](../../../infra/gcp/backups/BACKUPS.md): new **backup-of-record**
  table (commerce → Cloud SQL native automated backups + 7-day PITR + on-demand backup/**clone** as the
  escrow-drill / PITR rehearsal replacement for Neon branching; Supabase → R2 escrow dump **unchanged**);
  fixed the stale **"Not yet live"** status (pipeline LIVE since 2026-06-12); added a Cloud SQL **restore/PITR**
  procedure; documented the **`neon` target retirement** sequencing (keep through the rollback window, then
  drop to `BACKUP_TARGETS=supabase`).
- ✅ Commented the `neon` branch in [`db-backup.sh`](../../../infra/gcp/backups/db-backup.sh) as
  being-retired dead-code-when-dropped (left intact — the `supabase` path still uses the script).

### Story 3.3 — Demote Neon + epic close ✅ (code/docs) · ⏳ (Daniel-owed demote)
**As** the platform, **I want** Neon off the commerce path, **so that** the cross-cloud tax is gone for good.
**Decision (Daniel, 2026-06-22):** **demote** the Neon commerce project to a dev-only sandbox — **not delete**.
**Done:**
- ✅ Egress success-signal re-read recorded (see *Egress signal* below).
- ✅ Epic Definition of Done: README `status: shipped`, `RETROSPECTIVE.md`, product poster, `LEARNINGS.md`,
  team memory + `MEMORY.md`, board regen.
**Owed to Daniel (gated, destructive — do NOT run early):** demote the Neon commerce project
`shiny-paper-72860331` to a dev-only sandbox + drop the `neon` backup target. **Gate:** (a) the ~1-week Neon
rollback window from 2026-06-22 has closed **and** (b) a Cloud SQL automated backup is confirmed. See
*Neon demote* below.

## Egress signal (the epic success metric)
`node scripts/neon-egress.mjs` — re-read **2026-06-22T05:00Z** (read-only):

| Project | Egress (MB) | % of 5 GB |
|---|--:|--:|
| medusa-bonsai (commerce) | 4330.4 | 86.6% |
| **ORG TOTAL** | 4490.1 | 89.8% |

This is the **cutover-day cumulative** for the billing period (the cutover was 2026-06-22, so the
accumulated metered egress hasn't reset). The win is the **rate going to ≈0** from here: the always-on backend
now reads Cloud SQL over the private VPC (unmetered), so the commerce number should **flatline** (no further
growth) and reset low at the next billing period. **Re-read over the next several days to confirm the plateau**
— `node scripts/neon-egress.mjs` is the standing measurement. Any residual trickle = the daily `neon` backup
target (retired per Story 3.2) hitting the read-only rollback copy, which also stops once that target is dropped.

## Carry-forward residuals (not blockers)
- **Staging is half-migrated** (deferred this sprint per Daniel): `medusa-web-staging` still points at Neon;
  the empty `medusa_staging` Cloud SQL DB exists; `deploy-staging.sh` already carries the `medusa-conn`
  connector + `private-ranges-only` egress (S1). **Fix-or-retire follow-up** (a standalone MED chore, gcloud
  writes owed to Daniel): re-run `infra/gcp/provision-cloudsql.sh` to (re)create `medusa_staging_app` + a
  fresh `DATABASE_URL_STAGING`, then the S1 sprint-1.md steps 7b–13 — pg_dump Neon staging → restore into
  `medusa_staging` → repoint `DATABASE_URL_STAGING` → confirm `medusa-web-staging` boots + a catalog smoke.
  Until then staging keeps reading Neon (low risk — no traffic, scale-to-zero).
- **Real money-path test checkout** still **owed to Daniel** from S2 (the agent's S2 checkout proof was
  read-only; a live SPEI/Stripe round-trip on Cloud SQL is the remaining confirmation).

---

## Sprint 3 — Smoke walkthrough
Numbered steps; one action + one expected result each. All real commands. Destructive/Daniel-owed steps are
flagged by name. Agent steps are read-only or doc-only and already done.

**Agent-run (deterministic + read-only — done):**
1. **Action:** `node --test 'infra/gcp/test/*.test.js'`
   **Expect:** all deploy-invariant tests pass — the Cloud SQL posture still holds (`medusa-conn` connector,
   `--vpc-egress=private-ranges-only`, `--min-instances=1`, env/secret parity). No edits to the guard were
   needed; this confirms the S3 doc edits didn't disturb it.
2. **Action:** `node scripts/build-order.mjs --check`
   **Expect:** "BUILD-ORDER.md is up to date." (exit 0) — the board reflects neon-egress `archived` +
   postgres-neon-to-cloudsql `shipped`.
3. **Action:** `gh pr view 19 --json state` and `gh pr view 32 --repo danybgoode/medusa-bonsai-backend --json state`
   **Expect:** both `CLOSED`, each carrying the "superseded by postgres-neon-to-cloudsql" pointer comment.
4. **Action:** `gcloud sql backups list --instance=medusa-pg --project=miyagisanchezback-497722`
   **Expect:** at least one `SUCCESSFUL` automated backup (e.g. `1782097256693`) — the backup-of-record for
   commerce, and the gate for retiring Neon coverage.
5. **Action:** `node scripts/neon-egress.mjs`
   **Expect:** the commerce-project egress is recorded; over the days after cutover it **plateaus** (stops
   climbing) rather than continuing toward the cap — the epic success signal.

**Owed to Daniel (destructive / gated — do NOT run until the gate below is met):**
> **Gate:** the ~1-week Neon rollback window from 2026-06-22 has closed **AND** step 4 shows a `SUCCESSFUL`
> Cloud SQL backup.

6. **Action (Neon demote):** in the Neon console, take the commerce project `shiny-paper-72860331` off the
   commerce path — confirm nothing connects (backend is on Cloud SQL; the `neon` backup target is dropped in
   step 7), then treat it as a **dev-only sandbox** (keep the v1 Neon DSN documented as the dev sandbox; do
   **not** delete the project).
   **Expect:** prod commerce unaffected (it's on Cloud SQL); Neon commerce egress drops to ≈0 (re-read
   step 5).
7. **Action (drop the `neon` backup target):**
   `gcloud run jobs update db-backup --region=us-east4 --update-env-vars=BACKUP_TARGETS=supabase`
   **Expect:** the next daily `db-backup` run dumps **only** Supabase to R2; the Neon read copy is no longer
   touched. (See BACKUPS.md → "Neon target retirement".)
8. **Action (money-path, carry-forward from S2):** run a live test checkout (SPEI/Stripe) against prod.
   **Expect:** the order writes + reads cleanly against Cloud SQL — the final money-path confirmation the
   read-only S2 proof couldn't cover.
