# Catalog management — Sprint 2: Inventory truths + channel publish

**Status:** ⬜ not started

> ⚠️ **Plan-mode gates:** (1) confirm how Medusa **sales channels** map onto the current
> marketplace-visibility model before wiring per-channel publish — escalate if the marketplace
> plugin fights it; (2) verify **reservation semantics on manual-payment orders** (SPEI/cash may
> not reserve stock until seller confirmation — the "reservado" column must tell the truth).

## Stories

### Story 2.1 — Inventory modes: tracked / sin límite / sobre pedido
**As a** seller of made-to-order or always-available goods, **I want** explicit inventory modes per variant — tracked (qty, available vs **reservado**), **sin límite** (`manage_inventory:false`), **sobre pedido** (`allow_backorder:true` + estimated dispatch note) — **so that** I never fake availability with qty 999 (and qty 0 stops meaning "vanished").
**Acceptance:** editor + table expose the modes; buy box + checkout honor them (backorder shows "sobre pedido — envío estimado X" from the seller's processing-time setting; unlimited never blocks); agotado listings stay visible with an honest state (eBay's out-of-stock-control heuristic); UCP catalog carries the mode.
**Risk:** HIGH

### Story 2.2 — Per-channel publish toggles
**As a** multi-channel seller, **I want** per-product toggles for Miyagi marketplace and Mercado Libre, **so that** I choose where each product sells.
**Acceptance:** Miyagi toggle controls marketplace/browse visibility (own-channel storefront unaffected — a shop always shows its own products); ML toggle drives ml-sync publish/unpublish (entitlement-gated); channel badges in the table; bulk later (S3).
**Risk:** HIGH

### Story 2.3 — ML price override
**As a** seller, **I want** an optional ML-specific price per product, **so that** ML's fees don't force my Miyagi price up.
**Acceptance:** override rides ml-sync publish parity; table shows both prices; absent override = same price (today's behavior); clears cleanly.
**Risk:** MED

## Sprint QA
- **api spec(s):** inventory-mode deriver (mode → buy-box behavior matrix) · channel-badge deriver · ML-override payload spec
- **browser smoke owed:** yes, to Daniel — **money path**: buy one *sin límite* and one *sobre pedido* product end-to-end (order lands, honest copy at every step); ML toggle round-trip on a real ML test listing
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Edit a listing → Inventario → set "Sin límite"; open its PDP in a private window.
   → No stock counter; add-to-cart always available.
2. Set another listing to "Sobre pedido" with 5-day processing.
   → PDP shows "Sobre pedido — envío estimado" copy; (money path) buy it with a test card → order confirms, seller order screen shows the backorder note.
3. Set a tracked listing's qty to 0.
   → PDP shows "Agotado" honestly; listing still visible in the shop; table shows estado=agotado.
4. In the table, toggle a product OFF for Miyagi marketplace.
   → Gone from `/l` browse; still on your own storefront `/s/[slug]`.
5. Toggle a linked product ON for Mercado Libre with a $50-higher ML price.
   → ML listing publishes/updates at the override price (check the ML test account); table shows both prices.

If any step fails, note the step number + what you saw — that's the bug report.
