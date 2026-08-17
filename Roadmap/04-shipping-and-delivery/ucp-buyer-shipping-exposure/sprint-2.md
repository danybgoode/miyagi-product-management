# UCP buyer-side shipping/delivery-method exposure — Sprint 2: Select fulfillment and charge through the Medusa cart

**Status:** ⬜ not started

## Stories

### Story 2.1 — Resolve an agent's fulfillment selection server-side

**As an** AI-assisted buyer, **I want** to select one returned shipping option or pickup destination,
**so that** the checkout uses my choice without trusting money fields I could have invented.

**Acceptance:**

- Extend the existing `create_checkout` schema with delivery-selection inputs; add no MCP tool.
- Shipping selection requires the complete destination and one option id returned by Sprint 1. Re-run
  the authoritative rate request immediately, find the exact id, and derive `CheckoutShippingQuote`
  solely from that fresh object.
- Never accept agent-supplied carrier, service, currency or amount as authority. Unknown, stale,
  cross-listing/cross-address or currently unavailable ids fail before any cart/payment write.
- Pickup selection validates the destination id against the current checkout-options catalog whenever
  structured spots are required, and requires the same buyer-proposed date/window web checkout uses.
- A pure selection resolver distinguishes invalid input, unavailable source, missing current option and
  valid server-derived shipping/pickup data.

**Risk:** high — anonymous agent input selects a money-affecting fulfillment option.

### Story 2.2 — Start a delivery-aware checkout on the Medusa cart rail

**As an** AI-assisted buyer, **I want** the hosted-payment total and resulting order to carry my validated
delivery choice, **so that** I approve and the seller fulfills one identical contract.

**Acceptance:**

- When delivery selection is present, `create_checkout` calls existing `startCheckout()` with the
  selected Stripe/Mercado Pago provider, MX market, fulfillment method, address and server-derived quote
  or pickup data.
- Shipping adds the freshly resolved amount exactly once to the provider/payment-collection total and
  snapshots rate id, carrier, service, amount, currency and delivery context on the cart/order path.
- Pickup adds zero carrier amount and snapshots the validated spot plus proposed appointment.
- Backend seller-status, provider, coordinated-payment, cart admission and fulfillment-option guards
  remain authoritative; the frontend does not duplicate or weaken them.
- A call without delivery selection preserves the current legacy path. Rental, configured-product,
  arranged-only and US-market guards stay green.
- Errors returned through MCP are short, actionable and sanitized; they do not leak backend payloads,
  addresses, credentials or raw provider errors.

**Risk:** high — checkout, payment total and fulfillment metadata.

## Sprint QA

- **api spec(s):** extend MCP tools/list with the exact delivery-selection schema; add an MCP/API
  contract spec covering a valid server-derived shipping selection, valid pickup selection, unknown
  option, stale/mismatched option, missing address/appointment and unavailable quote source. Preserve
  configured-product, rental, arranged and market-agent contract suites.
- **pure spec:** selection resolver matrix proves no caller amount reaches `startCheckout`, returned
  quote fields are copied from the fresh server match, and pickup validation is catalog-bound.
- **money-path assertion:** the automated seam/spec must prove selected fulfillment cents feed the one
  `startCheckout` input; Daniel's test-mode smoke proves the external hosted total and resulting order.
- **red proof:** mutate the matcher to accept an unknown id or copy a caller amount and observe the new
  specs fail before restoring it.
- **browser smoke owed:** yes, to Daniel — one test-mode agent shipping purchase through the hosted
  Stripe/Mercado Pago page and one authenticated seller order check. Pickup persistence may be verified
  through an API test order if the test fixture permits; otherwise it is also owed to Daniel.
- **deterministic gate:** frontend `npx tsc --noEmit` + `npm run lint` + `npm run build` + Playwright
  `api` green before merge. Run the backend gate only if architecture lock proves a backend diff is
  necessary.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Call `get_checkout_options` at https://miyagisanchez.com/api/ucp/mcp with
   `$MS_TEST_SHIPPABLE_LISTING_ID` and the committed complete MX test destination.
   → The response returns at least one current selectable shipping option id and its centavo total.
2. Call `create_checkout` at https://miyagisanchez.com/api/ucp/mcp with that listing, destination,
   returned option id and the test Stripe/Mercado Pago method. **(money path — owed to Daniel)**
   → The tool returns a hosted checkout URL; its amount equals item total plus the freshly quoted
   shipping amount exactly once.
3. Complete the hosted test-mode payment from step 2. **(money path — owed to Daniel)**
   → Payment succeeds and Miyagi creates one order rather than leaving a paid orphan session.
4. Open the resulting order from https://miyagisanchez.com/shop/manage/orders as the fixture seller.
   **(authenticated fulfillment check — owed to Daniel)**
   → The order shows the selected carrier/service/rate and delivery address; its shipping amount matches
   steps 1–2.
5. Repeat `create_checkout` with an invented option id, then with the prior id after changing the
   destination.
   → Both calls fail before returning a hosted checkout URL; no cart/payment write is reported as
   successful.
6. Call `get_checkout_options` for a fixture listing with structured pickup, then `create_checkout` with
   its returned pickup destination plus a proposed date/window.
   → Checkout adds zero carrier charge and the resulting order carries the chosen spot and appointment.

If any step fails, note the step number + response/order detail — that's the bug report.
