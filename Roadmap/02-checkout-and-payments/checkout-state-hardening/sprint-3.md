# Sprint 3 — One total + trust polish

> Epic: [Checkout & Manual-Payment State Hardening](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned.** Goal: the price never changes between summary and pay button, the buyer
> sees how they'll pay before committing, a stalled online payment shows recovery (not false success),
> and refund language is honest. Mostly frontend.

## Stories

### S3.1 — One coupon-aware total, summary = CTA
**As** a buyer, **I want** the pay-button total to equal the summary total, **so that** the price never
appears to change at the moment I commit.
- Extract **`lib/checkout-total.ts`** (items − coupon − bundle discount + shipping) from `CheckoutExperience.tsx:222`; feed the computed total into `CheckoutPayButton` and drop its local `amountCents + shipping` (`:73`).
- **Acceptance:** apply a coupon → the summary total and the pay-button total show the **same** number; remove it → both update together; bundle + shipping included.
- **Risk: HIGH.**

### S3.2 — Manual-payment instructions preview before placement
**As** a buyer paying manually, **I want** to see which methods are available (and a preview of the
instructions) **before** I place the order, **so that** I'm not committing blind.
- Replace the "Verás las instrucciones de pago al confirmar tu pedido" cliff (`CheckoutExperience.tsx:551`) with masked/structured SPEI/DiMo/cash availability, reusing `checkout-options` (no new lookup).
- **Acceptance:** before placing a manual order, the buyer sees the accepted manual methods + a preview; placing still works.
- **Risk: HIGH.**

### S3.3 — Async-success recovery, not false success
**As** a buyer whose online payment is still settling, **I want** a recovery state instead of a
premature "success," **so that** I'm never told an order succeeded when it didn't.
- When `completeMedusaCart` returns null (`payment/success/page.tsx:91`), render "Estamos confirmando tu pedido" + retry/check-status + a stable path to `/account/orders` instead of `<SuccessUI>`.
- **Acceptance:** the null-completion branch renders the recovery UI (not a success screen); a normal completion still shows success.
- **Risk: HIGH.**

### S3.4 — Honest refund language (copy-only)
**As** a seller, **I want** SPEI/cash refund status to say what actually happened, **so that** "issued"
never implies an off-platform transfer already left my account.
- "Reembolso registrado / Transferencia pendiente" until confirmed, instead of "Reembolso emitido" (`OrderDetail.tsx:659,1079`). Copy-only; the full assisted-refund state machine is #3c.
- **Acceptance:** no SPEI/cash refund reads "emitido" before the transfer is confirmed.
- **Risk: HIGH** (money-path epic; copy-only).

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `next build` + Playwright `api` green before merge.
- **New specs:** pure-logic spec on `lib/checkout-total.ts` (coupon + bundle + shipping math — free coverage); unit/api spec on the `/payment/success` null-completion branch; string assertion for the refund-language fix. S3.2 preview gets a `*.browser.spec.ts` rendered-state check (works anonymously).
- **Browser smoke (owed to Daniel):** apply-coupon parity (anonymous browser spec can assert it); the live manual-method preview + the real stalled-payment recovery are **money/auth path owed to Daniel**.

## Sprint 3 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.

```
1. Add an item to the cart and open checkout at https://miyagisanchez.com/checkout
   → Summary total and the pay-button total match.
2. Apply a valid seller coupon code.
   → BOTH the summary total and the pay-button total drop by the discount and show the SAME number.   ← the core fix
3. Choose a manual (SPEI/cash) method.
   → You see which manual methods are accepted + an instructions preview BEFORE placing the order.
4. (money/auth — owed to Daniel) Pay a CARD order; if completion is still settling,
   → You see "Estamos confirmando tu pedido" with retry + a link to /account/orders (not a false success).
5. (money/auth — owed to Daniel) As a seller, register a SPEI/cash refund.
   → It reads "Reembolso registrado / Transferencia pendiente", NOT "Reembolso emitido".

If any step fails, note the step number + what you saw.
```
Steps 4–5 are the **money/auth path** — owed to Daniel; steps 1–3 the agent can largely cover via browser specs.
