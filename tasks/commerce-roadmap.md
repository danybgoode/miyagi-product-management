# Commerce roadmap — post-inventory (2026-05-30)

Fresh plan after the big-picture status review, mapped to the old plans
(checkout-remediation Sessions A–D; post-purchase A–F). Medusa-first: research
docs.medusajs.com before designing each section. No Supabase for commerce.

## ✅ Section 1 — Seller product management (full Medusa model) DONE (2026-05-30)
Backend commit 8125446 + frontend commit 2a89f94. Both on main, deployed.

What shipped:
- **Mexico config** (`POST /internal/setup-mexico`, run once live): MXN added as default store
  currency, Mexico region (country: mx) + tax region created, stock location renamed
  "European Warehouse" → "México", store name set to "Miyagi Sánchez".
  This fixed the Admin price display ($2,500 shown for $25 items — was a missing MXN region,
  NOT a price-unit bug; prices were correct in centavos all along, checkout was always right).
- **Product create**: auto-generates SKU (`MIYAGI-{ts36}-{rand}`), sets variant title = product
  title (was hardcoded "Default"), accepts `weight_grams` → native Medusa `weight`, accepts
  `attrs` → `metadata.attrs`.
- **Product PATCH**: accepts `attrs` deep-merge + `weight_grams`.
- **ListingShape**: exposes `attrs`, `weight_grams`, `sku`.
- **Type-driven seller form** (`app/sell/AttrsSection.tsx`, shared component): per-category
  attribute fields on create + edit — autos (make/model/año/km/combustible/transmisión/color),
  inmuebles (tipo/m²/recámaras/baños/estacionamientos/amueblado), moda (marca/talla/género/
  color/material), electrónica (marca/modelo/almacenamiento/color), servicios (modalidad/
  duración/experiencia), generic (marca/color).
- **Backfill** (`POST /internal/backfill-product-titles`, run once): 5/5 existing products
  fixed — variant titles set to product title, SKUs generated.

Still not done from the original Section 1 scope (deferred):
- Prune 20+ duplicate sales channels/publishable keys (Admin housekeeping, non-blocking).
- `feat/messaging-realtime` not merged — messaging work pending Daniel's Clerk/Supabase toggles.

---

## ✅ Section 2 — Returns → refunds (F) DONE (2026-05-30)
Backend commit fe8c79e + frontend commit 9ebc6bf. Both on main, deployed.

What shipped:
- **`POST/GET /store/customers/me/orders/:id/return-request`** (Medusa backend): buyer opens
  return on a Medusa order; persists `return_request` in `order.metadata`; gates on
  delivered/completed status; one active return per order.
- **`GET/PATCH /store/sellers/me/orders/:id/return-request`** (Medusa backend): seller
  accept (→ triggers `refundPaymentWorkflow` → Stripe `reverse_transfer:true` or MP
  `/v1/payments/{id}/refunds`) or decline. Sets `order.payment_status = 'refunded'` on success.
  Partial refund supported via `refund_amount_cents`. Ownership-checked.
- **Frontend routes** `app/api/orders/[id]/return-request/[route|requestId]`: detect
  `order_*` IDs → proxies to Medusa backend; Supabase path kept as fallback for legacy orders.
  Emails (Resend) sent from frontend after Medusa confirms.
- **Vercel double-deploy fixed**: added `"git": { "deploymentEnabled": { "main": true } }` to
  `vercel.json`. Feature branch pushes no longer trigger failing Preview deployments.

---

## ✅ Section 3 — Post-purchase E-full + order-store consolidation DONE (2026-05-30)
Backend commit 48613c1 on main. Frontend: no new commits needed.
**Deployed 2026-05-30 (3 builds: 48613c1 → 176d1fe → 2ad3dac). Seed run. FULLY LIVE.**
ShippingOptions seeded: shipping=so_01KSXJBSMFY5Y8EKRK3N6K2W81 | pickup=so_01KSXJBSNB5R8F32GF104PAC8T | digital=so_01KSXJBSNX7605PW95RGT77K2H

