# Sprint 2 — Manage listings via MCP

Goal: a seller's agent can manage the shop's existing listings — pause/activate and edit price, title,
description, and inventory — through MCP. Requires a new backend service-to-service write path because
listing writes are otherwise gated behind a Clerk JWT that an agent token doesn't have.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **All stories ✅ SHIPPED + live-QA'd 2026-06-03.**

> Backend route (Cloud Run) + frontend tools. Deeper backend research done at build time.

---

## US-1 — Backend internal seller-product route ✅
**As the** platform, **I want** a service-to-service write path for listings, **so that** the agent (which
has no Clerk JWT) can manage a seller's catalog safely.
- [x] New internal Medusa route `apps/backend/src/api/internal/seller-products/[id]/route.ts`, authed by
      the shared `x-internal-secret`. Takes `seller_slug`, resolves the seller, double-checks the product
      belongs to it, then runs the shared update logic.
- [x] Extracted the title/description/status/price/stock logic into `src/api/store/_utils/seller-product-update.ts`
      so this route and the existing Clerk-authed `/store/sellers/me/products/[id]` share ONE write path
      (the portal route refactored onto it, behaviour unchanged).
- [x] Wrong/missing secret → 401. *(Backend commit 7e3b5e2 → Cloud Run.)*

## US-2 — Listing MCP tools ✅
**As a** seller's agent, **I want** to manage my listings, **so that** I can keep the catalog fresh.
- [x] `list_my_listings` (read from the Supabase mirror, all statuses), `update_listing`
      (title/description/price/quantity), `set_listing_status` (active/paused) — token-scoped to one shop,
      ownership verified via the mirror before write, write through the internal route (`lib/seller-products.ts`).
- [x] **Guardrails:** `listingActivationBlock` reuses the portal's checkout-viability rule on activate;
      price changes are money-sensitive → audited + seller security email (`recordAgentListingAction`); the
      Supabase listing mirror is kept in sync.
- [x] A token for shop A can't touch shop B's listings. *(Frontend commit 17abbbc.)*

---

### Definition of done (sprint)
A seller's agent lists its listings, pauses/reactivates one, and edits its price — with the viability gate
enforced, the change mirrored to the storefront, price changes audited and the seller alerted, and
cross-shop access denied.

### QA — passed (2026-06-03)
- **Playwright** (`e2e/seller-listing-tools.spec.ts`, 4 specs green vs prod): all three tools advertised;
  each rejects calls without a token. Full suite 11/11 green.
- **Live MCP** (real token on VP Shops "El Miyagi San", revoked after): `list_my_listings` read; pause →
  status `paused`; reactivate → status `active` (viability gate passed); price $50→$55→$50; bogus
  product_id → "no pertenece a tu tienda". **Verified the price write reached Medusa** (public catalog read
  `price_cents: 5000`), not just the Supabase mirror. Listing restored to its original state.

### Out of scope
Creating new listings via MCP (Bulk-Import covers create) · deleting listings · bulk edits.
