# Catalog management — Sprint 2: Inventory truths + channel publish

**Status:** ✅ built, PRs open (not yet merged) — backend + frontend, all 3 stories, behind a new
kill-switch `catalog.inventory_channels_enabled` (default OFF). Branch `feat/catalog-management-s2`
in both repos, fresh off `origin/main` (Sprint 1's branch was squash-merged).

> ⚠️ **Plan-mode gates — both resolved during S2 planning, confirmed against source:**
> 1. **Sales Channels**: NOT modeled this sprint. Marketplace visibility (today and the new
>    `miyagi_visible` toggle) is entirely a metadata + route-filter convention
>    (`/store/listings` reads `metadata.miyagi_visible`), not real Medusa Sales Channels — no
>    plugin models them here and introducing them would be a much bigger change. The Miyagi
>    toggle deliberately does NOT reuse `isHiddenCatalogProduct` (that deriver means "hidden
>    everywhere," including the PDP and the seller's own storefront) — it's a new, narrow filter
>    scoped to exactly the marketplace-browse route.
> 2. **Manual-payment reservation timing**: confirmed against installed `@medusajs/core-flows`
>    source — `reserveInventoryStep`/`completeCartWorkflow` reserve at cart-complete time
>    identically regardless of payment provider (Stripe, MercadoPago, SPEI/manual). No
>    special-casing needed; "reservado" is truthful the same way for every payment method.
>    The same source check confirmed `allow_backorder` is genuinely native — Medusa's own
>    checkout workflow already honors it, so no custom checkout-blocking code was written for
>    "sobre pedido."

## Stories

### Story 2.1 — Inventory modes: tracked / sin límite / sobre pedido
**As a** seller of made-to-order or always-available goods, **I want** explicit inventory modes per variant — tracked (qty, available vs **reservado**), **sin límite** (`manage_inventory:false`), **sobre pedido** (`allow_backorder:true` + estimated dispatch note) — **so that** I never fake availability with qty 999 (and qty 0 stops meaning "vanished").
**Acceptance:** editor + table expose the modes; buy box + checkout honor them (backorder shows "sobre pedido — envío estimado X" from the seller's processing-time setting; unlimited never blocks); agotado listings stay visible with an honest state (eBay's out-of-stock-control heuristic); UCP catalog carries the mode.
**Risk:** HIGH
**Built:** ✅ Backend `768b603` — `toListingShape` surfaces `allow_backorder`/`reserved_quantity`/`dispatch_estimate`; `updateSellerProduct`'s new `inventory_mode` field translates to the two native variant flags server-side (Medusa's own `reserveInventoryStep`/`completeCartWorkflow` already honor `allow_backorder`, confirmed against installed `@medusajs/core-flows` source — no custom checkout code needed); the catalog route's hand-mirrored status-count logic gets a 5th `sobre_pedido` bucket. Frontend `3699246` — `lib/inventory-mode.ts` (`deriveInventoryMode`/`deriveBuyBoxBehavior`, the mode → buy-box matrix), `lib/catalog-status.ts` extended with `sobre_pedido` (checked before `agotado` — a backorder item at qty 0 reads as "sobre pedido," never "agotado"), PDP buy box honors it behind the flag (OFF ⇒ today's exact `soldOut` logic), editor gets a Rastreado/Sin límite/Sobre pedido selector + dispatch-estimate picker (reusing the shop-wide `PROCESSING_LABELS` vocabulary), UCP catalog/checkout-session/MCP routes thread the same flag so an agent's buy eligibility matches the PDP.

### Story 2.2 — Per-channel publish toggles
**As a** multi-channel seller, **I want** per-product toggles for Miyagi marketplace and Mercado Libre, **so that** I choose where each product sells.
**Acceptance:** Miyagi toggle controls marketplace/browse visibility (own-channel storefront unaffected — a shop always shows its own products); ML toggle drives ml-sync publish/unpublish (entitlement-gated); channel badges in the table; bulk later (S3).
**Risk:** HIGH
**Built:** ✅ Backend `c00a942` — two independent product-metadata toggles (`miyagi_visible`, `ml_enabled`); `decidePublishAction` composes `productPublished AND mlEnabled` so a paused Miyagi product still force-closes ML regardless of the toggle (no special-casing); `publishOrSyncProduct` gates its ML-writing actions (create/update/relist, never close) on a pre-resolved `ml_sync` entitlement; a new `/store/listings` filter (NOT folded into `isHiddenCatalogProduct`) respects `miyagi_visible`. Also fixed a Sprint-1-noted gap: the ML badge now respects `ml_status` (a closed link no longer shows "ML"). Frontend `7440d49` — two new table toggles (Miyagi visibility, ML publish) reusing the pause/activate optimistic-update pattern; the ML toggle always attempts in-place and only deep-links to `/sell/edit/[id]` when the backend reports `needs_category` (never-linked product, no modal built); `lib/catalog-channels.ts` (`deriveChannelBadges`) extracted for the deploy-lag-safe badge logic.

