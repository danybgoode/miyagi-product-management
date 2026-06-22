# Neon egress reduction — Sprint 2: Backend quiet (externalize crons → minScale:0 trial → measure)

**Status:** 🏗️ Built, awaiting Daniel merge/execute. Backend + infra (Cloud Run us-east4, ~12 min, **no
preview**). Risk: **HIGH** — shared backend infra; `minScale` affects every storefront request's latency; the
scheduled jobs are money-adjacent. **Daniel merges/executes** (no autonomous merge). This sprint attacks the
**validated dominant cause** (the ~190 MB/day "no shoppers" background bleed).

- Story 2.1 ✅ Audit (VALIDATE-FIRST — already right-sized; documented below, no code).
- Story 2.2 🏗️ Externalize the two crons → Cloud Scheduler — backend PR (`apps/backend`, jobs removed) +
  `infra/gcp/provision-cron-scheduler.sh` (root repo). **Prereq for 2.3.**
- Story 2.3 🏗️ Trial `minScale: 0` + measure — `infra/gcp/deploy.sh` (min 1→0) + new minScale invariant in
  `infra/gcp/test/deploy-invariants.test.js`. Uptime check paused during the measurement window.

## Why
The backend ran `minScale: 1`, so a Medusa instance was always up holding a Neon connection pool and running
background loops — keeping Neon's `main` endpoint ~84% active and reading continuously even with zero shoppers.
Letting the backend idle when truly quiet directly cuts the baseline egress (and Cloud Run cost). The tradeoff
is **Medusa cold-start latency** (~10–30 s) on the first storefront hit after an idle window — acceptable to
**trial** given current near-zero traffic, measured before committing.

**Two decisions Daniel made when this sprint was planned** (they shaped the work):
1. **Pause the uptime check for the trial window.** `provision-monitoring.sh` runs a GCP uptime check on
   `api.miyagisanchez.com/health` **every 5 min**. Cloud Run only idles to zero after ~15 min of no requests,
   so that ping would keep Medusa warm and **defeat `minScale:0`**. We delete the check for the ~2–3 day window
   and restore it after (re-run the idempotent `provision-monitoring.sh`). Outage detection is paused on
   near-zero traffic — acceptable for a short trial; an owed-to-Daniel operational step.
2. **Externalize the money-adjacent crons FIRST.** With `min=0` an in-process Medusa scheduled job can't fire
   while the instance is scaled to zero. `reconcile-checkouts` (payment safety-net) and `sweepstakes-draw`
   (fairness-adjacent) moved to **Cloud Scheduler** before the `min=0` trial, so cron reliability never depends
   on instance warmth.

## Stories

### Story 2.1 — Audit scheduled-job / event-bus cadence (VALIDATE-FIRST)
**As** the platform, **I want** every always-on backend loop's cadence matched to its real freshness need,
**so that** the idle backend stops issuing needless Neon queries.

**Finding: the cadence lever was already pulled, and the in-process jobs don't read Neon anyway.**

| Loop | Cadence | Touches Neon? | Action |
|---|---|---|---|
| `src/jobs/reconcile-checkouts.ts` | `*/30` (right-sized in vercel-cost-reduction) | No — `fetch(SITE_URL/api/cron/reconcile-checkouts)` (Vercel) | **Externalized** to Cloud Scheduler (2.2), file removed |
| `src/jobs/sweepstakes-draw.ts` | `*/15` (was `* * * * *`; widened in vercel-cost-reduction) | No — `fetch(SITE_URL/api/cron/sweepstakes-draw)` (Vercel) | **Externalized** to Cloud Scheduler (2.2), file removed |
| Event bus | n/a | Redis (`event-bus-redis`) | No Neon polling to widen |
| Workflow engine | n/a | Redis (`workflow-engine-redis`) | No Neon polling to widen |
| Locking | n/a | Redis (`locking-redis`) | n/a |
| `livenessProbe GET /health` | every 30 s (only while an instance runs) | shallow | Stops entirely once the instance scales to zero (2.3) |

**Conclusion:** there is no over-tight Neon-side cadence left to widen — the app jobs were already right-sized
and hit Vercel, not Neon, and the buses are Redis-backed. The real "backend quiet" win is **2.3** (idle the
instance so the connection pool drops and Neon `main` autosuspends). 2.1 is therefore an audit, not new code.
**Acceptance (met):** the audit table + conclusion are recorded here. **Risk:** low (documentation).

