# Sprint 5 — Per-type blocks B: autos · inmuebles · events · unclaimed

> Epic: [PDP redesign](README.md) · **Risk: LOW–MED** (frontend reorder on existing primitives; the events ticket
> purchase is a money path — owed to Daniel). **Status: ✅ BUILT on `feat/pdp-redesign` (off `origin/main`
> db3c0a3) — gate green (tsc + `next build` + Playwright `api` 526 passed/0 failed); frontend-only, no backend
> deploy. All deltas gated on the `pdp_redesign` kill-switch.** Goal: the four remaining types each lead with
> their decision block + type-appropriate primary action, reusing REPUVE, the property fields, `readEventDetails`,
> ticketing/QR, and the unclaimed contact-only PDP.
>
> **VALIDATE-FIRST result (events, S5.3):** the buyer's purchased-ticket **QR is not cleanly reachable from the
> PDP read** — it lives on the buyer's order (`app/account/orders/[id]` already renders it via `ticketQrPath`),
> tickets are issued on payment by the Stripe/MP webhooks (`issuePaidTicketsForOrder`), and buyer→order
> resolution is the documented-fragile Medusa gap (`buyer_clerk_user_id: null`). The redemption backend
> (`/internal/events-ticketing/redeem`) is door/seller-scoped (internal secret), not PDP-facing. → **scoped to
> display + link** (lead with the event block + "Comprar boleto" via the existing checkout + a "Ver mi boleto"
> link to the order surface). **Aforo / ticket tiers / quantity selector have no live source** (`MarketplaceEvent.
> capacity` is a separate RSVP system not linked to listings; a paid ticket is one line-item per order) → **deferred.**
> **Owed to Daniel:** the events ticket **purchase** + the **QR after payment** (money/auth path).

## Stories

### S5.1 — Autos · primary "Agendar prueba de manejo" ✅ `0e79f1d`
**As** a buyer of a car, **I want** the REPUVE verification and vehicle specs up front, **so that** my fraud
anxiety is resolved before anything else.
- REPUVE verification anchored under the price (reuse `listing.metadata.repuve` — green = sin reporte,
  red = con reporte, with folio). Vehicle specs (año · km · transmisión · combustible) replace talla/condición.
  Primary "Agendar prueba de manejo"; oferta secondary; WhatsApp direct.
