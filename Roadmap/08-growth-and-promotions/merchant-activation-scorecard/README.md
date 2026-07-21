---
status: scaffolded
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

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Metric dictionary is versioned and every displayed value has a fixture-backed definition
- [ ] UI count, drill-through and CSV agree for identical filters
- [ ] Stale/missing journey or commerce facts render an explicit degraded state
- [ ] Admin authorization and read-only agent authorization pass deterministic tests
- [ ] No scorecard route can modify relationship or commerce truth
- [ ] Every sprint walkthrough contains deployed URLs and disposable cohort data
- [ ] This README marked shipped; retrospective, poster and durable learnings updated
- [ ] Feature branch deleted and `node scripts/build-order.mjs` run
