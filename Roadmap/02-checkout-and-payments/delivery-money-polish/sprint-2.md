# Sprint 2 — Pickup propose-and-confirm appointment

> Epic: [Delivery & Manual-Money Polish](README.md) · **Risk: HIGH — Daniel merges** (fulfillment /
> order state).
> **Status: 📋 PLANNED — not started.** Goal: local pickup stops being an external scheduling link and
> becomes a real appointment — the buyer proposes a date + time window, the seller confirms or
> reschedules, both sides see the agreed slot. Reuses the existing pickup-spot selection; persists on
> `order.metadata`. **No slot-inventory engine** (Daniel's call: propose-and-confirm).

## Stories

### S2.1 — Buyer proposes a pickup appointment
**As** a buyer choosing local pickup, **I want** to propose a date + time window, **so that** I'm not
bounced to an external link to "coordinate."
- Extend the existing `pickup_spots` / `selectedPickupSpotId` selection in `CheckoutExperience.tsx` with
  a proposed datetime (date + time window) persisted on the order metadata; replaces leaning on the spot's
  external `scheduling_url`.
- **Acceptance:** selecting local pickup lets the buyer propose a slot; it's saved on the order and visible
  to both buyer and seller after placement.
- **QA:** api spec on persistence (the proposed appointment round-trips on the order); browser smoke
  (anonymous where the picker renders pre-auth). **Risk: HIGH** (order/fulfillment state).

### S2.2 — Seller confirms or reschedules
**As** a seller, **I want** to confirm or propose a new pickup window, **so that** the appointment is a
real agreement, not a one-sided guess.
- Seller action on the order: confirm the proposed slot, or counter with a new window; both sides see the
  current state; honest copy ("Pendiente de confirmar" → "Cita confirmada").
- **Acceptance:** seller confirm flips the order to a confirmed appointment shown to the buyer; a
  reschedule round-trips and re-enters "pendiente de confirmar".
- **QA:** api spec on the confirm/reschedule transitions; authed browser smoke **owed to Daniel**. **Risk: HIGH.**

## Sprint QA — plan
- **Deterministic gate:** `tsc --noEmit` (both repos) · `next build` · Playwright `api`.
- **New specs:** api specs on the appointment persistence + confirm/reschedule transitions; an anonymous
  browser smoke for the checkout picker render. Extract any slot/derive logic to a `lib/` seam for a free
  pure-logic spec.
- **Deploy order:** backend (persist appointment + transitions) first or together; frontend reads
  degrade gracefully (`pickup_appointment ?? null`).

## Sprint 2 — Smoke walkthrough (fill in real IDs at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.

1. As a BUYER, add a local-pickup listing to cart and reach checkout:
   https://miyagisanchez.com/checkout
   → Choosing "Recolección" shows a date + time-window picker (NOT just an external link).
2. Propose a slot and place the order.
   → The order shows "Cita de recolección: <date/window> — pendiente de confirmar".
3. As the SELLER, open the order: https://miyagisanchez.com/shop/manage/orders/<order-id>
   → The proposed slot is shown with "Confirmar" / "Proponer otra hora".
4. As the SELLER, click "Confirmar".
   → Both sides read "Cita confirmada: <date/window>".
5. (reschedule) As the SELLER, propose a new window instead.
   → The order re-enters "pendiente de confirmar" with the new slot; the buyer sees it on reload.

If any step fails, note the step number + what you saw.
```
*(Steps that mutate order state are seller-auth-gated — owed to Daniel; the checkout picker render (step 1) is anonymous-testable.)*
