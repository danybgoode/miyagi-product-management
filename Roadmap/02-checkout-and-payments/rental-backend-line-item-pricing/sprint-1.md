# Rental line-item pricing — Sprint 1: the backend charge rail

**Status:** ⬜ not started

> Backend-only sprint (`apps/backend`). Backend-first deploy: merges + finishes rolling on Cloud Run
> (~12 min, no per-branch preview) before Sprint 2 starts. Everything lands behind
> `checkout.rental_pricing_enabled` (default `false`, created disabled), so this sprint is dark in prod.

## Stories

### Story 1.1 — Backend pure pricing seam + unit specs
**As a** developer (and every later story), **I want** the rental math to exist in the backend as
one pure, unit-tested module — ported from `apps/miyagisanchez/lib/rental-pricing.ts`, including
the **pesos→cents** normalization for `metadata.attrs.deposit` — **so that** the charged total is
computed from a single spec-proven source, never re-derived inline.
**Acceptance:** a next-free `src/lib/rental-pricing.ts` (or equivalent seam) with `nightsBetween`,
`rentalUnits`, `computeRentalTotal`, `toRatePeriod` + a deposit-attrs reader (`attrs.deposit` pesos
→ cents; absent/malformed → 0); `node:test` unit specs cover the frontend seam's cases **plus** the
pesos→cents edge cases (string values, decimals, negatives, absent). Guard `main()`-less module
(pure lib — no script entry).
**Risk:** LOW
**QA:** pure-logic unit specs in the backend CI gate (`medusa build` → `tsc` → `test:unit`).

### Story 1.2 — `start-checkout` rental branch: dates in, server-computed total charged
**As a** buyer of a rental, **I want** the checkout charge to be exactly nights × rate + deposit
for my chosen dates, **so that** what the PDP showed is what I pay — on Stripe, MercadoPago, or
Pago directo alike.
**Acceptance:**
- `POST /store/carts/:id/start-checkout` accepts `rental: { check_in, check_out }` when
  `fulfillment_method: 'rental'`; the flag is ON; the product is a rental listing.
- The charge amount is **recomputed server-side** from the dates + the product's own
  `metadata.attrs` (rate = variant price, `rate_period`, `deposit`) via the S1.1 seam. **A
  client-sent amount is ignored** (tamper spec: sending `offer_amount_cents`/any amount alongside
  `rental` does not change the charge).
- Works through the existing override rail for **all** providers: Stripe Connect + MP sessions
  bill the computed total; the manual snapshot/instructions + emails carry it.
- A `rental_booking` metadata block rides cart→order: `{ check_in, check_out, nights, units,
  rate_period, rate_cents, rent_cents, deposit_cents, total_cents }`.
- 422 (never a wrong charge) on: flag OFF · non-rental listing · invalid/non-positive range ·
  missing/zero rate · malformed attrs. The 422 message tells the buyer to coordinate with the
  seller (today's path).
- Coupon/bundle discounts do **not** apply to the rental override (same posture as the offer
  override); escrow + coordinated-delivery guards keep their existing behavior.
**Risk:** HIGH (payments/checkout — Daniel merges; stays dark behind the flag)
**QA:** unit specs on the branch's pure decision fn (valid/invalid ranges, flag states, tamper);
post-merge prod API smoke (flag still OFF: assert the 422 shape; flag-ON charge smoke happens at
epic activation) — stated explicitly in the PR per WAYS-OF-WORKING (backend has no preview).

### Story 1.3 — Order surfaces: dates + itemized deposit everywhere the order shows
**As a** rental seller (and buyer), **I want** the order to show the booked dates and the breakdown
(noches × tarifa · depósito reembolsable · total), **so that** confirming — or refunding — needs no
arithmetic in chat.
**Acceptance:** buyer order page, seller order screen, both confirmation emails, and the in-chat
transaction ledger render the `rental_booking` block (derived by the existing order normalizer);
the seller screen shows the deposit line adjacent to the existing refund action (deposit return =
existing refund flow — **no new money mutation**). Non-rental orders byte-for-byte unchanged.
**Risk:** LOW (display-only)
**QA:** one api spec on the order read exposing `rental_booking`; email render check with the
deposit line; regression spec that a non-rental order payload is unchanged.

## Sprint QA
- **api/unit specs:** S1.1 pure seam specs · S1.2 decision-fn + tamper specs · S1.3 order-read spec — all in the backend `test:unit` gate.
- **deterministic gate:** `medusa build` → `tsc --noEmit` → `npm run test:unit` green before merge (backend `ci.yml`, required check).
- **post-merge:** agent-owned prod API smoke (422 shape, flag OFF); route-deployed probe. Browser/money smoke N/A this sprint (feature dark).

## Sprint 1 — Smoke walkthrough (do these in order)
*(placeholder — written by the building agent before the sprint is called done; real prod URLs;
flag-OFF assertions only, since the feature ships dark)*

If any step fails, note the step number + what you saw — that's the bug report.