### Order-store consolidation — what's live (accumulated across sessions):
- Seller orders page (`/shop/manage/orders`): reads Medusa directly ✅
- Seller order detail: Medusa ✅
- Buyer order list: merges Medusa + Supabase (Medusa-only orders appear) ✅
- Buyer order detail: Medusa for `order_*` IDs ✅
- Ship / status PATCH / return-request: all Medusa-aware ✅
- Autoconfirm cron: calls `/internal/autoconfirm-delivered` (Medusa) + Supabase ✅
- `/api/orders?role=seller` (old route): still Supabase-only — NOT used by seller pages
  (seller pages call Medusa backend directly); can be cleaned up later

### E-full (native Medusa fulfillment) — what ships in backend commit 1d938cf:
- **`@medusajs/fulfillment-manual` registered** in medusa-config.ts
- **`POST /internal/setup-fulfillment`**: idempotent seed — creates FulfillmentSet
  "Miyagi México" + ServiceZone + GeoZone(MX) + 3 ShippingOptions (shipping, pickup,
  digital) with manual provider. Links FulfillmentSet to the stock location.
  **Must be run once after deploy.**
- **Seller PATCH** (`/store/sellers/me/orders/:id`) now runs:
  - `createOrderFulfillmentWorkflow` (shipping_option_id derived from
    `order.metadata.fulfillment_method`; location_id from stock location) when status='shipped'
  - `createOrderShipmentWorkflow` with tracking_number when tracking provided
  - `markOrderFulfillmentAsDeliveredWorkflow` when status='delivered'
  - Graceful fallback to metadata-only (E-lite) if seed hasn't run yet
  - Metadata always written (normalizeMedusaOrder compatibility maintained)
- No checkout changes required: `createOrderFulfillmentWorkflow` accepts
  `shipping_option_id` directly — no shipping method on cart needed.

### Deferred (intentional):
- Checkout wiring (`addShippingMethodToCart`) — would make Medusa Admin show correct
  shipping cost per order; deferred to Section 4 alongside escrow checkout changes.
- `stocked_quantity` full decrement: still reservation-based (correct for P2P);
  `markOrderFulfillmentAsDeliveredWorkflow` will decrement once E-full workflows run.
- `/api/orders?role=seller` Supabase route cleanup — non-blocking (no live page uses it).

## ✅ Section 4a — Escrow + Manual payments DONE (2026-05-30)
Backend commit a92f571, deployed to Cloud Run (build ✅). Frontend commit 80e9eb6, deployed to Vercel (✅).
Both live on main. No seed or migration required.

### What shipped:

**Escrow (Stripe `capture_method: manual`)**
- `start-checkout` reads `seller.settings.checkout.escrow_mode` ('off'|'optional'|'required');
  adds `capture_method:'manual'` on the PaymentIntent when escrow is active
- Stripe provider `capturePayment` now actually calls `stripe.paymentIntents.capture(pi)` when
  `data.escrow_mode` is set (was a no-op before)
- `cancelPayment` voids the PI authorization instead of expiring the Checkout Session when escrow
  is active + uncaptured — no money was ever moved
- `POST /store/customers/me/orders/:id/confirm-delivery`: buyer confirms receipt → triggers
  `capturePaymentWorkflow` for escrow orders; marks `escrow_captured: true` in metadata
- `POST /store/sellers/me/orders/:id/release-escrow`: seller manually releases escrow early
  (buyer confirmed verbally, or window elapsed)
- `return-request` accept path: voids the PI (escrow + uncaptured) instead of calling
  `refundPaymentWorkflow` — upgrades Section 2 refunds from clawback to void-auth for F3
- `autoconfirm-delivered`: also auto-captures escrow orders delivered 3+ days without buyer
  confirmation (ESCROW_AUTO_CAPTURE_DAYS = 3)

**Manual payments (SPEI/cash)**
- `start-checkout` accepts `provider:'spei'|'cash'`; uses `pp_system_default` (built-in Medusa
  manual payment provider — no extra package needed); returns `{clabe, bank_name, account_holder,
  redirect_url:null}`
- `lib/cart.ts` `startCheckout` for SPEI/cash: immediately calls `POST /store/carts/:id/complete`
  to create the Medusa order in `pending` state, then returns the order ID
