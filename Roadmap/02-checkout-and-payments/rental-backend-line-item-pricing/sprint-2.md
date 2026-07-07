# Rental line-item pricing — Sprint 2: web checkout + the PDP flip

**Status:** ⬜ not started

> Frontend sprint (`apps/miyagisanchez`). Requires Sprint 1 live on Cloud Run. Both stories are
> flag-gated (`checkout.rental_pricing_enabled`) and degrade to today's AskSeller coordination.

> **↩ Handoff from Sprint 1 (order-surface rendering).** S1.3 shipped the **backend half** only —
> the order normalizer (`normalizeMedusaOrder`) now exposes `rental_booking` (raw block) +
> `rental_booking_state` on every order read (null / `'none'` for non-rental). The **frontend
> rendering** of those five surfaces — buyer order page, seller order screen, both confirmation
> emails, and the in-chat transaction ledger — was deliberately moved into this sprint (it lives in
> `apps/miyagisanchez`, so it couldn't ship in the backend-only S1). Reuse `lib/rental-pricing.ts`
> (`formatRentalCents`, `rentalUnitsLabel`, `ratePeriodLabel`) for the breakdown and the
> pickup-appointment rendering precedent for the block. The step-2 walkthrough below already asserts
> these surfaces render, so wire them as part of 2.1/2.2 (or add a Story 2.3 if scoped separately).

## Stories

### Story 2.1 — `/checkout` rental mode
**As a** buyer who picked dates on a rental PDP, **I want** the checkout page to show the identical
breakdown (noches × tarifa + depósito) and charge exactly that, **so that** the pay-button total
always equals the summary (house rule) and both equal what the backend charges.
**Acceptance:**
- `/checkout?listingId=…&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` renders the rental breakdown
  (reuse `lib/rental-pricing.ts` — the same seam the PDP used, so the numbers cannot drift).
- `startCheckout` (`lib/cart.ts`) threads `rental: { check_in, check_out }` +
  `fulfillment_method: 'rental'` to the backend; **no amount is sent from the client**.
- Invalid/non-positive/past ranges, non-rental listings, or flag OFF → redirect back to the PDP
  (configurator precedent — never silently fall through to a single-unit charge).
- All payment methods the seller has configured surface as usual (Stripe / MP / Pago directo);
  manual instructions show the computed total.
- Rental checkout is single-listing (no mixed/multi-rental carts, matching today's checkout).
**Risk:** HIGH (checkout money path — Daniel merges)
**QA:** api spec — checkout page renders the computed total for a rental listing + redirects on
invalid dates; tamper spec — crafted `?amount=`-style params are inert; existing checkout specs
stay green (non-rental unchanged).

### Story 2.2 — PDP flip: "Reservar estas fechas" goes to checkout (flag ON)
**As a** buyer on a rental PDP, **I want** the reserve button to take me straight to checkout with
my dates, **so that** booking is one step — while the platform can revert to coordination with one
flag flip.
**Acceptance:** flag ON → `RentalBooking`'s "Reservar estas fechas" deep-links to
`/checkout?listingId=…&checkIn=…&checkOut=…` and the "Coordinarás el cobro…" microcopy updates to
the pay-now reality; flag OFF **or** the seller has no payment method configured → today's
AskSeller path, byte-for-byte (regression spec). `booking_url` secondary link unchanged. es-MX
copy only (no allow-list change).
**Risk:** LOW (UI routing; money logic stays server-side)
**QA:** api spec on both flag states (SSR/HTML-level assertion of the CTA target); the existing
rental PDP specs stay green.

## Sprint QA
- **api specs:** S2.1 checkout-render + tamper + redirect specs · S2.2 flag-state CTA specs — Playwright `api` project, run vs the branch preview in CI (bypass token).
- **deterministic gate:** `tsc --noEmit` + `next build` + Playwright `api` green before merge.
- **browser smoke owed to Daniel (flag-ON, post-activation):** full money path — dates → checkout → Stripe test card → order + emails show dates/deposit; same with Pago directo (SPEI). Named in the walkthrough below.

## Sprint 2 — Smoke walkthrough (do these in order)
*(placeholder — written by the building agent before the sprint is called done. Must include, with
real URLs: (1) flag-OFF: PDP reserve button still opens AskSeller; (2) flag-ON on a disposable test
rental listing: PDP dates → checkout breakdown identical → **[Daniel — money path]** Stripe test
card 4242… → order pages + both emails + chat ledger show dates + itemized deposit, charged amount
equals the PDP total; (3) **[Daniel — money path]** same flow with Pago directo/SPEI: instructions
+ emails show the computed total; (4) tamper check: crafted amount param changes nothing.)*

If any step fails, note the step number + what you saw — that's the bug report.
