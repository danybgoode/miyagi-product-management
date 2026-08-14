# Tenant lifecycle — Sprint 2: paused means dark, everywhere

**Status:** ⬜ not started

## Stories

### Story 2.1 — Catalog visibility follows status
**As a** buyer, **I want** a paused shop's products to be absent, **so that** I never open a product
page for a shop that cannot sell to me.
**Acceptance:** pausing a shop removes its products from `/store/listings`, `/store/listings/:id`,
`/store/sellers/:slug/*`, search, the sitemap, the agent surface and the embed — by sales-channel
unlink, with no new filter added to any read path. Unpausing restores all of them.
**Risk:** HIGH

### Story 2.2 — Checkout admission refuses a non-active seller
**As a** platform owner, **I want** the money path to refuse independently of catalog visibility,
**so that** a lingering channel link can never become a sale.
**Acceptance:** `/store/checkout-admission/:id` refuses a product whose owning seller is `paused` or
`deleted`, with the seam's existing three-state shape — `closed` 404 for a genuinely refused product,
`unavailable` 503 when the seller cannot be resolved, never a fallback to admitting it.
`start-checkout` refuses the same case.
**Risk:** HIGH

### Story 2.3 — The seller portal explains itself
**As a** paused merchant, **I want** to be told my account is paused, **so that** I do not think the
product is broken.
**Acceptance:** `/store/sellers/me/*` write routes refuse for a paused seller with a status
distinguishable from "not found" and from "not authenticated"; the portal renders an explanation
naming the state; reads that let the merchant see their own data keep working.
**Risk:** MEDIUM

## Sprint QA
- **api spec(s):** 2.2 → `src/api/store/_utils/__tests__/checkout-admission-status.unit.spec.ts`
  (asserts the three states, and that an unresolvable seller is 503 not admit); 2.1 →
  `e2e/paused-shop-invisible.spec.ts` over the marketplace read surface.
- **browser smoke owed:** **yes, to Daniel** — the checkout refusal on a real cart is a money-path
  step an anonymous smoke cannot complete.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

Use a disposable shop, not a real merchant's.

1. Note the disposable shop's public URL and one of its product URLs. Confirm both render.
2. Pause the shop.
3. Reload the shop URL and the product URL.
   → both are gone (404). Search for the product by title on https://miyagisanchez.com/mx/l
   → it does not appear.
4. Try to add that product to a cart and check out. **Owed to Daniel — money path.**
   → checkout refuses.
5. Sign in as that shop's owner and open the seller portal.
   → it says the account is paused. It does not show a broken or empty screen.
6. Unpause the shop, and repeat step 1.
   → the shop and the product are back, and the product's channel membership is what it was before.

If any step fails, note the step number + what you saw — that's the bug report.
