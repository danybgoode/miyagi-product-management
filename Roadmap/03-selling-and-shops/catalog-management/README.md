---
status: in-progress   # Sprint 1 (nav group + catalog table) MERGED 2026-07-08: BE PR#69 squash 84ee9bd, FE PR#193 squash eada2a0. Both live in prod (Cloud Run medusa-web-00144-h5s; Vercel dpl_F9DG2tYCt5MzXDvRMNhbXFrvRWZ2). Fixed a discovered pausado/borrador gap (metadata.paused) as part of S1.3; codex cross-review caught + fixed a real status_counts scoping bug pre-merge. Sprint 2 (inventory modes + channel toggles + ML price override) MERGED 2026-07-08: BE PR#71 squash 77d121e, FE PR#196 squash 8aa3266 — `catalog.inventory_channels_enabled` now ON in prod. Codex cross-review caught + fixed 6 real bugs pre-merge (see sprint-2.md). Sprint 3 (staged bulk actions) MERGED 2026-07-09: BE PR#72 squash 0ff8dc36, FE PR#199 squash a0f2868b — `catalog.bulk_enabled` now ON in prod after Daniel's live smoke passed (all 11 steps incl. MCP agent flow). Cross-agent (codex) review + an independent pr-reviewer pass caught + fixed real bugs pre-merge, incl. a genuine IDOR (bulk-apply had no per-item product-ownership check). The smoke test itself surfaced a 2nd live incident (null-slot crash on `resolveSellerProductIds()` right after any soft-delete) — fixed same-day, BE PR#74 squash 62f32c1b, independently reviewed; a ~18-site sweep of the same latent pattern (incl. money-path order routes) is owed as a follow-up, not yet scoped. Sprint 4 (margin columns + bulk apply suggested prices) MERGED 2026-07-10: BE PR#77 squash d094129, FE PR#209 squash 469f6f4 — HIGH risk tier, Daniel authorized merging on green CI + clean review with the live money-path smoke owed post-merge (explicit call). Cross-agent (Antigravity/agy) review + an independent pr-reviewer pass caught + fixed 4 real issues pre-merge, incl. a deploy-ordering hazard (unconditional `delta_cents` write would have broken the already-live `catalog.bulk_enabled` feature, not just the new action type). A same-day sibling PR (#208) landed on `main` mid-merge and conflicted in `CatalogTable.tsx` (a shared Toast/useToast extraction) — resolved via 3-way merge, reverified green. `delta_cents` migration applied to prod 2026-07-10. Partial live smoke run same day (real Chrome session, no test-account sales history available): flag gate, `no_sales` margin state, sort toggle, the `apply_suggested_price` ineligibility path, and a full regression pass on the pre-existing `price_pct` bulk pipeline all confirmed live and working. Owed: the actual money-path leg on a shop with real order history + COGS (suggested-price diff/total render, Miyagi+ML both updating, multi-variant rejection, margin-killer flagging) — see sprint-4.md's per-step status. Sprint 5 (nav SSOT layer: flag-safe nav parity, mobile bar redesign, import door fix) MERGED 2026-07-11: FE PR#216 squash `4b5b831` — frontend-only, no backend. Cross-agent (codex) review's one "blocking" finding was a false positive (Supabase `marketplace_orders` is the established Medusa read-mirror pattern, not a new bypass); 3 legitimate lesser findings fixed pre-merge. Independent pr-reviewer pass approved, no blocking findings. 29 new/updated pure-logic assertions in `e2e/seller-mode.spec.ts`, incl. a completeness guard so no nav entry can silently lose mobile reachability. Story 5.3 narrowed in scope (confirmed with Daniel): only the dashboard's mobile-hidden Importar button was fixed; the settings-page banner correctly stayed untouched (distinct feature — store-config import, not catalog import). Owed: Daniel's live mobile-bar smoke — see sprint-5.md.
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
| 3 | ✅ 3.1 Select-across-filter → staged diff preview (old→new, inline validation) → apply; per-row failures; idempotent; audited | HIGH |
| 3 | ✅ 3.2 Action set: price set/±%, publish/unpublish per channel, category, collection, inventory mode, pause/activate, soft-delete | HIGH |
| 3 | ✅ 3.3 MCP parity: staged bulk ops as agent tools (propose → confirm → apply) | MED |
| 4 | ✅ 4.1 Estimated margin per product/channel columns (profit-analyzer seams); margin-killer flags | MED |
| 4 | ✅ 4.2 Bulk "apply suggested price" through the S3 staged pipeline + PA apply path | HIGH |
| 5 | ✅ 5.1 Flag-safe nav parity (R13): SELLER_NAV entries carry optional `flag`; nav filters on the same `isEnabled()` pages use — Ganancias hidden (not 404) when `ops.profit_enabled` off | LOW |
| 5 | ✅ 5.2 Mobile bar (F5): Resumen · Pedidos(badge) · ⊕ Publicar FAB → `/sell` · Catálogo · Más(badge relay); grouped "Más" sheet with headers | LOW–MED |
| 5 | ✅ 5.3 Import door mobile restore (F7, narrowed scope): dashboard Importar button unhidden on mobile; settings banner left untouched (distinct feature) | LOW |
| 6 | 6.1 Seller shell over `/sell` + `/sell/setup` for owners (F6); signed-out keeps buyer chrome. Owner-aware branch in shared `layout.tsx` + shared shell component. Kill-switch `seller.shell_on_sell_enabled` (default true, created enabled) | MED |
| 6 | 6.2 Split 62KB `Canal.tsx` (F7): federation → Canales page under Catálogo; support widget → own settings card; anti-monolith guard | MED |

> **S5 + S6 = P1·C IA restructure remainder (F5/F6/F7)** — the seller-portal UX audit fold-in
> ([scope seed](../../00-ideas/seeds/catalog-management-ia-remainder.md), signed off 2026-07-09). Rides the
> `lib/seller-nav.ts` SSOT + the seller shell. Sequenced **after S3 merges** so nav/shell work doesn't
> collide with S3's open PRs. Intrinsic risk LOW–MED; folds into this HIGH epic ⇒ **Daniel merges**.

## Deploy order
S1 → S2 → S3 → S4 (S4 only after profit-analyzer US-4) → **S5 → S6 (both after S3 merges — nav/shell
work must not collide with S3's open PRs; S5/S6 are independent of S4's table columns)**. Backend-first
in S2/S3. OSPP S2 merges before S3 ships collection-assign. `catalog.bulk_enabled` stays OFF until
Daniel's S3 smoke. S5/S6 are frontend/chrome only (no backend).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md`
- [ ] Kill-switches exist with stated polarity: `catalog.bulk_enabled` (S3, fail-closed OFF) and `seller.shell_on_sell_enabled` (S6.1, kill-switch — default true, created ENABLED in every env)
- [ ] Feature branch deleted; frontmatter `status: shipped` (run `node scripts/build-order.mjs`)
