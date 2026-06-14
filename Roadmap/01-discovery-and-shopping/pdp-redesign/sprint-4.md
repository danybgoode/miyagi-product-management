# Sprint 4 — Per-type blocks A: services · rentals · digital · subscriptions

> Epic: [PDP redesign](README.md) · **Risk: LOW–MED** (frontend reorder on existing per-type primitives; rental
> pricing math is the one place to spec carefully). **Status: ✅ MERGED — PR
> [#91](https://github.com/danybgoode/miyagisanchezcommerce/pull/91) squash `6a52ad2` (off `feat/pdp-redesign-s4`),
> CI green (tsc + build + Playwright `api`) + clean cross-agent review (fresh Claude reviewer findings all applied;
> Antigravity advisory no-blocking); frontend-only, no backend deploy. Deployed to Vercel prod.** All deltas gated
> on the `pdp_redesign` kill-switch. **Owed to Daniel: the four authed signed-in completed-state smokes (money/
> booking paths) — see the walkthrough step 5.** Goal: for each of these four types, the PDP leads with the block
> that decides the purchase and a single type-appropriate primary action — reusing the primitives that already
> exist. Each ships its signed-out **and** signed-in (completed) state.
>
> **Post-review fixes folded in (PR #91):** rental "Reservar" routes to seller coordination (the generic /checkout
> only charges one unit of `price_cents` and ignores the date range + deposit), figure labeled **"Total estimado"**;
> the S4.4 mensual/anual toggle is gated on `pdp_redesign`; rentals expose `rental: { rate_period, deposit_cents }`
> in the UCP read (rule #3) so agents don't quote the per-period rate as the full price; date-picker `today` is
> Mexico-City-local. **Follow-up (cross-cutting, not this sprint):** normalize protocol-less seller `booking_url`s
> (used unguarded across the codebase); backend rental line-item pricing so a rental can be charged online for real.

## Stories

### S4.1 — Services · primary "Agendar cita" ✅ `d95cbc5`
**As** a buyer of a service, **I want** to see what's included and the next available times, **so that** I can book
without opening a separate calendar.
- Schedule gallery ("próximas fechas" tappable) replaces the methods grid as the hero block, using the existing
  Cal.com `booking_url` (`shopSettings.calcom`). "Qué incluye" + modalidad replace the specs table. Single primary
  "Agendar cita"; "Preguntar" a light link; no "Hacer oferta". Signed-in: "cita elegida → Confirmar y pagar".
- **Acceptance:** a service PDP leads with schedule + "qué incluye"; the only primary action is Agendar.
- **QA:** browser smoke. **Risk: LOW.**
- **Built:** `app/l/[id]/ServiceHero.tsx` (schedule card → `booking_url`, or "Solicitar cita" via AskSeller when
  none; "Qué incluye" = `listingSpecs` service attrs + description). Generic buy/offer bar + bundle + duplicate
  specs/description suppressed for `serviceLed`. Decision in pure `lib/service-hero.ts` (`e2e/service-hero.spec.ts`).

### S4.2 — Rentals · primary "Reservar estas fechas" ✅ `9d3bd06`
**As** a buyer of a rental, **I want** to pick dates and see the full total incl. deposit, **so that** there are no
surprises at checkout.
- Check-in/out selector + availability as the hero block; **deposit** shown beside the price and in the bar total;
  bar total = días × precio + depósito. Signed-in: chosen dates → "Reservar · $total".
- **Acceptance:** picking a 3-day range shows total = 3 × daily + deposit in the bar.
- **QA:** **pure-logic spec on the pricing math** (`lib/` seam) + browser smoke. **Risk: LOW–MED** (no money mutation,
  but the displayed total must be exact).
- **Built:** `app/l/[id]/RentalBooking.tsx` (check-in/out picker → exact total; "Reservar · $total" reuses the
  checkout hop — *no money mutation*; `booking_url` → secondary "Ver disponibilidad" link). Math in pure
  `lib/rental-pricing.ts` (`e2e/rental-pricing.spec.ts` — incl. the 3-night acceptance, exact). **Decision (Daniel):**
  deposit + rate-period captured **frontend-only** into `metadata.attrs` via a new rental pricing panel in
  `AttrsSection` (`RENTAL_GROUP`/`RENTAL_FIELDS`) — kept OUT of the specs table (pricing inputs, not specs). Defaults
  safe (deposit 0, period día) so an un-captured rental still works.

### S4.3 — Digital · primary "Comprar al instante" ✅ `0acb973`
**As** a buyer of a digital good, **I want** the instant-delivery promise up front, **so that** I know I get it now.
- Instant-delivery banner at top (file name + size); specs reinterpreted (formato · compatibilidad · incluye ·
  licencia); single-action bar; no envío/devoluciones/oferta. Signed-in: "comprado → Descargar archivo".
- **Acceptance:** a digital PDP leads with the instant-delivery banner; no shipping/offer UI.
- **QA:** browser smoke. **Risk: LOW.**
- **Built:** "Entrega al instante" hero banner (file name + size + format) + specs reinterpreted as formato · tamaño
  (licencia/compatibilidad/incluye **only when stored** — no new capture). Legacy badge + returns section suppressed
  for `digitalLed`; digital already excluded from the offer bar; existing inline `BuyButton` stays the action. Model
  in pure `lib/digital-delivery.ts` (`e2e/digital-delivery.spec.ts`).

### S4.4 — Subscriptions · primary "Suscribirse" ✅ `e8d38e2`
**As** a buyer choosing a plan, **I want** comparable tiers and a mensual/anual toggle, **so that** I can pick the
right plan.
- Comparable tiers + "Más popular" highlight + mensual/anual toggle with the annual saving shown; bar reflects the
  chosen plan; "cancela cuando quieras". Reuse `SubscriptionSection`. Signed-in: "ya suscrito → Gestionar suscripción".
- **Acceptance:** toggling anual shows the saving; selecting a tier updates the bar's plan + price.
- **QA:** pure-logic spec on the annual-saving calc + browser smoke. **Risk: LOW.**
- **Built:** extended `SubscriptionSection.tsx` (all existing Stripe/MP/SPEI checkout logic reused) with a
  mensual/anual toggle shown **only when both intervals exist**, the exact annual saving, and same-plan continuity
  across the switch. Pairing + saving in pure `lib/subscription-pricing.ts` (`e2e/subscription-pricing.spec.ts` —
  12×monthly−annual, exact).

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- Pricing/saving math (S4.2, S4.4) on pure `lib/` seams with specs. Browser smoke per type. Signed-in completed
  states use `MS_TEST_*`; the authed/booking/checkout confirmations are **owed to Daniel**.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com once merged (the branch's Vercel **preview** while pre-merge). The
`pdp_redesign` flag must be ON (default). Steps 1–4 are anonymous (no login needed); step 5 is **owed to Daniel**.

1. Open a **service** listing, e.g. https://miyagisanchez.com/l/<service-id>.
   → It leads with a schedule card + "Qué incluye"; the only primary button is **"Agendar cita"** (links to the
   seller's Cal.com) — or **"Solicitar cita"** if the seller has no calendar. "Preguntar" is a light link; there is
   no "Hacer oferta".
2. Open a **rental** listing and pick a check-in then a check-out 3 days later.
   → A breakdown shows `precio × 3 noches`, the **depósito** line, and **Total = 3 × daily + deposit**; the primary
   button reads **"Reservar · $total"**. The per-día rate + deposit also show in the card sub-header. (If the seller
   set a `booking_url`, a secondary "Ver disponibilidad" link appears.)
3. Open a **digital** listing.
   → An **"Entrega al instante"** banner (file name + size + format) leads the page; specs read formato · tamaño;
   there is **no shipping / devoluciones / offer** UI; the action is the inline "Comprar al instante" buy box.
4. Open a **subscription** listing that has both a monthly and an annual tier, and toggle **Mensual → Anual**.
   → The toggle appears, the **annual saving** ("Ahorras $X al año (Y%)") shows on Anual, and selecting a tier
   (e.g. Pro) updates the subscribe button to that plan + price. (A subscription with one interval shows no toggle.)
5. (signed-in — **owed to Daniel**, money/booking paths an anonymous smoke can't cover) On each, the completed state
   shows: cita elegida → Confirmar y pagar · fechas elegidas → Reservar (checkout hop) · comprado → Descargar
   archivo · ya suscrito → Gestionar suscripción.

If any step fails, note the step number + what you saw — that's the bug report.
