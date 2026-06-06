# Section 4b — Bundles (per-merchant multi-item checkout) — SCOPE

Scoped 2026-05-30. Medusa-first, Vinted-heuristic. **Per-merchant only** (one bundle = one
seller; cross-seller single payment is impossible — each seller has their own Stripe/MP account).

## Decisions locked (Daniel, 2026-05-30)
1. **Discount model:** tiered % by item count (Vinted-style). Seller sets tiers e.g. 2→5%, 3+→10%.
2. **Combined shipping:** one combined Envia quote (all items as one multi-parcel shipment, charged once).
3. **v1 scope:** ALL of — bundle discount E2E + combined shipping + SPEI/escrow in bundle + add-to-bundle from closet.

## What already exists (built, wired, deployed — do NOT rebuild)
- `app/components/CartContext.tsx` — localStorage cart (`ms_cart_v1`), grouped by seller, dedupes by
  productId (1-of-each). Actions: ADD/REMOVE/CLEAR_SELLER/OPEN/CLOSE/HYDRATE. `itemsBySeller` map.
- `app/components/CartDrawer.tsx` — slide-out, per-seller groups, per-seller "Revisar paquete" CTA,
  multi-seller footer warning. Mounted in `app/layout.tsx`.
- `app/components/AddToCartButton.tsx` — add/"En carrito — Ver" toggle.
- `app/components/CartButton.tsx` — nav cart icon w/ count (in layout, desktop + mobile).
- `app/components/SellerBundleSection.tsx` — PDP "Arma un paquete" grid (current item + up to 5
  siblings); "Agregar/Quitar del paquete"; "Comprar paquete" → `/checkout/bundle?sellerId=`.
- `app/l/[id]/page.tsx` — builds `bundleItems` (currentBundleItem + up to 5 active sibling products
  from `getShopListings`), renders `<SellerBundleSection>` (line ~651).
- `app/checkout/bundle/{page,BundleCheckoutClient}.tsx` — review page: per-seller item list,
  remove, multi-seller switcher, summary, pays via `CheckoutPayButton` (Stripe/MP) using the
  multi-item `startCheckout({ items, sellerId })`.
- **Backend `start-checkout`** — already handles multi-item carts (combined title, summed
  `itemsTotalCents`, escrow + SPEI/cash branches all seller-level so they flow through).
- `lib/cart.ts` `startCheckout({ items, sellerId, ... })` — multi-item path: creates cart, adds all
  line items, calls start-checkout. SPEI/cash completes cart → order.

**So a buyer can already add N items from one seller and pay once.** Gaps = everything that makes
a bundle *worth assembling* + payment/shipping parity.

---

## Workstream 1 — Bundle discount (tiered %) — THE headline feature

### Data model
`seller.metadata.settings.bundles` (new block, sibling of `checkout`/`shipping`/`offers`):
```jsonc
{
  "enabled": true,
  "tiers": [
    { "min_items": 2, "percent_off": 5 },
    { "min_items": 3, "percent_off": 10 }
  ]
}
```
Applied tier = highest `min_items` ≤ cart item count. Percent applied to **item subtotal only**
(not shipping).

### Backend — `apps/backend/src/api/store/carts/[id]/start-checkout/route.ts`
- Read `sellerSettings.bundles`. When `cart.items.length >= 2` and `bundles.enabled` and a tier
  qualifies: `discountCents = round(itemsTotalCents * tier.percent_off / 100)`, charge
  `priceCents = itemsTotalCents - discountCents` (offers override still wins if `offer_amount_cents`).
- Persist to cart + order metadata: `bundle_discount: { percent_off, discount_cents, item_count, tier_min_items }`.
- Pass discounted amount to Stripe line item / MP item / payment collection (existing code path —
  it already computes `priceCents`; just subtract the discount before building provider payloads).