### Story 2.3 — ML price override
**As a** seller, **I want** an optional ML-specific price per product, **so that** ML's fees don't force my Miyagi price up.
**Acceptance:** override rides ml-sync publish parity; table shows both prices; absent override = same price (today's behavior); clears cleanly.
**Risk:** MED
**Built:** ✅ Backend `956f963` — `ml_price_cents` as seller-private variant metadata (exact `unit_cost_cents` precedent: integer-cents validation, null clears, stripped from public reads); `buildMlItemPayload` prefers it over `price_cents`, falling back for every product without an override (zero behavior change verified by a dedicated backend Jest test). Frontend `f1ff855` — single-variant-only price input in the editor (same pattern/dirty-check as unit cost), table shows the ML price as a second line when it differs from the Miyagi price.

## Sprint QA
- **api spec(s):** `e2e/inventory-mode.spec.ts` (mode → buy-box behavior matrix, 2.1) · `e2e/catalog-status.spec.ts` extended with the `sobre_pedido` bucket (2.1) · `e2e/catalog-channels.spec.ts` (channel-badge deriver, 2.2) · a backend Jest unit test for `buildMlItemPayload`'s price-override fallback (2.3 — this story's core logic is backend-side, so its deterministic-gate coverage is too, not a frontend Playwright spec)
- **browser smoke owed:** yes, to Daniel — **money path**: buy one *sin límite* and one *sobre pedido* product end-to-end (order lands, honest copy at every step); ML toggle round-trip on a real ML test listing (turn ON a never-linked product → deep-link to edit page → pick category → confirm it publishes; turn OFF a live one → confirms it closes)
- **deterministic gate:** frontend `tsc --noEmit` + `npm run build` + Playwright `api` green (32 new/extended tests, all passing); backend `medusa build` → `tsc --noEmit` → `npm run test:unit` green (278/278, up from 274 — includes the new `decidePublishAction`/`buildMlItemPayload` cases)
- **Known noise, not a regression:** the local `api` Playwright project has no `webServer` configured (`playwright.config.ts` defaults `baseURL` to production when `PLAYWRIGHT_BASE_URL` is unset), so running it locally hits live `miyagisanchez.com`. Repeated local runs during this build surfaced transient rate-limit/prod-state flakiness on 3 unrelated spec files (`launchpad-campaign-vote`, `not-found-shape`, `promoter-applications`) — confirmed pre-existing by running the same specs against a stashed (pre-this-sprint) working tree. None touch catalog-management code; CI's real gate runs against the PR's own Vercel preview, not production.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (once merged) · or the branch's Vercel preview pre-merge.
**Prerequisite:** `catalog.inventory_channels_enabled` must be ON (Supabase `platform_flags`) — every step below is invisible/inert while it's OFF (the deliberate kill-switch default).

1. Go to `/shop/manage/catalogo`, click a product → edit screen.
   → A new "Modo de inventario" selector shows three pills: Rastreado / Sin límite / Sobre pedido.
2. Pick "Sin límite", save; open its PDP in a private window.
   → No stock counter shown; add-to-cart always available.
3. Back in the editor, pick "Sobre pedido" on a different listing, choose an "Envío estimado" (e.g. 1–3 días hábiles), save.
   → PDP shows a "Sobre pedido — envío estimado 1–3 días hábiles" pill next to the price; (money path, owed to Daniel) buy it with a test card even after setting its tracked quantity to 0 → order confirms, never blocked.
4. Set a THIRD (tracked-mode) listing's quantity to 0, save.
   → PDP shows "Agotado" honestly; listing still visible in the shop; the catalog table's status chip shows "Agotado" (not confused with the Sobre pedido listing from step 3, which shows its own "Sobre pedido" chip).
5. In `/shop/manage/catalogo`, click "Ocultar Miyagi" on a product's Canales cell.
   → Gone from `/l` browse within a page reload; still visible on your own storefront `/s/[slug]`. Click "Mostrar Miyagi" to reverse.
6. Click "Publicar en ML" on a product never linked to Mercado Libre.
   → Toast "Elige una categoría…", redirected to `/sell/edit/[id]`, where the existing predict→confirm ML category flow runs (owed to Daniel — needs a real connected ML sandbox account).
7. Click "Quitar de ML" on a product already live on Mercado Libre.
   → Toast "Desactivado en Mercado Libre"; the ML badge disappears from the table; (owed to Daniel) confirm the real ML listing closes.
8. In the editor, set a "Precio en Mercado Libre" higher than the Miyagi price on a linked product, save, then hit "Sincronizar" (existing ML publish action).
   → Table shows both prices (`$X` · `ML: $Y`); (owed to Daniel) confirm the live ML listing updates to the override price, not the Miyagi price.

If any step fails, note the step number + what you saw — that's the bug report.
