---
title: "UCP buyer-side shipping/delivery-method exposure"
slug: ucp-buyer-shipping-exposure
status: scaffolded
area: "04"
type: feature
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-11
---

# Scope — UCP buyer-side shipping/delivery-method exposure

## Outcome & signal
An AI shopping agent calling `POST /api/ucp/checkout-session` can see and select a
delivery method (pickup, live-carrier shipping incl. Envía rates, and — once shipped —
Correos de México Impresos) exactly as a human buyer does at web checkout, and the
resulting order/charge reflects that choice. Today it cannot: the route only ever
extracts `payment_methods` from the backend `checkout-options` SSOT and has no
shipping/delivery concept at all (found during `shipping-provider-expansion` Sprint 3,
`04-shipping-and-delivery/shipping-provider-expansion/sprint-3.md` Story 3.5 — see that
sprint's `ucp-checkout-session-shipping-boundary.spec.ts`, which documents and locks the
current gap).

## Stage-2.5 bucket
Light enhancement, arguably — the backend `checkout-options` route (delivery_methods)
and `/store/envia/rates` (priced rates, now including Correos) are both already the
real SSOT; this is "read what already exists and thread it through," not new commerce
logic. The risk is in the AGENT money-path surface it opens (an agent selecting a
shipping method changes what gets charged), not in inventing new pricing/gating.

## Scope
**In v1 (proposed, not yet groomed in depth):**
- `checkout-session` reads `delivery_methods` from `checkout-options` and surfaces them.
- For the `shipping` method, call `/store/envia/rates` (same route the web checkout
  proxies to) and let the agent pick a priced rate — Envía carriers AND, since Sprint 3
  shipped it, Correos de México, identically to what a human sees (same ordering
  guarantee: Correos never pre-selected over a faster carrier).
- Whatever is selected must be persisted the same way `start-checkout` already persists
  a web-selected rate (`shipping_rate_id`/`shipping_carrier`/`shipping_service`/
  `shipping_amount_cents` on the order) — reuse, don't reinvent.

**Out of v1:** local-pickup spot scheduling via agent (coordinate — same as web); any
new MCP tool (this composes into the existing `checkout-session` surface, not a new one).

## What already exists (reuse, don't rebuild)
- `GET /store/sellers/:slug/checkout-options` — backend SSOT for delivery methods
  (`04-shipping-and-delivery/shipping-provider-expansion` epic; Correos-aware as of S3).
- `POST /store/envia/rates` — the priced-quote seam, now returning both Envía carrier
  rates and the Correos Impresos flat rate (appended after the price sort, never
  pre-selected — see `apps/backend/src/api/store/envia/rates/route.ts`).
- `app/api/ucp/checkout-session/route.ts` — `fetchBackendPaymentMethods()` already
  calls `checkout-options`; the pattern to extend is right there, just currently reads
  only `payment_methods` off the same response.
- `start-checkout`'s `normalizeShippingQuote()` — already carrier-agnostic, ready to
  accept whatever an agent-selected rate looks like, unchanged.

## Kill-switch / runtime gate (risk:high — Stage 6b)
Recommend an enablement flag, e.g. `ucp.checkout_shipping_enabled` — default `false`,
created disabled — gating the new agent-side rate-selection + charge path specifically
(the existing web checkout and the existing agent payment-only flow both stay
byte-identical while this is OFF). Flip on only after a live agent-driven purchase
(pick a rate, pay, seller ships) is smoke-tested end-to-end.

## Acceptance criteria
- Agent `checkout-session` for a shippable listing returns the same delivery methods a
  human sees for that seller/listing.
- Selecting a shipping rate via the agent charges the same amount the web checkout
  would for the identical rate.
- Flag OFF ⇒ today's exact behavior (payment-methods-only session), byte-identical.

## Open risks / research
- This is a NEW money-path surface for agents (an agent choosing what to charge for
  shipping), so scope/groom it with the same care as any HIGH-risk checkout story —
  don't fold it into a future sprint's "just wire it up" without a proper plan pass.
- No demand signal yet — this seed exists because Sprint 3 found the gap while
  building Correos, not because an agent-checkout shipping request has been made.
