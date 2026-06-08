# Sprint 1 — Two-sided refund state machine (off-platform-aware)

> Epic: [Delivery & Manual-Money Polish](README.md) · **Risk: HIGH — Daniel merges every story**
> (refunds / money path).
> **Status: 📋 PLANNED — not started.** Goal: the refund lifecycle is durable, two-sided, and honest —
> for off-platform SPEI/cash refunds the UI tracks "registrado → transferencia pendiente → confirmado"
> (the buyer's "recibí" is the close), while card refunds (which actually execute) auto-confirm.
> Extends the existing return-request `order.metadata` model; mirrors #3b's `lib/manual-payment-state.ts`.

## Stories

### S1.1 — Persist a durable derived `refund_state`
**As** the system, **I want** the refund lifecycle persisted as one durable derived state
(`solicitado → aceptado → transferencia_pendiente → confirmado`, + `rechazado`; card rail auto-confirms),
**so that** buyer, seller, and agents read one source of truth instead of an overstated "refunded".
- New pure helper **`lib/refund-state.ts`** (derive + transition guards + es-MX copy), mapping the
  existing return-request statuses (`requested/seller_accepted/declined/refunded`) onto the derived
  states; backend `normalizeMedusaOrder` emits `refund_state` for both sides + the UCP/MCP order object.
- Model on `order.metadata` (Medusa-first; extend the return-request record — **no new table**).
- **Acceptance:** the state round-trips through `normalizeMedusaOrder`; an illegal transition for SPEI/cash
  (`aceptado → confirmado` skipping `transferencia_pendiente`) is rejected by the guard; a card refund maps
  straight to `confirmado` once `refundPaymentWorkflow` succeeds.
- **QA:** pure-logic spec on `lib/refund-state.ts` (derivation precedence + transition table incl. the
  rejected jump + copy completeness; no auth/network). **Risk: HIGH.**

### S1.2 — Seller records an off-platform (SPEI/cash) transfer
**As** a seller, **I want** accepting a SPEI/cash refund to set "transferencia pendiente" (not "emitido"),
**so that** the buyer isn't told money arrived before I actually sent it.
- Seller accept on a SPEI/cash order → `transferencia_pendiente` (+ a "ya transferí" action to advance);
  card orders keep running `refundPaymentWorkflow` → `confirmado`. Copy never says "emitido" until `confirmado`.
- Backend transition guards: 422 on illegal action, 409 on already-confirmed/declined (reuse the existing
  return-request guard shape).
- **Acceptance:** accepting a SPEI/cash refund shows "Transferencia pendiente"; a card refund shows
  "Reembolso confirmado" once the workflow succeeds.
- **QA:** api spec on the backend transition (422/409 boundaries). Authed money-path browser smoke
  **owed to Daniel**. **Risk: HIGH.**

### S1.3 — Buyer confirms receipt
**As** a buyer, **I want** to confirm I received the refund, **so that** "Reembolso confirmado" reflects
reality, not just the seller's say-so.
- A "Recibí el reembolso" action moves `transferencia_pendiente → confirmado`; both surfaces
  (`OrderDetail` seller view + the buyer order view) + the agent order object read the shared state.
- **Acceptance:** buyer confirm flips both sides to "Reembolso confirmado" and survives a hard reload.
- **QA:** api spec on the buyer confirm endpoint (auth + ownership; anonymous → 401). Authed browser
  smoke **owed to Daniel**. **Risk: HIGH.**

## Sprint QA — plan
- **Deterministic gate (green before merge):** `tsc --noEmit` (both repos) · `next build` · Playwright `api`.
- **New specs:** pure-logic `e2e/refund-state.spec.ts` (the `lib/refund-state.ts` machine); api specs on
  the seller transition + buyer confirm endpoints (auth/guard boundaries). Full two-sided round-trip is
  money/auth-gated → the browser smoke below, owed to Daniel.
- **Deploy order:** backend (extend route + normalizer) first or together; frontend reads degrade
  gracefully (`refund_state ?? 'none'`) across the ~12-min Cloud Run window.

## Sprint 1 — Smoke walkthrough (fill in real order IDs at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Needs a real buyer + seller session on a live SPEI/cash order with a return request — money/auth path,
OWED TO DANIEL.

1. As the BUYER, open a delivered SPEI/cash order and request a return:
   https://miyagisanchez.com/account/orders/<order-id>
   → A return request is created; status reads "Solicitado".
2. As the SELLER, open the same order: https://miyagisanchez.com/shop/manage/orders/<order-id>
   → "Aceptar reembolso" is available; accepting shows "Transferencia pendiente" (NOT "emitido").
3. As the SELLER, click "Ya transferí".
   → State stays "Transferencia pendiente — esperando confirmación del comprador".
4. As the BUYER, reload the order.
   → A "Recibí el reembolso" button shows; the state is "Transferencia pendiente".
5. As the BUYER, click "Recibí el reembolso".
   → Both buyer and seller now read "Reembolso confirmado"; survives a hard reload.
6. (card control) On a CARD order, accept a refund.
   → It goes straight to "Reembolso confirmado" (the Stripe workflow executed) — no transfer step.

If any step fails, note the step number + exactly what you saw.
```
**Steps 1–6 are the money/refund path — owed to Daniel.**
