---
title: "UCP buyer-side shipping/delivery-method exposure"
slug: ucp-buyer-shipping-exposure
status: shipped
area: "04"
type: feature
priority: null
risk: high
epic: "04-shipping-and-delivery/ucp-buyer-shipping-exposure"
build_order: null
updated: 2026-08-17
---

# Pitch — UCP buyer-side shipping/delivery-method exposure

## Problem

Miyagi's buyer-agent checkout can price an item and describe payment methods, but it cannot complete
the physical-delivery half of the purchase. `POST /api/ucp/checkout-session` calls the backend
`checkout-options` source, extracts `payment_methods`, and reads `delivery_methods` only far enough to
emit the existing coordinated-delivery note. For an ordinary shippable listing it returns no delivery
catalog, accepts no shipping address, requests no carrier rates, and records no selection.

The MCP path has the same boundary. `get_checkout_options` only formats payment choices, while
`create_checkout` sends an ordinary listing through the legacy raw Stripe/Mercado Pago endpoints.
Those endpoints do not create the Medusa cart that owns fulfillment, shipping metadata and the charged
shipping line. Merely exposing `delivery_methods` would therefore produce a choice the agent still
could not buy.

The gap is intentional and still guarded by
`e2e/ucp-checkout-session-shipping-boundary.spec.ts`: coordinated listings may carry the additive
`delivery: { arranged, note }` hint, but a normal shippable listing has no shipping, delivery-method or
rate field.

## Classification and lane

- **Class:** Feature — a new buyer/agent capability, not a regression in a previously shipped UCP flow.
- **Lane:** Fixed scope — this is the already-deferred, code-verified parity gap from shipping-provider
  expansion, not a new strategic bet.
- **Operating-posture note:** no appetite ceiling or underwriting gate. The current pre-launch process
  makes those opt-in; the build should deliver the final bounded capability below.

## Outcome & signal

For a public MX physical listing, an AI shopping agent can:

1. discover the seller's real shipping and pickup choices through the existing checkout session;
2. provide a complete delivery address and receive the same current Envía/Correos rates, in the same
   order, that web checkout receives;
3. select one returned carrier option or a valid pickup destination; and
4. use the existing `create_checkout` MCP tool to start the Medusa-cart checkout rail, so the payment
   total and resulting order carry that exact server-resolved fulfillment choice.

Daniel can prove the result with one fixture-backed API/MCP walkthrough plus one test-mode purchase:
the chosen rate appears once in the charged total and the order's shipping metadata; pickup adds no
carrier charge and records the chosen pickup details.

## Stage-2.5 bucket

**Light enhancement over existing commerce rails, with a genuinely new public contract.** Medusa
already owns the delivery catalog, carrier quote, cart, fulfillment option, shipping total and order
metadata. This epic adds the missing UCP projection and threads a server-validated selection into those
rails. It adds no commerce model, table, provider, tariff or payment calculation.

## Bill of materials (What / Why)

| What | Why |
|---|---|
| Typed delivery-catalog adapter | Preserve `checkout-options` as the one availability source |
| UCP `fulfillment` projection | Expose shipping/pickup in the protocol's current shape |
| Address-to-rate adapter | Reuse the same `/store/envia/rates` quote as web checkout |
| Selection resolver | Accept only a method/destination/option the server just returned |
| Medusa-cart handoff | Reuse `startCheckout`; make shipping part of charge + order |
| MCP schema/summary update | Make the existing agent tools able to discover and choose |
| Boundary + money-path specs | Turn the locked gap into an intentional, tamper-resistant contract |

## Scope

### Sprint 1 — Discover delivery choices and authoritative rates

**As an** AI shopping agent, **I want** the checkout session to expose fulfillment methods and,
after I provide a destination, current shipping options, **so that** I can present the buyer the same
delivery decision the web checkout presents.

**In v1:**

- Extend the existing `checkout-options` adapter to retain the full typed delivery catalog; do not
  duplicate seller/provider eligibility in the frontend.
- Project physical-product delivery into a `fulfillment` response using the current UCP fulfillment
  vocabulary: `methods` of type `shipping` or `pickup`, destinations, groups, options, selected ids,
  and fulfillment totals in minor currency units.
