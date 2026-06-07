# Re-scope delta — UX Audit Refresh (2026-06) → #3b / #5 / #6 / #3c

The cross-cutting output of the #3a spike. Pinned: frontend `origin/main@ed447bd`, backend
`origin/main@0980253`. This is the planning input that grooming #3b (and later #5/#6/#3c) sits on.

## TL;DR
The refresh **confirms #3b's scope as named in BUILD-ORDER** and surfaces **no new P0 that jumps the
queue**. All three money-path P0s reproduce on current `main`. Two reuse hooks were found that make
#3b cheaper than the v1 audit implied. One small product decision is needed (refund-language: #3b or
#3c). #5/#6/#3c lines get minor sharpening, not re-ordering.

---

## What this changes for #3b — Checkout & manual-payment state hardening

**Confirmed (all three P0s still live on current `main`):**
1. **Durable `buyer_reported_paid`** — `report-payment/route.ts:23` is still a Telegram-only nudge;
   `buyer_reported_paid` exists nowhere. The buyer's "ya pagué" middle state is lost on reload. *(02-#1, 03-P0, 05-#5.)*
2. **Block-ship-before-paid** — frontend `ShippingSection` gated only on `listing_type`
   (`OrderDetail.tsx:827`, renders before the confirm-payment card `:839`); **both** backend ship
   routes ungated (`backend …/ship/route.ts` has no `payment_received` guard; frontend
   `ship-manual/route.ts` likewise). *(02-#3, 03-P0.)*
3. **Coupon-vs-CTA total mismatch** — summary shows discounted `totalCents`
   (`CheckoutExperience.tsx:222,662`); pay CTA shows undiscounted `amountCents + shipping`
   (`CheckoutPayButton.tsx:73,136`). *(02-#5, 04-#7.)*

**Two reuse hooks (shrink the build):**
- **The gating predicate already exists.** `OrderDetail.tsx:709` computes
  `paymentSettled = !isSpeiOrder || paymentReceived`, currently wired only to refunds. Reuse it to
  gate shipping. The cosmetic `canShip` (`:703`) is the right shape but wired to an "AI tip" (`:1164`).
- **A durable reported-paid flag already ships for print.**
  `app/api/print/submissions/[id]/payment-reported/route.ts:35` persists
  `payment_reported: true, payment_reported_at`. Mirror the pattern for marketplace manual orders —
  Medusa-first, a flag on `order.metadata`, **likely zero new tables** (per LEARNINGS: read the
  Medusa model first; it tends to re-scope the epic smaller).

**Sharpened #3b scope (recommended going into the groom):**
- **In (P0):** persist the manual-payment state machine `pending_payment → buyer_reported_paid →
  payment_confirmed → processing` on order metadata; make `report-payment` write it; gate shipping
  (UI via `paymentSettled` + **server-side** on both ship routes — UI alone isn't foolproof);
  single coupon-aware total shared by summary + CTA.
- **In (P1, same money-path mental model):** "who acts next" copy + fix inbox "Listo para enviar" on
  unpaid orders; manual-payment instructions preview before placement; async-success recovery state.
- **Decision needed → defaulting to IN as a copy-only sub-item:** refund-language honesty
  ("Reembolso emitido" overstates an off-platform SPEI/cash transfer — `OrderDetail.tsx:659,1079`).
  Cheap, same money path. **Full** assisted-refund *state machine* stays in #3c. *(Confirm at groom.)*
- **Out (→ #3c):** assisted multi-step refund state machine; pickup reserved-slot scheduling.

**Risk tier:** **HIGH — Daniel merges** (payments / checkout / fulfillment / state). Unchanged.

**No queue-jumper:** the post-audit money surfaces are safe — support widget guest checkout is
**protected-rail-only** (Stripe/MP, amount-validated, no manual path —
`app/api/embed/support/checkout/route.ts:85`); custom-domain checkout returns only to **verified**
domains (`payment/success/page.tsx:104`). Neither adds a manual-payment P0.

---

## What this changes for #5 — Granular multi-channel notifications

- **Trigger set confirmed, with a dependency made explicit.** #5's canonical triggers are the
  manual-payment lifecycle events. Today only `payment_confirmed` (seller confirm) and ship/deliver
  transitions are persisted; **`buyer_reported_paid` is NOT a durable event** (Telegram-only). So
  **#5 depends on #3b** making the state durable first — otherwise "buyer reported payment" can't be
  a reliable notification trigger. Keep #5 sequenced **immediately behind #3b** (unchanged order),
  and note the dependency in its line.
- Reuse confirmed: the Telegram send primitive (`lib/telegram.ts`) already fires on these events;
  #5 generalizes channel/preference, it doesn't invent the triggers.

## What this changes for #6 — Sellers landing redesign

- **New constraint: per-channel rendering.** Post-audit, the storefront renders white-label across
  subdomains, custom domains, short-links, and embed (05 net-new). A landing/trust redesign must be
  **channel-aware** — trust signals audited on the marketplace render may differ on tenant renders.
  Add "audit trust-signal proximity per channel" to #6's discovery. Still gated on #4 design tokens
  (unchanged). No re-order.

## What this changes for #3c — Remaining audit polish

- **Grew slightly** (absorbs items #3b explicitly defers): assisted multi-step refund state machine
  (05-#4); pickup reserved-slot scheduling (02-#7/04); plus the standing #3c set (listing-type
  taxonomy — note `lib/listings.ts:119` already normalizes `listing_type`, a head start; mobile
  filter rebuild; PDP hierarchy; CP-first capture; quote recovery/timeout; in-chat transaction
  ledger — which should **consume the #3b durable state** rather than re-model it).
- **Product decision flagged for Daniel (pre-#3c):** the **arranged-only delivery policy**
  (`onlyCoordinated = false` hardcoded, 04-#4) — may sellers publish arranged-only? Decide before #3c
  slices delivery work.

---

## Go-forward (proposed BUILD-ORDER edits)
1. **Tick #3a** as groomed **and run** (spike complete; findings in `results-refresh-2026-06/`).
2. **Sharpen #3b** line: confirm the 3 P0s reproduce on `main@ed447bd`/`0980253`; note the two reuse
   hooks (`paymentSettled` predicate; print `payment_reported` pattern); flag the refund-language
   decision; HIGH-risk / Daniel merges.
3. **#5** line: add "depends on #3b for the durable `buyer_reported_paid` trigger."
4. **#6** line: add "channel-aware trust audit (subdomain/custom-domain/embed)."
5. **#3c** line: add assisted-refund state machine + pickup scheduling; note the arranged-only policy
   decision owed; note in-chat ledger consumes #3b state.
6. **Next action:** groom **#3b** off this delta (the 02/03 deep docs are its primary input).