### Story 2.2 — Externalize the two crons to Cloud Scheduler (prereq for `min=0`)
**As** the platform, **I want** the money-adjacent crons to fire independent of Cloud Run instance warmth,
**so that** scaling the backend to zero never silently skips a payment-reconcile or a sweepstakes draw.
**Acceptance:**
- New idempotent `infra/gcp/provision-cron-scheduler.sh` creates two Cloud Scheduler jobs that **GET the Vercel
  routes directly** with the `x-internal-secret` header — `reconcile-checkouts` `*/30`, `sweepstakes-draw`
  `*/15`. Secret read at provision time from Secret Manager (`MEDUSA_INTERNAL_SECRET`), never echoed. Same
  trust boundary the Medusa jobs used.
- `apps/backend/src/jobs/reconcile-checkouts.ts` + `sweepstakes-draw.ts` removed (Medusa auto-discovers
  `src/jobs/*`; deleting retires them). Both target routes are idempotent → a brief overlap while the backend
  is still warm is safe.
- Backend gate green: `medusa build` + `tsc --noEmit` + `npm run test:unit`.
**Risk:** high (money-adjacent safety-net moves trust boundary; backend shared infra).

### Story 2.3 — Trial `minScale: 0` and measure the egress delta
**As** the platform, **I want** the backend to scale to zero when idle, **so that** the Neon `main` compute can
autosuspend and the ~190 MB/day baseline read bleed stops.
**Acceptance:**
- `infra/gcp/deploy.sh` `--min-instances=1` → `0` (staging already runs `0`); the change is reflected in the
  script so it isn't lost on the next image-only deploy, and `infra/gcp/test/deploy-invariants.test.js` stays
  **green** with a **new invariant pinning `--min-instances`** (prod 0, staging 0) so it can't silently revert.
