# Merchant activation scorecard — Sprint 2: Operating surface

**Status:** ✅ Shipped — merged to `main`, PR 307 (squash `f608869`; `d4722c6` S2.1 · `62781fe` S2.2 · `16a5cab` S2.3 + review rounds `53db72c`/`dfc3072`); read-only, no migration, no flag. Admin-session browser smoke owed to Daniel (pre-launch).

## Stories

### Story 2.1 — Funnel, aging and drill-through operating view ✅

**As an** activation lead, **I want** a weekly scorecard I can act from, **so that** the team addresses the
largest bottleneck and oldest commitments first.

**Acceptance:** `/admin/promoter/activacion` shows cohort size, stage conversion, median/p90 age, overdue/missing
next actions, first-sale and retention outcomes; filters are URL-stable; every count drills to its merchant rows;
definitions/freshness are visible; empty, loading, error and degraded states are distinct.

**Risk:** low — additive authenticated read-only UI.

### Story 2.2 — Resolver-identical CSV export ✅

**As an** activation lead, **I want** the filtered scorecard as a CSV, **so that** I can review or share the same
weekly facts without hand-copying values.

**Acceptance:** server export applies the identical resolver, schema version and filters; row/count totals match
the UI; file includes generation and source-freshness timestamps; authorization matches the page; contact PII is
excluded unless an already-approved admin drill-through contract explicitly requires it.

**Risk:** low — read-only export using the existing download pattern.

### Story 2.3 — Read-only agent parity ✅

**As an** authorized operator using an agent, **I want** the same scorecard facts and definitions, **so that**
weekly analysis does not depend on scraping the UI.

**Acceptance:** an `ms_admin_` read tool exposes the same resolver, filters, version and degraded states; tool
cannot mutate records or commerce facts; responses are bounded/paginated; UI/API/agent fixture comparisons agree.

**Risk:** low — additive authenticated read tool.

## Sprint QA

- **api specs:** UI/export/agent parity fixtures, URL filters, pagination, PII allowlist and read-only auth.
- **browser smoke owed:** yes, to Daniel — authenticated admin scorecard, drill-through and CSV download.
- **deterministic gate:** typecheck/build + API/MCP specs + one real-browser admin smoke green.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Sign in as admin and open https://miyagisanchez.com/admin/promoter/activacion.
   → The disposable cohort renders with definitions and source freshness.
2. Filter by cohort, steward and stage, then copy/reopen the URL.
   → The same filtered view returns.
3. Select one funnel or overdue count.
   → Its merchant drill-through rows exactly explain the count.
4. Download CSV with the same filters.
   → Schema version, totals and freshness match the rendered view.
5. Ask the authorized admin agent for the same filtered scorecard.
   → Values and degraded states agree; no mutation tool is offered.

If any step fails, note the step number + URL — that's the bug report.
