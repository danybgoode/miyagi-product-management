# Vercel function & Fluid-CPU cost reduction — Retrospective

_Closed: 2026-06-13_

## What shipped
A platform/infra cost-tuning epic with **no product-behaviour change** — it removes self-inflicted
waste that pushed the `miyagisanchez` Vercel project over the free-tier **Fluid Active-CPU** cap and
near the **1M function-invocation** cap.

- **S1 — Backend cron cadence** (backend [PR #28](https://github.com/danybgoode/medusa-bonsai-backend/pull/28), squash `2fa1773`).
  Sweepstakes-draw job `*/1` → `*/15` (`2fe1bed`); reconcile-checkouts `*/15` → `*/30` (`2fa1773`).
  An idempotent no-op draw was burning ~43K invocations/month for nothing.
- **S2 — `/_not-found` cost** (the #1 function by both invocations and Active CPU).
  - **2.1 Vercel Bot Protection** (dashboard toggle, no code) — **now Active**: bot-probe paths
    (e.g. `/l/wp-admin`) are denied with HTTP 403 (`x-vercel-mitigated: deny`) before any function runs.
  - **2.2 Cheap cached 404** (frontend [PR #92](https://github.com/danybgoode/miyagisanchezcommerce/pull/92), squash `db3c0a3`) —
    malformed listing/shop URLs short-circuit to a `s-maxage`-cached 404 in middleware, **before** the
    Medusa fetch, so repeat scanner hits don't pay Fluid CPU on a doomed fetch.
- **S3 — conversations/unread poll** (frontend [PR #94](https://github.com/danybgoode/miyagisanchezcommerce/pull/94), squash `507ee9c`).
  The global unread badge polled `/api/conversations/unread` every 60s from every signed-in tab —
  including backgrounded ones. Now visibility-gated (no fetch while `document.hidden`, refetch on
  return) and 60s → 150s. The 1s sweepstakes countdown timer got the same visibility pattern.

## What went well
- **Medusa-first note held:** the epic was correctly scoped as infra tuning, not a commerce feature —
  one slice touched a Medusa scheduled job's cadence, the rest were Vercel-side. No new tables, no
  migrations, no money path.
- **Independent slices, no cross-dependency** — each sprint merged on its own rail (backend Cloud Run
  for S1, Vercel preview for S2/S3) with no degrade-gracefully concern.
- **The deterministic gate + antigravity cross-review** ran clean on every PR; S3's review surfaced
  only one negligible self-healing nit (declined with rationale).

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (Build & QA / Architecture). -->
- **Visibility-gate every client poll/timer.** A `setInterval` that fetches (or just re-renders) should
  early-return unless `document.visibilityState === 'visible'` and refetch on `visibilitychange` →
  visible. A backgrounded tab then bills zero invocations; the interval can also be widened. Highest-
  leverage, lowest-risk client cost lever.
- **A managed WAF rule shadows app-level handlers for flagged paths — and applies to prod but not
  previews.** Once Vercel Bot Protection is on, a bot-probe path (`/l/wp-admin`) returns 403
  `x-vercel-mitigated: deny` *before* middleware/page, so a spec asserting the app's own 404 *shape* for
  such a path breaks **on prod only** (CI-vs-preview stays green — the firewall isn't on previews). Test
  app not-found behaviour with a benign junk slug the WAF won't flag.

## Gaps / follow-ups
- **Owed to Daniel (live smokes — DoD-permitted gaps):** S1 post-deploy draw-still-fires smoke (needs a
  live test sweepstakes past its end); S3 authed DevTools eyeball (poll pauses while backgrounded).
- **Test follow-up (flagged):** `e2e/not-found-shape.spec.ts` (S2.2) asserts 404 for `/l/wp-admin`, which
  the now-live S2.1 firewall denies with 403 on prod. Behaviour is correct (403 is cheaper than the
  app 404); the spec should accept a firewall mitigation for bot-probe paths and exercise the cheap-404
  with a non-probe junk slug. Does **not** block CI (preview-scoped). Spun off as a background task.
- **Verification of the actual cost drop** is a next-day Observability read (per each sprint walkthrough).
