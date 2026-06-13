# Sprint 3 — Attendee-ticket primitive + check-in (the shared spine)

> Epic: [Events & Ticketing](README.md) · **Risk: S3.1 / S3.2 HIGH (Daniel merges) · S3.3 MED.**
> Goal: every attendee — whether they **bought** admission (S1) or
> **registered** for free (S2) — gets a **unique, scannable ticket** the seller can **check in once** at
> the door. This is the genuinely-new primitive the spike identified; it's built **once** and fed by both
> front doors. **Depends on Sprint 1 + Sprint 2.**

**Status:** ✅ SHIPPED 2026-06-08 — PR #52 (`72d3cfe`, Daniel-merged) + ticket primitive `fe8c5e8`. S3.1
(per-attendee token + QR) · S3.2 (door scan, redeem-once) · S3.3 (roster) all on `main`. **Owed to
Daniel:** the authed door-scan money/fulfillment live smoke (scan a real ticket; confirm redeem-once).

## Stories

### S3.1 — Mint a unique per-attendee ticket token; QR encodes the token
**As** the platform, **I want** to mint a unique token per attendee at purchase (paid) and at
registration (free), **so that** every attendee has a unique credential — not the same file for everyone.
- A pure, next-free **`lib/` helper** (mirror `lib/manual-payment-state.ts`): mint token + redemption
  state (`issued → redeemed`, with guards rejecting illegal transitions and double-mint). Persist on
  **order/line-item metadata** for paid tickets (Medusa-first) and on the
  `marketplace_event_registrations` row for free tickets. **The QR encodes the token**, not a marketing
  URL (today both QR gens encode a URL). Deliver the ticket (email + the buyer re-download from S1.2 / the
  RSVP success page from S2.2).
- **Acceptance:** two buyers of the same event get **different** tokens/QRs; a free registrant gets a
  token/QR too; re-issuing is idempotent (same attendee → same token). The token is opaque + non-guessable.
- **QA:** **pure-logic spec** on the token/state helper (unique mint, idempotent re-issue, illegal
  transition rejected) — free coverage on the `lib/` seam; api spec that a paid order + a free registration
  each expose a token. **Risk: HIGH** (order/fulfillment metadata + delivery → **Daniel merges**).

### S3.2 — Seller scans a ticket at the door; marked used exactly once
**As** a seller, **I want** to scan a ticket at the door and have it marked used exactly once, **so that**
no ticket is reused.
- A seller-facing **scan/redeem endpoint** that takes a token, marks it redeemed, and returns
  valid / already-used / not-found. The one-time-use guard must cover **every mutation** that can reach
  the redeemed state (per LEARNINGS "a server gate covers every mutation", not just the named route).
  Scope each scan to the seller who owns the event.
- **Acceptance:** scanning a valid token marks the attendee present and returns OK; scanning the **same**
  token again returns "already used"; an unknown/forged token returns not-found; a seller can't redeem
  another seller's event tickets.
- **QA:** **pure-logic spec** (double-redeem rejected); api spec on the redeem endpoint (valid /
  already-used / not-found / wrong-seller). **The real door-scan flow is a browser smoke owed to Daniel**
  (authed seller session). **Risk: HIGH → Daniel merges.**

### S3.3 — Attendance roster / check-in view
**As** a seller, **I want** a roster showing who's registered and who's checked in, **so that** I can
manage the door.
- A seller view listing attendees (paid + free) with their redemption state; live-ish count of
  checked-in vs total. Reads the S3.1 state — no new model.
- **Acceptance:** the roster shows every attendee and flips a row to "checked in" after a scan; the count
  is correct. es-MX.
- **QA:** api spec on the roster read; anonymous-safe component spec where possible. **Risk: MED.**

## Sprint QA — plan
- **Deterministic gate (green before merge):** `tsc --noEmit` (both repos) · `next build` · Playwright `api`.
- **New specs:** pure-logic spec on the ticket-token state machine (unique/idempotent/illegal-transition/
  double-redeem) — the highest-value free coverage; secret-gated smoke covers token exposure + valid /
  double / forged / wrong-seller free redemption. Paid redemption is covered by the same shared state
  primitive and backend metadata mutation gate.
- **Deploy order:** S3 writes order metadata + reads S1/S2 surfaces — **merge backend-first or together**;
  the frontend degrades gracefully (no token yet → no ticket shown) across the Cloud Run window.
- **Owed to Daniel:** the **authed door-scan money/fulfillment smoke** (scan a real ticket, confirm
  one-time-use) — an automated browser smoke can't fully cover the seller-session redeem path.

## Sprint 3 — Authed door-scan smoke walkthrough
```
Tier: HIGH for S3.1/S3.2 money + fulfillment. Daniel merges after this smoke.
Env: PR Vercel preview first, then production https://miyagisanchez.com after merge.

1. As a buyer, buy admission to a paid event (Sprint 1). Capture the ticket token shown in email or
   account order details. Confirm the QR image decodes to the raw token, not a URL.
2. Register a second attendee for a free event (Sprint 2). Capture the token from the RSVP success page
   or confirmation email. Confirm the paid and free tokens differ.
3. As the event seller, open the roster at:
   https://miyagisanchez.com/shop/manage/eventos/<event-id>
   The paid and free attendees should both appear as issued / not checked in.
4. Enter or scan the free attendee token in the roster check-in field.
   Expected: valid; the row flips to checked in and the checked-in count increments by one.
5. Enter or scan the same free token again.
   Expected: already used; no second check-in and the count does not increment.
6. Enter a forged token such as tkt_deadbeef_deadbeef_deadbeef_deadbeef.
   Expected: not found.
7. Repeat steps 4-5 with the paid attendee token.
   Expected: the same one-time-use behavior, persisted back through Medusa order metadata and mirrored
   into the seller roster.
8. Sign in as a different seller and try either real token.
   Expected: not found / not allowed; the other seller cannot redeem this event's tickets.

If any step fails, note the step number + what you saw. This smoke is owed to Daniel because it exercises
the real authenticated seller door path and the money/fulfillment metadata path.
```
