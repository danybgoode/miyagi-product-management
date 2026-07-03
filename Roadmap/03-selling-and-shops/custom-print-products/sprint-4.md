# Custom print products — Sprint 4: Lightweight proof, agent parity + reorder

**Status:** ⬜ not started

## Stories

### Story 4.1 — Lightweight proof via messaging
**As a** seller, **I want** to send a proof from the order screen into the existing buyer–seller conversation, **so that** the buyer approves before I print — without touching the money path.
**Acceptance:** "Enviar prueba" attaches an image + an auto-generated restatement of **size + quantity + price** (the StickerJunkie-pitfall guard — a seller-proposed change must be explicit, never silent); buyer taps "Aprobar prueba" in chat; approval lands on the read-only order-ledger card (no in-chat money mutation, per house rule); the order screen shows "Prueba aprobada" state. Advisory only — does not server-gate shipping in v1.
**Risk:** MED

### Story 4.2 — Agent parity (UCP/MCP)
**As an** AI agent, **I want** the configurator products fully machine-readable, **so that** "pide 100 stickers de 7.5cm con este arte" works end-to-end (AGENTS rule #3).
**Acceptance:** UCP catalog exposes options, quantity tiers, and the file-field contract (required, formats, size cap); MCP checkout accepts variant + quantity + an artwork URL (server fetches/validates into R2 with the same preflight); manifest stays accurate.
**Risk:** MED

### Story 4.3 — "Volver a pedir"
**As a** buyer, **I want** one tap to reorder a fulfilled configurator order, **so that** repeat sticker runs (the core print-shop revenue pattern) are trivial.
**Acceptance:** re-adds the same variant + quantity + artwork to the cart; price re-resolves at **current** tiers (state this in the UI if it differs); works from the order detail page.
**Risk:** LOW

## Sprint QA
- **api spec(s):** 4.1 → proof-restatement builder spec (pure seam: size/qty/price always present); 4.2 → UCP catalog contract spec + MCP order-with-artwork spec; 4.3 → reorder payload spec
- **browser smoke owed:** yes, to Daniel — proof round-trip on a real device (seller sends → buyer approves → ledger updates), and one full MCP agent order with an artwork URL
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. As miyagiprints, open a paid configurator order in https://miyagisanchez.com/shop/manage/orders → "Enviar prueba" → attach an image.
   → The conversation gets the proof message with size + quantity + price restated automatically.
2. As the buyer (second browser), open the conversation → "Aprobar prueba".
   → The order-ledger card in chat and the order screens (both sides) show "Prueba aprobada" within a reload.
3. Connect a seller agent via the personal MCP URL (Configuración → Agentes) and ask it to read the sticker listing.
   → The agent sees options, tiers, and the artwork requirement.
4. (money/agent path) Have the agent place an order: 7.5cm × 25 + a hosted artwork URL, through MCP checkout.
   → Order lands with the correct tier price and the artwork attached; seller sees it like any web order.
5. As the buyer, open the fulfilled order → "Volver a pedir".
   → Cart contains the same variant/qty/artwork; total matches current tiers.

If any step fails, note the step number + what you saw — that's the bug report.
