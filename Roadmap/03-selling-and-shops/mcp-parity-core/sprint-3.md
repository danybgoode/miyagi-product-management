# MCP parity core — Sprint 3: Money-adjacent listing/pricing tools

**Status:** ⬜ not started · independent of Sprint 2, both frontend-only. Two small, individually
simple closures — each mutates money-adjacent state, so each is HIGH with its own kill-switch.

## Stories

### Story 3.1 — `delete_listing` over MCP
**As a** shop agent, **I want** to delete a listing, **so that** catalog cleanup is agent-operable.
**Acceptance:** wraps `DELETE /api/sell/listing/[id]`; verifies `shopOwnsProduct` first; faithfully
surfaces the route/backend's existing guard behavior when the listing is order-linked as a named
`isError` (not a generic failure) — this story relies on that existing guard, it does not invent
a new one.
**Reuses:** the existing `DELETE /api/sell/listing/[id]` route + its internal path; `shopOwnsProduct`.
**Risk:** HIGH (removes a possibly order-linked listing). **Kill-switch:**
`mcp.delete_listing.enabled`, default OFF.

### Story 3.2 — `apply_price` over MCP
**As a** shop agent, **I want** to apply a computed margin-target price to a live variant, **so
that** repricing (e.g. from the Profit Analyzer's solve-for-price) is agent-operable.
**Acceptance:** wraps `POST /api/sell/profit/apply-price`; ownership verified; surfaces the
route's existing variant-price validation faithfully.
**Reuses:** the existing `POST /api/sell/profit/apply-price` route.
**Risk:** HIGH (mutates a live variant price). **Kill-switch:** `mcp.apply_price.enabled`,
default OFF.

## Sprint QA
- **api spec(s):** one per story — auth/ownership rejection, the happy path, and the named guard
  (order-linked delete refusal; invalid variant/price rejection).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **browser smoke owed:** **yes, to Daniel, both stories** —
  - 3.1: delete an order-linked test listing via the tool, confirm the guard refuses it; delete a
    clean test listing, confirm it's actually gone from the shop's catalog.
  - 3.2: apply a price via the tool to a live test variant, confirm the new price shows correctly
    in a real cart/checkout.

## Sprint 3 — Smoke walkthrough (do these in order, once each flag is flipped ON in a test shop)
Env: production (or preview, flag forced on for the test shop only)

1. Create a throwaway test listing with no orders against it. Call `delete_listing` on it.
   → Tool returns success; the listing no longer appears in `list_my_listings` or the storefront.
2. Call `delete_listing` on a listing that has at least one real order against it.
   → Tool returns `isError:true` naming the order-linked guard; the listing is untouched.
3. On a test variant, call `apply_price` with a computed target price.
   → Tool returns success with the new price; add the item to a cart and confirm checkout charges
   the new price, not the old one.

If any step fails, note the step number + what you saw — that's the bug report.