- `SpeiPaymentButton`: new component — shows CLABE instructions inline, no external redirect
- Listing page: SPEI as primary payment when only CLABE configured; secondary option when Stripe/MP
  is also present
- `PATCH /store/sellers/me/orders/:id/confirm-payment`: seller marks payment received →
  `capturePaymentWorkflow` on `pp_system_default` → `payment_status: paid`
- Frontend API proxies: `/api/orders/:id/{confirm-delivery, confirm-payment, release-escrow}`
- Buyer order page: SPEI pending notice + escrow "liberar pago" CTA
- Seller order detail: "Confirmar pago recibido" (SPEI) + "Liberar pago" (escrow) panels

**MP escrow**: deferred. MercadoPago Checkout Pro has no native delayed-capture API; "Compra
Protegida" is a buyer-protection program requiring special MP merchant agreement. Badge stays in
ShopSettings UI but is not wired to any capture behavior.

### Deferred (intentional):
- Push to main / deploy — needs Daniel's OK (backend ~18min Cloud Build)
- Bundles — multi-item checkout needs own scoping session (Section 4b)
- `addShippingMethodToCart` wiring (deferred from Section 3; optional)

## ✅ Section 4b — Bundles DONE (2026-05-30)
Backend commit a78db64, frontend commit a884d88. Both deployed to Cloud Run + Vercel. Full scope in tasks/bundles-section4b.md.

### What shipped:
- **Bundle discount engine (Vinted-style tiered %)**: `start-checkout` reads `seller.settings.bundles.{enabled,tiers}`;
  applies highest-qualifying tier to `priceCents` before building Stripe/MP payloads; offer_amount_cents
  overrides skip the discount; `bundle_discount_*` persisted to order metadata.
- **ShopSettings**: "Descuentos por paquete" section — enable toggle + tier editor (up to 4 tiers of
  {min_items, percent_off}); live preview chip.
- **SellerBundleSection** (PDP): savings badge + strikethrough subtotal when tier active;
  "Agrega X más → Y% off" teaser for next tier.
- **Combined Envia quote**: `/api/checkout/shipping-rates` now accepts `{items:[ids]}` — one
  EnviaPackage per item using per-product `weight_grams`, one `quoteShipments()` call → combined rate.
- **Bundle checkout** (`/checkout/bundle`): address form + live rate picker; SPEI button when seller
  has CLABE; shipping quote passed to all payment buttons.
- **CartItem.paymentMethods.spei** flag added; listing page + closet pass it through.
- **ClosetListingCard** (`/s/[slug]`): every physical product card has a secondary "Agregar al paquete"
  button; primary tap still navigates to listing.

### Fast-follow (not committed):
- Stock re-validation UX in bundle drawer (Medusa inventory already rejects at backend).

## Cleanup debt (still owed)
- **Rotate MP prod client_secret + access token; delete `references/mpkeys.txt`** — do ASAP.
- **Decommission Render** (still auto-deploys backend → failure emails).
- **Prune 20+ duplicate sales channels / publishable keys** in Medusa DB (Admin QoL).
- Remove `/internal/{mp-debug, mp-test-payment, backfill-sales-channel, backfill-inventory,
  backfill-product-titles, setup-mexico}` once confirmed done (x-internal-secret gated, low risk,
  but cleaner without them).
- Merge `feat/messaging-realtime` once Daniel enables Clerk "Connect with Supabase" + Supabase
  Add-Clerk-3rd-party-auth toggles → spike → E2E → merge.

## Standing rules (every section)
- Medusa primitives first; research docs.medusajs.com before designing. Supabase only for non-commerce.
- Bilingual strings (en.json + es.json). tsc clean. Fresh branch off main per repo.
- CONFIRM before any push/deploy (backend push main → Cloud Build ~18min; frontend push main →
  Vercel ~2min; check via `gh api repos/danybgoode/*/commits/main/check-runs`).
- Local checkouts: **frontend `feat/messaging-realtime`**, **backend `main`**.
- Vercel deploys only from `main` (fixed 2026-05-30 — feature branches no longer trigger builds).
