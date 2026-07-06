---
status: readyforscope
slug: rental-backend-line-item-pricing
macro: 02-checkout-and-payments
class: feature
risk: HIGH overall (checkout / payments / money) — display + agent-quoting stories LOW
---

# Rental line-item pricing — charge nights × rate + deposit online

> Scoped 2026-07-06 from the READY seed (`seeds/rental-backend-line-item-pricing.md`, routed out of
> the PDP-followups groom 2026-06-21; carried from PDP-redesign S4 rentals). Four open decisions
> resolved with Daniel same-day — see *Decisions*.

**Tagline:** *Elige tus fechas, paga el total real — noches × tarifa + depósito — en un solo paso.*

## Overview — As a / I want / so that

**As a buyer of a rental**, I want to pay the **real** total (nights × rate + deposit) online at
checkout, **so that** I book and pay in one step instead of coordinating the amount with the seller
by message.

**As a rental seller**, I want the order to arrive with the dates, the computed breakdown, and the
deposit clearly itemized, **so that** I can confirm the booking (or refund if the dates don't work)
without re-deriving the math in chat.

**As an AI agent (UCP/MCP)**, I want `checkout-session` to quote — and the checkout rail to charge —
the **same** computed rental total for a given date range, **so that** an agent can book a rental
end-to-end without quoting the per-period rate as the full price (AGENTS rule #3).

## Stage-2.5 bucket — genuinely new, but the charge rail already exists

The seed's "genuinely new" call stands: the online-charge path for rentals does not exist — today's
flow deliberately routes "Reservar estas fechas" to an AskSeller conversation. But the Medusa-first
read (Stage 4) shrinks the build materially: **the backend already knows how to charge an override
amount through every provider.** What's new is only the *rental-shaped, server-authoritative*
computation of that amount + threading the dates through checkout → order → surfaces → agents.

## Decisions (resolved with Daniel, 2026-07-06)

1. **Deposit v1 = charged with the rent.** One total = nights × rate + deposit, works on all
   providers. Returning the deposit reuses the existing refund machinery (Stripe/card refund; the
   two-sided off-platform refund state machine for SPEI/cash). Card **hold** (auth/manual-capture)
   on the deposit is explicitly **out** — a possible follow-up seed.
2. **Booking model v1 = instant book + refund path.** The buyer pays immediately; the dates ride
   the order; a seller who can't honor them refunds via the existing machine. No request-to-book
   state machine, **no availability calendar** (both out of v1 — see *Out of scope*).
3. **Agent surface is in-epic** (its own sprint): UCP `checkout-session` + MCP quote and link the
   same computed total for a date range.
4. **All existing payment methods**: Stripe, MercadoPago, and manual (SPEI/cash/DiMo — the
   instructions + emails show the computed total; the seller confirms receipt exactly as today).

## Research note

v1 deliberately uses only rails that already exist in this codebase (the start-checkout override
amount, existing providers, existing refund machinery) — no new provider capability is relied on,
so no external research was needed. The one provider-dependent alternative (Stripe manual-capture
deposit holds) was explicitly deferred at decision #1; research it if/when that seed is groomed.

## What already exists (reuse, don't rebuild)

- **`apps/miyagisanchez/lib/rental-pricing.ts`** — the pure, spec-proven pricing seam
  (`nightsBetween`, `rentalUnits`, `computeRentalTotal`, es-MX labels). Single source of truth for
  the math; next-free, portable to the backend.
- **`RentalBooking.tsx`** (PDP, S4.2) — date-range picker with the exact estimate breakdown;
  currently ends in AskSeller by design. The UI to flip, not rebuild.
- **Backend `src/api/store/carts/[id]/start-checkout/route.ts`** — already charges an override
  amount (`rawItemsCents = support ?? offer_amount_cents ?? cart.total`) through **all** providers,
  already loads product metadata (`loadProductForCheckout`), already writes structured state to
  cart→order metadata (manual snapshot, pickup appointment, support block — the precedent for a
  `rental_booking` block).
- **`FulfillmentMethod` already includes `'rental'`** on both frontend (`lib/cart.ts`) and backend;
  `checkout-options` already emits the "Renta" delivery method.
- **Rate + deposit already live on the product**: Medusa `metadata.attrs.rate_period` +
  `metadata.attrs.deposit` (MXN pesos — note the pesos→cents conversion at the read seam) —
  `lib/listing-attributes.ts` defines them; the UCP read already exposes
  `rental: { rate_period, deposit_cents }`.
- **`/checkout` page precedent** — the print-configurator checkout already overrides `amountCents`
  with a computed price (price-grid resolve, redirect-to-PDP on unresolvable) and the offer
  checkout already passes a negotiated amount: the exact page pattern rentals need.
- **Manual-payment lifecycle + two-sided refund machine** (#3b / Epic B) — pending → buyer marks
  paid → seller confirms; refund states for off-platform money. Deposit return rides this as-is.
- **In-house flags** (`lib/flags.ts` both ends, fail-open reader) — the kill-switch rail.
- **UCP `checkout-session` + MCP `get_checkout_options`** — the agent quoting surface to extend
  (already returns rental rate/deposit in the listing read; already pre-generates checkout URLs).

## The one hard rule this epic adds

**The rental total is server-computed, never client-supplied.** The client sends only
`rental: { check_in, check_out }`; `start-checkout` recomputes units × rate + deposit from the
product's own `metadata.attrs` and charges *that*. (Unlike the accepted-offer override, there is no
server-side record to validate a client amount against — so the dates are the payload and the math
is the backend's. A tamper spec asserts a client-sent amount is ignored.)

## Proposed slicing (skateboard → car)

### Sprint 1 — the backend charge rail (backend-first deploy, ~12-min Cloud Run window)
- **S1.1 (LOW)** — Port the pure pricing seam to the backend (`src/lib/rental-pricing.ts`, mirrored
  from the frontend seam incl. the pesos→cents deposit normalization) + `node:test` unit specs.
  *QA: pure-logic unit tests in the backend CI gate.*
- **S1.2 (HIGH)** — `start-checkout` rental branch behind the flag: accept
  `rental: { check_in, check_out }` for `fulfillment_method: 'rental'`, recompute the total
  server-side, set it as the charge amount for all providers, write the `rental_booking` metadata
  block (dates · nights · units · rate · deposit · breakdown) onto cart→order. 422 on invalid
  ranges / non-rental listings / flag OFF. *QA: unit specs on the branch's pure decision fn + the
  tamper spec (client amount ignored); prod API smoke post-merge (no backend preview — stated in
  the PR per WAYS-OF-WORKING).*
- **S1.3 (LOW)** — Order surfaces: buyer + seller order pages, both confirmation emails, and the
  in-chat transaction ledger show the rental breakdown (dates + deposit itemized) derived from
  `rental_booking` metadata by the existing normalizer; the seller screen shows the deposit line
  next to the existing refund action (deposit return = existing refund flow, no new mutation).
  *QA: one api spec on the order read; email render check.*

### Sprint 2 — web checkout + the PDP flip
- **S2.1 (HIGH)** — `/checkout` rental mode: accepts `checkIn/checkOut` params, renders the same
  breakdown the PDP showed (reuse the frontend seam), threads the dates through
  `startCheckout` → backend. House rule holds: pay-button total = summary = what the backend
  charges. Unresolvable/invalid dates redirect back to the PDP (configurator precedent). *QA: api
  spec — checkout page renders the computed total; spec that a `?amount=` style tamper is inert.*
- **S2.2 (LOW)** — PDP flip behind the flag: flag ON → "Reservar estas fechas" deep-links to
  `/checkout?listingId=…&checkIn=…&checkOut=…`; flag OFF (or seller has no payment method
  configured) → today's AskSeller path, byte-for-byte. *QA: api spec on both flag states.*

### Sprint 3 — agent parity (UCP/MCP)
- **S3.1 (LOW)** — `checkout-session` accepts `check_in`/`check_out` for rental listings → returns
  the quoted breakdown (`rental_quote`: nights · units · rent · deposit · total) + checkout URLs
  carrying the dates; MCP `get_checkout_options` parity; agents without dates keep getting the
  per-period rate + deposit clearly labeled (never the rate as the full price). *QA: api spec on
  the quote; MCP tool round-trip smoke.*

**Kill-switch (decided here, per WoW Stage 6b):** enablement flag
`checkout.rental_pricing_enabled` — default `false`, created **disabled**. OFF = today's
coordination flow everywhere (PDP, checkout 422, agent quote falls back to the coordinate note).
Verified at epic DoD.

**Deploy order:** Sprint 1 (backend) merges + finishes rolling first; frontend flips are flag-gated
and degrade to AskSeller, so the deploy-lag window never strands a buyer. Daniel merges every
sprint (HIGH-risk epic).

## Out of scope (v1)

- Availability calendar / blocked dates / double-booking prevention (instant book + refund covers v1).
- Request-to-book (reserve → accept → charge) state machine.
- Card holds (auth/manual-capture) for the deposit.
- Automatic deposit return on rental end (return = existing manual refund flow).
- Seasonal / per-date dynamic pricing; multi-rental or mixed carts (single rental per checkout, matching today's single-listing checkout).
- Rental-specific cancellation policies.

## Open risks

- **HIGH money path** — every WoW guardrail applies: Daniel merges, kill-switch, backend-first,
  tamper spec, prod-only backend smoke stated in the PR.
- Deposit stored in **pesos** in `metadata.attrs.deposit` vs cents everywhere else — one
  normalization seam, unit-tested, or a silent 100× under-charge.
- Existing rentals with missing/zero rate-period or malformed attrs: the branch must 422 (fall back
  to coordination), never charge a wrong total.
- The `offer_amount_cents` override is client-trusted today; the rental branch must **not** copy
  that pattern (see the hard rule). Worth a note to also harden the offer path some day — separate
  seed, not this epic.

## Acceptance (Daniel can run)

1. Rental PDP, flag ON: pick dates → "Reservar estas fechas" → checkout shows the identical
   breakdown (noches × tarifa + depósito) → pay with Stripe test card → order (buyer + seller +
   emails + chat ledger) shows dates and itemized deposit; the charged amount equals the PDP total.
2. Same flow with Pago directo (SPEI): instructions + emails show the computed total; seller
   confirms receipt as with any manual order.
3. Flag OFF: the PDP behaves exactly as today (AskSeller), and a hand-crafted rental
   start-checkout call 422s.
4. Agent: MCP `get_checkout_options` with dates returns the same total the web showed, with a
   checkout URL that charges it.

**Smoke walkthrough owner:** money/auth steps (1–2) owed to **Daniel** by name in each sprint doc;
API-level + flag-state smokes owned by the building agent. Test rental listing needed (disposable
shop, cleaned up after).

---
*Gate: this scope doc requires Daniel's approval before any scaffolding (epic README + sprint docs + kickoff prompts).*
