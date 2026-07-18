# ReportHub as the Notion replacement — Sprint 2: Live views (the Notion parity layer)

**Status:** 🟡 built + tested, PRs open — Daniel merges + deploys (both stories touch the hub, no
runtime flag; deploy order matters, see handoff below)

## Stories

### Story 2.1 — Live roadmap/sprint status views ✅ (built + tested, PR open, NOT deployed)
**As** Daniel (and any stakeholder), **I want** the hub's `/reports` library to show current epic +
sprint status — building now / ready / shipped / funnel, per-sprint story ticks — refreshed
automatically, **so that** the hub answers what the Notion board answers today.
Reuse: the `roadmap-to-notion.mjs --extract` projection + the `reports-data.json` generator; a routine
(or the existing nightly) regenerates and publishes the JSON on merge/nightly cadence.
**Acceptance:** flipping an epic README `status:` on `main` is reflected in the hub within one cycle;
views match `BUILD-ORDER.md` counts exactly (same SSOT, no second derivation).
**Risk:** low
**Status:** ✅ merged to `feat/reporthub-s2` — commit `fce1e24`. Design: `scripts/lib/report-registry.mjs`
gained an `allowOverwrite`/`live/` capability (skips the generation-0 precondition every other
packet/daily write keeps); new `scripts/publish-live-views.mjs` republishes the hub's full
`reports-data.json` payload to `live/roadmap-status.json` (env-var config only, degrades gracefully).
Fork side (`danybgoode/smalldocs`, branch `feat/live-views`, PR #4): new `GET /api/live/:key`
read-through route + `public/reports.js` now fetches it FIRST, falling back to the build-time-baked
`/public/reports-data.json` on ANY failure — no flag, matches the epic's kill-switch carve-out. The
`#generated-at` line labels "en vivo" vs "instantanea local" so a smoke can tell at a glance.
**Bug found + fixed along the way:** `summarizeRoadmapRows`'s `funnelSeeds` counted every `grain:'Seed'`
row unconditionally (including ones already shipped/scaffolded/archived), diverging from
`BUILD-ORDER.md`'s funnel count. Extracted `scripts/lib/roadmap-status-buckets.mjs` as the shared SSOT
for epic-status buckets + the seed-funnel definition — both `build-order.mjs` and
`pmo-report-hub-data.mjs` import it now, closing the "same SSOT, no second derivation" acceptance by
construction, not just a regression test. `scripts/live-views-count-parity.test.mjs` cross-checks the
live extractor against the checked-in board end-to-end.

### Story 2.2 — PMO metrics graphs ✅ (built + tested, PR open, NOT deployed)
**As** Daniel, **I want** weekly/monthly PMO metrics (throughput, DORA-ish, AI-differential) as charts
in the hub, **so that** the numbers `pmo-report.mjs` already computes become visual artifacts beyond
what the Notion free tier could show.
Reuse: `scripts/pmo-report.mjs` output feeds a sheet/chart view via the existing viewer; no new metric
computation.
**Acceptance:** weekly PMO Telegram message links a chart view; monthly artifact mode stays stateless
(window log untouched — `shouldPersistWindow` test extended).
**Risk:** low
**Status:** ✅ merged to `feat/reporthub-s2` — commit `301ffc6`. The snapshot bar charts + benchmarks
table already shipped in `scripts/pmo/templates/*.md` (pmo-operational-reports epic) already satisfied
"weekly PMO Telegram message links a chart view" — locked with a new regression test rather than new
code. The actual gap: those snapshot decks only ever show the LATEST window. New
`scripts/lib/pmo-trend-view.mjs` (pure data-shaping, no new metric computation — reuses the
already-computed per-window summaries `pmo-report.mjs` already persists to `claude/pmo-reports-log`)
builds a throughput/DORA-ish/doc-ops trend chart across recent windows, published by
`publish-live-views.mjs` to a stable `packets/pmo-live-metrics.md` slug — resolves through Sprint 1's
**already-deployed** `/r/<slug>` resolver with **zero fork-side change** (a non-`daily-` slug already
maps to `packets/` on the read side). `shouldPersistWindow` coverage extended with an explicit test
tying chart-bearing monthly artifact production to staying stateless.

## Sprint QA
- **api spec(s):** `node --test` on the projection→view data mapping (pure); count-parity assert vs `build-order.mjs` output
- **browser smoke owed:** yes, to Daniel — mobile check of /reports views (no horizontal overflow, filters usable)
- **deterministic gate:** root `scripts-guard` + fork repo tests green
- **Status:** ✅ — GitHub Actions minutes were exhausted this session, so both gates were run **locally**
  instead of via CI:
  - Root: `node --test 'scripts/lib/*.test.mjs' 'scripts/*.test.mjs'` → **337 tests, 336 pass, 1 graceful
    skip** (a pre-existing, unrelated `BUILD-ORDER.md`-staleness cross-check skips itself rather than
    false-failing — the board was regenerated fresh by this branch's own pre-commit hook, see PR #98).
    `node --test infra/gcp/test/*.test.js infra/gcp/test/*.test.mjs` → **146/146 pass** (sanity-checked,
    unaffected by this sprint).
  - Fork: `node test/run.js` → **1106/1106 pass** (baseline was 1097 at Sprint 1 close; +9 new). `npx
    playwright test test/reports-library.spec.js` → **5/5 pass** (2 new specs covering the live-payload
    and fallback-labeled render paths explicitly).
  - Live smoke against `gs://miyagi-pmo-reports-staging`: `--dry-run` wrote nothing (verified via
    `gcloud storage ls`); a real `publish-live-views.mjs` run published both `live/roadmap-status.json`
    (445 items, 6 views) and `packets/pmo-live-metrics.md`; a second run proved the overwrite path (GCS
    `update_time` advanced, not a no-op/412-skip).
  - Read-only hit against the deployed hub (no redeploy performed): `/` → 200, `/reports` → 200,
    `/trust/manifest` confirms deployed commit `494997c...` (S1.2, PR #3); `/api/live/roadmap-status` →
    404 as expected (S2.1's route isn't on that revision yet — this PR hasn't deployed).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/reports — **all 3 steps need both PRs
merged + the fork redeployed + `publish-live-views.mjs` run at least once against the prod bucket first
(Daniel handoff below); nothing below has been re-run against the live URL yet.**

1. Open /reports.
   → Epic/sprint status cards match Roadmap/00-ideas/BUILD-ORDER.md (spot-check the "Building now" count).
   → `#generated-at` should read "Actualizado ... (en vivo)" — if it says "(instantanea local, no en
     vivo)" instead, the live publish hasn't landed yet (see handoff step 3).
2. Open the weekly PMO link from Telegram, AND open the PMO metrics view from `/reports`' "Vistas
   ejecutivas" grid (or directly: `/r/pmo-live-metrics`).
   → The weekly deck's snapshot bar chart + benchmarks table render (this already worked before this
     sprint — Sprint 1's registry link). The NEW `/r/pmo-live-metrics` view renders throughput/DORA-ish/
     doc-ops as trend charts across multiple PMO windows, not just the latest one.
3. Open /reports on your phone.
   → No horizontal overflow; filters usable.

If any step fails, note the step number + what you saw — that's the bug report.

## Daniel handoff — what's left before Sprint 2 is fully live

1. **Root repo PR merge:** merge `danybgoode/miyagi-product-management#98` (branch `feat/reporthub-s2`)
   — safe alone, `publish-live-views.mjs` is a new opt-in script; no existing call site changed.
2. **Fork PR merge + deploy:** review + merge `danybgoode/smalldocs#4` (branch `feat/live-views`), then
   redeploy per `infra/gcp/pmo-smalldocs.md`'s checklist (adds `GET /api/live/:key`).
3. **Run the live publish at least once** (or wire it into a routine — nightly/on-merge cadence):
   `node scripts/publish-live-views.mjs` — env-var config only, same two credential env vars
   `report-registry.mjs` already reads (`GOOGLE_APPLICATION_CREDENTIALS_JSON` for the
   routine/unattended path, or local `gcloud` ADC). Until this runs against the prod bucket,
   `/api/live/roadmap-status` 404s and the hub correctly (by design) falls back to the bundled snapshot
   — that's expected, not a bug, but it means the "live" half of Story 2.1 isn't actually live yet.
4. **Re-run the smoke walkthrough above for real** once 1–3 land, including the mobile check.
