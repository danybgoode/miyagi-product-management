---
status: readyforscope
slug: ml-orders-native
class: Feature
archetype: Builder
priority: high
---

# Scope · ML orders, native — Mercado Libre sales land as real Medusa orders (Epic A of the Merchant Ops PRD)

> Groomed 2026-07-02 from the `merchant-ops-center.md` PRD (Feature 2, "Omnichannel Order Management").
> Inspiration: [Veeqo order management](https://www.veeqo.com/ecommerce-order-management-software).
> **Stage-2.5 bucket: light-to-genuine enhancement of an existing module** — NOT a new pipeline. The live
> `mercadolibre-sync` epic already sees every ML order (webhook `orders_v2` + `*/30` reconcile poll); its
> groom explicitly cut "order import into Miyagi — out of scope for now". This epic is that deferred slice.
> **Companion:** [`profit-analyzer.md`](profit-analyzer.md) (Epic B) builds on the order data this epic lands.
> **Build order: this epic first** — it is the data foundation for realized profit.

## Overview

**As a** seller connected to Mercado Libre, **I want** my ML sales to appear as real orders in my Miyagi
order screen — with correct payment/fulfillment states, a source badge, tags, and bulk actions — **so that**
I run one fulfillment workflow instead of context-switching between two back-offices.

Today an ML sale only decrements Miyagi stock (S4 delta sync). After this epic it materializes as a
**source-tagged Medusa order** flowing through the native lifecycle, notifications, and agent surface.

## Daniel's calls (disambiguation, 2026-07-02)

- **Two epics, orders first** (this one), profit analyzer second.
- **Real Medusa orders on a dedicated ML sales channel** — not a read-only side-table inbox.
- **Automation thin slice:** manual tags + auto source-tag + bulk status actions. The IF/THEN rule
  builder, order merge/split, and batch label printing are explicitly OUT (v2 seeds).
- **Monetization:** rides the existing `ml_sync` entitlement (no new money infra).
- **UI: project conventions, full stop** (Daniel, 2026-07-02: the PRD's aesthetic direction was a
  mistake — discard it). Build like any other `/shop/manage` section: house design system, semantic
  tokens, existing components. A data-dense order table is normal seller-portal UI, not a new style.

## Medusa-first reframe (what the PRD over-specified)

The PRD's "isolated Docker workers on GCP" ingestion layer is **not needed** — the proven house rail is
the ML module + webhook route + `reconcile-ml-inventory`-style job (idempotent per ML order id, shipped
2026-07-01). "Strict idempotency keys" already exist in-module; S5 deferred **US-15 (durable idempotency
table, `unique(link_id, ml_order_id)`)** becomes this epic's foundation story rather than a residual.
Feature flags: in-house flag system (`ml.*` family). Telemetry: GTM/Clarity, nothing custom.

## What already exists (reuse, don't rebuild)

- **ML module** `apps/backend/src/modules/mercadolibre/` — OAuth connection (encrypted tokens, refresh,
  `needs_reauth` health), `product-ml-link` linkage, ML API client, unit-test harness.
- **Order visibility rail** — inbound `orders_v2` webhook (replay-safe, paid-only filter, order-id
  idempotency) + reconcile job polling each seller's ML orders since a per-seller marker (S4).
- **Medusa Orders / Sales Channels / Inventory** — system of record (rule #1); `backfill-sales-channel`
  + `prune-sales-channels` internal routes show the sales-channel management pattern.
- **Seller order screen** `/shop/manage/pedidos` + granular multi-channel notifications (email/push/Telegram).
- **Entitlement gate** — `lib/ml-sync-entitlement*` on the `ml_sync` grant key + `ml.sync_paywall_enabled`
  flag + promoter comp-grant (S5/S6); this epic adds zero money infra.
- **Activity log** — per-seller `ml_sync_event` module log (token-redacted) for observability.
- **Agent surface** — seller MCP tools already read orders; parity story verifies, not builds.

## The core technical risk (name it now)

Creating a real Medusa order **also** wants to decrement/reserve inventory — but the S4 delta sync
*already* decrements on the same ML sale. Order materialization must **supersede or coordinate with** the
S4 stock adjuster per link (one ML order = exactly one inventory effect, whether via order creation or
delta adjust — never both). This interaction is the epic's HIGH-risk heart; the durable idempotency table
(US-0) is the mechanism that makes it provable. Decision on the exact seam (order-creation-with-reservation
replaces delta for linked products vs. order created with inventory-none + delta kept) belongs to the
sprint-1 plan-mode session, reading the S4 code on latest `main` first — **note: the local backend checkout
is stale (`feat/subdomain-pricing-s3`); branch off fresh `origin/main`.**

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | US-0 Durable idempotency table (absorbs deferred ml-sync S5 US-15) — `unique(link_id, ml_order_id)`, transactional with inventory/order effects | high |
| 1 | US-1 Materialize a paid ML order as a Medusa order on a dedicated "Mercado Libre" sales channel (line items via `product-ml-link`, ML buyer + `ml_order_id`/pack id in metadata), idempotent, coordinated with the S4 stock path | high |
| 1 | US-2 ML → Medusa state machine mapping (paid → shipped → delivered) applied on webhook + reconcile | high |
| 1 | US-3 Source badge + ML metadata on `/shop/manage/pedidos` list + order detail | low |
| 2 | US-4 Cancellation / refund mapping (ML cancel after paid → Medusa cancel, restock coordinated with sync) | high |
| 2 | US-5 Seller notifications for ML orders through the existing granular channels (email/push/Telegram) | med |
| 2 | US-6 Entitlement + kill-switch wiring: behind `ml_sync` grant + new `ml.orders_enabled` (default OFF, fail-closed) | med |
| 3 | US-7 Order tags: manual tag CRUD + automatic source tag on ingest | low |
| 3 | US-8 Bulk select + bulk fulfillment-status actions on the order list | med |
| 3 | US-9 Agent-surface parity: ML-sourced orders visible via seller MCP order reads; UCP manifest accurate | low |

## Out of scope (v1 — write the "out" list)

- IF/THEN automation rule builder (v2 seed), order **merge/split**, **batch label printing**.
- Buying-flow anything: ML buyers stay ML buyers (no Miyagi accounts, no buyer emails from Miyagi for ML orders — ML owns buyer comms).
- Shipping label purchase for ML orders (ML fulfillment/Envíos stays on ML).
- Other external channels (Amazon etc.) — the sales-channel pattern generalizes later.
- Ad-spend / profit math (Epic B). Docker/GCP worker layer (rejected — see reframe).

## Kill-switch (Stage 6b)

`ml.orders_enabled` — **enablement** flag, default `false`, created **disabled**; per-seller enable rides
the existing sync-settings pattern. HIGH stories are Daniel-merge per WAYS-OF-WORKING.

## QA / smoke stage

- Pure seams for free coverage: state-mapping (`lib/`-style pure fn, ML status → Medusa transition),
  idempotency decision fn, tag derivation — one `api` spec per story where testable.
- Backend has no preview: post-merge prod API smoke by the agent; **live ML-sandbox order → Medusa order
  walkthrough owed to Daniel** (money/fulfillment path), written into each `sprint-N.md` per Stage 8b.
- Regression guard: an ML sale must decrement stock **exactly once** with orders ON and with orders OFF
  (flag both ways) — this is the epic's signature smoke.

## Acceptance (epic-level, Daniel-runnable)

1. Sandbox ML purchase → within a minute (webhook) or ≤30 min (reconcile) the order appears in
   `/shop/manage/pedidos` with an ML badge, correct items, price, and state — and stock moved exactly once.
2. Mark shipped on ML → Miyagi order shows shipped. Cancel on ML → Miyagi cancels + restocks once.
3. Tag three orders, bulk-advance their status; the ML-sourced ones carry the auto source tag.
4. Flag OFF → behavior identical to today (stock-only sync). Non-entitled seller → upsell, no orders.

## Open risks

- **Double inventory effect** (see core risk above) — highest; mitigated by US-0 + flag + signature smoke.
- ML order payloads: exact fee/shipping field shapes (`sale_fee_details`, shipments) need sandbox
  confirmation in sprint 1 — they also feed Epic B's ledger; capture them in order metadata from day one.
- Medusa order creation for external sales may fight checkout-oriented workflows (no payment collected via
  Medusa) — likely a draft-order-completed or order-module-direct write; sprint-1 plan decides.
- ML buyer identity: orders need a customer or guest-shape record; keep a per-connection synthetic
  customer or guest email pattern — decide in sprint 1, don't touch Clerk (rule #4).

## Research citations (present-day, 2026-07-02)

- Order management + `sale_fee_details` on order data: [ML manage-sales docs](https://developers.mercadolibre.com.ar/en_us/manage-sales), [orders API](https://global-selling.mercadolibre.com/devsite/manage-orders-cbt).
- Fees for listing (estimates): [fees-for-listing](https://developers.mercadolibre.com.ar/en_us/fees-for-listing).
- House facts verified in-repo: `mercadolibre-sync` epic README + sprint-4/5/6 docs (merged + live 2026-07-01).
