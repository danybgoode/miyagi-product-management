# Sprint 2 — Block ship before paid (UI + server)

> Epic: [Checkout & Manual-Payment State Hardening](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 🟡 Built — green gate, awaiting Daniel merge.** Goal: a seller physically cannot ship a
> manual order before confirming payment — enforced in the **API**, with the UI as the courtesy layer.
> Builds on S1's durable state.
>
> **PRs (draft, HIGH risk → Daniel merges):** backend `medusa-bonsai-backend#14` ·
> frontend `miyagisanchezcommerce#38`. **Deploy order:** backend gate first or together; the UI hides
> the affordance client-side so the lag window is safe. Rebase latest `main` before merge.

## Stories

### S2.1 — Seller ship affordance gated on payment ✅
**As** a seller, **I want** the shipping controls to be unavailable until I've confirmed payment on a
manual order, **so that** I can't accidentally ship before the funds land.
- `ShippingSection` now renders only when `paymentSettled`; an unpaid manual order shows the reason note "Esperando pago — confirma el depósito antes de enviar" with no ship/label controls. **Latent gap fixed:** it was gated only on `listing_type`, so the controls showed on unpaid manual orders. Reordered so the "Confirmar pago recibido" card precedes shipping.
- **Acceptance:** an unpaid manual order shows **no enabled** ship/label action; confirming payment reveals it. ✓
- **Done:** FE `72d3314` (`canSellerShip`/`SHIP_BLOCKED_*` helper + 4 pure-logic cases + OrderDetail). **Risk: HIGH.**

### S2.2 — Server-side ship gate (both backend mutations + frontend courtesy) ✅
**As** the platform, **I want** the ship APIs to reject manual orders that aren't paid, **so that** the
guarantee holds even if the UI is bypassed (the UI alone is not foolproof).
- The "ship" action has **two backend mutation points**, both gated → **422** "Aún no confirmas el pago de este pedido." for unpaid manual orders: `…/orders/[id]/ship/route.ts` (Envia) **and** `…/orders/[id]/route.ts` PATCH (`status: shipped|in_transit` — what the frontend `ship-manual` proxies to, the bypass-proof point). Frontend `ship-manual` adds a fail-fast courtesy 422; the Envia proxy surfaces the backend 422.
- Non-manual (card/MP, captured) and `processing`/`delivered`/`completed` transitions unaffected — gate keys on the manual payment method.
- **Acceptance:** a direct API ship call on an unpaid manual order returns 422; the same call after confirmation succeeds; card orders unaffected. ✓ (authoritative round-trip owed to Daniel — see smoke).
- **Done:** BE `9d2cc85` (ship + PATCH gates) · FE `e90faf7` (ship-manual courtesy + boundary spec). **Risk: HIGH.**

## Sprint QA — what ran (green)
- **Deterministic gate:** `tsc --noEmit` ✓ (both repos) · `next build` ✓ · Playwright `api` ✓ (128 passed, 1 pre-existing skip).
- **New specs:** 4 `canSellerShip` pure-logic cases in `manual-payment-state.spec.ts` (manual+unpaid → blocked; manual+confirmed → allowed; card/unknown → allowed; reason non-empty); `manual-ship-gate.spec.ts` asserts both ship endpoints reject anonymous callers (401 boundary).
- **Why not a deterministic 422→200 api spec:** the authoritative round-trip needs a real seller session + a seeded manual order (money/auth-gated) → browser smoke owed to Daniel. The gate's brain (`canSellerShip`) is unit-covered; the auth boundary is api-covered.
- **Deploy order:** backend gates first or together; the UI hides the affordance client-side so the ~12-min Cloud Run lag window is safe.

## Sprint 2 — Smoke walkthrough (production)
Env: PR Vercel preview (pre-merge, SSO-gated) → production `https://miyagisanchez.com` after merge.
Backend has no preview — its gates are confirmed **post-merge** against prod (~12 min after merge).
Steps 1–2, 4–5 are the **money/auth path** (real seller session + manual & card orders) — **owed to Daniel**.

```
1. As the SELLER, open an unpaid manual (SPEI/DiMo/cash) physical-product order:
   https://miyagisanchez.com/shop/manage/orders/<order-id>
   → No shipping/label controls. A "🔒 Esperando pago — confirma el depósito antes de enviar" note
     shows where shipping would be; the "Confirmar pago recibido" card is above it.
2. Click "✓ Confirmar pago recibido".
   → The shipping section (weight inputs + "Generar etiqueta" + manual-carrier) now appears.
3. (API — agent/Daniel with a seller token) POST the order's ship BEFORE confirming payment on a fresh
   unpaid manual order — e.g. POST /api/orders/<order-id>/ship-manual {carrier, trackingNumber}.
   → 422 "Aún no confirmas el pago de este pedido." — no shipment created.
4. Repeat the POST after confirming payment.
   → 200, the order moves to shipped / a label or tracking is recorded.
5. Place + pay a CARD order, then ship it.
   → Ships normally — no regression for already-captured payments.

If any step fails, note the step number + exactly what you saw.
```
The anonymous 401 boundary on both ship endpoints is covered by `manual-ship-gate.spec.ts`; step 3's
422 (and the card no-regression) are the **money/auth path owed to Daniel** (need a real seller token).
