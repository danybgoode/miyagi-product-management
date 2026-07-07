---
status: shipped
slug: profit-analyzer
archetype: Builder
---

# Epic · Profit Analyzer — true SKU margins after fees, COGS & shipping, plus suggested prices

> Scoped 2026-07-02 from [`00-ideas/2. readyforscope/profit-analyzer.md`](../../00-ideas/2.%20readyforscope/profit-analyzer.md)
> (Epic B of the Merchant Ops PRD; approved by Daniel 2026-07-02).
> **Status: ✅ SHIPPED 2026-07-06 — both sprints merged.** S1: backend
> [#61](https://github.com/danybgoode/medusa-bonsai-backend/pull/61) `9967adb`, frontend
> [#178](https://github.com/danybgoode/miyagisanchezcommerce/pull/178) `86a06ea`. S2: backend
> [#62](https://github.com/danybgoode/medusa-bonsai-backend/pull/62) `8c53702`, frontend
> [#180](https://github.com/danybgoode/miyagisanchezcommerce/pull/180) `38f8944`.
> Risk was **HIGH** (financial data model + live price writes) — Daniel merged both sprints.
> See [RETROSPECTIVE.md](RETROSPECTIVE.md). Owed: live ML-sandbox money-path smoke + S1's remaining
> walkthrough steps (both named in the respective sprint docs).

**Tagline:** *Sabe cuánto ganas de verdad en cada venta — y a qué precio deberías vender.*

## Why

Merchants rarely know their true margin after ML's dynamic fees; some sell at a silent loss. A per-sale
financial ledger (revenue − fee − shipping − COGS, snapshotted at sale time) plus a solve-for-price
suggester turns the order data Epic A lands into decisions: fix the margin killers, raise the underpriced
winners — one click to apply, propagated to ML through the already-shipped publish parity.

## Context

| | |
|---|---|
| **Role** | Seller (margins + pricing); admin (flags) |
| **Macro-section** | 03 · Selling & Shops |
| **Risk** | HIGH — financial ledger (DB migration) + live price writes to Miyagi + ML |
| **Flag** | `ops.profit_enabled` (enablement, default OFF); apply-price also respects `ml.publish_enabled` |
| **Entitlement** | ML-fee analytics ride the `ml_sync` SKU; native-only margin gating decided sprint 1 |
| **Design** | Project conventions only — house tokens/components; the PRD's aesthetic was discarded at groom |
| **Depends on** | Epic A (`ml-orders-native`) merged + capturing fee/shipping payloads |

## Medusa-first note (AGENTS rule #1)

COGS is commerce data → lives on the **Medusa variant** (never Supabase). The "immutable ledger" is a small
**append-only Medusa module table** of financial events per order line — no event-sourcing framework. The
suggester needs **no fee-table sync pipeline**: ML's Listing Prices API returns the fee for a price/category
on demand (call + cache). **The PRD's pricing formula is corrected**: fees are a % of the price being solved
for, so `price = (COGS + shipping + fixed_fee) / (1 − fee% − target_margin%)` — a pure, unit-tested `lib/`
seam. Apply-price reuses ml-sync S3 publish/update parity — no new ML write path. Suggestions are visible to
seller agents via existing MCP config/listing reads (rule #3); copy es-MX (rule #5); Clerk untouched (#4).

## What already exists (reuse, don't rebuild)

- **Realized fee/shipping per ML order** — Epic A order metadata (captured from day one).
- **ML module + client** — add one `listing_prices` call (`apps/backend/src/modules/mercadolibre/client.ts`).
- **Publish/update parity Miyagi → ML** (ml-sync S3) — the apply-price write path.
- **Envía quotes/labels** — native-order shipping cost source.
- **Seller analytics home** — `/shop/manage` Analíticas section; nav SSOT `lib/seller-nav.ts`.
- **Bulk import pipeline** — bulk COGS CSV rides `bulk-import-migration` plumbing.
- **Listing editor** — COGS field slot. **Design tokens + raw-hex guard** — the UI contract.
- **Entitlement + in-house flags** — `ml_sync` grant; add `ops.profit_enabled`.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1 COGS per variant: field + listing-editor input + bulk CSV via import pipeline | med |
| 1 | US-2 Financial-events ledger module (append-only: revenue / fee / shipping / COGS snapshot per order line, ML + native) + backfill for Epic-A orders | high |
| 1 | US-3 Profit dashboard v1: per-order + per-SKU realized-margin table in `/shop/manage`, behind `ops.profit_enabled` | low |
| 2 | US-4 Fee estimator: `listing_prices` call + cache + pure `lib/profit.ts` solve-for-price suggester (unit-tested) | med |
| 2 | US-5 Target-margin control + suggested price + one-click **Apply** → Miyagi price → ML via publish parity (confirm dialog; activity-logged) | high |
| 2 | US-6 Margin insights: margin killers + underpriced high-margin SKUs on the dashboard | low |

**Out (v1):** ad-spend ingestion (Product Ads API — v2 seed, own OAuth scope), auto-repricing, IF/THEN
rules, multi-currency COGS, landed cost, custom telemetry.

## Deploy order

**Backend-first.** S1 lands the data model dark (`ops.profit_enabled` OFF): COGS + ledger + read-only
dashboard — US-2's migration is the HIGH heart, Daniel merges. S2 adds the suggester + the only write path
(US-5, HIGH: live price mutation on Miyagi *and* ML — confirm dialog, activity log, respects
`ml.publish_enabled`). Ledger append-only semantics are non-negotiable: changing COGS later must not
rewrite history (tested). Announce shared-surface touches.

## Definition of Done (epic)

- [x] All sprints merged to `main` (gaps stated): COGS→sale→margin (S1) and the live apply-price money
      path against a real ML sandbox (S2) remain **owed to Daniel** — a real local-Postgres smoke this
      session proved the Apply write path against a live database, short of the ML-sandbox leg itself.
- [x] Each `sprint-N.md` has its smoke walkthrough (real prod URLs once deployed).
- [x] This README marked ✅; every sprint status ticked with commit refs.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster (`Roadmap/README.md`) updated (profit analytics + price suggestions).
- [x] Team memory + `MEMORY.md` updated (ledger module, suggester seam, flags).
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append).
- [x] Kill-switch verified: `ops.profit_enabled` exists, flipped ON in prod by Daniel 2026-07-06 (S1);
      `ml.publish_enabled` (reused from mercadolibre-sync) gates Apply's ML push — both live, no new flag
      needed for S2.
- [x] Feature branches deleted (both repos, both sprints); scope-doc frontmatter `status: shipped`.

## Sprints

- [sprint-1.md](sprint-1.md) — ✅ Data foundation: COGS + append-only ledger + margin dashboard (dark).
- [sprint-2.md](sprint-2.md) — ✅ Intelligence: fee estimator, solve-for-price suggester, one-click apply, insights.
