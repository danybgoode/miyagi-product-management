# Neon egress reduction — Sprint 2: Backend quiet (minScale trial + job-cadence audit)

**Status:** ⬜ Not started. Backend + infra (Cloud Run us-east4, ~12 min, **no preview**). Risk: **HIGH** —
shared backend infra; `minScale` affects every storefront request's latency; the scheduled jobs are
money-adjacent. **Daniel merges/executes.** This sprint attacks the **validated dominant cause** (the ~190
MB/day "no shoppers" background bleed).

## Why
The backend runs `minScale: 1`, so a Medusa instance is always up holding a Neon connection pool and running
background loops — keeping Neon's `main` endpoint ~84% active and reading continuously even with zero shoppers.
Letting the backend idle when truly quiet (and slowing any over-eager job) directly cuts the baseline egress
(and Cloud Run cost). The tradeoff is **Medusa cold-start latency** (~10–30 s) on the first storefront hit
after an idle window — acceptable to **trial** given current near-zero traffic, measured before committing.

## Stories

### Story 2.1 — Audit + right-size Medusa scheduled-job / event-bus cadence
**As** the platform, **I want** every always-on backend loop's cadence matched to its real freshness need,
**so that** the idle backend stops issuing needless Neon queries.
**Acceptance:**
- Enumerate `apps/backend/src/jobs/*` + any event-bus/poller config; for each, record its current cadence and
  the freshness it actually needs (same lens as vercel-function-cost-reduction S1).
- Widen any over-tight cadence (with rationale); no money-adjacent job (reconcile, draw) loses correctness or
  idempotency.
- Cloud Run logs confirm the new cadences after deploy.
**Risk:** high (money-adjacent jobs; backend shared infra).

### Story 2.2 — Trial `minScale: 0` and measure the egress delta
**As** the platform, **I want** the backend to scale to zero when idle (or min=1 only during active hours),
**so that** the Neon `main` compute can autosuspend and the ~190 MB/day baseline read bleed stops.
**Acceptance:**
- `medusa-web` `minScale` lowered (to `0`, or a scheduled/business-hours min) via the deploy path; the change
  is reflected in `infra/gcp/deploy.sh` so it isn't lost on the next image-only deploy, and
  `infra/gcp/test/deploy-invariants.test.js` stays **green** (update the invariant if the expected value changes).
- After the change, Neon's `main` endpoint is observed **autosuspending** during idle windows (`neonctl` /
  project API active-time drops materially from ~84%).
- The Story-1.1 egress reading shows a clear drop attributable to this lever (record it).
- Cold-start behaviour is acknowledged: first storefront hit after idle is slower; confirm it's within an
  acceptable bound for current traffic (Daniel's call — this is the keep/revert decision point).
**Risk:** high (latency for all visitors; reversible by redeploy — the built-in "kill switch").

## Sprint QA
- **api spec(s):** none new for the cadence change (config, not route behaviour) — verified via Cloud Run logs +
  Neon active-time. Keep `deploy-invariants.test.js` green as the deterministic infra gate.
- **browser smoke owed:** **Daniel** — the post-idle cold-start latency eyeball on a real storefront load, and
  the keep-vs-revert call on `minScale`.
- **deterministic gate:** backend `tsc` + build + `npm run test:unit`; `node --test infra/gcp/test/*.js` green.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · backend = Cloud Run (`medusa-web`, us-east4) · Neon project `shiny-paper-72860331`

1. Merge the cadence change (2.1) → wait for the new Cloud Run revision
   (`gcloud run services describe medusa-web --region=us-east4 --format='value(status.latestReadyRevisionName)'`).
   → new revision live; logs show the widened job cadences.
2. Apply the `minScale` change (2.2) → confirm `deploy.sh` + the invariant test reflect it.
   → `node --test infra/gcp/test/deploy-invariants.test.js` passes; service shows the new minScale.
3. Leave the storefront idle ~15–30 min, then query the Neon `main` endpoint state.
   → endpoint has **autosuspended** (was permanently active before).
4. **(Owed to Daniel — latency eyeball)** Load https://miyagisanchez.com/s/<test-shop> as the first hit after idle.
   → page loads after a cold-start delay (~10–30 s); decide if acceptable. If not → revert minScale (redeploy).
5. Re-run the Story-1.1 egress script after ~2–3 days.
   → org egress materially down vs the S1 baseline (this is the sprint's success signal).

If any step fails, note the step number + what you saw — that's the bug report.
