# Merchant activation scorecard — Sprint 1: Metric contract and data adapter

**Status:** ⬜ not started

## Stories

### Story 1.1 — Versioned metric dictionary and fixtures

**As an** activation lead, **I want** each metric to have one testable definition, **so that** weekly decisions
do not change with the reader or dashboard query.

**Acceptance:** dictionary defines cohort entry, stage denominator, conversion, age, overdue action, activation
time, first sale and 30-day retention with timezone and exclusion rules; a schema version accompanies output;
fixtures cover zero, incomplete, corrected, retained and stale journeys.

**Risk:** low — read-only analytical contract.

### Story 1.2 — Golden Beans journey and Medusa fact adapter

**As a** scorecard consumer, **I want** journey and commerce facts joined predictably, **so that** stage and
outcome measures share one merchant identity without copied data.

**Acceptance:** opaque merchant id joins activation relationship, Golden Beans journey projection and Medusa
facts; source timestamps/freshness are retained; delayed/replayed facts settle idempotently; mismatches are
reported, not resolved by overwriting a source.

**Risk:** low — read-only adapters over stable contracts.

### Story 1.3 — Authenticated scorecard read model and degraded states

**As an** admin, **I want** a filterable scorecard response with data health, **so that** I can distinguish zero
performance from missing telemetry.

**Acceptance:** admin-authenticated endpoint accepts cohort, date, promoter/steward and stage filters; returns
summary, funnel, aging, overdue and drill-through ids from one resolver; stale/missing source status is explicit;
unauthenticated/non-admin requests are rejected; no write method exists.

**Risk:** low — additive read-only admin route under existing auth.

## Sprint QA

- **api specs:** fixture table for every metric; join/freshness/mismatch; filter combinations; stale vs zero;
  admin 200/non-admin 403/anonymous 401; write methods unavailable.
- **browser smoke owed:** no; admin render smoke moves to Sprint 2.
- **deterministic gate:** typecheck/build + metric and endpoint specs green in both consuming repos.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: preview API + production-compatible fixture cohort

1. Request the scorecard endpoint without authentication, then as a non-admin.
   → It returns 401 then 403 with no merchant data.
2. Request as admin for the disposable cohort.
   → Summary, funnel, aging and drill-through ids share one metric schema version.
3. Delay one Golden Beans projection fixture and request again.
   → The affected metric reports degraded/stale rather than zero.
4. Replay the delayed event and refresh.
   → The value repairs without double-counting.
5. Attempt a non-GET method.
   → The route refuses it and no source state changes.

If any step fails, note the step number + URL/request — that's the bug report.
