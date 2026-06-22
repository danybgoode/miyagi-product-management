# Postgres → Cloud SQL — Sprint 2: Production cutover

**Status:** ⬜ Not started. Prod (`medusa-web` Cloud Run + the `DATABASE_URL` secret). Risk: **HIGH** —
production commerce DB, money data, a cutover window. **Daniel executes the cutover + merges** (no autonomous
anything). Runs the rehearsed S1 runbook against prod.

## Why
S1 proved the dump→restore→repoint→verify loop on staging. This sprint runs it on **prod main** inside a short
maintenance window, with the Flagsmith checkout kill-switch off so no buyer can transact mid-swap, and Neon kept
read-only as an instant rollback.

## Stories

### Story 2.1 — Production cutover runbook (kill-switch gated)
**As** the platform, **I want** prod commerce moved onto Cloud SQL with no lost/Сorrupted money data, **so that**
the egress bill goes to zero and the backend can stay warm.
**Acceptance (the runbook — each step has a verifiable result):**
1. Flip Flagsmith `checkout.stripe_enabled` **OFF**; confirm checkout is refused (422/disabled) across UI + agents.
2. `pg_dump` Neon **main** → restore into the Cloud SQL **prod** DB (reuse S1's proven commands).
3. Swap the **`DATABASE_URL`** secret to the Cloud SQL private DSN; **redeploy** `medusa-web`; confirm the new
   revision is live AND picked up the new secret version (`gcloud run services describe … latestReadyRevisionName`
   + a config check — `:latest` secrets need a fresh revision to roll).
4. Verify: Medusa **boots clean**, `db:migrate` is a **no-op**, a **catalog read** works, and a **test checkout**
   completes (disposable/test shop; clean up after).
5. Flip `checkout.stripe_enabled` back **ON**; confirm a real checkout path works.
- **Rollback:** keep Neon **read-only ~1 week**; the revert is swapping `DATABASE_URL` back + redeploy
  (document the exact revert command).
**Risk:** high (money data, prod cutover, brief downtime).

### Story 2.2 — Keep the infra guards honest
**As** the platform, **I want** `deploy.sh` + the drift guard to reflect the Cloud SQL `DATABASE_URL` home,
**so that** a future full deploy doesn't repoint the DB back to Neon.
**Acceptance:**
- `infra/gcp/deploy.sh` + `deploy-invariants.test.js` reflect where `DATABASE_URL` now comes from; the test
  stays **green**. `min-instances` stays **1** (co-location means no `minScale:0` tradeoff — the S2 of the old
  egress epic is explicitly NOT applied).
**Risk:** med (config parity).

## Sprint QA
- **deterministic gate:** `node --test 'infra/gcp/test/*.test.js'` green; backend `tsc`/build/test:unit green if
  any backend change.
- **live confirmation (owed to Daniel — HIGH):** the kill-switch flip, the dump/restore, the secret swap +
  redeploy, the **test checkout**, and the keep/rollback call. The agent owns the API-level catalog smoke + the
  egress re-measure.
- **success signal:** `node scripts/neon-egress.mjs` shows egress flat-lining toward **zero** after cutover.

## Sprint 2 — Cutover runbook + smoke walkthrough
_Written at build time from S1's proven commands — numbered, one action + one expected result each, real prod
URLs/commands. Every money/cutover/secret step flagged **owed to Daniel**._
