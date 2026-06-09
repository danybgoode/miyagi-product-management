# Sprint 2 — Pickup propose-and-confirm appointment

> Epic: [Delivery & Manual-Money Polish](README.md) · **Risk: HIGH — Daniel merges** (fulfillment /
> order state).
> **Status: ✅ BUILT 2026-06-09 — both PRs open, awaiting Daniel merge (HIGH).**
> Backend [PR #17](https://github.com/danybgoode/medusa-bonsai-backend/pull/17) ·
> Frontend [PR #58](https://github.com/danybgoode/miyagisanchezcommerce/pull/58). **Merge backend
> first** (frontend reads degrade gracefully). Gate green both repos: `tsc --noEmit` ✓ · `next build`
> ✓ · Playwright `api` (pickup-appointment pure-logic **19/19** + auth-gate spec).
> Goal: local pickup stops being an external scheduling link and becomes a real appointment — the buyer
> proposes a date + time window, the seller confirms or reschedules, both sides see the agreed slot.
> Reuses the existing pickup-spot selection; persists on `order.metadata`. **No slot-inventory engine**
> (Daniel's call: propose-and-confirm).

## Stories

### S2.1 — Buyer proposes a pickup appointment ✅
> Backend `21c12eb` (start-checkout persist + normalizer) · Frontend `da28ec8` (lib + checkout picker).

**As** a buyer choosing local pickup, **I want** to propose a date + time window, **so that** I'm not
bounced to an external link to "coordinate."
- Extend the existing `pickup_spots` / `selectedPickupSpotId` selection in `CheckoutExperience.tsx` with
  a proposed datetime (date + time window) persisted on the order metadata; replaces leaning on the spot's
  external `scheduling_url`.
- **Acceptance:** selecting local pickup lets the buyer propose a slot; it's saved on the order and visible
  to both buyer and seller after placement.
- **QA:** api spec on persistence (the proposed appointment round-trips on the order); browser smoke
  (anonymous where the picker renders pre-auth). **Risk: HIGH** (order/fulfillment state).

### S2.2 — Seller confirms or reschedules ✅
> Backend `04be92a` (seller + buyer transition routes) · Frontend `781cf11` (order-page UI + proxies).

**As** a seller, **I want** to confirm or propose a new pickup window, **so that** the appointment is a
real agreement, not a one-sided guess.
- Seller action on the order: confirm the proposed slot, or counter with a new window; both sides see the
  current state; honest copy ("Pendiente de confirmar" → "Cita confirmada").
- **Acceptance:** seller confirm flips the order to a confirmed appointment shown to the buyer; a
  reschedule round-trips and re-enters "pendiente de confirmar".
- **QA:** api spec on the confirm/reschedule transitions; authed browser smoke **owed to Daniel**. **Risk: HIGH.**

## Sprint QA — what we ran
- **Deterministic gate (green both repos):** `tsc --noEmit` (backend via a clean worktree install;
  frontend) · `next build` (frontend) · Playwright `api`.
- **New specs:**
  - `e2e/pickup-appointment.spec.ts` — pure-logic on `lib/pickup-appointment.ts` (derivation, action
    guards, transitions, es-MX copy, window labels). **19/19 pass.**
  - `e2e/pickup-appointment-api.spec.ts` — anonymous auth-gate: each confirm/reschedule proxy PATCH
    rejects an unauthenticated caller (401). Runs vs the preview in CI (the routes don't exist on prod
    until the frontend merges, so a pre-merge prod run can't see the 401 — CI is the home for it).
- **Deploy order:** **backend (PR #17) merges first**; frontend (PR #58) reads degrade gracefully
  (`pickup_appointment ?? null`, `pickup_appointment_state ?? 'none'`) across the ~12-min Cloud Run window.

## Sprint 2 — Smoke walkthrough
**Owed to Daniel — HIGH (authed, order/fulfillment state).** An automated browser smoke can't cover the
seller/buyer session mutations; run this by hand once both PRs are merged + deployed. The checkout
picker render (step 1) is the one anonymous-testable part.

```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Prereq: a listing whose delivery offers "Recolección" (local pickup), and a disposable buyer session.

1. As a BUYER, open a local-pickup listing → "Comprar" → reach checkout, and choose "Recolección".
   → Below the spot picker a "¿Cuándo quieres recogerlo?" block appears: a DATE field +
     three time windows (Mañana 9–13 / Tarde 13–18 / Noche 18–21). NOT just an external link.
   → The pay button stays disabled until BOTH a date and a window are chosen.

2. Pick a date + window, then place the order (any payment method the seller offers).
   → On the order page (/account/orders/<id>) a "📅 Cita de recolección" box shows your chosen
     slot with the badge "Pendiente de confirmar" and "Esperando que el vendedor confirme tu hora".

3. As the SELLER, open the same order: https://miyagisanchez.com/shop/manage/orders/<order-id>
   → The "📅 Cita de recolección" box shows the proposed slot + "Pendiente de confirmar",
     with buttons "✓ Confirmar cita" and "Proponer otra hora".

4. As the SELLER, click "✓ Confirmar cita".
   → The box flips green to "Cita confirmada"; reload the buyer order page → buyer also reads
     "Cita confirmada: <date · window>".

5. (reschedule) As the SELLER, click "Proponer otra hora", pick a new date + window, "Enviar propuesta".
   → The appointment re-enters "Pendiente de confirmar" (proposed by the seller). The seller box now
     reads "Esperando que el comprador confirme la nueva hora" (no confirm button on the seller side).

6. As the BUYER, reload the order page.
   → The box shows the seller's new slot + "Confirma la nueva hora que propuso el vendedor" and a
     "✓ Confirmar esta hora" button. Click it → both sides read "Cita confirmada".

If any step fails, note the step number + exactly what you saw.
```
*(Steps 2–6 mutate order state behind seller/buyer auth — owed to Daniel; step 1's picker render is
anonymous-testable.)*
