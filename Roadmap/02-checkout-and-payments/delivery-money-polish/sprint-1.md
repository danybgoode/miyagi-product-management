# Sprint 1 — Two-sided refund state machine (off-platform-aware)

> Epic: [Delivery & Manual-Money Polish](README.md) · **Risk: HIGH — Daniel merges every story**
> (refunds / money path).
> **Status: ✅ SHIPPED — both PRs MERGED 2026-06-09; backend live.** Reviewed by a fresh agent
> (clean — no blockers; 3 frontend NITs fixed). **Backend PR #16 MERGED** (Cloud Build `129c58fc` SUCCESS →
> Cloud Run live). **Frontend PR #54 MERGED** (`3698fa0`), CI fully green. The refund lifecycle is now
> durable, two-sided, and honest: off-platform SPEI/cash refunds walk
> `solicitado → aceptado → transferencia_pendiente → confirmado` (the buyer's "Recibí el reembolso" is the
> close), while card/escrow refunds (which actually execute) auto-confirm. Extends the existing
> return-request `order.metadata` model; mirrors #3b's `lib/manual-payment-state.ts` via a new pure
> `lib/refund-state.ts`. **Branch `feat/delivery-money-polish` (both repos).**
>
> **Built commits** — Backend: S1.1 `52d1250` · S1.2 `1ec4b61` · S1.3 `f2c9a2a` (merged PR #16).
> Frontend: S1.1 `9644cdb` · S1.2 `b08ea68` · S1.3 `0e0fde8` · review `37e5c3e` · main-merge `4fb1762`
> (merged PR #54 → `3698fa0`).
> **Deterministic gate green:** `tsc --noEmit` (both repos) · `next build` ✓ · eslint (0 errors) ·
> Playwright `api` pure-logic 51 pass (`refund-state.spec.ts` 24 + `manual-payment-state` + `buyer-messages`).
> **Owed to Daniel:** the authed two-sided money-path browser smoke (steps below).

## Stories

### S1.1 — Persist a durable derived `refund_state`
**As** the system, **I want** the refund lifecycle persisted as one durable derived state
(`solicitado → aceptado → transferencia_pendiente → confirmado`, + `rechazado`; card rail auto-confirms),
**so that** buyer, seller, and agents read one source of truth instead of an overstated "refunded".
- New pure helper **`lib/refund-state.ts`** (derive + transition guards + es-MX copy), mapping the
  existing return-request statuses (`requested/seller_accepted/declined/refunded`) onto the derived
  states; backend `normalizeMedusaOrder` emits `refund_state` for both sides + the UCP/MCP order object.
- Model on `order.metadata` (Medusa-first; extend the return-request record — **no new table**).
- **Acceptance:** the state round-trips through `normalizeMedusaOrder` (emits `refund_state` + the raw
  `return_request`); an illegal transition for SPEI/cash (`aceptado → confirmado` skipping
  `transferencia_pendiente`) is rejected by the guard; a card refund maps straight to `confirmado` once
  `refundPaymentWorkflow` succeeds. ✅ **BUILT** (FE `9644cdb` / BE `52d1250`).
- **QA:** ✅ pure-logic spec `e2e/refund-state.spec.ts` (24 cases: derivation precedence, the rejected
  `aceptado → confirmado` jump, legacy `refunded_at` fallback, copy completeness; no auth/network). **Risk: HIGH.**

### S1.2 — Seller records an off-platform (SPEI/cash) transfer
**As** a seller, **I want** accepting a SPEI/cash refund to set "transferencia pendiente" (not "emitido"),
**so that** the buyer isn't told money arrived before I actually sent it.
- **(4-state model — Daniel's call 2026-06-08)** Seller accept on a SPEI/cash order → `aceptado` ("Reembolso
  aceptado", money NOT sent yet); a new **"Ya transferí"** action (`transfer_sent`) advances it to
  `transferencia_pendiente`. Card/escrow orders keep running `refundPaymentWorkflow` (or void) → `confirmado`
  in one shot. Copy never says "emitido"/"confirmado" until it's true; the card-only "aparecerá en tu cuenta
  en 5–10 días" email is **not** sent on a SPEI accept.
- Backend transition guards: 422 on illegal action; 409 when `transfer_sent` hits a non-off-platform / already
  -marked / wrong-state refund (reuses the return-request guard shape).
- **Acceptance:** accepting a SPEI/cash refund shows "Reembolso aceptado" with a "Ya transferí" button;
  pressing it shows "Transferencia pendiente"; a card refund shows "Reembolso confirmado" once the workflow
  succeeds. ✅ **BUILT** (FE `b08ea68` / BE `1ec4b61`).
- **QA:** ✅ api auth-gate spec on the seller transition (`refund-transition-api.spec.ts`); the 422/409
  round-trip is authed → the money-path browser smoke **owed to Daniel**. **Risk: HIGH.**

### S1.3 — Buyer confirms receipt
**As** a buyer, **I want** to confirm I received the refund, **so that** "Reembolso confirmado" reflects
reality, not just the seller's say-so.
- A "Recibí el reembolso" action moves `transferencia_pendiente → confirmado` (PATCH `confirm_receipt` on the
  buyer return-request route); both surfaces (`OrderDetail` seller view + `OrderTrackingClient` buyer view) +
  the agent order object read the shared `refund_state`. The seller is notified the refund closed.
- **Acceptance:** buyer confirm flips both sides to "Reembolso confirmado" and survives a hard reload.
  ✅ **BUILT** (FE `0e0fde8` / BE `f2c9a2a`).
- **QA:** ✅ api auth-gate spec on the buyer confirm endpoint (anonymous → 401); the authed ownership +
  round-trip is the browser smoke **owed to Daniel**. **Risk: HIGH.**

## Sprint QA — plan
- **Deterministic gate (green before merge — DONE):** `tsc --noEmit` (both repos) ✓ · `next build` ✓ ·
  eslint (0 errors) ✓ · Playwright `api` pure-logic 51 pass ✓.
- **New specs:** pure-logic `e2e/refund-state.spec.ts` (24 cases — the `lib/refund-state.ts` machine,
  derivation + the rejected `aceptado → confirmado` jump + legacy fallback + copy completeness) and
  `e2e/refund-transition-api.spec.ts` (seller `accept`/`transfer_sent` + buyer `confirm_receipt` reject
  anonymous → 401; runs vs the preview/prod in CI). The full authed 422/409 round-trip is money/auth-gated →
  the browser smoke below, owed to Daniel.
- **Deploy order:** **backend first or together** — the frontend reads `order.refund_state` /
  `order.return_request`, which only appear once the normalizer ships; both default-degrade
  (`refund_state ?? deriveRefundState(...)`, `?? 'none'`) so the ~12-min Cloud Run window never breaks prod.

## Sprint 1 — Smoke walkthrough (real order IDs filled at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Needs a real buyer + seller session on a live SPEI/cash order, delivered, with a return request —
money/auth path, OWED TO DANIEL. Backend (Cloud Run) must be deployed first (no preview for it).

--- Off-platform (SPEI/cash) ladder — the core of S1 ---
1. As the BUYER, open a delivered SPEI/cash order and request a return:
   https://miyagisanchez.com/account/orders/<order-id> → "Solicitar devolución" → pick a motivo → "Enviar solicitud".
   EXPECT: a return request is created; the seller is notified.
2. As the SELLER, open the same order: https://miyagisanchez.com/shop/manage/orders/<order-id>
   → "Ver solicitudes de devolución" → "✓ Reembolso total".
   EXPECT: a tracker shows "Reembolso aceptado" with a "💸 Ya transferí" button — NOT "emitido", NOT
   "Reembolso confirmado". (Honesty check: no "aparecerá en tu cuenta en 5–10 días" claim.)
3. As the SELLER, make the real SPEI/cash transfer to the buyer, then click "💸 Ya transferí".
   EXPECT: the tracker flips to "Transferencia pendiente — esperando que el comprador confirme".
4. As the BUYER, reload the order (hard refresh).
   EXPECT: a green "✓ Recibí el reembolso" button shows; the state reads "Transferencia pendiente".
5. As the BUYER, click "✓ Recibí el reembolso".
   EXPECT: both buyer AND seller now read "Reembolso confirmado"; survives a hard reload (state is durable on
   order.metadata). The seller is notified the refund closed.

--- Card control (auto-confirm, no transfer step) ---
6. On a CARD (Stripe/MP) order, as the SELLER accept a refund (buyer request or "Iniciar reembolso").
   EXPECT: it goes straight to "Reembolso confirmado" (refundPaymentWorkflow executed) — no "Ya transferí"
   step, and the buyer sees the issued refund.

--- Guard spot-checks (optional) ---
7. As the SELLER, on the order from step 2 (state "Reembolso aceptado"), there is no buyer-confirm path:
   the buyer cannot close it until you press "Ya transferí" (the aceptado → confirmado jump is rejected).
8. As the SELLER, on a CARD order, there is no "Ya transferí" button (transfer_sent is off-platform-only).

If any step fails, note the step number + exactly what you saw.
```
**Steps 1–8 are the money/refund path — owed to Daniel** (an automated browser smoke can't cover the real
SPEI transfer + the authed two-sided session).
