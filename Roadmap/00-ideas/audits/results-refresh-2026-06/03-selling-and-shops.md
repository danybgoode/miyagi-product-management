# 03 · Selling & Shops — Refresh (2026-06)

**Depth: DEEP** (drives #3b). Pinned: frontend `origin/main@ed447bd`, backend `origin/main@0980253`.
Re-read read-only via `git show origin/main:<path>`. No files modified.

## Reproduction status of v1 findings

| v1 finding | Status | Current anchor |
|---|---|---|
| **P0:** Manual-payment orders not foolproof — `pending_payment/paid/processing` all read as action-needed; pending order can read "Listo para enviar"; shipping section before "Confirmar pago recibido" | **STILL LIVE (P0)** | `OrdersInbox.tsx:81,149`; `OrderDetail.tsx:827` (shipping) precedes `:839` (confirm-payment). Same defect as 02-#2/#3. |
| **P0:** Backend state model reinforces the risk — confirm-payment is separate, but seller shipping/status updates don't gate against unpaid manual orders | **STILL LIVE (P0)** | `ship/route.ts` guards only already-shipped (`:86`), missing-rate (`:92`), missing-address (`:100`), missing-origin (`:125`) — **no `payment_received` gate**. `ship-manual` route (frontend `app/api/orders/[id]/ship-manual/route.ts`) transitions → shipped with no payment check either. |
| **P1:** Abandoned-shop empty state under-guided (no first-run "finish your first listing" checklist) | **STILL LIVE (P1)** | unchanged; feeds onboarding polish, not #3b. |
| **P1:** Listing builder is one dense generic form; editing lacks parity (no photo replacement) | **STILL LIVE (P1)** | unchanged; feeds #3c. |
| **P1:** Promotions are raw code CRUD, campaign-light | **STILL LIVE (P1)** | unchanged; coupons shipped but no campaign layer. Feeds #3c/#6. |
| **P2:** Referrals structurally separate from seller retention | **STILL LIVE (P2)** | unchanged. |

**Net: all still-live.** Manual-payment state clarity remains the dominant 03 risk — and it is the
same defect as 02. **#3b is the joint fix for the 02 + 03 P0s.**

## Net-new findings (post-audit surfaces)
- **Personalized products on the seller order screen — shipped, no money-path regression.** Custom-field input echoes onto the order line item and the seller order view (per the 2026-06-05 epic). It does not interact with payment/fulfillment gating, so it neither adds nor fixes a #3b P0. *(Note for #3b: the new manual-payment status banners must continue to render alongside the personalization block — keep them independent.)*
- **Subdomain / custom-domain identity surface (03 settings)** — minor; addressing/identity only, no order-state impact. No new finding.

## Reuse hook (shared with 02)
The fix surface is **one state model used by both buyer and seller surfaces** plus a backend gate
on both ship routes. The frontend already computes `paymentSettled` (`OrderDetail.tsx:709`) — reuse
it for the seller's shipping affordance; add the symmetric server-side guard so the API is the real
gate (UI alone is not foolproof).

## Prioritized recommendations (refreshed — feeds #3b)
1. Make manual payments a **hard, visible state machine**: "Esperando pago" blocks "Prepara entrega" — shipping/fulfillment actions unavailable (UI + API) until `payment_confirmed`. *(P0 — joint with 02.)*
2. Backend: gate `ship` + `ship-manual` (+ status→shipped transitions) on `payment_received` for manual orders; return a clear 422. *(P0.)*
3. Fix the inbox/detail "who acts next" copy so an unpaid order never says "Listo para enviar". *(P1.)*
4. *(Deferred to #3c):* first-run seller checklist; type-first listing builder; promotions hub; referrals in a seller growth hub.
