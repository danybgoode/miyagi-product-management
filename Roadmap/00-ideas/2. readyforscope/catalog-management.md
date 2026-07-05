---
status: readyforscope
slug: catalog-management
macro: 03-selling-and-shops
class: feature
archetype: Builder
risk: HIGH (inventory truths + bulk mutations + channel publish) — S1 nav/table MED
---

# Catalog management — one Catálogo home for every product, channel, price & quantity

> Scoped 2026-07-05 from Daniel's raw ask (4 decisions resolved — see *Decisions*). The shared
> foundation for the cars vertical (`cars-vertical-tratocar-parity`) and the bookshop launchpad
> (`bookshop-launchpad`) — both bring large catalogs. Integrates with scaffolded
> `profit-analyzer` + shipped `mercadolibre-sync` / in-flight `ml-orders-native`.

**Tagline:** *Todo tu catálogo en una tabla: qué se publica dónde, a qué precio, con cuánto inventario — y edítalo en bloque sin miedo.*

## Overview — As a / I want / so that

**As a seller with a large catalog** (bookshop, car lot, print shop), I want one Catálogo section
where I see every product with its status, stock, channels, and price — filter it, select across
filters, and apply bulk changes with a preview — **so that** managing 500 titles or 60 cars doesn't
mean 500 edit screens.

**As a multi-channel seller**, I want to choose per product where it publishes (Miyagi marketplace /
Mercado Libre), with what price on each channel, and see estimated profit per channel — **so that**
I stop guessing which channel makes me money.

**As a seller of made-to-order or always-available goods**, I want explicit "sin límite" and "sobre
pedido" (backorder) inventory modes — **so that** I never fake it with qty 999.

**As a seller's AI agent**, I want the same catalog operations over MCP — **so that** "sube 10% los
precios de la colección X solo en ML" is one instruction (AGENTS rule #3).

## Stage-2.5 bucket

