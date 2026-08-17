---
status: scaffolded
slug: ucp-buyer-shipping-exposure
---

# Epic: UCP buyer-side shipping/delivery-method exposure

> **Area:** 04 · Shipping & Delivery · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/ucp-buyer-shipping-exposure.md`](../../00-ideas/seeds/ucp-buyer-shipping-exposure.md)

## Why

An AI shopping agent can currently inspect Miyagi's item price and payment methods, but it cannot see,
quote or select the physical-delivery choice that changes the buyer's total and the seller's order.
This epic closes that already-deferred parity gap: the existing checkout session exposes real shipping
and pickup fulfillment, and the existing `create_checkout` MCP tool carries one freshly validated
selection through the Medusa cart into payment and order metadata.

## Platform-first note

Medusa already owns every commerce fact this needs: seller delivery availability, pickup locations,
Envía/Correos eligibility and quotes, carts, seeded fulfillment options, payment totals and order
metadata. The expected build is frontend-only adapter/orchestration work over those backend Store API
routes. There is no new table, module, tariff, provider, payment calculation or commerce mirror.

At architecture lock, re-read both apps' live `origin/main`. If a backend change is genuinely required,
name the disproved assumption and update this README plus the affected sprint contract before a builder
starts; do not silently widen the epic.

## Approved decisions (re-verify during architecture lock)

- **D1 — one availability source:** backend `checkout-options` remains authoritative for whether
  shipping/pickup exists and which pickup spots exist. The frontend only maps its result.
- **D2 — one rate source:** backend `/store/envia/rates` remains authoritative for Envía/Correos
  eligibility, ordering and amounts. The UCP adapter preserves its states and order.
- **D3 — UCP public shape:** physical delivery is projected under `fulfillment` using the current UCP
  method/destination/group/option vocabulary. Do not add a Miyagi-only `shipping_options` sibling.
- **D4 — ids select; they never price:** an agent submits only a returned method/destination/option id.
  Immediately before checkout, the server re-runs the rate query and derives carrier, service and amount
  from the fresh matching object. Unknown, stale or mismatched ids fail before cart/payment writes.
- **D5 — existing tools compose:** `checkout-session`/`get_checkout_options` discovers;
  `create_checkout` selects and starts payment. Add no MCP tool and do not smuggle in a persistent UCP
  create/get/update/complete/cancel lifecycle migration.
- **D6 — cart-backed completion:** a delivery-aware `create_checkout` calls existing
  `lib/cart.ts startCheckout()` with the server-resolved quote or validated pickup data. Legacy calls
  without delivery selection keep their current raw gateway behavior.
- **D7 — pickup is a proposal, not a scheduler:** validate a returned pickup destination when required
  and pass the buyer's date/window into the shipped pickup appointment. No availability search,
  reschedule/confirm or Cal.com work.
- **D8 — degraded is not empty:** incomplete address, backend unavailable, eligible-but-zero rates and
  no delivery method are distinct response states. Never turn an unavailable quote into a confident
  empty success.
- **D9 — no new flag:** the product owner approved shipping this adapter enabled. Existing
  `shipping.envia_enabled` and `shipping.correos_enabled` still decide provider availability; no
  `ucp.checkout_shipping_enabled` flag is added.
- **D10 — scope boundary:** MX single physical listings only. US `manual_carrier`, bundles/multi-seller,
  rental, service, digital and arranged-only redesigns remain out.

## What already exists (reuse, don't rebuild)

- Backend `src/api/store/sellers/[slug]/checkout-options/route.ts` — delivery/payment catalog and
  coordinated-only enforcement.
- Backend `src/api/store/_utils/delivery-catalog.ts` — pure shipping/pickup/market derivation.
- Backend `src/api/store/envia/rates/route.ts` — authoritative Envía + Correos quote, gates and ordering.
- Frontend `app/api/checkout/shipping-rates/route.ts` — thin proxy to the backend quote route.
- Frontend `app/api/ucp/checkout-session/route.ts` — existing single-listing checkout adapter; its
  `fetchBackendPaymentMethods` seam already reads `checkout-options` and the coordinated note.
- Frontend `app/api/ucp/mcp/route.ts` — existing `get_checkout_options` and `create_checkout` tools.
- Frontend `lib/cart.ts startCheckout()` — accepts fulfillment method, address, shipping quote, pickup
  spot and pickup appointment, then creates the Medusa cart.
- Backend `src/api/store/carts/[id]/start-checkout/route.ts` — attaches the seeded fulfillment option,
  adds shipping to the payment total and snapshots order metadata.
- Frontend `e2e/ucp-checkout-session-shipping-boundary.spec.ts` — locks today's missing shippable-listing
  exposure; reshape it into the intentional positive contract, do not remove it without a successor.
- Frontend `e2e/ucp-checkout-session-arranged-delivery.spec.ts` — protects the complementary coordinated
  hint and must stay green.
- Official references checked during grooming:
  [UCP Fulfillment Extension](https://ucp.dev/latest/specification/fulfillment/) and
  [UCP Checkout REST Binding](https://ucp.dev/specification/checkout-rest/).

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | Discover delivery choices and authoritative rates | high |
| 2 | Select fulfillment and charge through the Medusa cart | high |

## Deploy order

Expected: one frontend repo, two stacked branches/PRs —
`feat/ucp-buyer-shipping-exposure` then `feat/ucp-buyer-shipping-exposure-s2`. Sprint 2 depends on
Sprint 1's typed projection and selection ids, so merge in order. If the architecture lock proves a
backend change necessary, split that contract into the earliest owning sprint, merge/deploy backend
first, and keep the frontend null-safe through the Cloud Run deploy lag.

Each PR is a checkout/money-path change: deterministic gate green, then the one routed cross-family
review required by current `WAYS-OF-WORKING.md`, findings resolved, builder merges their own PR. No fresh
reviewer subagent unless the product owner asks. Done means Cloud Build/Cloud Run serving plus the named
smokes, not merely merged.

## Definition of Done (epic)

- [ ] Both sprints merged to `main` and smoke-tested; any unavailable fixture/live step stated
- [ ] Every new/changed spec observed red once via deliberate mutation
- [ ] Each `sprint-N.md` has its final smoke walkthrough with production URLs and commit/PR refs
- [ ] One test-mode agent shipping purchase proves displayed rate = hosted-payment total = order metadata
- [ ] One pickup contract smoke proves zero carrier charge + spot/date/window persistence
- [ ] Existing arranged, rental, configured-product, no-delivery and market guards remain green
- [ ] No new feature flag, MCP tool, database object, provider or payment calculation shipped
- [ ] This README marked complete; every sprint status ticked
- [ ] `RETROSPECTIVE.md` written; durable learnings promoted to `Roadmap/LEARNINGS.md` without duplication
- [ ] Product poster (`Roadmap/README.md`) and team memory index updated
- [ ] Feature branches deleted; this README frontmatter set to `status: shipped`; build-order regenerated
