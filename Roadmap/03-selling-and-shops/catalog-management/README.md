---
status: in-progress   # Sprint 1 (nav group + catalog table) MERGED 2026-07-08: BE PR#69 squash 84ee9bd, FE PR#193 squash eada2a0. Both live in prod (Cloud Run medusa-web-00144-h5s; Vercel dpl_F9DG2tYCt5MzXDvRMNhbXFrvRWZ2). Fixed a discovered pausado/borrador gap (metadata.paused) as part of S1.3; codex cross-review caught + fixed a real status_counts scoping bug pre-merge. Sprint 2 (inventory modes + channel toggles + ML price override) MERGED 2026-07-08: BE PR#71 squash 77d121e, FE PR#196 squash 8aa3266 — behind catalog.inventory_channels_enabled (still OFF). Backend Cloud Build + frontend Vercel prod deploy triggered on merge (not yet confirmed live — ~12min Cloud Build lag). Codex cross-review caught + fixed 6 real bugs pre-merge (see sprint-2.md). Owed: Daniel's real-phone table smoke (S1) + money-path/ML-toggle smoke (S2, flag still off). S3-S4 not yet started.
slug: catalog-management
---

# Epic: Catalog management — one Catálogo home for every product, channel, price & quantity

> **Area:** 03 · Selling & Shops · **Risk:** HIGH (inventory truths + bulk mutations + channel publish; S1 MED) · **Archetype:** Builder · **Scope doc:** [`00-ideas/2. readyforscope/catalog-management.md`](../../00-ideas/2.%20readyforscope/catalog-management.md)

**Tagline:** *Todo tu catálogo en una tabla: qué se publica dónde, a qué precio, con cuánto inventario — y edítalo en bloque sin miedo.*

## Why
Sellers with large catalogs (bookshops, car lots, print shops) manage 500 titles through 500 edit
screens; multi-channel sellers (Miyagi + Mercado Libre) can't see where a product publishes, at what
price, or what it earns. This epic adds the Catálogo section: a server-filtered table, per-channel
publish/price, honest inventory modes (sin límite / sobre pedido — Medusa's native
`manage_inventory:false` / `allow_backorder:true`, NOT qty 0), and staged bulk actions that preview
every diff before apply — deliberately dodging Shopify's bulk-editor traps (50-row sessions, lost
work, no update-all-variants) and eBay's no-validation disasters, while adopting their strengths
(saved views; listings that survive stock-outs). Foundation for the cars + bookshop verticals.

## Context
| | |
|---|---|
| **Role** | Seller (manage catalog), seller's agent (MCP catalog ops), buyer (honest availability), admin (flags) |
| **Macro-section** | 03 · Selling & Shops |
| **Risk** | S2 HIGH (inventory/checkout behavior) · S3 HIGH (bulk mutations) · S4 HIGH (price writes w/ profit-analyzer) |
| **Flag** | `catalog.bulk_enabled` kill-switch on S3 apply path (fail-safe OFF until smoke) |
| **Decisions** | 2026-07-05 w/ Daniel: table + staged bulk actions (inline cells = fast-follow) · Catálogo nav group · emoji sweep separate · S4 gated on profit-analyzer |
| **Depends on** | OSPP S2 (collections) before S3's collection-assign action · profit-analyzer US-4 before S4 |
| **Bilingual** | es-MX only |

## Medusa-first note
Inventory modes are **native Medusa variant flags** (`manage_inventory`, `allow_backorder`) + the
Inventory module's stocked/reserved — surface, don't build. Channel publish maps to **Medusa sales
channels** (marketplace visibility) + the ml-sync links module (ML) — plan mode confirms the sales-
channel mapping vs the current publish model; escalate if the marketplace plugin fights it. Bulk
mutations run as **Medusa workflows/batch endpoints** (never N sequential route calls). Prices stay
Medusa price sets (CPP S2's qty tiers included). No Supabase catalog tables.

## What already exists (reuse, don't rebuild)
- **Nav SSOT** `lib/seller-nav.ts` + `e2e/seller-mode.spec.ts` + shared breadcrumb (S1 is config + spec).
- **Manage grid** (`ManageDashboard` "Mis anuncios") — absorbed by the table; dashboard keeps a summary card.
- **Bulk-import staging pipeline** (`lib/catalog-import.ts`, staging → validate → idempotent apply) — THE staged-bulk-action pattern.
- **ml-sync module** (publish/price/stock parity, links, rate-limited client) + **ml-orders-native** (ML sales already decrement Medusa stock) + ML entitlement seams.
- **Medusa natives:** variant flags, Inventory (stocked/reserved), sales channels, price sets, collections (OSPP S2).
- **profit-analyzer scaffold** — COGS per variant, ledger, `lib/profit.ts` (S4 consumes; builds after ml-orders-native).
- **Seller MCP tools** (listing lifecycle, config patch, audit log) — extend with catalog ops.
- **Soft-delete precedent** (seller-unclaimed-bug-sweep); print-placement/hidden-catalog visibility predicates (`lib/listing-query.ts`) — ONE visibility deriver, don't fork.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | ✅ 1.1 Seller-nav restructure: Catálogo group (Anuncios · Colecciones · Canales · Precios · Importar); rail = Operar / Catálogo / Crecer / Configuración | LOW |
| 1 | ✅ 1.2 `/shop/manage/catalogo` server-filtered paginated table (search/status/channel/stock/category; saved views; sort) | MED |
| 1 | ✅ 1.3 Status model surfaced: activo / borrador / pausado / agotado as first-class filters | LOW |
| 2 | ✅ 2.1 Inventory modes: tracked (available vs reservado) / sin límite / sobre pedido — editor + table + buy-box/checkout honor them | HIGH |
| 2 | ✅ 2.2 Per-channel publish toggles (Miyagi / ML) + channel badges; UCP respects marketplace visibility | HIGH |
| 2 | ✅ 2.3 ML price override per product (publish parity carries it); both prices in the table | MED |
| 3 | 3.1 Select-across-filter → staged diff preview (old→new, inline validation) → apply; per-row failures; idempotent; audited | HIGH |
| 3 | 3.2 Action set: price set/±%, publish/unpublish per channel, category, collection, inventory mode, pause/activate, soft-delete | HIGH |
| 3 | 3.3 MCP parity: staged bulk ops as agent tools (propose → confirm → apply) | MED |
| 4 | 4.1 Estimated margin per product/channel columns (profit-analyzer seams); margin-killer flags | MED |
| 4 | 4.2 Bulk "apply suggested price" through the S3 staged pipeline + PA apply path | HIGH |

## Deploy order
S1 → S2 → S3 → S4 (S4 only after profit-analyzer US-4). Backend-first in S2/S3. OSPP S2 merges
before S3 ships collection-assign. `catalog.bulk_enabled` stays OFF until Daniel's S3 smoke.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md`
- [ ] Kill-switch `catalog.bulk_enabled` exists with stated polarity
- [ ] Feature branch deleted; frontmatter `status: shipped` (run `node scripts/build-order.mjs`)
