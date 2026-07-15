# ReportHub as the Notion replacement — Sprint 2: Live views (the Notion parity layer)

**Status:** ⬜ not started

## Stories

### Story 2.1 — Live roadmap/sprint status views
**As** Daniel (and any stakeholder), **I want** the hub's `/reports` library to show current epic +
sprint status — building now / ready / shipped / funnel, per-sprint story ticks — refreshed
automatically, **so that** the hub answers what the Notion board answers today.
Reuse: the `roadmap-to-notion.mjs --extract` projection + the `reports-data.json` generator; a routine
(or the existing nightly) regenerates and publishes the JSON on merge/nightly cadence.
**Acceptance:** flipping an epic README `status:` on `main` is reflected in the hub within one cycle;
views match `BUILD-ORDER.md` counts exactly (same SSOT, no second derivation).
**Risk:** low

### Story 2.2 — PMO metrics graphs
**As** Daniel, **I want** weekly/monthly PMO metrics (throughput, DORA-ish, AI-differential) as charts
in the hub, **so that** the numbers `pmo-report.mjs` already computes become visual artifacts beyond
what the Notion free tier could show.
Reuse: `scripts/pmo-report.mjs` output feeds a sheet/chart view via the existing viewer; no new metric
computation.
**Acceptance:** weekly PMO Telegram message links a chart view; monthly artifact mode stays stateless
(window log untouched — `shouldPersistWindow` test extended).
**Risk:** low

## Sprint QA
- **api spec(s):** `node --test` on the projection→view data mapping (pure); count-parity assert vs `build-order.mjs` output
- **browser smoke owed:** yes, to Daniel — mobile check of /reports views (no horizontal overflow, filters usable)
- **deterministic gate:** root `scripts-guard` + fork repo tests green

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/reports

1. Open /reports.
   → Epic/sprint status cards match Roadmap/00-ideas/BUILD-ORDER.md (spot-check the "Building now" count).
2. Open the weekly PMO link from Telegram.
   → Charts render (throughput + the AI-differential view) in the branded viewer.
3. Open /reports on your phone.
   → No horizontal overflow; filters usable.

If any step fails, note the step number + what you saw — that's the bug report.
