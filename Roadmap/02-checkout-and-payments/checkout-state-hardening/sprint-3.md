# Sprint 3 — One total + trust polish

> Epic: [Checkout & Manual-Payment State Hardening](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: ✅ SHIPPED to prod 2026-06-07** (Daniel-merged). The price never changes between summary and
> pay button, the buyer sees how they'll pay before committing, a stalled online payment shows recovery
> (not false success), and refund language is honest. Frontend-only.
>
> **Merged (HIGH risk, Daniel green-lit):** frontend `miyagisanchezcommerce#39` (`481be07`) → Vercel prod.
> Post-merge prod api smoke green (135). **Owed to Daniel:** the steps 4–5 money/auth browser smoke.

## Stories

### S3.1 — One coupon-aware total, summary = CTA ✅
**As** a buyer, **I want** the pay-button total to equal the summary total, **so that** the price never
appears to change at the moment I commit.
- New **`lib/checkout-total.ts`** `computeCheckoutTotal` (items − coupon + shipping, floored at 0; items already bundle-priced) called by BOTH the summary "Total" and `CheckoutPayButton` (new `couponDiscountCents` prop replaced the button's local `amountCents + shipping`, which ignored the coupon).
- **Acceptance:** apply a coupon → the summary total and the pay-button total show the **same** number; remove → both update; shipping included. ✓
- **Done:** `a7b1700` (helper + both call sites + 5 pure-logic cases). **Risk: HIGH.**

### S3.2 — Manual-payment instructions preview before placement ✅
**As** a buyer paying manually, **I want** to see which methods are available (and a preview of the
instructions) **before** I place the order, **so that** I'm not committing blind.
- Replaced the "Verás las instrucciones…" cliff with a structured per-method preview (icon + label + note from `checkout-options` sub_options); exact account numbers (CLABE/phone) still appear on the order page post-placement (masked here). No new lookup.
- **Acceptance:** before placing a manual order, the buyer sees the accepted manual methods + a preview; placing still works. ✓
- **Done:** `db3e1f9`. **Risk: HIGH.**

### S3.3 — Async-success recovery, not false success ✅
**As** a buyer whose online payment is still settling, **I want** a recovery state instead of a
premature "success," **so that** I'm never told an order succeeded when it didn't.
- When `completeMedusaCart` returns no order, `payment/success` renders `PaymentPendingRecovery` ("Estamos confirmando tu pedido" + "Revisar de nuevo" retry + "Ver mis pedidos") instead of `<SuccessUI>`. Retry re-runs the idempotent completion; prefetch disabled so a hover can't re-trigger it.
- **Acceptance:** the null-completion branch renders the recovery UI (not a success screen); a normal completion still shows success. ✓
- **Done:** `55b5f73`. **Risk: HIGH.**

### S3.4 — Honest refund language (copy-only) ✅
**As** a seller, **I want** SPEI/cash refund status to say what actually happened, **so that** "issued"
never implies an off-platform transfer already left my account.
- SPEI/cash refunds read "Reembolso registrado — transferencia pendiente" (+ a "send the transfer" note); card/MP keep "emitido". Centralized in `refundConfirmationToast`/`refundIssuedBanner` (`lib/manual-payment-state`). Full assisted-refund state machine stays #3c.
- **Acceptance:** no SPEI/cash refund reads "emitido" before the transfer is confirmed. ✓
- **Done:** `45f403c`. **Risk: HIGH** (money-path epic; copy-only).

## Sprint QA — what ran (green)
- **Deterministic gate:** `tsc --noEmit` ✓ · `next build` ✓ · Playwright `api` ✓ (135 passed, 1 pre-existing skip).
- **New specs:** `e2e/checkout-total.spec.ts` (5 cases — coupon, shipping, clamp-at-0, parity) proves the summary and CTA compute identically; +2 refund-copy cases in `manual-payment-state.spec.ts` (manual never "emitido"; card keeps "emitido").
- **Why parity needs no browser spec:** both the summary and the CTA call the one `computeCheckoutTotal`, so the pure-logic spec is the parity proof. S3.2 preview / S3.3 recovery / S3.4 banner are rendered/authed → browser smoke owed to Daniel.

## Sprint 3 — Smoke walkthrough (production)
Env: PR Vercel preview (pre-merge, SSO-gated) → production `https://miyagisanchez.com` after merge.
Steps 4–5 are the **money/auth path** (real card payment + seller refund) — **owed to Daniel**.

```
1. Add an item to the cart and open checkout at https://miyagisanchez.com/checkout
   → The summary "Total" and the pay-button total match.
2. Apply a valid seller coupon code.
   → BOTH the summary total and the pay-button total drop by the discount and show the SAME number.   ← the core fix
   (Remove it → both go back up together.)
3. Choose a manual (SPEI/DiMo/cash) method.
   → You see each accepted manual method (icon + how it works) BEFORE placing — with a note that the
     exact CLABE/phone appear on your order right after confirming.
4. (money/auth — owed to Daniel) Pay a CARD order; if completion is still settling,
   → You see "Estamos confirmando tu pedido" with "Revisar de nuevo" + a link to /account/orders
     (NOT a false success). A normal completion still shows the success screen.
5. (money/auth — owed to Daniel) As a seller, register a SPEI/cash refund.
   → It reads "Reembolso registrado — transferencia pendiente", NOT "Reembolso emitido".

If any step fails, note the step number + exactly what you saw.
```
The coupon parity (steps 1–2) is also proven deterministically by `checkout-total.spec.ts`; steps 4–5
are the money/auth path owed to Daniel.
