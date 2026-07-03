---
status: readyforscope
slug: profit-analyzer
class: Feature
archetype: Builder
priority: high
---

# Scope · Profit Analyzer & price suggestions — true SKU margins after fees, COGS & shipping (Epic B of the Merchant Ops PRD)

> Groomed 2026-07-02 from the `merchant-ops-center.md` PRD (Feature 1).
> Inspiration: [Veeqo profit analyzer](https://www.veeqo.com/profit-analyzer).
> **Stage-2.5 bucket: genuinely new** — no COGS field, fee ledger, or price suggester exists anywhere.
> **Depends on Epic A** ([`ml-orders-native.md`](ml-orders-native.md)) for realized ML fees/shipping per
> order; **build after A ships.** Estimate-level pieces (fee estimator, suggester math) don't strictly
> need A, but the slicing below assumes A's order data exists.

## Overview

**As a** seller, **I want** to see the true per-SKU margin of every sale — after Mercado Libre fees,
shipping and my unit cost — and get a suggested price for a target margin **so that** I stop selling at a
silent loss and price with confidence.

## Daniel's calls (disambiguation, 2026-07-02)

- **v1 inputs: COGS (manual per-variant entry), ML fees (realized + estimated), shipping costs.**
  **Ad spend is OUT of v1** (separate Product Ads OAuth scope, 90-day lookback — v2 seed).
- **Suggest + one-click apply**: suggestion shown; "Apply" updates the Miyagi price and propagates to ML
  via the already-shipped publish/update parity. Seller-confirmed, never automatic. Auto-repricing OUT.
- **Monetization:** rides the `ml_sync` entitlement for ML-fee analytics; margin on native-only sales may
  stay free (decide final gating at sprint 1 — zero new money infra either way).
- **UI: project conventions, full stop** (Daniel, 2026-07-02: the PRD's skeuomorphic/90s aesthetic
  direction was a mistake — discard it entirely). Build like any other `/shop/manage` section: house
  design system, semantic tokens, existing components, raw-hex CI guard stands. A data-dense margin
  table is normal seller-portal UI, not a new style.

## Medusa-first reframe

- **COGS** lives on the Medusa variant (metadata or a small module field) — never Supabase (rule #2 says
  non-commerce only; unit cost is commerce data).
- **The "immutable ledger"** is a small append-only Medusa module table of financial events per order line
  (revenue, fee, shipping, COGS snapshot at sale time) — historical margins stay correct when fees or COGS
  change later, exactly the PRD's intent, no event-sourcing framework.
- **The suggester needs no fee-table sync pipeline**: ML's Listing Prices API returns the fee for a given
  price/category/listing-type on demand — call + cache, don't replicate ML's fee schedule.
- **Note the PRD's formula is subtly wrong**: fees are a % *of the price being solved for*, so suggested
  price = (COGS + shipping + fixed fee) / (1 − fee% − target-margin%), not an additive sum. The pure
  `lib/` seam makes this unit-testable.
- **Apply-price** reuses Epic `mercadolibre-sync` S3 publish/update parity — no new ML write path.

## What already exists (reuse, don't rebuild)

- **Realized fee/shipping data per ML order** — landed by Epic A in order metadata (its sprint 1 captures
  `sale_fee_details` + shipment cost from day one).
- **ML module + client** (`apps/backend/src/modules/mercadolibre/`) — add a `listing_prices` call.
- **Publish/update parity Miyagi → ML** (ml-sync S3) — the apply-price write path.
- **Envía quotes/labels** — native-order shipping cost source.
- **Seller analytics section** `/shop/manage` (Analíticas nav) — the dashboard's home; seller-nav single
  source of truth `lib/seller-nav.ts`.
- **Bulk import pipeline** (`bulk-import-migration`) — bulk COGS entry via CSV rides it.
- **Listing editor** — COGS field slot; **design tokens + raw-color guard** — the UI contract.
- **Entitlement + flags** — `ml_sync` grant + in-house flag family; add `ops.profit_enabled`.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1 COGS per variant: Medusa-side field + listing-editor input + bulk CSV via import pipeline | med |
| 1 | US-2 Financial-events ledger module (append-only; revenue / fee / shipping / COGS snapshot per order line, ML + native) + backfill for Epic-A-ingested orders | high |
| 1 | US-3 Profit dashboard v1: per-order and per-SKU realized-margin table in `/shop/manage`, behind `ops.profit_enabled` (default OFF) | low |
| 2 | US-4 Fee estimator: `listing_prices` client call + cache + pure `lib/profit.ts` suggester math (solve-for-price; unit-tested) | med |
| 2 | US-5 Target-margin control + suggested price + one-click **Apply** → Miyagi price update → propagate via existing ML publish parity (confirm dialog; audited in activity log) | high |
| 2 | US-6 Margin insights: "silent margin killers" (margin below threshold) + underpriced high-margin SKUs, surfaced on the dashboard | low |

## Out of scope (v1)

- **Ad-spend ingestion** (Product Ads API — v2 seed with its own OAuth scope story).
- Auto-repricing / unattended price writes; IF/THEN rules of any kind.
- Multi-currency COGS (MXN only), landed-cost modeling, ML *listing* (exposure) fees beyond sale fees.
- Any new telemetry library (GTM/Clarity as-is). Docker/GCP worker layer (rejected — see Epic A reframe).

## Kill-switch (Stage 6b)

`ops.profit_enabled` — enablement flag, default `false`, created disabled. US-5 (apply-price) additionally
respects the existing `ml.publish_enabled` rail. HIGH stories are Daniel-merge.

## QA / smoke stage

- **Pure seams**: `lib/profit.ts` (margin calc, solve-for-price suggester, threshold classifiers) — api
  specs, no auth/network; ledger idempotency decision fn unit-tested backend-side.
- One api spec per story where testable; dashboard render smoke anonymous where possible.
- **Owed to Daniel (browser/money):** enter COGS on a real listing → make a sandbox ML sale (Epic A rail)
  → margin row appears with the real fee; click Apply on a suggestion → price changes on Miyagi *and* ML.

## Acceptance (epic-level, Daniel-runnable)

1. Set COGS $60 on a $100 listing; a sandbox ML sale later, the dashboard shows that order's true margin
   using the *actual* ML fee from the order — and it doesn't change when fees change next month (ledger).
2. Bulk-upload COGS for 20 SKUs via CSV; the SKU table populates margins for all sold ones.
3. Move the target-margin control to 30% → suggested price updates live; Apply → the Miyagi PDP shows the
   new price and the linked ML listing follows.
4. A SKU whose fee+shipping eats its margin appears under "margin killers"; flag OFF → no profit UI at all.

## Open risks

- Realized-fee field shapes on ML orders need sandbox confirmation (Epic A captures them; if `sale_fee`
  proves unavailable per-order in MX, fall back to `listing_prices` estimate at sale time, flagged as
  estimated in the ledger row).
- COGS snapshot semantics: changing COGS must not rewrite history (ledger append-only; test it).
- Apply-price on a listing with an active ML promotion may conflict — surface ML API errors honestly in
  the activity log rather than silently retrying.
- Native-sale shipping cost attribution (label bought later than the order) — ledger rows may arrive
  asynchronously; dashboard must render partial rows honestly ("envío pendiente").

## Research citations (present-day, 2026-07-02)

- [Listing Prices API](https://developers.mercadolibre.com.ar/en_us/fees-for-listing) — fee estimate per
  site/price/category/listing-type (`sale_fee_amount`, `sale_fee_details`: fixed + percentage components).
- [Manage sales / orders](https://developers.mercadolibre.com.ar/en_us/manage-sales) — order payloads carry
  fee detail (`sale_fee_details`); exact per-order shape to confirm in sandbox.
- [Product Ads API](https://developers.mercadolibre.com.ar/en_us/product-ads-us-read) — cost/ACOS/ROAS per
  ad, 90-day lookback, separate scope — evidence for deferring ad spend to v2.
