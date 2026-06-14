# Vercel function & Fluid-CPU cost reduction — Sprint 1: Backend cron cadence

**Status:** ✅ Shipped — both stories merged to backend `main` via [PR #28](https://github.com/danybgoode/medusa-bonsai-backend/pull/28) (squash `2fa1773`); antigravity cross-review clean. Owed to Daniel: post-deploy live draw smoke (step 3).

## Stories

### Story 1.1 — Sweepstakes draw every 15 min, not every minute ✅ `2fe1bed`
**As** the platform, **I want** the sweepstakes-draw scheduled job to run every 15 min instead of every
minute, **so that** we stop spending ~43K Vercel function invocations/month (+ Fluid Active CPU) on an
idempotent no-op draw that only acts when a sweepstakes has actually ended.
**Acceptance:**
- `apps/backend/src/jobs/sweepstakes-draw.ts` schedule is `*/15 * * * *`.
- After deploy, Cloud Run logs show the job firing every 15 min (not every minute).
- A test sweepstakes past its end still draws within 15 min (idempotent; no double-draw).
- Vercel Observability: `/api/cron/sweepstakes-draw` invocations drop ~15×.
**Risk:** low (money-adjacent: draw timing shifts ≤15 min; idempotency unchanged). Built in PR #28, pending Daniel merge.

### Story 1.2 — Reconcile-checkouts every 30 min ✅ `2fa1773`
**As** the platform, **I want** the reconcile-checkouts job at `*/30` instead of `*/15`, **so that** the
incomplete-cart reconcile (not time-critical) halves its Vercel invocations.
**Acceptance:**
- `apps/backend/src/jobs/reconcile-checkouts.ts` schedule is `*/30 * * * *`.
- Cloud Run logs show it firing every 30 min; abandoned-cart handling still completes (no checkout regressions).
**Risk:** low.

## Sprint QA
- **api spec(s):** none (cron cadence is config, not a testable route behaviour). Verified via Cloud Run logs + Observability.
- **browser smoke owed:** no — but the **draw-still-fires** check is owed to Daniel (needs a live test sweepstakes past its end).
- **deterministic gate:** backend `tsc` + build green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · backend = Cloud Run (`medusa-web`, us-east4); Vercel = https://miyagisanchez.com

1. Merge PR #28 → wait for the new Cloud Run revision (`gcloud run services describe medusa-web --region=us-east4 --format='value(status.latestReadyRevisionName)'`).
   → new revision live.
2. Watch Cloud Run logs for `[sweepstakes-draw]` / `[reconcile-checkouts]` over ~30 min.
   → sweepstakes fires ~every 15 min, reconcile ~every 30 min.
3. **(Owed to Daniel — money path)** Create a test sweepstakes ending a few minutes out; confirm it draws within 15 min, exactly once.
   → winner drawn, single draw, notification sent.
4. Vercel → Observability → Functions (next day): `/api/cron/sweepstakes-draw` invocations down ~15×.
   → confirmed drop.

If any step fails, note the step number + what you saw — that's the bug report.