**Medusa-first note:** Medusa's **Promotions module** is the canonical discount primitive. BUT
`start-checkout` deliberately computes the charge itself (it does NOT trust `cart.total` — see the
existing `region`/promotions comment; cart.total isn't reliably computed on a plain `listCarts`).
Per-seller *dynamic* bundle tiers as platform Promotions would be heavyweight and awkward to scope
per-seller. **Recommendation:** settings-driven adjustment, consistent with the existing
`escrow_mode` / `bank_transfer` settings pattern. Revisit Medusa Promotions if/when we want
buyer-facing promo codes site-wide. This is an explicit, documented deviation.

### Frontend display
- `ShopSettings.tsx` — new "Paquetes / Bundles" section: enable toggle + tier editor (add/remove
  rows of `{min_items, percent_off}`). Save into `settings.bundles` (see save shape ~line 1133).
- `SellerBundleSection.tsx` — when ≥2 selected and a tier qualifies, show "Ahorras X% armando
  paquete" + struck-through subtotal → discounted total.
- `BundleCheckoutClient.tsx` — summary: add "Descuento de paquete (−X%)" line, update Total.
- Both compute discount client-side for display; **server is source of truth** for the charge.

---

## Workstream 2 — Combined shipping (one Envia quote)

### Key enabler (verified)
`lib/envia.ts` `quoteShipments({ packages: [...] })` already accepts a **multi-package array** →
returns a single combined shipment rate. Products store native `weight_grams` (Section 1). So a
bundle quotes as one shipment with one package per item.

### Backend/API — extend `app/api/checkout/shipping-rates/route.ts`
- Accept `{ items: string[] }` (productIds) in addition to the existing single `listingId`.
- Fetch each listing; build `packages[]` — one per item, using per-product `weight_grams` (fallback
  to seller `package_defaults`), per-item `declaredValue` from `price_cents`, dims from
  `package_defaults`. (Per-product dims aren't stored; use shop defaults per package — acceptable.)
- One `quoteShipments` call → combined rates. Handling fee applied once. Same normalize/sort/display
  logic. Validate all items share one seller (reject mixed).

### Frontend — `BundleCheckoutClient.tsx`
- Add the address form + shipping-rate picker (reuse the pattern from
  `app/checkout/CheckoutExperience.tsx` — address fields, POST `/api/checkout/shipping-rates`, rate
  cards, `selectedShippingQuote`).
- Pass `shippingAddress` + `shippingQuote` to `CheckoutPayButton` (already supports both props).
- start-checkout already charges the shipping line for multi-item → no backend shipping change
  beyond the quote endpoint.
- Replace the current "Envío: Se coordina con vendedor" summary line with the real combined rate.
- Only require shipping when the bundle has physical products needing delivery (mirror
  single-item `needsShippingRate`); pickup/digital bundles skip it.

---

## Workstream 3 — SPEI + escrow parity in bundle checkout

- **SpeiPaymentButton** currently takes a single `listingId`. Extend to accept `items[]` + `sellerId`
  (mirror `CheckoutPayButton`'s multi-item props) so it can drive a bundle SPEI checkout. The
  multi-item `startCheckout` already supports `provider:'spei'`.
- `BundleCheckoutClient.tsx` — render `SpeiPaymentButton` when the seller has a CLABE
  (`settings.checkout.bank_transfer.clabe`), alongside Stripe/MP.
- **Escrow badge:** when `settings.checkout.escrow_mode !== 'off'`, show the "Compra Protegida"
  badge in the bundle review (display only — escrow already flows through start-checkout at the
  seller level for multi-item carts).

---

## Workstream 4 — Add-to-bundle from seller closet (`/s/[slug]`)

- `app/s/[slug]/page.tsx` — the closet grid currently has zero cart wiring. Add a compact
  "Agregar al paquete" control to each **product** card (active, has price, listing_type product),
  building the same `CartItem` shape used on the PDP (productId, sellerId/slug/name, price, image,
  paymentMethods). The existing `CartButton`/`CartDrawer` handle the rest (count, review, checkout).
- Vinted parity: the closet is where buyers actually assemble bundles. Keep the card's primary tap =
  open listing; the add control is secondary (icon button), to avoid hijacking navigation.
- Respect channel: don't show on custom-domain/embed if cart isn't wanted there (check
  `detectChannel` / existing channel layout — confirm during build).

---

## Cross-cutting

### Stock re-validation (fast-follow, not blocking)
Cart items live in localStorage → an item can sell out before checkout. Medusa inventory
reservation already rejects sold-out items at line-item add / complete (backend safety net), but the
UX needs a graceful "ya no disponible — quitar" in the drawer/bundle review. **Recommend** a light
availability re-check (the `in_stock` flag is already on listings) when opening `/checkout/bundle`.
Flagged as a near-term follow-up, not in the committed v1 unless trivial.

### Bilingual
All new strings → currently the app uses hardcoded es-MX strings (no locales/ files). Match existing
Spanish copy; no en.json/es.json exist to update (confirmed).

### tsc clean both repos; fresh branch `feat/section4b-bundles` off main per repo. CONFIRM before push.

---

## Sequencing
1. **WS1 backend** (discount apply in start-checkout) + settings UI — testable in isolation.
2. **WS2** combined-shipping endpoint + bundle checkout address/rate UI — biggest lift.
3. **WS3** SPEI/escrow parity (small, depends on SpeiPaymentButton multi-item refactor).
4. **WS4** closet add-to-bundle (independent, can land anytime).
5. Discount + shipping display polish; QA the full assemble→discount→ship→pay→order loop.

## Open risks
- **Per-product dims** aren't stored (only `weight_grams` + shop default box). Combined quote uses
  shop default dims per package — fine for weight-driven Mexican carrier rates; revisit if dims
  matter for a category.
- **Discount + offer interaction:** if a buyer has an accepted offer on one item, does it combine
  with a bundle? v1: offers are per-item single-item checkout; bundle discount applies only to the
  plain multi-item path (no offer override). Keep them mutually exclusive in v1.
- **Escrow auto-capture** (Section 4a, 3-day window) applies per-order → works for bundle orders
  unchanged.
</content>