- **Acceptance:** an autos PDP shows the REPUVE anchor under the price + the vehicle spec set; primary = Agendar prueba.
- **QA:** browser smoke. **Risk: LOW.**
- **Built:** `app/l/[id]/AutoHero.tsx` (promoted REPUVE anchor + vehicle specs via `listingSpecs` + "Agendar prueba
  de manejo" → `booking_url`, or "Solicitar prueba de manejo" via AskSeller). Reorder, not a takeover — buy/offer
  bar stays; lower REPUVE badge + generic specs table suppressed for `autoLed`. Decision in pure `lib/auto-hero.ts`
  (`repuveDisplay` + `autoHeroModel`; `e2e/auto-hero.spec.ts`).

### S5.2 — Inmuebles · primary "Agendar visita" ✅ `82fd4aa`
**As** a buyer of a property, **I want** distribution + location first, **so that** I can judge fit before contacting.
- Property specs as icons (rec · baños · m² · estac.) from the inmuebles structured fields; approximate-zone map
  (no exact address pre-visit — privacy/safety). Primary "Agendar visita"; contact secondary.
- **Acceptance:** an inmuebles PDP shows the icon spec set + an approximate-zone map; primary = Agendar visita.
- **QA:** browser smoke. **Risk: LOW.**
- **Built:** `app/l/[id]/InmuebleHero.tsx` (glanceable icon spec row from the inmuebles attrs + a "Ver zona
  aproximada" link → **Google Maps search of the `location` zone string**, no exact address / no API key + "Agendar
  visita" → `booking_url`/AskSeller). Icon row is a summary; the full property specs table (tipo/amueblado) stays
  below, not suppressed. Pure `lib/inmueble-hero.ts` (`inmuebleIconSpecs` + `zoneMapUrl` + `inmuebleHeroModel`;
  `e2e/inmueble-hero.spec.ts`).

### S5.3 — Events / boletos · primary "Comprar boleto" ✅ `622c505` (scoped to display + link)
**As** a buyer of a ticket, **I want** date/venue first and a clear way to buy + reach my ticket, **so that** I can
buy and get in.
- Event block leads (fecha · hora · lugar · dirección from `readEventDetails`); the buy CTA is relabeled "Comprar
  boleto" (a ticket is a buyable product — the Stripe/MP webhooks issue the ticket on payment); a light "Ver mi
  boleto" link points at the buyer order surface that **already renders the QR** (`ticketQrPath`).
- **Validated (see header):** the QR is **not** cleanly resolvable from the PDP read → **display + link**, not inline
  QR. **Aforo / ticket tiers / quantity selector deferred** (no live source — capacity is a separate RSVP system not
  linked to listings; building it is a backend money-path story).
- **Acceptance:** an event PDP leads with the event block + a "Comprar boleto" CTA + a "Ver mi boleto" link.
- **QA:** browser smoke for the display; **the ticket purchase + the QR after payment are a money/auth path — owed
  to Daniel.** **Risk: MED (money).**
- **Built:** `app/l/[id]/EventHero.tsx` (promoted event card + "Ver mi boleto" → `/account/orders`); buy-CTA label
  threaded via `eventModel` in `page.tsx`; lower event block suppressed for `eventLed`. Pure `lib/event-hero.ts`
  (`eventHeroModel` + `MY_TICKETS_HREF`; `e2e/event-hero.spec.ts`).

### S5.4 — Unclaimed · primary "Contactar" ✅ `190af7e`
**As** a buyer on an unclaimed (imported) listing, **I want** an honest notice and a direct way to contact, **so
that** I know the status and can still reach the seller.
- Honest "aún no reclamada" notice (Buy/Offer/Cart already suppressed via `isShopClaimed`); contact-only (WhatsApp ·
  llamar · email); source-of-listing line + "¿Es tuya esta tienda? Recláma gratis →" nudge. Document the **"claim
  awakens the PDP"** upgrade — once claimed, the same skeleton shows price/Buy/Offer/methods/protección (§02), wired
  by the existing gem-claim loop. No new gating.
- **Acceptance:** an unclaimed PDP shows the honest notice + contact-only actions + the claim nudge; no buy/offer UI.
- **QA:** browser smoke (anonymous). **Risk: LOW.**
- **Built:** `app/l/[id]/UnclaimedNotice.tsx` — honest "Tienda aún no reclamada" notice leading the page +
  claim nudge (`/s/<slug>/claim`, matching `SellerTrustCard`); contact-only actions + source line already render.
  **No `isShopClaimed` gating change.** Copy + claim href in pure `lib/unclaimed-notice.ts` (`e2e/unclaimed-notice.spec.ts`).

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- Browser smokes per type (anonymous where possible). **Events ticket purchase + QR redemption = money/auth path,
  owed to Daniel.** REPUVE/property/unclaimed all read existing data — no new mutations.

## Sprint 5 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com once merged (the branch's Vercel **preview** while pre-merge). The
`pdp_redesign` flag must be ON (default). Steps 1–3 and 5 are anonymous (no login); step 4 is **owed to Daniel**.

1. Open an **autos** listing with REPUVE data, e.g. https://miyagisanchez.com/l/<auto-id>.
   → A REPUVE verification box sits right under the price (green "sin reporte" or red "con reporte" + folio); specs read año · km · transmisión · combustible; primary button is "Agendar prueba de manejo".
2. Open an **inmuebles** listing.
   → Icon specs (rec · baños · m² · estac.) and an approximate-zone map show; primary is "Agendar visita".
3. Open an **events** listing (one with `event_date`/`venue` set).
   → It leads with an "Evento" card (fecha · hora · lugar · dirección), the buy CTA reads **"Comprar boleto — $precio"**,
   and a light "¿Ya compraste? Ver mi boleto" link sits under the event card. (No aforo / tier / quantity selector —
   deferred, no live source; see the header.)
4. (money path — **owed to Daniel**) Buy a ticket signed-in, then open the order under **Mis compras**.
   → After payment the order page shows a scannable QR ticket ("Listo para presentar en puerta"). The PDP itself
   only **links** here (the QR isn't resolved inline — validated).
5. Open an **unclaimed** listing (a gem-imported one).
   → It shows "Tienda aún no reclamada", contact-only actions (WhatsApp · llamar · email), the source line, and "Recláma gratis"; there is no Buy/Offer.

If any step fails, note the step number + what you saw — that's the bug report.
