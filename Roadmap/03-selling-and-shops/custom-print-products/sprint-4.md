# Custom print products — Sprint 4: Lightweight proof, agent parity + reorder

**Status:** ✅ merged — all 3 stories live in production.
Frontend PR [#177](https://github.com/danybgoode/miyagisanchezcommerce/pull/177) ("Sprint 3+4") merged 2026-07-07 · backend PR [#63](https://github.com/danybgoode/medusa-bonsai-backend/pull/63) merged 2026-07-07.
Two same-day hardening PRs from cross-review also merged: backend [#64](https://github.com/danybgoode/medusa-bonsai-backend/pull/64) (seller-ownership auth-bypass fix) · frontend [#181](https://github.com/danybgoode/miyagisanchezcommerce/pull/181) (MCP `isError` propagation). Backend Cloud Run deploy confirmed live (new route responds correctly, not 404).
Owed to Daniel: real-device proof round-trip + one full MCP agent order with real artwork (see walkthrough below) + `configurator.enabled` flag flip decision.

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
- **api specs (all green):**
  - 4.1 → `src/lib/__tests__/proof-restatement.unit.spec.ts` (backend, 5 specs — `deriveProofRestatement` always derives size/qty/price from the order's own line item, never a caller)
  - 4.2 → `e2e/mcp-configured-checkout.spec.ts` (frontend, 4 specs — `create_checkout`'s new schema + branching against the live MCP JSON-RPC endpoint)
  - 4.3 → `e2e/reorder.spec.ts` (frontend, 10 specs — `resolveReorderTarget`/`buildReorderCheckoutPath`/`reorderPriceChangeNote`, the pure reorder seam)
- **deterministic gate:** `tsc --noEmit` + `npm run build`/`medusa build` + Playwright `api` (frontend) / `test:unit` (backend) — all green, confirmed both locally and in CI against the real Vercel preview (PR #177: 1431 passed, 2 pre-existing/unrelated failures, 13 skipped; PR #63: 22 suites, 185 tests).
- **cross-agent review (Codex, both PRs) caught real findings, all fixed:** frontend — two DB writes whose errors were silently swallowed (proof-approve, proof-send), `ProofApproveButton` not checking fetch status, and `medusa_order_id` staying pinned to a conversation's FIRST order (would show the wrong order's state once "Volver a pedir" creates a second order for the same listing). Backend — a seller-ownership check that was skippable entirely when an order's items had no resolvable `product_id` (auth bypass), now rejected outright.
- **browser smoke owed:** yes, to Daniel — proof round-trip on a real device (seller sends → buyer approves → ledger updates), and one full MCP agent order with a real artwork URL. This local dev environment has no configurator product seeded, so only the tool's validation/branching paths — not a real successful checkout — could be verified here.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: preview (pre-merge) · https://miyagisanchez-git-feat-custom-print-c4b507-danybgoodes-projects.vercel.app
Once merged, re-run against production · https://miyagisanchez.com

1. As miyagiprints, open a paid configurator order in `/shop/manage/orders` → "Enviar prueba" → attach an image.
   → The conversation gets the proof message with size + quantity + price restated automatically; the order screen shows "Esperando aprobación".
2. As the buyer (second browser/session), open the conversation → "Aprobar prueba".
   → The proof bubble shows "✓ Aprobada"; the order-ledger card in chat and both order screens show "Prueba aprobada" within a reload.
3. Connect a seller agent via the personal MCP URL (Configuración → Agentes) and ask it to read the sticker listing (`get_listing`).
   → The agent's response spells out each variant's `variant_id` + tier prices, and the artwork requirement (required/formats/size cap) if the listing has one.
4. (money/agent path) Have the agent place an order via `create_checkout` with `variant_id` + `quantity: 25` + a hosted `artwork_url`.
   → Order lands with the correct tier price and the artwork attached (re-fetched + validated server-side, never the raw external URL); seller sees it like any web order.
5. As the buyer, open the fulfilled (delivered) order → "Volver a pedir".
   → Cart contains the same variant/qty/artwork; total matches current tiers (a "Precio actualizado" note appears if the tier price changed since the original order).

If any step fails, note the step number + what you saw — that's the bug report.
