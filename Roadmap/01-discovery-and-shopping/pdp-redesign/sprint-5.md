# Sprint 5 — Per-type blocks B: autos · inmuebles · events · unclaimed

> Epic: [PDP redesign](README.md) · **Risk: LOW–MED** (frontend reorder on existing primitives; the events ticket
> purchase is a money path — owed to Daniel). **Status: 🚧 planned.** Goal: the four remaining types each lead with
> their decision block + type-appropriate primary action, reusing REPUVE, the property fields, `readEventDetails`,
> ticketing/QR, and the unclaimed contact-only PDP.

## Stories

### S5.1 — Autos · primary "Agendar prueba de manejo"
**As** a buyer of a car, **I want** the REPUVE verification and vehicle specs up front, **so that** my fraud
anxiety is resolved before anything else.
- REPUVE verification anchored under the price (reuse `listing.metadata.repuve`, PDP `:468` — green = sin reporte,
  red = con reporte, with folio). Vehicle specs (año · km · transmisión · combustible) replace talla/condición.
  Primary "Agendar prueba de manejo"; oferta secondary; WhatsApp direct. Signed-in: "prueba agendada → Ver punto de encuentro".
- **Acceptance:** an autos PDP shows the REPUVE anchor under the price + the vehicle spec set; primary = Agendar prueba.
- **QA:** browser smoke. **Risk: LOW.**

### S5.2 — Inmuebles · primary "Agendar visita"
**As** a buyer of a property, **I want** distribution + location first, **so that** I can judge fit before contacting.
- Property specs as icons (rec · baños · m² · estac.) from the inmuebles structured fields; approximate-zone map
  (no exact address pre-visit — privacy/safety). Primary "Agendar visita"; contact secondary. Signed-in: "visita
  agendada → Ver dirección exacta".
- **Acceptance:** an inmuebles PDP shows the icon spec set + an approximate-zone map; primary = Agendar visita.
- **QA:** browser smoke. **Risk: LOW.**

### S5.3 — Events / boletos · primary "Comprar boleto"
**As** a buyer of a ticket, **I want** date/venue/availability first and a scannable ticket after, **so that** I can
buy and get in.
- Event block leads (fecha · hora · lugar · dirección from `readEventDetails`); aforo scarcity ("quedan N") + ticket
  tiers + quantity selector in the bar. Signed-in after purchase: scannable QR ticket (reuse ticketing backend,
  one-time redeem). **Open question (validate first):** confirm the QR redemption backend is reachable from the PDP
  read; if not, scope to display + link to the existing ticket surface.
- **Acceptance:** an event PDP leads with the event block + aforo + tier/qty selector; a purchased ticket shows a QR.
- **QA:** browser smoke for the display; **the ticket purchase is a money path — owed to Daniel.** **Risk: MED (money).**

### S5.4 — Unclaimed · primary "Contactar"
**As** a buyer on an unclaimed (imported) listing, **I want** an honest notice and a direct way to contact, **so
that** I know the status and can still reach the seller.
- Honest "aún no reclamada" notice (Buy/Offer/Cart already suppressed via `isShopClaimed`); contact-only (WhatsApp ·
  llamar · email); source-of-listing line + "¿Es tuya esta tienda? Recláma gratis →" nudge. Document the **"claim
  awakens the PDP"** upgrade — once claimed, the same skeleton shows price/Buy/Offer/methods/protección (§02), wired
  by the existing gem-claim loop. No new gating.
- **Acceptance:** an unclaimed PDP shows the honest notice + contact-only actions + the claim nudge; no buy/offer UI.
- **QA:** browser smoke (anonymous). **Risk: LOW.**

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- Browser smokes per type (anonymous where possible). **Events ticket purchase + QR redemption = money/auth path,
  owed to Daniel.** REPUVE/property/unclaimed all read existing data — no new mutations.

## Sprint 5 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (or preview while pre-merge)

1. Open an **autos** listing with REPUVE data, e.g. https://miyagisanchez.com/l/<auto-id>.
   → A REPUVE verification box sits right under the price (green "sin reporte" or red "con reporte" + folio); specs read año · km · transmisión · combustible; primary button is "Agendar prueba de manejo".
2. Open an **inmuebles** listing.
   → Icon specs (rec · baños · m² · estac.) and an approximate-zone map show; primary is "Agendar visita".
3. Open an **events** listing.
   → It leads with fecha · hora · lugar · dirección, shows "quedan N lugares", and a tier + quantity selector in the bar.
4. (money path — **owed to Daniel**) Buy a ticket signed-in.
   → After payment, a scannable QR ticket shows ("se escanea una vez").
5. Open an **unclaimed** listing (a gem-imported one).
   → It shows "Tienda aún no reclamada", contact-only actions (WhatsApp · llamar · email), the source line, and "Recláma gratis"; there is no Buy/Offer.

If any step fails, note the step number + what you saw — that's the bug report.
