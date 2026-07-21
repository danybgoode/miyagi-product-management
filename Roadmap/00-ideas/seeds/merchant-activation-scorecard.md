---
title: "Merchant activation scorecard — conversion, aging, and cohort retention"
slug: merchant-activation-scorecard
status: scaffolded
area: "08"
type: feature
priority: "#4-fm"
risk: low
epic: "08-growth-and-promotions/merchant-activation-scorecard"
build_order: "#4-fm"
updated: 2026-07-20
---

# Scope — Merchant activation scorecard — conversion, aging, and cohort retention

## Outcome & signal

Daniel can run the founding-merchant program from one weekly operating view: where merchants convert, where
they wait, which records lack a next action, and whether the cohort reaches three products, first share,
inquiry, sale and 30-day retention. Every number has one definition, denominator, freshness stamp and source.

Daniel can test the result by opening `/admin/promoter/activacion`, filtering to one founding cohort and
checking a known disposable merchant. The stage, age and milestones must match its Golden Beans journey plus
Medusa facts, and the same filtered export must reproduce the visible totals without spreadsheet formulas.

## Stage-2.5 bucket

**Light enhancement once its dependencies exist.** Miyagi already has authenticated admin patterns and seller
analytics UI; Golden Beans already ships the event stream, TARS funnels and experiment comparisons. This epic
adds a read-only operating projection and presentation—it must not build a second journey engine in Miyagi.

## Scope

**In v1:**
- A versioned metric dictionary covering stage entry/conversion, median time in stage, current aging, previews
  awaiting action, merchants missing next action, payments ready, three products live, first external share,
  first inquiry, first sale and retained at 30 days.
- An admin-only weekly scorecard at `/admin/promoter/activacion` with cohort, source/promoter/partner and date
  filters; funnel, aging/work queue and downstream outcome sections.
- Counts always show their denominator; medians show population size; empty/insufficient data reads honestly.
- Merchant drill-through links to the canonical activation relationship, never an editable scorecard row.
- Data freshness and last successful projection time, with a visible degraded state rather than stale certainty.
- A CSV export of the current filtered view using the same metric resolver as the UI.
- Agent-readable **read-only** parity for the same summary once the existing partner/admin MCP authorization
  seam can express it; no write tool in this epic.

**Out of v1:**
- A generic BI/query builder, manually edited totals, vanity traffic dashboard or custom spreadsheet formulas.
- Reimplementing entity journeys, event delivery or experiment statistics inside medusa-bonsai.
- Predictive lead scoring, compensation calculation, autonomous alerts or causal claims from small cohorts.
- Public/shareable scorecards containing merchant identity or contact data.

## What already exists (reuse, don't rebuild)

| Existing capability | Reuse decision |
|---|---|
| `founding-merchant-activation-ops` | Relationship drill-through, owner/next action and canonical stage definitions. |
| Golden Beans `event-destination-router` | Reliable canonical event delivery. |
| Golden Beans `entity-journeys-projections` | Current stage, entered-at, history, conversion, time-in-stage and cohort retention. |
| Medusa sellers/products/orders/payment facts | Validate commerce milestones; never replace with editable CRM flags. |
| `/admin/promoter` and analytics UI patterns | Auth, filters, tables/cards, semantic tokens and responsive admin shell. |
| Existing CSV/XLSX export helpers | Reuse the established safe export pattern where compatible. |

## UX heuristics & rails check

- **CI guards covering this surface:** admin-auth specs, design-token guard and analytics/table patterns. Add a
  fixture-backed metric-contract suite that proves denominator, stage-age and 30-day retention definitions.
- **Audits-lens findings that apply:** no direct scorecard finding; preserve honest empty/degraded states and
  never mix marketplace traffic with activation outcomes just because both are easy to count.
- **Design-language debt:** avoid a wall of KPI tiles. Lead with the ordered funnel, then the actionable aging
  list; use tables only for merchants needing action and keep all status color semantic-token based.

## Delivery slices

1. **Metric contract and data adapter:** definitions/fixtures, Golden Beans journey reads, Medusa fact join,
   freshness/degraded state and cross-tenant/admin authorization.
2. **Operating surface:** scorecard, filters, merchant drill-through, shared-resolver CSV export and read-only
   agent summary.

## Acceptance criteria

1. Every visible metric has a versioned definition, numerator, denominator, source and freshness timestamp.
2. A fixture merchant moving through all 13 stages produces the expected conversions, stage ages and retention.
3. Commerce milestones disagreeing with an editable relationship note resolve to Medusa truth and surface the
   mismatch rather than silently counting it.
4. Cohort/source/partner/date filters affect UI and export identically.
5. Missing projection data produces an explicit degraded/insufficient-data state, never zero masquerading as fact.
6. Only admins (and explicitly authorized read-only agent scopes) can access the aggregate or merchant drill-down.
7. No merchant contact field is included in Golden Beans aggregates or the default export.

## Open risks / research

- Hard dependencies: `founding-merchant-activation-ops`, Golden Beans `event-destination-router`, and Golden
  Beans `entity-journeys-projections`. If the latter is not ready, stop—do not create a Miyagi-only projection.
- Daniel must approve the metric dictionary, particularly what qualifies as “first inquiry,” “shared externally”
  and “retained at 30 days.” These definitions should be locked before UI work, not inferred from convenient data.
- No runtime flag is planned: the surface is read-only, admin-authenticated and can ship with an honest
  insufficient-data state. If implementation introduces new writes or public access, reclassify as HIGH.
