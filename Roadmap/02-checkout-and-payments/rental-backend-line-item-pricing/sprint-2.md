# Rental line-item pricing — Sprint 2: web checkout + the PDP flip

**Status:** 🟡 built, PR open — awaiting Daniel's merge (HIGH-risk epic). All 3
stories ship dark behind `checkout.rental_pricing_enabled` (still `false`).

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

### Story 2.1 — `/checkout` rental mode ✅ built (`f128ca4`)
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

### Story 2.2 — PDP flip: "Reservar estas fechas" goes to checkout (flag ON) ✅ built (`98dd625`)
**As a** buyer on a rental PDP, **I want** the reserve button to take me straight to checkout with
my dates, **so that** booking is one step — while the platform can revert to coordination with one
flag flip.
**Acceptance:** flag ON → `RentalBooking`'s "Reservar estas fechas" deep-links to
`/checkout?listingId=…&checkIn=…&checkOut=…` and the "Coordinarás el cobro…" microcopy updates to
the pay-now reality; flag OFF **or** the seller has no payment method configured → today's
AskSeller path, byte-for-byte (regression spec). `booking_url` secondary link unchanged. es-MX
copy only (no allow-list change).
**Risk:** LOW (UI routing; money logic stays server-side)
**QA:** api spec on both flag states (pure decision-function spec — see note below); the existing
rental PDP specs stay green.