- **Already possible (surface, don't build):** unlimited + backorder exist natively in Medusa
  (variant `manage_inventory: false` = unlimited; `allow_backorder: true` = backorder —
  [docs](https://docs.medusajs.com/resources/commerce-modules/inventory)) — **qty 0 is NOT the
  mechanism**; ML publish/unpublish + price parity (ml-sync S3); bulk import staging pipeline;
  collections (OSPP S2, in flight); listing soft-delete.
- **Light:** seller-nav restructure (new Catálogo group — nav SSOT `lib/seller-nav.ts` makes this a
  config change + spec update).
- **Genuinely new:** the filtered catalog table; select-across-filter + staged bulk actions;
  per-channel publish/price/qty surfaces; profit columns integration.

## Decisions (resolved with Daniel, 2026-07-05)

1. **Bulk depth v1 = table + staged bulk actions** (server-side filters, select-all-across-filter,
   bulk price/publish/category/inventory-mode changes that stage a **preview diff before apply** —
   the bulk-import staging pattern reused). Inline spreadsheet cells = fast-follow.
2. **Nav restructure:** third seller-nav group **Catálogo** (Anuncios · Colecciones · Canales ·
   Precios/Márgenes · Importar) → rail reads Operar / Catálogo / Crecer / Configuración. Anuncios
   moves out of the dashboard anchor into the real table (dashboard keeps a summary card).
3. Emoji→Iconoir sweep = separate chore epic (`emoji-to-iconoir-sweep`), not folded here.
4. Profit columns consume `profit-analyzer` seams — its build order (after `ml-orders-native`)
   gates catalog S4, not S1–S3.

## Research (2026-07-05) — heuristics adopted / pitfalls designed against

- **Shopify pitfalls** ([bulk editor limits](https://meldeagle.com/blog/shopify-bulk-editor-not-working-alternatives),
  [guide](https://www.prediko.io/blog/bulk-edit-inventory-on-shopify)): 50-product sessions, lost
  work on refresh, no update-all-variants, UI crawls at ~100 rows. → Ours: server-side filters +
  pagination, selections persist server-side per staged batch, variant-aware bulk ops.
- **eBay pitfalls** ([bulk edits](https://www.maxmerce.com/blog/ebay-bulk-edit-listings-error-free-mass-updates/)):
  zero pre-publish validation — one shifted spreadsheet cell breaks 200 live listings. → Ours:
  every bulk action stages a validated diff (old → new per row) requiring explicit apply; failed
  rows report individually, partial-apply never silent.
- **eBay strength adopted:** out-of-stock control (listing stays alive at 0, auto-relists) → our
  backorder/unlimited modes + "agotado" as a visible state, not a vanished listing.
- **Multi-channel oversell** ([sync gaps](https://www.sumtracker.com/blog/sync-inventory-across-shopify-amazon-and-ebay),
  [Webgility](https://www.webgility.com/blog/shopify-ebay-inventory-sync)): interval-sync +
  SKU-mapping mismatches. → Medusa is the single stock source; ML inbound is already webhook-native
  (ml-sync); the table shows **available vs reservado** so sellers see committed stock.
- **Shopify strength adopted:** saved views (filter presets) + product status (activo/borrador/
  agotado/pausado) as first-class filters.

## What already exists (reuse, don't rebuild)

- **Nav SSOT** — `lib/seller-nav.ts` + `e2e/seller-mode.spec.ts` (nav can't drift) + shared breadcrumb.
- **Manage grid** — `/shop/manage` ManageDashboard ("Mis anuncios") — the table replaces/absorbs it.
- **Bulk import staging** — parse → staging table → validate → idempotent apply (`lib/catalog-import.ts`,
  `/supply` pipeline) — THE pattern for staged bulk actions.
- **ML sync** — publish/unpublish + price/stock parity + links module (`apps/backend/src/modules/mercadolibre/`);
  ML entitlement seams. **ml-orders-native** — ML sales already decrement Medusa stock.
- **Medusa natives** — variant `manage_inventory`/`allow_backorder`, Inventory module
  (stocked/reserved), sales channels, price sets (per-currency; CPP S2 adds qty tiers).
- **Profit-analyzer scaffold** — COGS on variant, ledger, `lib/profit.ts` suggester (S4 consumes).
- **Collections** — OSPP S2 (bulk assign-to-collection joins the action list).
- **Seller MCP tools** — listing lifecycle + config patch (extend with catalog ops).
- **Soft-delete precedent** — seller-unclaimed-bug-sweep (delete from the table = same native soft-delete).

## v1 scope boundary

**In:** Catálogo nav group + filtered/paginated table (search, status, channel, stock-state,
category/collection; saved views; columns: photo/title/SKU/price(s)/stock/channels/status);
select-across-filter; staged bulk actions (price set/±%, publish/unpublish per channel, category,
collection assign, inventory mode, pause/activate, delete); inventory modes surfaced (unlimited /
backorder / tracked with available-vs-reserved); per-channel publish toggles + ML price override
(reusing ml-sync parity); estimated-profit columns (S4, gated on profit-analyzer); MCP catalog-ops
parity; es-MX.

**Out (explicit):** inline spreadsheet editing (fast-follow); CSV round-trip editor (import
pipeline already covers ingest); per-channel *quantity allocation* beyond Medusa's
reserved/available model (true multi-location allocation = later); auto-repricing rules; Amazon or
other channels; admin-side (platform) catalog tools.

## Slices (skateboard → car)

### Sprint 1 — The Catálogo home: nav group + the table — MED
| # | Story | Risk |
|---|---|---|
| 1.1 | Seller-nav restructure: Catálogo group (Anuncios · Colecciones · Canales · Precios · Importar); dashboard keeps a summary card; breadcrumbs + nav spec updated. | LOW |
| 1.2 | `/shop/manage/catalogo`: server-filtered paginated table (search/status/channel/stock/category), sort, saved views; columns incl. channels + stock state; row → existing edit screen. | MED |
| 1.3 | Status model surfaced: activo / borrador / pausado / agotado as filterable first-class states (existing data, honest display). | LOW |

### Sprint 2 — Inventory truths + channel publish — HIGH
| # | Story | Risk |
|---|---|---|
| 2.1 | Inventory modes on the listing editor + table: tracked (qty, available vs reservado) / **sin límite** (`manage_inventory:false`) / **sobre pedido** (`allow_backorder:true` + PDP "sobre pedido, envío estimado X"); buy-box + checkout honor them. | HIGH |
| 2.2 | Per-channel publish toggles per product (Miyagi marketplace / Mercado Libre via ml-sync links); channel badges in the table; UCP catalog respects marketplace visibility. | HIGH |
| 2.3 | ML price override per product (publish parity carries it); table shows both prices. | MED |

### Sprint 3 — Staged bulk actions — HIGH
| # | Story | Risk |
|---|---|---|
| 3.1 | Select-across-filter + bulk action builder → **staged diff preview** (old→new per row, validation errors inline) → apply; per-row failure reporting, idempotent re-apply; audit log. | HIGH |
| 3.2 | Action set v1: price set/±%, publish/unpublish per channel, category, collection assign, inventory mode, pause/activate, delete (soft). | HIGH |
| 3.3 | MCP parity: staged bulk ops as agent tools (propose → confirm token → apply), audited. | MED |

### Sprint 4 — Profit columns (gated on profit-analyzer) — MED
| # | Story | Risk |
|---|---|---|
| 4.1 | Estimated margin per product per channel in the table (profit-analyzer `lib/profit.ts` + fee estimator); "margin killer" flags; link to PA dashboard. | MED |
| 4.2 | Bulk "apply suggested price" rides the S3 staged pipeline + PA's apply path (respects `ml.publish_enabled`). | HIGH |

**Deploy order:** S1 → S2 → S3; S4 after profit-analyzer US-4 ships. S2/S3 backend-first.
**Dependency note:** OSPP S2 (collections) should merge before catalog S3's collection-assign action.

## QA / smoke commitments
Pure seams + api specs: filter-query builder, staged-diff builder (validation + partial-failure),
inventory-mode deriver (buy-box behavior per mode), channel-badge deriver. Browser smokes owed to
Daniel: **S2 money path** (buy an unlimited + a backorder product end-to-end), **S3** bulk price
change on 50+ products with a deliberate invalid row (verify per-row failure), ML publish toggle
round-trip on a real ML test listing. Numbered real-URL walkthrough per sprint.

## Open risks
- Medusa reserved-quantity semantics through the marketplace plugin (verify reservations flow on
  manual-payment orders — SPEI/cash orders may not reserve until confirmation).
- Bulk ops volume: Medusa workflows batching (avoid N sequential API calls for 500 rows) — batch
  endpoint or workflow, decided in S3 plan mode.
- `agotado` state vs unclaimed-shop + print-placement filters — one visibility deriver, don't fork.
- ML rate limits on bulk publish/price ops — queue + backoff (ml-sync client owns it).
