# Sprint 3 — Create listings via MCP

Goal: a seller's agent can **create a brand-new listing** through MCP — completing the listing lifecycle it
already manages (create → edit → pause/activate). Like Sprint 2's edits, creates are otherwise gated behind a
Clerk JWT the agent token doesn't have, so this adds the *create* counterpart of Sprint 2's
service-to-service door. Effectively "bulk-import of a single row, authed by an agent token" — it reuses the
catalog-import schema/validation and the import image pipeline.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **All stories ✅ SHIPPED + live-QA'd 2026-06-04.**

> Backend route (Cloud Run) + frontend tool. Reopens the epic for the one capability Sprints 1–2 left out.

---

## US-1 — Backend internal seller-product **create** route ✅
**As the** platform, **I want** a service-to-service *create* path for listings, **so that** the agent (no
Clerk JWT) can add to a seller's catalog through the same audited door used for updates.
- [x] Extracted the product-create logic from `POST /store/sellers/me/products` into a shared
      `src/api/store/_utils/seller-product-create.ts` (mirrors Sprint 2's `seller-product-update.ts`):
      category/type lookup, metadata, sales-channel + shipping-profile resolution, `createProductsWorkflow`,
      seller↔product link, inventory provisioning. The store POST route refactored onto it (behaviour unchanged).
- [x] New `src/api/internal/seller-products/route.ts` (`POST`), authed by `x-internal-secret`. Takes
      `seller_slug`, resolves the seller, runs the shared create logic.
- [x] A `status: 'published' | 'draft'` field lets the caller control publish state (default `published`).
- [x] Wrong/missing secret → 401; seller not found → 404. *(Backend commit `2a33a63` → us-east4 Cloud Build SUCCESS; live 401-probe confirmed.)*

## US-2 — `create_listing` MCP tool ✅
**As a** seller's agent, **I want** to create a new listing, **so that** I can grow the catalog end-to-end
without a human in the portal.
- [x] `create_listing` tool — input mirrors the catalog-import row (title, category, description, price_mxn,
      currency, listing_type, condition, quantity, state, city, images[], weight_grams). Registered in
      `lib/ucp/capabilities.ts` (`MCP_SELLER_TOOLS`) so the manifest/`/agent` page stay in sync.
- [x] Handler reuses primitives: `resolveAgentShop` (token-scoped to one shop) → `validateRows` server-side
      → `ingestImageUrls` (remote URLs → R2) → create via the new internal route → `syncSupabaseListingMirror`
      → `recordAgentListingCreate` (audit + Telegram).
- [x] **Guardrail (create-as-draft):** a physical `product` on a shop missing delivery **or** payment
      (`listingActivationBlock`) is created `draft`/paused with a clear "configure X to publish" message,
      never a live listing no buyer can check out. Non-product types publish normally.
- [x] A token for shop A can only create in shop A. *(Frontend commit `604bb17`.)*

---

### Definition of done (sprint)
A seller's agent creates a listing via MCP: it lands in Medusa (public catalog) and the Supabase mirror,
shows up in `list_my_listings`, ingests any remote images to R2, is audited + admin-notified, applies the
create-as-draft viability gate for physical products, and refuses cross-shop access.

### QA — passed (2026-06-04)
- **Playwright** (`e2e/seller-listing-create.spec.ts`, 2 specs): `tools/list` advertises `create_listing`;
  no-token call → "Unauthorized". **Full suite 13/13 green vs prod.**
- **Backend deploy:** us-east4 Cloud Build SUCCESS; `POST /internal/seller-products` live (garbage-secret
  probe → 401, sibling PATCH route identical) — confirms the route deployed and the backend booted healthy
  after the create-logic extraction.
- **Live MCP** (disposable token minted on VP Shops, **revoked + verified dead** after): `create_listing` on
  the viable shop → **published**; the listing reached **Medusa's public catalog** (`/api/ucp/catalog/{id}`
  → `$499.00` / 49900¢, `price_mxn` correctly converted) **and** the Supabase mirror (`list_my_listings`
  showed it). Remote image URL → graceful R2 fallback (source host blocked the server-side fetch → original
  URL kept, listing still created). Paused via `set_listing_status` → dropped out of discovery (catalog
  search = 0). Refactor safety is covered transitively: the live agent create exercises the *same shared
  `createSellerProduct` util the portal create uses*.
- **Honest gaps:** (1) the **create-as-draft** branch was logic-verified (it's the already-live
  `listingActivationBlock` used by `set_listing_status`) but not exercised live — VP Shops is sale-ready, and
  we didn't mutate a shared prod shop's payment/shipping just to force the branch. (2) The test listing
  (`prod_01KT9GZBN2WMK0A0TRF8AF1EDN`) is paused/undiscoverable but couldn't be hard-deleted via agent (the
  seller DELETE route is Clerk-gated) — owed a one-click portal delete on VP Shops.

### Out of scope
Subscriptions / multi-tier · digital-file or image binary upload (URLs only) · REPUVE/automotive attrs ·
bulk multi-row create via MCP (file-based bulk import covers volume) · deleting listings.
