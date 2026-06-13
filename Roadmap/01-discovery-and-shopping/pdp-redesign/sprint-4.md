# Sprint 4 — Per-type blocks A: services · rentals · digital · subscriptions

> Epic: [PDP redesign](README.md) · **Risk: LOW–MED** (frontend reorder on existing per-type primitives; rental
> pricing math is the one place to spec carefully). **Status: 🚧 planned.** Goal: for each of these four types,
> the PDP leads with the block that decides the purchase and a single type-appropriate primary action — reusing
> the primitives that already exist. Each ships its signed-out **and** signed-in (completed) state.

## Stories

### S4.1 — Services · primary "Agendar cita"
**As** a buyer of a service, **I want** to see what's included and the next available times, **so that** I can book
without opening a separate calendar.
- Schedule gallery ("próximas fechas" tappable) replaces the methods grid as the hero block, using the existing
  Cal.com `booking_url` (`shopSettings.calcom`). "Qué incluye" + modalidad replace the specs table. Single primary
  "Agendar cita"; "Preguntar" a light link; no "Hacer oferta". Signed-in: "cita elegida → Confirmar y pagar".
- **Acceptance:** a service PDP leads with schedule + "qué incluye"; the only primary action is Agendar.
- **QA:** browser smoke. **Risk: LOW.**

### S4.2 — Rentals · primary "Reservar estas fechas"
**As** a buyer of a rental, **I want** to pick dates and see the full total incl. deposit, **so that** there are no
surprises at checkout.
- Check-in/out selector + availability as the hero block; **deposit** shown beside the price and in the bar total;
  bar total = días × precio + depósito. Signed-in: chosen dates → "Reservar · $total".
- **Acceptance:** picking a 3-day range shows total = 3 × daily + deposit in the bar.
- **QA:** **pure-logic spec on the pricing math** (`lib/` seam) + browser smoke. **Risk: LOW–MED** (no money mutation,
  but the displayed total must be exact).

### S4.3 — Digital · primary "Comprar al instante"
**As** a buyer of a digital good, **I want** the instant-delivery promise up front, **so that** I know I get it now.
- Instant-delivery banner at top (file name + size); specs reinterpreted (formato · compatibilidad · incluye ·
  licencia); single-action bar; no envío/devoluciones/oferta. Signed-in: "comprado → Descargar archivo".
- **Acceptance:** a digital PDP leads with the instant-delivery banner; no shipping/offer UI.
- **QA:** browser smoke. **Risk: LOW.**

### S4.4 — Subscriptions · primary "Suscribirse"
**As** a buyer choosing a plan, **I want** comparable tiers and a mensual/anual toggle, **so that** I can pick the
right plan.
- Comparable tiers + "Más popular" highlight + mensual/anual toggle with the annual saving shown; bar reflects the
  chosen plan; "cancela cuando quieras". Reuse `SubscriptionSection`. Signed-in: "ya suscrito → Gestionar suscripción".
- **Acceptance:** toggling anual shows the saving; selecting a tier updates the bar's plan + price.
- **QA:** pure-logic spec on the annual-saving calc + browser smoke. **Risk: LOW.**

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- Pricing/saving math (S4.2, S4.4) on pure `lib/` seams with specs. Browser smoke per type. Signed-in completed
  states use `MS_TEST_*`; the authed/booking/checkout confirmations are **owed to Daniel**.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (or preview while pre-merge)

1. Open a **service** listing, e.g. https://miyagisanchez.com/l/<service-id>.
   → It leads with próximas fechas + "Qué incluye"; the only primary button is "Agendar cita".
2. Open a **rental** listing and pick a 3-day range.
   → The bar shows total = 3 × daily price **plus the deposit**, with the deposit also shown beside the price.
3. Open a **digital** listing.
   → A "entrega al instante" banner (file name + size) is at the top; there's no shipping/offer UI; the action is "Comprar al instante".
4. Open a **subscription** listing and toggle mensual → anual.
   → The annual saving appears; selecting a tier (e.g. Pro) updates the bar to that plan + price.
5. (signed-in — **owed to Daniel**) On each, the completed state shows (cita elegida / fechas elegidas / comprado / ya suscrito).

If any step fails, note the step number + what you saw — that's the bug report.
