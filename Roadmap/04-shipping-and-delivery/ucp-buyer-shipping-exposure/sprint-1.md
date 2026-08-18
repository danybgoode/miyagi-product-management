# UCP buyer-side shipping/delivery-method exposure — Sprint 1: Discover delivery choices and authoritative rates

**Status:** ✅ shipped — frontend [#385](https://github.com/danybgoode/miyagisanchezcommerce/pull/385), production commit `936b42d`

## Stories

### Story 1.1 — Project checkout-options into UCP fulfillment

**As an** AI shopping agent, **I want** a shippable listing's checkout session to expose the seller's
real shipping and pickup methods, **so that** I can ask the buyer only for delivery inputs the seller
actually supports.

**Acceptance:**

- Widen the existing checkout-options adapter to retain the full typed `delivery_methods` catalog while
  preserving payment-method and coordinated-note behavior.
- For an MX physical listing, project backend shipping/pickup into UCP `fulfillment.methods`, using the
  listing as the single line-item/group subject.
- Pickup spots become retail-location destinations with stable ids. Shipping reports that a destination
  is required; an incomplete destination is a recoverable/missing-input state, not an empty rate result.
- Digital/service/rental listings receive no fabricated physical-fulfillment block. The arranged-only
  `delivery: { arranged, note }` response stays byte-compatible.
- The projection logic lives in a next-free pure module, with typed unknown/unavailable states rather
  than route-inline coercion.

**Risk:** high — public checkout contract and delivery availability.

### Story 1.2 — Quote and present authoritative shipping options

**As an** AI shopping agent, **I want** current carrier options for the buyer's MX address, **so that**
I can present the same prices and delivery context as web checkout.

**Acceptance:**

- Accept a complete shipping destination on the current checkout-session/get-checkout-options input and
  map it once into the existing shipping-rates request shape.
- Call the existing `/store/envia/rates` seam; do not reproduce provider flags, seller opt-ins, Envía
  grants, weight rules, rate-display limits or Correos math in the UCP code.
- Project every returned option with a stable selectable id, title/description, carrier when present,
  and a `fulfillment` total in minor currency units.
- Preserve backend order exactly. In particular, the UCP layer never price-sorts or auto-recommends
  Correos ahead of live carriers.
- Preserve three states: options present, known-empty, and unavailable/error. The MCP text summary names
  which state occurred and still includes the raw JSON response.
- Extend the existing `get_checkout_options` tool schema/description and summary; add no tool.

**Risk:** high — quoted shipping amounts influence the buyer's later charge.

## Sprint QA

- **api spec(s):** reshape `e2e/ucp-checkout-session-shipping-boundary.spec.ts` into the positive
  fixture-gated method/rate contract; extend `e2e/ucp-checkout-session-arranged-delivery.spec.ts` only as
  needed to prove its existing wire shape stays unchanged; extend MCP tools/list and
  `mcp-tool-error-propagation.spec.ts` for the new destination input and unavailable state.
- **pure spec:** add one next-free projection/address/rate-state spec covering shipping, pickup,
  incomplete destination, known-empty, unavailable, non-physical omission and returned-order
  preservation.
- **red proof:** deliberately break the projection/rate state or option ordering and observe each new or
  changed spec fail before restoring it.
- **browser smoke owed:** no — API/MCP-only discovery; the builder owns production API smoke. No payment
  session is created in this sprint.
- **deterministic gate:** frontend `npx tsc --noEmit` + `npm run lint` + `npm run build` + Playwright
  `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. POST `{ "listing_id": "$MS_TEST_SHIPPABLE_LISTING_ID" }` to
   https://miyagisanchez.com/api/ucp/checkout-session.
   → The response exposes shipping and/or pickup under `fulfillment`; shipping names the missing
   destination input and does not report a confident empty option list.
2. POST the same listing plus the complete MX test destination from the committed API fixture to
   https://miyagisanchez.com/api/ucp/checkout-session.
   → The shipping group contains the current Envía/Correos options with ids, carrier context and
   centavo totals in the exact order returned by the backend.
3. POST the same listing/address directly to
   https://miyagisanchez.com/api/checkout/shipping-rates.
   → Option ids/order/amounts match step 2; the UCP adapter has not invented or re-priced anything.
4. Call `get_checkout_options` at https://miyagisanchez.com/api/ucp/mcp with the same listing and
   destination.
   → The human-readable response explains fulfillment choices and the second content block carries the
   same structured JSON.
5. Repeat step 1 with `$MS_TEST_ARRANGED_LISTING_ID`.
   → The existing `delivery.arranged: true` note remains and no physical UCP fulfillment is fabricated.

If any step fails, note the step number + response status/body — that's the bug report.

### Completion record — 2026-08-17

- `npx tsc --noEmit`, changed-file ESLint, `npm run build`, targeted fulfillment/API tests and the
  complete preview API-shard gate were green. The deliberately broken projection and stale-destination
  matcher each made the new specs red before restoration.
- Cloud Build `4276cd94-332d-4c82-97be-d6c0542b9039` deployed `miyagi-web-00106-plc` at 100% traffic.
- A read-only production `checkout-session` request with a complete MX address returned no fabricated
  `fulfillment` for a public physical listing with no delivery configuration. A read-only production
  `get_checkout_options` MCP request for an arranged listing preserved the existing coordinated flow and
  did not fabricate a physical method.
- Steps 1–4's positive carrier-rate comparison is **fixture-unavailable**, not passed-by-skip: every
  public product is currently arranged or has no delivery mode, and no safe carrier fixture is published.
  No cart, payment or order was created to compensate.
