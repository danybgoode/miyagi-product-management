# Custom print products — Sprint 2: Priced options + quantity tiers (commerce core)

**Status:** 🟡 in progress

> ✅ **Verify-first finding (2026-07-05):** confirmed on our installed Medusa v2.15.3
> (`apps/backend/package.json`) that cart price calculation **does** resolve quantity into
> `min_quantity`/`max_quantity` tier prices — [medusa#12706](https://github.com/medusajs/medusa/issues/12706)
> does not apply to us. No start-checkout fallback needed.
>
> Evidence:
> - `node_modules/@medusajs/pricing/dist/repositories/pricing.js:22-80` — `calculatePrices` extracts
>   `quantity` from the pricing context and adds SQL `WHERE min_quantity <= quantity AND max_quantity >=
>   quantity` when quantity is present; only falls back to the base (no-tier) price when quantity is
>   omitted entirely from the context.
> - `node_modules/@medusajs/core-flows/dist/cart/workflows/get-variants-and-items-with-prices.js:33-46` —
>   builds a **per-line-item** pricing context including `item.quantity` (not one shared cart-wide
>   context), confirmed wired into `refresh-cart-items.js`, `add-to-cart.js`, and
>   `update-line-item-in-cart.js` — the real cart paths.
> - The GitHub issue itself (filed against v2.7.1, closed "not planned") describes quantity being
>   unavailable when a cart holds multiple items — our installed version's per-item context construction
>   doesn't have that gap.
> - No `CHANGELOG.md` entry between 2.8 and 2.15 mentions a fix in this area; the code has simply always
>   worked correctly on the version we run. No existing manual tier-price workaround was found anywhere in
>   `apps/backend/src`.
> - Consequence: `start-checkout` (`apps/backend/src/api/store/carts/[id]/start-checkout/route.ts:~327-330`)
>   already manually sums `unit_price * quantity` across `cart.items` as a `cart.total` fallback — since
>   each item's `unit_price` is already tier-resolved by Medusa, this seam needs **no new logic**.

## Stories

### Story 2.1 — Seller defines priced option dimensions → real Medusa variants
**As a** print-shop seller, **I want** to add option dimensions (Tamaño / Material / Acabado, up to ~3) with per-combination pricing to a listing (create + edit), **so that** a 7.5cm holográfico costs what it should without chat back-and-forth.
**Acceptance:** options persist as native Medusa options/variants; existing single-variant listings and their edit flow are untouched (sweep the `variants[0]` call sites: `_utils/seller-product-update.ts`, inventory summing, offers, ML link); deleting a dimension is safe on a listing with orders.
**Risk:** HIGH

### Story 2.2 — Quantity price breaks per variant
**As a** seller, **I want** quantity tiers (e.g. 10 / 25 / 50 / 100+) per variant, **so that** bulk pricing works like Sticker Mule's automatic discounts.
**Acceptance:** tiers stored as Medusa `min_quantity`/`max_quantity` prices; overlapping/gapped tiers rejected with a clear es-MX message; a listing without tiers behaves exactly as today.
**Risk:** HIGH

### Story 2.3 — Correct variant × quantity pricing through PDP → cart → checkout
**As a** buyer, **I want** the price I see at every step to match the variant + quantity I chose, **so that** the pay button never lies (house rule: pay-button total always equals the summary).
**Acceptance:** pure price-grid deriver extracted to `lib/` (unit-tested: tier boundaries, currency, MXN rounding); changing quantity in the cart re-resolves the tier; coupons and negotiation offers apply to the resolved variant+qty price (spec this explicitly).
**Risk:** HIGH

## Sprint QA
- **api spec(s):** 2.2/2.3 → `e2e/api/price-grid-deriver.spec.ts` (tier resolution: boundaries, gaps, no-tier fallback) + a cart-recompute spec on the checkout seam
- **browser smoke owed:** yes, to Daniel — **money path**: configure variant + qty ≥ a tier break → checkout with Stripe test card → order total matches the grid
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/shop/manage (as miyagiprints) → edit a sticker listing → "Opciones".
   → You can add Tamaño (5cm/7.5cm/10cm) + Material (vinil/holográfico) with prices per combination.
2. Add quantity tiers on the 7.5cm/vinil variant: 10 → $X, 50 → $Y (Y unit price < X).
   → Tiers save; entering an overlapping tier shows a clear es-MX error.
3. Open the listing's public page, pick 7.5cm/vinil, set quantity 50.
   → Displayed unit price drops to the 50-tier; total = 50 × tier price.
4. (money path) Add to cart → in cart, change quantity 50 → 10.
   → Line total re-resolves to the 10-tier. Checkout with Stripe test card 4242… → order confirmation total equals the cart summary exactly.
5. Open an old single-variant listing (any other shop) and buy-flow it to the payment screen.
   → Behaves exactly as before this sprint (regression).

If any step fails, note the step number + what you saw — that's the bug report.
