---
status: shipped
slug: merchant-activation-scorecard
---

# Epic: Merchant activation scorecard

> **Area:** 08 · Growth & Promotions · **Risk:** low · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/merchant-activation-scorecard.md`](../../00-ideas/seeds/merchant-activation-scorecard.md)

## Why

Miyagi needs a weekly operating view that reveals where founding merchants stall, how long activation takes and
which next actions are overdue. The scorecard should project trusted activation and commerce facts, not become a
second place to edit them or a dashboard of vanity traffic.

## Medusa-first note

Medusa remains authoritative for claim, product, payment and sale facts. The activation relationship supplies
stage, steward, consent and task state. Golden Beans supplies reusable entity-journey/cohort projections. This
epic joins those read models through one versioned metric dictionary and adds no new commerce writes.

## Decisions locked at scope approval

1. Metric definitions and stage boundaries are versioned before UI work begins.
2. Counts drill through to the records behind them; exports use the same resolver.
3. Missing/stale source data is visible as degraded, never silently treated as zero.
4. The surface is admin-authenticated and read-only, including agent parity.
5. No implementation begins until activation operations and Golden Beans entity journeys expose stable inputs.

## Build-time architecture decisions (2026-07-24, locked before Sprint 1)

Resolved against the **live `origin/main` code** and the **live DB** before any builder started. Each
citation is a real export/table verified on 2026-07-24 — this section CITES its sources so a builder
implements the contract, never a paraphrase of it (the trap the activation-ops epic paid four defects to
learn, `LEARNINGS.md`).

### SD1 — Derive from Miyagi's OWN canonical read models; Golden Beans is a freshness diagnostic, not the source

The scope table says "reuse time-in-stage and conversion projection" from Golden Beans
`entity-journeys-projections`. Verified 2026-07-24: **Miyagi has no read path for any Golden Beans
journey/cohort projection** — those projections live in the GB repo, are not consumable here, and the
round-trip is **empty pre-launch** (`merchant_lifecycle_emissions` = 0 rows). Meanwhile activation-ops **D2
made `merchant_relationship_transitions` canonical** for stage history. So the scorecard derives funnel,
conversion, time-in-stage and aging from the **canonical Miyagi tables** (`merchant_relationships` +
`merchant_relationship_transitions`) plus `loadCommerceFacts`, and uses Golden Beans **only** for the
freshness diagnostic (scope reuse row "Event delivery → Diagnose source/destination freshness") via
`loadReconciliationRows()` / `merchant_lifecycle_emissions`: a metric renders **degraded** when the GB
mirror is stale relative to the canonical source. Honors "Miyagi authoritative," is self-contained, needs
no populated round-trip. *(Deviation from the scope table's wording, stated not silent.)*

### SD2 — No new flag; reuse the activation-ops authorizer

The scorecard reads activation-ops data, which is gated by `promoter.activation_crm_enabled` (now ON). It
introduces **no flag of its own** and reuses `authorizeRelationshipRequest(req)` (`lib/relationship-access.ts`)
for the API and `isEnabled('promoter.activation_crm_enabled')` → `notFound()` then `requireAdmin()`
(`lib/admin/guard.ts`, `lib/flags.ts`) for the page — the exact flag-first-then-admin order every
`/api/admin/relationship*` route and the `/admin/relaciones` page already use. Flag OFF ⇒ the scorecard is
404/`notFound` too, which is correct: no cohort to score.

### SD3 — The metric dictionary IMPORTS the stage contract; it never restates it

Every stage-derived definition imports `STAGES`, `STAGE_ORDINAL`, `Stage`, `resolveStage`, `factsAtOrAbove`,
`mergeStageFacts` from `lib/merchant-stage.ts`; thresholds import `RETENTION_WINDOW_DAYS` and
`THREE_PRODUCTS_THRESHOLD` from `lib/merchant-medusa-reads.ts`; first-sale/retention arithmetic reuses
`deriveSaleFacts` (`lib/merchant-lifecycle.ts`) via `loadCommerceFacts` (`lib/merchant-commerce-facts.ts`).
A parallel hardcoded stage list, ordinal map or threshold in the dictionary is a **build error**, enforced
by a spec that asserts the dictionary's stage set `toEqual([...STAGES])` and its ordinals `=== STAGE_ORDINAL`.

### SD4 — "Degraded, never silent zero" is a typed, per-metric, fail-closed state

Every metric value is `{ value, health: 'ok' | 'stale' | 'missing', source, asOf }`. An `ok:false` from any
underlying read (`listAllRelationships` / `enrichRelationships` / `loadCommerceFacts`) or a stale GB mirror
sets `health` to `stale`/`missing` for exactly the affected metric and **never** substitutes `0`. A genuine
zero is `{ value: 0, health: 'ok' }` — distinct from `missing`. The **resolver is the one place** this is
computed; UI, CSV and agent render the same typed object (decision 2: counts and exports use the same
resolver, one schema version).

## What already exists (reuse, don't rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| Merchant stage/work data | `founding-merchant-activation-ops` | Read stage, steward, next action and history |
| Commerce milestones | Medusa facts and established frontend mirrors | Read claim, payments, products and first sale |
| Journey/cohort model | Golden Beans `entity-journeys-projections` | Reuse time-in-stage and conversion projection |
| Event delivery | Golden Beans `event-destination-router` | Diagnose source/destination freshness |
| Admin shells | existing `/admin/*` layouts, auth and table/filter primitives | Add one focused operating surface |
| Exports | existing server-side CSV/download patterns | Export the same filtered resolver, not a client rebuild |
| Agent auth | `ms_admin_` credential and MCP read-tool patterns | Add read-only parity after UI contract is stable |

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Versioned metric dictionary and fixture contract | low |
| 1 | 1.2 Golden Beans journey + Medusa fact adapter | low |
| 1 | 1.3 Authenticated scorecard read model and degraded states | low |
| 2 | 2.1 Funnel, aging and drill-through operating view | low |
| 2 | 2.2 Resolver-identical CSV export | low |
| 2 | 2.3 Read-only agent parity | low |

## Deploy order

Do not start until activation-operations lifecycle inputs and Golden Beans entity journeys are stable. Ship the
metric dictionary and fixture suite before adapters, then the authenticated read endpoint, UI, export and agent
read in that order. No feature flag is required because this is additive, read-only and admin-authenticated;
hide navigation until the complete resolver is deployed.

## Definition of Done (epic)

**Status 2026-07-24: SHIPPED.** All 6 stories in PR #307 (squash `f608869`), CI green (Playwright-vs-preview
+ type-check/build). Read-only, no migration, no flag. Two review layers × two rounds; every finding resolved.
Owed to Daniel: the admin-session browser smoke (untestable in the `api` project — pre-launch, descoped like
the sibling founding-merchant epics).

- [x] All sprints merged to `main` — PR #307 squash `f608869`; smoke gap stated (admin-session browser smoke)
- [x] Metric dictionary is versioned and every displayed value has a fixture-backed definition —
      `SCORECARD_SCHEMA_VERSION`; the dictionary imports `STAGES`/`STAGE_ORDINAL` by reference (identity spec)
- [x] UI count, drill-through and CSV agree for identical filters — one `resolveScorecard`; UI/CSV/agent parity spec
- [x] Stale/missing journey or commerce facts render an explicit degraded state — SD4 typed
      `{value, health, source, asOf}`; zero vs missing vs stale covered (incl. the independent transitions read-failure)
- [x] Admin authorization and read-only agent authorization pass deterministic tests — flag→404, anon→401,
      non-admin→403 route specs; agent tool bounded/paginated + read-only
- [x] No scorecard route can modify relationship or commerce truth — zero write verbs; every DB call `.select()`, every Medusa call GET
- [x] Every sprint walkthrough contains deployed URLs and disposable cohort data — sprint-1/sprint-2 smoke walkthroughs
- [x] This README marked shipped; retrospective, poster and durable learnings updated — 2026-07-24
- [x] Feature branch deleted and `node scripts/build-order.mjs` run — branch deleted at merge; board regenerated