### Story 2.3 — Order-surface rendering: rental dates + deposit on 5 surfaces ✅ built (`9316c42`)
**As a** buyer or seller with a booked rental order, **I want** to see the dates and itemized
deposit on my order, in my email, and in the chat ledger, **so that** the charge is legible
everywhere the order appears.
**Context:** the S1.3 handoff — the backend already exposes `rental_booking`/`rental_booking_state`
on every order read; nothing rendered it yet. Added as its own story (Daniel's call, scoped at S2
kickoff) since the sprint doc explicitly left this open ("wire as part of 2.1/2.2 or add a Story
2.3").
**Acceptance:** the buyer order page, seller order page, both confirmation emails (coordinated +
manual paths), and the in-chat transaction ledger each show the booking's dates + rent/deposit/total
via one shared formatter (`lib/rental-booking.ts`) — absent/no-op for every non-rental order.
**Risk:** LOW (display only — no money-path change)
**QA:** api spec — pure unit specs for the shared formatter across both booking states.

## Sprint QA
- **api specs (all pure decision/formatter functions — no live flag state, no browser):**
  - `e2e/rental-checkout.spec.ts` — `resolveRentalCheckoutDisplay`: valid range, calendar-rollover
    rejection, past date, non-rental listing, flag OFF, zero rate, zero-deposit, and the tamper
    guarantee (the function's input type has no amount field) — plus one `request`-based spec
    confirming an anonymous `/checkout?listingId=&checkIn=&checkOut=` redirect preserves both dates
    in the sign-in `redirect_url`.
  - `e2e/rental-booking-cta.spec.ts` — `resolveRentalBookingCta` across all 4 states (flag off /
    flag on + no seller payment method / flag on + payment + a range picked / no range yet).
  - `e2e/rental-booking.spec.ts` — `formatRentalBookingLines` + `rentalBookingBadge` (a sample
    booking, both states, the zero-deposit case).
  - **Why pure-function specs, not a live SSR/flag-state fetch:** `checkout.rental_pricing_enabled`
    lives in the same Supabase `platform_flags` table shared with prod (no dev-scoped credential —
    see team memory `shared-infra-supabase-stripe`), so flipping it to exercise the ON path in an
    automated spec would flip it for real users. Every flag-dependent branch is instead isolated
    into one pure decision function per story and asserted directly against it — the same shape the
    S1 backend used for its own tamper guarantee.
- **deterministic gate — run locally, worktree-scoped (`.worktrees/rental-backend-line-item-pricing-s2`):**
  `tsc --noEmit` clean · `next build` clean · `npm run test:e2e` (Playwright `api` project) run
  against a local `next start` serving this branch's build (not `preview_start` — known worktree
  package-name collision, see team memory) with `.env.local` copied in from the main checkout
  (read-only Store/Supabase calls only). **1575 passed**, all rental specs (new + the pre-existing
  `rental-pricing.spec.ts`) green. **5 unrelated pre-existing failures observed and NOT caused by
  this branch** (verified by cross-checking against a run vs prod): `launchpad-submission.spec.ts`
  ×3 (expects 404, gets 423/429 — fails identically against prod, a rate-limit/flag-state artifact
  in that spec, not this diff); `not-found-shape.spec.ts` (404 vs 403 — only fails against prod,
  looks like Vercel Bot/Firewall Protection challenging the automated request, per the documented
  `agent-discovery-and-indexing` gotcha); `home-auth-leakage.spec.ts` + `home-static.spec.ts` (only
  fail against a fresh local `next start`, not prod — missing warm ISR/cache locally, unrelated to
  rental/checkout code). None of the 5 touch a file in this diff.
- **browser smoke owed to Daniel (flag-ON, post-activation):** full money path — dates → checkout →
  Stripe test card → order + emails show dates/deposit; same with Pago directo (SPEI). Also owed: no
  disposable rental listing currently exists in prod (UCP catalog returns zero `listing_type=rental`
  items), so the flag-OFF PDP byte-for-byte check (walkthrough step 1) needs one created first —
  named in the walkthrough below.

## Sprint 2 — Smoke walkthrough (do these in order)
0. **[Daniel — setup]** Create one disposable rental listing (any shop you control) with a rate +
   `metadata.attrs.deposit` set, and a payment method configured on that shop (Stripe test mode or a
   CLABE). None exists in prod today.
1. **Flag OFF (current prod state) — PDP reserve button still opens AskSeller, byte-for-byte.**
   Visit `https://miyagisanchez.com/l/<the-listing-id>`, pick a date range, click "Reservar estas
   fechas". *Expect:* opens an AskSeller conversation ("Coordinarás el cobro y el depósito con el
   vendedor." microcopy) — identical to before this PR, since `checkout.rental_pricing_enabled` is
   still `false`.
2. **[Daniel — flip the flag]** In `/admin/flags`, turn `checkout.rental_pricing_enabled` ON.
3. **PDP → checkout breakdown matches.** Reload the same PDP, pick the same dates. *Expect:*
   "Reservar estas fechas" is now a link to `/checkout?listingId=<id>&checkIn=<date>&checkOut=<date>`;
   the checkout page's "Reserva de renta" block shows the identical nights×rate + deposit + total the
   PDP showed.
4. **[Daniel — money path] Stripe test card.** Complete checkout with card `4242 4242 4242 4242`.
   *Expect:* the charged amount equals the PDP total; the buyer order page
   (`/account/orders/<id>`), the seller order page (`/shop/manage/orders/<id>`), both confirmation
   emails, and the chat ledger (if a conversation exists for this listing) all show the booking
   dates + itemized deposit.
5. **[Daniel — money path] Pago directo / SPEI.** Repeat step 4 choosing "Pago directo" instead.
   *Expect:* the SPEI/manual instructions show the same computed total; the buyer + seller manual
   emails show the same dates + deposit block as step 4.
6. **Tamper check.** Repeat step 3's checkout page load with an extra crafted query param, e.g.
   `&checkIn=<date>&checkOut=<date>&amountCents=1`. *Expect:* no visible or charged difference — the
   page never reads an amount from the URL (`resolveRentalCheckoutDisplay`'s input type has no
   amount field at all).
7. **[Daniel — cleanup]** Flip `checkout.rental_pricing_enabled` back OFF if this was only a smoke
   test, or leave ON if activating for real; archive/delete the disposable test listing either way.

If any step fails, note the step number + what you saw — that's the bug report.
