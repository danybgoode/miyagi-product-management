# Events & Ticketing — Retrospective

_Closed: 2026-06-08_

**Area:** 10 · Events & Ticketing · **BUILD-ORDER #7** (spike → epic, amended by Daniel) · **Risk:** MIXED
(S1.2 / S3.1 / S3.2 HIGH → Daniel-merged). 3 sprints, frontend + Supabase (no new commerce tables).
Shipped to prod 2026-06-08. **S1** PR #48 (`f0df5ba`, Daniel-authorized) · **S2** PR #49 (`8ec0c61`) ·
**S3** PR #52 (`72d3cfe`, Daniel-merged) + ticket primitive `fe8c5e8`.

## What shipped
The thing that makes an event an event — a **unique, scannable, one-time-per-attendee ticket redeemed at
the door** — built once and fed by two front doors (paid checkout + free RSVP).

- **S1 — paid admission, made real.** S1.1 event date/time/venue/aforo attrs ride **Medusa product
  metadata** (no new `listing_type`); aforo = native `manage_inventory`; attrs surface on the PDP + UCP so
  agents see them. S1.2 buyers re-download their ticket/confirmation (built the TODO'd buyer-owns-order gate).
- **S2 — free RSVP surface.** `marketplace_events` + `marketplace_event_registrations` (Supabase, sibling to
  sweepstakes — **forked the pattern, not the raffle/legal-shaped table**) and a public `/e/[slug]` page;
  anyone registers with email-code verification (no marketplace account).
- **S3 — attendee-ticket primitive + check-in.** S3.1 mints a unique per-attendee token (paid order metadata
  + free registration row), QR encodes the **token** (not a URL). S3.2 the seller scans at the door and the
  ticket is marked used **exactly once** — every mutation that reaches the redeemed state is gated. S3.3 the
  attendance roster / check-in view reads the S3.1 state (no new model).

## What went well
- **One primitive, two front doors.** Daniel's call to build free-RSVP + check-in now (vs. the spike's
  "park behind demand") paid off precisely because the scannable ticket a free RSVP needs is the *same*
  primitive paid ticketing needs — so it was built once and reused, not twice.
- **Medusa-first, zero new commerce tables.** Event attrs on product metadata (like personalization),
  ticket token + redemption state on order/line-item metadata for paid and on the Supabase registration row
  for free — no new `listing_type`, no schema sprawl.
- **The redeem-once guarantee is a pure state machine + an every-mutation gate.** The token/redemption
  lifecycle is a pure, next-free `lib/` helper (`lib/event-ticket-state.ts`), so the illegal transition
  (double-redeem) is rejected with free pure-logic coverage; the door-scan + every write that reaches the
  redeemed state is gated server-side (the UI gate is courtesy).

## What we learned
- **A one-time redemption (door check-in) is the same shape as manual-payment state: a pure, next-free
  `lib/` state machine + a server gate on EVERY mutation that reaches the redeemed state — never just the
  named scan route.** Double-redeem and wrong-seller are rejected by the guard, proven by pure-logic specs.
  → promoted to `LEARNINGS.md` (reuses the manual-payment-state + every-mutation-gate learnings).
- **Fork a neighbouring feature's *pattern*, not its table, when the data shape differs.** The free-RSVP
  surface reused the sweepstakes public-page + email-code *pattern* but stood up its own
  `marketplace_events`/`_registrations` — the sweepstakes `tickets`/`draws` table is raffle/legal-shaped
  (SEGOB gate) and would have been the wrong model to generalize.

## Gaps / follow-ups
- **Owed to Daniel:** the authed **door-scan money/fulfillment live smoke** — scan a real ticket with a
  seller session, confirm it's marked used and can't be reused, and that wrong-seller/already-used/not-found
  are rejected. The deterministic parts (state machine, gates, negative paths) are spec-covered.
- **Out of scope (v1), as designed:** multi-tier/multi-session variant tickets, assigned/reserved seating,
  a dedicated `event` `listing_type`, ticket resale/transfer, auto-offer into print-social, any new
  payment/checkout/coupon behaviour.
