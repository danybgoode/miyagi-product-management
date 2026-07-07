# Rental line-item pricing — Sprint 1: the backend charge rail

**Status:** ✅ MERGED to `main` 2026-07-07 — squash `8e41d18` (PR #67, HIGH-risk, Daniel-authorized
merge-on-green). Stories: 1.1 `4a797a1` · 1.2 `3a0eb8c` · 1.3 `31e9bbe` · cross-review hardening
`ad90a71`. CI green (`Type-check + build + unit`, 243 unit tests). Ships **dark**
(`checkout.rental_pricing_enabled` default `false`) — post-merge prod API smoke (flag-OFF) + the flag
flip are owed (Daniel flips the flag; walkthrough below).

> Backend-only sprint (`apps/backend`). Backend-first deploy: merges + finishes rolling on Cloud Run
> (~12 min, no per-branch preview) before Sprint 2 starts. Everything lands behind
> `checkout.rental_pricing_enabled` (default `false`, created disabled), so this sprint is dark in prod.

## Build notes / deltas from the scaffold
- **Unit specs are Jest, not `node:test`.** The scaffold said "node:test"; the backend's actual
  convention is Jest (`*.unit.spec.ts` in `__tests__/`, run by `npm run test:unit`). Followed the
  repo's real convention (WoW: docs track code). Three new specs: `rental-pricing` (17),
  `rental-checkout` incl. tamper (10), `rental-booking` (6).
- **Story 1.3 is the backend half only** (confirmed with Daniel). The order normalizer now exposes
  `rental_booking` + `rental_booking_state`; the **frontend rendering** of the 5 order surfaces moved
  to Sprint 2 (they live in `apps/miyagisanchez` — a backend-only sprint can't ship them). Handoff
  note added to `sprint-2.md`.
- **Rate source:** the per-period rate is the cart line item's `unit_price` (already integer cents) —
  no product-price fetch needed. Only the **deposit** (`metadata.attrs.deposit`, in **pesos**) is
  converted to cents, at one seam (`readDepositCents`).
- **Rental-listing gate:** `loadProductForCheckout` was widened to fetch `type.value`; the branch
  requires the resolved listing type (`type.value ?? metadata.listing_type`) to be `'rental'`.
- **Cross-review hardening (`ad90a71`, from PR #67 codex + pr-reviewer):** (1) strict `isValidYmd`
  calendar check (rejects `2026-06-31`-style dates `Date.parse` would silently roll over →
  `RENTAL_INVALID_DATES`); (2) the branch triggers on `fulfillment_method === 'rental'` (not mere
  `body.rental` presence) so a stray field can't divert a normal checkout; (3) `RENTAL_CART_UNSUPPORTED`
  guard rejects multi-item / multi-quantity rental carts rather than mischarging. pr-reviewer
  independently CONFIRMED the tamper guarantee, deposit conversion, fail-open polarity, and the
  non-rental regression.

## Stories

### Story 1.1 — Backend pure pricing seam + unit specs — ✅ `4a797a1`
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

### Story 1.2 — `start-checkout` rental branch: dates in, server-computed total charged — ✅ `3a0eb8c`
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

### Story 1.3 — Order surfaces: expose rental_booking on the order read (backend half) — ✅ `31e9bbe`
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

Run **after the backend PR merges and Cloud Run finishes rolling** (`SUCCESS` build ≠ live revision —
confirm the new revision is serving first). The feature is **dark** (`checkout.rental_pricing_enabled`
absent → default `false`), so every assertion here is a **flag-OFF** assertion. Prod backend base:
`https://medusa-web-91083034475.us-east4.run.app`. Store calls need the prod publishable key header
`x-publishable-api-key: <MEDUSA_PUBLISHABLE_KEY>` (same value the storefront uses).

Agent-runnable (no login):

1. **Deploy is live.** `curl -s https://medusa-web-91083034475.us-east4.run.app/health` → `200`/OK.
   *Expected:* the new revision is serving.
2. **Rental listings are unaffected (no regression).** `GET /store/sellers/<a-rental-seller-slug>/checkout-options?listing_type=rental`
   (with the publishable-key header). *Expected:* the response still includes a delivery method
   `{ id: 'rental', label: 'Renta', … }` — the deploy didn't disturb today's rental flow.
3. **Dark-path 422 (the core flag-OFF assertion).** Create a cart with one rental listing's variant
   (`POST /store/carts`, `POST /store/carts/:id/line-items`), then
   `POST /store/carts/:id/start-checkout` with body
   `{"provider":"manual","fulfillment_method":"rental","rental":{"check_in":"2026-08-01","check_out":"2026-08-04"}}`.
   *Expected:* **HTTP 422** with `{"code":"RENTAL_PRICING_UNAVAILABLE"}` and an es-MX message telling
   the buyer to coordinate with the seller. (Proves the branch is wired but dark — no charge is created.)
4. **Tamper is inert while dark.** Repeat step 3 adding `"offer_amount_cents":1` to the body.
   *Expected:* identical **422 `RENTAL_PRICING_UNAVAILABLE`** — the client amount changes nothing
   (and, once the flag is ON, the tamper spec proves it still can't change the computed charge).
5. **Non-rental checkout unchanged.** Start a normal (non-rental) checkout on a disposable test cart
   as usual. *Expected:* behaves exactly as before this sprint (no `rental` key sent → the branch is
   never entered).

**Owed to Daniel — flag-ON money smoke (epic activation, NOT this sprint):** after the deliberate
flag flip, a real dated booking must charge `nights × rate + deposit` on Stripe (test card) **and**
Pago directo/SPEI, and the resulting order's `rental_booking` block must carry the itemized deposit.
This is a real-money path an automated smoke can't cover — it happens at epic activation, once
Sprints 2–3 are live and Daniel flips `checkout.rental_pricing_enabled` on.

If any step fails, note the step number + what you saw — that's the bug report.
