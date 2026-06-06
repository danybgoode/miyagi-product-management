# 02 · Checkout & Payments — Refresh (2026-06)

**Depth: DEEP** (drives #3b). Pinned: frontend `origin/main@ed447bd`, backend `origin/main@0980253`.
Re-read read-only via `git show origin/main:<path>`. No files modified.

## Reproduction status of v1 findings

| # | v1 finding | Status | Current anchor |
|---|---|---|---|
| 1 | Manual-payment lifecycle not durable — buyer "Ya hice el pago" only sets local button state + Telegram, no persisted `buyer_reported_paid`; middle state lost on reload | **STILL LIVE (P0)** | `app/api/orders/[id]/report-payment/route.ts:23` — still `tgNotify(...)` + `{ok:true}`, no persistence. `buyer_reported_paid` appears **nowhere** in the codebase. |
| 2 | Seller next action ambiguous — inbox shows "Listo para enviar" on a pending-payment order | **STILL LIVE (P1)** | `app/shop/manage/orders/OrdersInbox.tsx:149` — `order.status === 'paid' ? 'Confirma y prepara el envío' : 'Listo para enviar'`; `pending_payment` falls into the "Listo para enviar" branch (and is `urgent` via `needsAction`, line 81). |
| 3 | Seller detail allows shipping before manual payment — shipping block renders before/independent of confirmation, not gated by payment state | **STILL LIVE (P0)** | `app/shop/manage/orders/[id]/OrderDetail.tsx:827` — `ShippingSection` gated **only** by `listing?.listing_type === 'product'`, rendered *before* the confirm-payment card (`:839`). |
| 4 | Manual payment trust cliff — buyer commits before seeing CLABE/DiMo/cash details | **STILL LIVE (P1)** | `app/checkout/CheckoutExperience.tsx:551` — "Verás las instrucciones de pago al confirmar tu pedido." |
| 5 | Discounted totals conflict — summary applies coupon, pay CTA ignores it | **STILL LIVE (P0)** | `CheckoutExperience.tsx:222` computes coupon-aware `totalCents` (shown `:662`) but passes pre-coupon `amountCents` (`:673`) to `CheckoutPayButton`, which renders its own `total = amountCents + shipping` (`CheckoutPayButton.tsx:73`, `:136`) — **two different totals on one screen**. |
| 6 | Online success too certain during async lag — `/payment/success` renders success even when cart completion returns null | **STILL LIVE (P1)** | `app/payment/success/page.tsx:91-92` — `completeMedusaCart` can return `null` (`:32,:35`); code proceeds to `<SuccessUI orderNumber={null} …>` (`:134`) with no order-specific recovery path. |
| 7 | Deterministic input incomplete — pickup scheduling is an external link, not a reserved slot | **STILL LIVE (P2)** | unchanged; feeds #3c, not #3b. |

**Net: 0 fixed, 0 materially changed, 7 still-live.** The three P0s the build order names for #3b
(rows 1, 3, 5) all reproduce verbatim on current `main`.

## Reuse hooks discovered (shrink #3b)
- **The exact gating predicate already exists.** `OrderDetail.tsx:709` computes
  `const paymentSettled = !isSpeiOrder || paymentReceived` — but it is wired only to
  `canInitiateRefund` (`:710`). Gating `ShippingSection` (`:827`) and the cosmetic-only `canShip`
  (`:703`, used at `:1164` for an "AI tip") on `paymentSettled` is a small, low-blast-radius change.
- **A durable "reported-paid" pattern already ships — for print.** `app/api/print/submissions/[id]/payment-reported/route.ts:35` persists `payment_reported: true, payment_reported_at` (Supabase). The marketplace manual-order path can mirror this (Medusa-first: a flag on `order.metadata`, per LEARNINGS "Medusa-first / read the model first").

## Net-new findings (post-audit surfaces)
- **Support widget guest checkout — NO new manual-payment risk (positive).** `app/api/embed/support/checkout/route.ts:85` accepts **only** `stripe` | `mercadopago` (protected rails; `providerAvailable` `:46`), with amount validation (`validateSupportContribution`, `:100`). It never enters the manual SPEI/cash state machine, so it does **not** inherit the durability/ship-gating P0s. *(One shared exposure: if it routes through `/payment/success`, it shares finding #6's async-success-recovery gap — verify when #3b touches that page.)*
- **Custom-domain checkout — money path is sound.** `app/payment/success/page.tsx:94-110` returns the buyer to a **verified** tenant domain only (`isVerifiedCustomDomain`, `:104`; no redirect built from forged metadata). No new money-path P0; consistent with the v1 model.
- **Personalized line items in checkout — no money-path regression.** Personalization rides line-item metadata (`lib/personalization.ts`); totals/coupon logic are unchanged by it. (Its own checkout-display nuances are a 03/01 concern, not a 02 P0.)

## Prioritized action plan (refreshed — feeds #3b)
1. **Persist the manual-payment state machine** `pending_payment → buyer_reported_paid → payment_confirmed → processing` on `order.metadata` (Medusa-first). Make `report-payment` write `buyer_reported_paid` (mirror the print `payment_reported` pattern) — not just Telegram. *(P0, fixes #1.)*
2. **Gate shipping on payment** everywhere: reuse `paymentSettled` to hide/disable `ShippingSection`; gate the backend `ship` + `ship-manual` routes with a `payment_received` check (422 "awaiting funds"). *(P0, fixes #3; ties to 03.)*
3. **One total, coupon-aware, everywhere.** Pass the computed discounted total (or the discount) into `CheckoutPayButton` so the CTA and summary always agree. *(P0, fixes #5 — trivial, highest trust-per-line-of-code.)*
4. Make "who acts next" explicit (buyer/seller copy keyed to the new states); fix the inbox "Listo para enviar" on unpaid orders. *(P1, fixes #2.)*
5. Preview manual-payment instructions **before** order placement (masked CLABE/DiMo/cash). *(P1, fixes #4.)*
6. Add an async-success recovery state ("Estamos confirmando tu pedido", retry, stable path to `/account/orders`). *(P1, fixes #6.)*
