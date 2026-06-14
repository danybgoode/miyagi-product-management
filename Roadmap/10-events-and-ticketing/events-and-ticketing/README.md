---
status: shipped
slug: events-and-ticketing
---

# Epic — Events & Ticketing

> **Macro-section:** [10 · Events & Ticketing](../README.md) · **BUILD-ORDER:** #7 ·
> **Risk: MIXED** — S1.1 / S2.* LOW, S3.3 MED, **S1.2 / S3.1 / S3.2 HIGH → Daniel merges**
> (delivery of a paid artifact, money/fulfillment-state, door redemption).
> **Status: ✅ EPIC COMPLETE — all 3 sprints shipped to prod 2026-06-08.** S1 paid admission
> ([#48](https://github.com/danybgoode/miyagisanchezcommerce/pull/48) `f0df5ba`, Daniel-authorized) ·
> S2 free RSVP ([#49](https://github.com/danybgoode/miyagisanchezcommerce/pull/49) `8ec0c61`) ·
> S3 shared attendee-ticket primitive + door check-in + roster
> ([#52](https://github.com/danybgoode/miyagisanchezcommerce/pull/52) `72d3cfe`, Daniel-merged +
> `fe8c5e8`). See [RETROSPECTIVE.md](RETROSPECTIVE.md). Scaffolded 2026-06-07 from the #7 spike (run,
> decision landed, **amended by Daniel to an epic**). Scope + decision + amendment:
> [`00-ideas/seeds/spike-ticket-event-management.md`](../../00-ideas/seeds/spike-ticket-event-management.md).
> **Owed to Daniel:** the authed door-scan money/fulfillment live smoke (scan a real ticket, redeem-once).

## Why
The #7 spike confirmed that **selling event admission is already-servable** (a `service`/`digital`
listing sells through the real checkout, caps seats with `manage_inventory`, and a `digital` listing
even delivers a downloadable confirmation via the Stripe webhook). What does **not** exist anywhere in
the system is the thing that makes an event an event: a **unique, scannable, one-time per-attendee
ticket you redeem at the door** — both QR generators in the repo encode a marketing URL, never a
per-attendee token, and there is no redemption/validation/roster concept at all. The spike *recommended*
parking free-RSVP and check-in behind demand; **Daniel elected to build them now**, because a free RSVP
without check-in is just a contact-capture form, and the scannable ticket free-RSVP needs is the *same*
primitive paid ticketing needs. So this epic builds that primitive **once** and feeds it from **two
front doors**: paid checkout and a free RSVP page.

## Context

| Question | Answer |
|---|---|
| **Who** | Sellers running events (paid or free) · attendees (buyers + non-account registrants) · the seller at the door |
| **Job** | Sell or collect registrations for an event, give each attendee a unique ticket, and check them in once at the door |
| **Outcome signal** | A seller lists an event with a date/venue and capped seats · a buyer buys admission and gets a unique QR ticket · someone registers for a free event with just email-code verification and gets a unique QR · the seller scans a ticket at the door and it's marked used, and can't be reused |
| **In v1** | Event date/venue/aforo attrs (S1.1) · buyer ticket re-download (S1.2) · free RSVP public surface (S2) · shared attendee-ticket primitive + door check-in + roster (S3) · single GA · aforo = inventory |
| **Out (deferred)** | Multi-tier/multi-session **variant** tickets · assigned/reserved seating · a dedicated `event` `listing_type` · ticket resale/transfer · auto-offer into print-social · any new payment/checkout/coupon behaviour |
| **Risk tier** | MIXED — see the story table; high-risk stories are Daniel-merge |

## Medusa-first note
**No new commerce tables.** Event attrs (date/time/venue/aforo) ride **Medusa product metadata**, exactly
like personalization (`lib/personalization.ts`) and manual-payment state (`lib/manual-payment-state.ts`);
aforo stays native `manage_inventory`. The **attendee-ticket token + redemption state** lives on
**order/line-item metadata** for paid tickets (Medusa-first, AGENTS #1) and on the **free-RSVP
registration row** for free tickets. **Free RSVP registrations are non-commerce → Supabase** (AGENTS #2),
mirroring how sweepstakes entries are stored. **No new `listing_type`** — events reuse `service`/`digital`
(optionally an event *category*). **Agent surface (AGENTS #3):** event attrs flow into `toUcpListing` so
agents see date/venue; an agent can already buy admission via `ucp/checkout-session`. Clerk untouched
(AGENTS #4). Bilingual es-MX for all new strings (AGENTS #5) — note the seller portal has no `en` render
path (see `LEARNINGS.md` i18n).

## What already exists (reuse, don't rebuild)
- **Sweepstakes spine (for S2 — reuse the *pattern*, NOT the table):** `app/g/[slug]/` (public page),
  the `lib/sweepstakes.ts` email-code send/verify (no marketplace account), the QR lib, and the public-page
  scaffold. **Do not generalize the sweepstakes entry table** — it's raffle/legal-shaped (`tickets` with
  `award_key`/`voided_at`, `draws`, a hard SEGOB legal gate in `20260605000000_sweepstakes.sql`). Stand up
  a sibling `marketplace_events` + `marketplace_event_registrations` and `/e/[slug]`.
- **State-machine shape (for S3):** `lib/manual-payment-state.ts` — a pure, next-free `lib/` helper with
  derivation + transition guards + copy, mirrored once in the backend normalizer. Mirror it for the ticket
  token/redemption state (illegal transition + double-redeem rejected = free pure-logic coverage).
- **Digital delivery hook (for S1.2):** `app/api/sell/listing/[id]/download/route.ts:37-49` — the buyer
  gate is already TODO'd here (today owner-only, returns 402 to non-owners). Build the buyer-owns-order
  check against `marketplace_orders`.
- **Listing attrs (for S1.1):** the per-type attr block pattern in `app/sell/AttrsSection.tsx`
  (autos/inmuebles are the shape to copy); `app/sell/SellWizard.tsx` to wire it; `lib/listings.ts` to
  normalize/surface; `app/l/[id]` PDP to render; `lib/ucp/schema.ts` `toUcpListing` for agents.
- **Aforo:** native Medusa `manage_inventory` (`lib/listings.ts:103-109`, surfaced as
  `available_quantity`/`in_stock`).
- **QR:** `lib/print-qr.ts` + the sweepstakes QR route — reuse the generator, but encode the **attendee
  token**, not a URL.
- **"A server gate covers every mutation" (for S3.2):** LEARNINGS — find every write that reaches the
  redeemed state and guard each, not just the named route.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Paid admission, made real** | ✅ S1.1 Event date/time/venue/aforo attrs on a listing (metadata; PDP + UCP surface) | LOW |
| | ✅ S1.2 Buyer can re-download their ticket/confirmation (build the TODO'd buyer gate) | **HIGH** |
| **S2 · Free RSVP surface** | ✅ S2.1 Seller creates a free event + RSVP page (`marketplace_events`, `/e/[slug]`) | LOW |
| | ✅ S2.2 Attendee registers with email-code verification (no account) + confirmation | LOW |
| **S3 · Attendee-ticket primitive + check-in** | ✅ S3.1 Mint a unique per-attendee token (paid + free); QR encodes the token | **HIGH** |
| | ✅ S3.2 Seller scans a ticket at the door; marked used exactly once (every-mutation gate) | **HIGH** |
| | ✅ S3.3 Attendance roster / check-in view | MED |

## Deploy order (two repos, async)
**S1 → S2 → S3.** S1 is the cheap, independent win (S1.1 is metadata-only; S1.2 is a frontend/API gate
on existing delivery). S2 is independent of S1 — **Supabase migration first** (per LEARNINGS async-deploy).
S3 depends on S1 + S2 (it tokenizes both the paid order and the free registration); where it writes order
metadata, **merge backend-first or together** and degrade gracefully across the ~12-min Cloud Run window.

## Epic Definition of Done
- [x] All three sprints' stories merged 2026-06-08 (S1 #48 · S2 #49 · S3 #52). **Door-scan money/fulfillment live smoke owed to Daniel** (stated).
- [x] Each `sprint-N.md` has a fool-proof smoke walkthrough; money/auth + door-scan steps flagged **owed to Daniel**.
- [x] This README ✅ complete; every sprint status ticked with commit refs.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster (`Roadmap/README.md`) updated — **10 · Events & Ticketing** domain line + Recent-highlights entry (see STEP 4 poster sweep).
- [x] `LEARNINGS.md` updated (ticket-token redeem-once state machine — reuse of the manual-payment-state pattern). *(Team memory lives outside this repo; left for Daniel/next session.)*
- [x] Branch(es) deleted; PR(s) merged.