- Keep the current route's single-listing contract. The listing id is the one line-item id/group subject.
- When the caller supplies a complete MX shipping destination, call the existing backend
  `/store/envia/rates` seam and project its current ordered response. Preserve the backend's rules:
  provider flags, Envía grant, seller opt-ins, address/weight eligibility, rate-display limit, and
  Correos appended after live carriers rather than auto-preferred by price.
- Without a complete address, expose that shipping is available and name the missing destination input;
  do not emit a confident empty rate list. An unavailable/failed quote remains distinct from no rates.
- Expose pickup locations already present in `delivery_methods.pickup_spots`; do not invent a second
  location store.
- Extend `get_checkout_options`'s existing input schema and human-readable summary so an agent can
  provide the destination and understand both payment and fulfillment choices. The raw JSON remains
  available as it is today.
- Preserve the existing arranged-only `delivery: { arranged, note }` behavior and its spec. This sprint
  does not reinterpret service, rental, digital or coordinated delivery as UCP physical fulfillment.

**Acceptance:**

- An eligible shippable listing returns shipping and/or pickup exactly when backend
  `checkout-options` does.
- A complete eligible address returns the same ordered carrier options and amounts as
  `/store/envia/rates`; Envía, Correos-only, provider-disabled and quote-unavailable states remain
  distinguishable.
- Every shipping option has one stable selectable id, carrier/description context and a fulfillment
  total in centavos; pickup is represented as a destination, not a fake carrier rate.
- The existing coordinated-listing hint stays byte-compatible, and non-physical listings gain no
  fabricated fulfillment block.

**Risk:** HIGH — this changes an advertised checkout contract and presents money-affecting totals.

**QA:** reshape `ucp-checkout-session-shipping-boundary.spec.ts` from "gap remains" into the positive
fixture-gated contract; add a next-free pure projection/availability spec; extend the MCP tools/list and
error-propagation checks. Observe every new/changed spec red via a deliberate mutation before restoring
the implementation.

### Sprint 2 — Select fulfillment and charge through the Medusa cart

**As an** AI-assisted buyer, **I want** my chosen carrier rate or pickup destination to survive into
checkout, **so that** the amount I approve and the order the seller fulfills match my choice.

**In v1:**

- Extend the existing `create_checkout` tool rather than adding a new tool. Delivery-aware calls carry
  the selected fulfillment method plus the returned destination/option id.
- For shipping, require the destination and returned option id. Immediately re-quote on the server,
  match that id against the fresh response, and build `CheckoutShippingQuote` from the matched server
  object. Never accept agent-supplied carrier, service or amount as authority; reject a missing, stale or
  mismatched option before any cart/payment write.
- For pickup, require a valid returned pickup destination when the catalog requires one, plus the
  buyer's proposed date and time window already used by web checkout. This is data threading into the
  existing pickup appointment; it is not a new scheduling engine.
- Route a delivery-aware `create_checkout` through the existing `startCheckout` Medusa-cart rail with
  `fulfillmentMethod`, address, validated quote or pickup fields, and the selected Stripe/Mercado Pago
  provider. Leave the legacy no-delivery call shape unchanged.
- Let the backend remain authoritative for cart admission, coordinated-payment enforcement, seller
  status, provider availability, fulfillment option attachment, payment-session creation and order
  metadata.

**Acceptance:**

- A selected live-carrier or Correos option adds exactly its freshly resolved amount to Stripe/Mercado
  Pago and records `shipping_rate_id`, carrier, service and amount on the cart/order path.
- A selected pickup destination adds zero carrier charge and records the pickup spot plus proposed
  appointment.
- An invented amount, unknown option id, option from another listing/address, stale option, missing
  required address/pickup fields, or method the seller no longer offers fails before cart/payment writes.
- Calling `create_checkout` without delivery selection preserves today's behavior; rental, configured
  product, arranged-delivery and US-market guards do not regress.

**Risk:** HIGH — public agent input reaches checkout, payment totals and fulfillment metadata.

**QA:** add a pure selection/revalidation matrix and one MCP/API contract spec covering shipping,
pickup and tamper refusal. The deterministic frontend gate is `tsc` + lint + build + Playwright `api`;
the backend gate is required only if the architecture-lock pass disproves the frontend-only reframe and
finds a backend change necessary. Observe each new spec red once.