- Applied live via `gcloud run services update medusa-web --region=us-east4 --min-instances=0` (image-only
  deploys don't rebuild config; the script edit guards future full runs).
- The 5-min uptime check is paused for the window; after the change, Neon's `main` endpoint is observed
  **autosuspending** during idle (`neonctl` / project API active-time drops materially from ~84%).
- The Story-1.1 egress reading shows a clear drop attributable to this lever (record it vs the S1 baseline).
- Cold-start behaviour acknowledged: first storefront hit after idle is slower (~10–30 s); confirm it's within
  an acceptable bound for current traffic (**Daniel's call — the keep/revert decision point**).
**Risk:** high (latency for all visitors; reversible by redeploy — the built-in "kill switch").

## Sprint QA
- **api spec(s):** none new for the cadence/scaling change (config, not route behaviour) — verified via Cloud
  Run logs + Neon active-time + the Cloud Scheduler run results. Keep `deploy-invariants.test.js` green as the
  deterministic infra gate (now incl. the minScale invariant).
- **browser smoke owed:** **Daniel** — the post-idle cold-start latency eyeball on a real storefront load, and
  the keep-vs-revert call on `minScale`.
- **deterministic gate:** backend `tsc` + build + `npm run test:unit` (all green locally); root
  `node --test 'infra/gcp/test/*.test.js'` green (17 tests).

## S1 baseline this sprint measures against
`node scripts/neon-egress.mjs`, 2026-06-21 (org `org-fancy-pond-57061061`, cap 5 GB/mo):
**org total 4295.6 MB / 85.9%**; medusa-bonsai **4135.9 MB / 82.7%**. The S2.3 delta is read against this.

## ⚠️ Live-state findings (2026-06-22 — diagnostic before applying the lever)
Verified against the live consoles before touching anything (these refine the spike's framing):
- **The egress win comes from killing the query loop, NOT from Neon suspending.** The Neon `main` endpoint
  (`br-lively-cell`, default branch) has **autosuspend DISABLED** (`suspend_timeout_seconds=0`) — it never
  suspends regardless of Cloud Run. So min=0's effect is: the Medusa instance dies → its background query loop
  (liveness `/health`, framework loops) stops → **no queries = no cross-cloud result transfer = no egress**. An
  always-on-but-unqueried compute transfers nothing. **The real success signal is therefore the egress number
  dropping (the script), not "watching main autosuspend."**
  - *Optional complementary lever:* **enable Neon autosuspend** (e.g. `suspend_timeout_seconds=300`) so the
    `main` compute also idles once min=0 stops poking it — saves Neon compute-hours and makes the suspend
    observable. One reversible API/console change. (Enabling it while still at min=1 does nothing — Medusa
    pokes Neon every ~30 s, so it'd never reach the idle timeout.)
- **Today's ~30 s idle cold-start is the Vercel frontend, not the backend.** Measured warm: backend
  `/health` 0.45 s and store API 0.25 s (Cloud Run is min=1, always warm) — but the **frontend home took 7.7 s
  even warm** (it SSRs every hit because `currentUser()` personalizes it → not edge-cacheable; the S1 finding).
  The cold ~30 s is the Vercel function spinning up that dynamic SSR. **Implication:** min=0 will **not** fix the
  30 s (that's Vercel), and it **adds** Medusa cold-boot (~10–30 s) on top for any post-idle load that hits the
  backend — so cold loads likely feel *slower*, not faster. That is the trade for the egress win; the step-8
  eyeball is the keep/revert decision point, made knowing this.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · backend = Cloud Run (`medusa-web`, us-east4, project `miyagisanchezback-497722`) ·
Neon project `shiny-paper-72860331` · app = https://miyagisanchez.com

1. **Provision the external crons (2.2).** `bash infra/gcp/provision-cron-scheduler.sh`
   → prints `+ created` (or `= updated`) for `reconcile-checkouts` (`*/30`) and `sweepstakes-draw` (`*/15`).
2. **Force a test run of each + confirm a 200 at the Vercel route.**
   `gcloud scheduler jobs run reconcile-checkouts --location=us-east4 --project=miyagisanchezback-497722` (and
   `sweepstakes-draw`); then `gcloud scheduler jobs describe reconcile-checkouts --location=us-east4 --project=miyagisanchezback-497722 --format='value(status.code,lastAttemptTime)'`.
   → last attempt code is `0`/OK (the route accepted the `x-internal-secret`); Vercel logs show a 200 on
   `/api/cron/reconcile-checkouts`. *(If 401 → the secret header didn't match; re-run the provision script.)*
3. **Merge the backend PR** (`apps/backend`, in-process jobs removed) → wait for the new Cloud Run revision:
   `gcloud run services describe medusa-web --region=us-east4 --format='value(status.latestReadyRevisionName)'`.
   → a new revision is live; Cloud Run logs no longer show `[reconcile-checkouts]` / `[sweepstakes-draw]`
   in-process (the crons now fire only from Cloud Scheduler).
4. **Merge the root-repo PR** (`deploy.sh` min=0 + invariant + docs). ⚠️ **This does NOT change production by
   itself** — `deploy.sh` only runs on a manual full deploy, and the live CI path is image-only, so the merged
   script edit just *guards* the value. The lever is applied live in step 6's `gcloud run services update`.
5. **(Owed to Daniel)** Pause the uptime check for the window:
   `gcloud monitoring uptime list-configs --project=miyagisanchezback-497722 --filter='displayName="[medusa-web] health"' --format='value(name)'`
   then `gcloud monitoring uptime delete <that-id>`.
   → the `[medusa-web] health` check is gone (restored in step 9).
6. **(Owed to Daniel — applies the lever live)** `gcloud run services update medusa-web --region=us-east4 --min-instances=0`.
   → `gcloud run services describe medusa-web --region=us-east4 --format='value(spec.template.metadata.annotations[autoscaling.knative.dev/minScale])'` shows `0`.
7. **Idle the storefront ~15–30 min, then confirm the backend actually scaled to zero.**
   `gcloud run services describe medusa-web --region=us-east4 --project=miyagisanchezback-497722 --format='value(status.traffic)'`
   and the Cloud Run console instance count.
   → instance count drops to 0 during the idle window (the Medusa query loop has stopped — this is what cuts
   egress). *(Note: the Neon `main` endpoint will still report `active` — its autosuspend is DISABLED, see the
   live-state findings above; that's expected and does not mean the lever failed. If you also enabled Neon
   autosuspend, `main` will additionally show `idle` after its timeout.)*
8. **(Owed to Daniel — latency eyeball)** Load https://miyagisanchez.com/s/<test-shop> as the first hit after idle.
   → page loads after a cold-start delay (~10–30 s); decide if acceptable. **If not → revert:**
   `gcloud run services update medusa-web --region=us-east4 --min-instances=1` and set the invariant + deploy.sh back to 1.
9. **(Owed to Daniel) Restore the uptime check.** `TARGET=prod bash infra/gcp/provision-monitoring.sh`
   → `[medusa-web] health` check + its alert are back (idempotent — only refills the gap).
10. **Re-run the egress script after ~2–3 days.** `node scripts/neon-egress.mjs`
    → org egress is **materially down** vs the S1 baseline (org 4295.6 MB / 85.9%). This is the sprint's success
    signal. If the drop holds the org under 5 GB, the epic's success criterion is met; if not, the recorded
    decision is to escalate to Neon Launch ($19/mo) per the spike.

If any step fails, note the step number + what you saw — that's the bug report.