### Out of v1 (no-gos)

- No new MCP tool; extend `get_checkout_options` and `create_checkout`.
- No full migration of Miyagi's current informational checkout adapter to UCP's stateful
  create/get/update/complete/cancel resource lifecycle.
- No new shipping provider, tariff, label flow, tracking flow, table, migration or Supabase commerce
  mirror.
- No autonomous pickup availability search, reschedule/confirm lifecycle or Cal.com integration. The
  agent only passes the buyer's proposed date/window into the already-shipped pickup appointment.
- No multi-seller/bundle UCP fulfillment, US `manual_carrier`, rental, service, digital or arranged-only
  redesign.
- No general rewrite of legacy raw Stripe/Mercado Pago checkout. Only delivery-aware calls move onto the
  Medusa cart rail; existing unrelated guards and deferred quantity/rental gaps stay separately scoped.
- No new feature flag unless Daniel explicitly adds one at the scope gate.

## Rabbit holes — decisions made here

1. **Use UCP `fulfillment`, not a Miyagi-only `shipping_options` sibling.** The current UCP fulfillment
   extension models physical delivery as methods (`shipping`/`pickup`), destinations, groups and
   selectable options. Internal `delivery_methods` and the arranged-only `delivery` hint remain adapter
   inputs/compatibility fields, not the new public physical-shipping schema.
2. **An option id is a selector, never a price claim.** The agent sends only the id it was shown. The
   server re-runs the quote against the same listing and destination and derives every charged/persisted
   field from the fresh match. A session's 30-minute informational expiry does not authorize a stale
   carrier price.
3. **Discovery and completion remain two existing surfaces.** `checkout-session`/`get_checkout_options`
   discovers; `create_checkout` selects and starts payment. A persistent UCP session resource would be a
   larger protocol migration and is deliberately not smuggled into this checkout parity fix.
4. **Pickup parity means proposal data, not a scheduling product.** Web checkout requires a spot when the
   seller has structured spots and always requires a proposed date/window. The agent passes those same
   fields; seller confirmation/rescheduling remains the existing order lifecycle.
5. **Do not silently flatten degraded states.** Backend unreachable, incomplete destination, zero eligible
   rates, and a real empty delivery catalog are different facts. The response and MCP summary must say
   which one occurred.
6. **Preserve provider ordering.** `/store/envia/rates` already ensures Correos is appended after faster
   live carriers because web preselects the first rate. The projection preserves returned order and does
   not introduce its own recommendation.

## What already exists (reuse, don't rebuild)

- `apps/backend/src/api/store/sellers/[slug]/checkout-options/route.ts` — Medusa-owned availability
  source for `delivery_methods`, pickup spots, payment methods and coordinated-only enforcement.
- `apps/backend/src/api/store/_utils/delivery-catalog.ts` — pure method derivation, including market,
  arranged-only and pickup rules.
- `apps/backend/src/api/store/envia/rates/route.ts` — authoritative Envía + Correos quote and ordering;
  already inherits platform flags, seller settings and Envía grants.
- `apps/miyagisanchez/app/api/checkout/shipping-rates/route.ts` — thin frontend proxy to the backend
  quote seam.
- `apps/miyagisanchez/app/api/ucp/checkout-session/route.ts` — existing single-listing agent checkout
  adapter; `fetchBackendPaymentMethods` is the narrow seam to widen into a typed checkout-options read.
- `apps/miyagisanchez/app/api/ucp/mcp/route.ts` — existing `get_checkout_options` discovery and
  `create_checkout` selection/payment tools.
- `apps/miyagisanchez/lib/cart.ts startCheckout()` — the cart-backed checkout rail accepting
  `fulfillmentMethod`, `shippingAddress`, `shippingQuote`, `pickupSpotId` and `pickupAppointment`.
- `apps/backend/src/api/store/carts/[id]/start-checkout/route.ts` — attaches the seeded Medusa shipping
  option, adds shipping to the provider/payment-collection amount, and snapshots fulfillment metadata.
- `e2e/ucp-checkout-session-shipping-boundary.spec.ts` and
  `e2e/ucp-checkout-session-arranged-delivery.spec.ts` — complementary current-boundary specs.

## UX heuristics & rails check

- **CI guards covering this surface:** Playwright `api`; UCP shipping/arranged boundary specs;
  `mcp-tool-error-propagation.spec.ts`; MCP tools/list schema checks; market-agent and public-shop
  commerce guards; frontend type-check/lint/build. Backend build/type-check/lint/unit applies only if
  the architecture lock finds a necessary backend change.
- **Audits-lens findings that apply:** the June shipping/checkout audits' durable requirement that the
  final charged total match the visible summary. Their historical UI P0s are already shipped fixes; this
  agent-only surface introduces no new rendered UI audit item.
- **Design-language debt:** none — this is a structured API/MCP contract with no visual component or copy
  system change. Agent-facing explanatory copy remains es-MX, matching the current tools.
- **Smoke owner:** the builder owns fixture/API verification. Daniel owns one test-mode agent purchase
  through the hosted payment page and the seller/order check because it crosses the real checkout and
  authenticated fulfillment surfaces.

## Runtime gate decision

**No new `ucp.checkout_shipping_enabled` flag.** `WAYS-OF-WORKING.md` now requires explicit product-owner
request before adding a flag, and the platform is pre-launch with no external buyers. Existing provider
flags (`shipping.envia_enabled`, `shipping.correos_enabled`) continue to decide which rates exist; the
new adapter ships enabled and can be reverted as one bounded frontend change. A flag remains an explicit
option Daniel may add at this scope gate, not an implementation default.

## Acceptance criteria (epic)

- A shippable MX listing exposes UCP-shaped shipping/pickup fulfillment derived from backend
  `checkout-options`; the old boundary spec is deliberately replaced rather than deleted without a
  successor.
- A complete destination produces the same ordered Envía/Correos options and centavo amounts as web's
  backend quote seam, with unavailable distinct from empty.
- The agent selects only server-returned ids; the server revalidates the selection immediately before
  checkout and derives all amount/carrier/service fields itself.
- Delivery-aware `create_checkout` uses the Medusa cart rail; its hosted-payment total and resulting
  order metadata match the chosen shipping option exactly, or pickup adds zero shipping and records the
  proposal.
- Existing no-delivery, arranged, rental, configured-product and market behaviors remain covered and
  unchanged.
- No new flag, database object, commerce mirror, payment calculation, provider or MCP tool ships.
- Every new/changed spec is observed failing once; deterministic gates are green; the sprint smoke
  walkthrough names the live/test-mode money and authenticated steps owed to Daniel.

## Open risks / research

- **Current UCP contract (checked 2026-08-17):** the official fulfillment extension puts physical
  delivery under `fulfillment.methods`; methods are `shipping` or `pickup`, carry destinations/groups,
  and expose selectable option ids with fulfillment totals in minor units. Source:
  [UCP Fulfillment Extension](https://ucp.dev/latest/specification/fulfillment/).
- **Deliberate compliance boundary:** official UCP REST models create, get, update, complete and cancel
  operations on a persistent checkout session. Miyagi's `/api/ucp/checkout-session` is currently an
  informational POST adapter, so this epic adopts the fulfillment data shape without claiming the whole
  lifecycle is implemented. Source: [UCP Checkout REST Binding](https://ucp.dev/specification/checkout-rest/).
- **Architecture lock must verify `origin/main` again before build.** Both app repos are active and move
  independently. In particular, confirm that the ordinary `create_checkout` path still uses raw gateway
  endpoints and that no sibling PR has added a cart-backed shipping selection since this pitch.
- **Existing broader trust boundary:** backend `start-checkout` normalizes a client-provided shipping quote
  but does not itself re-run `/store/envia/rates`. This epic makes the new public agent path safe by
  accepting only an option id and re-quoting server-side before calling `startCheckout`; a site-wide
  backend hardening of every web/direct caller is a separate money-path decision, not hidden scope here.

## Scope-document gate — approved 2026-08-17

Daniel approved this pitch as written: two HIGH-risk sprints in one epic-mode run, with no new
`ucp.checkout_shipping_enabled` flag. The scaffolded epic is
[`04-shipping-and-delivery/ucp-buyer-shipping-exposure`](../../04-shipping-and-delivery/ucp-buyer-shipping-exposure/).
