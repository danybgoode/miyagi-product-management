# Checkout Remediation Plan

Area: Dev
Priority: P0
Status: In progress (Session A)
Owner: Daniel
Created: 2026-05-28

Companion to **[checkout experience](checkout%20experience%2036efe1a5f19280e79d17c41648833d86.md)**. This is the engineering remediation track derived from a full audit of the payment/order lifecycle. North stars: Vinted / Etsy (platform-mediated payment + buyer protection).

---

## Audit summary — how it actually runs

```
PDP BuyButton / MercadoPagoButton ─┐
/checkout CheckoutPayButton        ─┴─► lib/cart.startCheckout()
  → POST /store/carts/:id/start-checkout   [Stripe Session OR MP Preference + Medusa PaymentSession]
  → redirect to provider hosted page
  → /payment/success?cart_id=...           [calls /complete → Medusa Order]
      └─ in parallel: provider webhook → /api/webhooks/{stripe,mercadopago}
           → (MP) mp-authorize → /complete (idempotent)
           → INSERT marketplace_orders (Supabase mirror = app read model)
           → emails + Telegram + UCP webhook + markListingPurchased
```

The shape is sound (Medusa cart→order is the spine). The defects are at the edges.

### Findings (ranked)

- **P0 — MercadoPago money never reaches the seller.** `start-checkout` builds the MP preference with the *platform* `MP_ACCESS_TOKEN`, no `marketplace_fee`/split/collector. Funds land in the platform account; no transfer-to-seller exists for one-time MP sales (`transferToSeller` only runs for Stripe subscription invoices). Stripe is the opposite (`transfer_data.destination` → seller). → Fixed by **Session B** (MP OAuth/Marketplace).
- **P0 — Order creation depends on the client redirect.** Medusa's own backend webhook only *authorizes the payment session*; it does not complete the cart into an order. Completion happens on the success page and the *frontend* webhook. If the buyer abandons the redirect tab AND the frontend webhook misfires/misconfigured, payment succeeds but no order is created. → Fixed by **Session A**.
- **P1 — Dual order store with a fragile mirror.** App UIs, `order-autoconfirm`, ship-manual, and returns read Supabase `marketplace_orders`, written *only* by frontend webhooks, no idempotency guard on the Medusa-flow insert. Webhook miss → Medusa order exists, mirror missing → order invisible in app. Violates AGENTS.md rule #1. → Hardened in **Session A**, consolidated in **Session D**.
- **P1 — Returns don't refund.** `/api/orders/[id]/return-request` is pure Supabase; not wired to Medusa's Return module and never calls the providers' `refundPayment` (which exist: Stripe `reverse_transfer: true`, MP `/refunds`). Refunds are manual dashboard actions today. → Fixed by **Session D**.
- **P2 — Best-effort degradations hide failures.** `start-checkout` returned `redirect_url` even when the Medusa PaymentSession creation threw; seller PATCH can return "shipped" with no fulfillment created; inconsistent currency casing. → `start-checkout` fixed in **Session A**.
- **P2 — Orphaned code + stale docs.** Legacy `/api/stripe/checkout` + `/api/mp/checkout` are no longer triggered by any button (both use `startCheckout`); webhook handlers still carry legacy branches; `payments.md` documents the legacy path as current. → Cleaned in **Session D**.
- **P2 — Escrow is cosmetic.** `escrow_mode` stored but never enforced; no Stripe manual capture, no fund hold. `order-autoconfirm` flips a Supabase status but holds/releases no money. → Fixed by **Session C**.

---

## Sessions

### Session A — Make order creation bulletproof  ⟵ current
1. [ ] Reconciliation cron: detect carts paid at the provider but never completed → complete them + backfill the Supabase mirror.
   - Backend `POST /store/carts/scan-incomplete` (internal-secret): finds incomplete carts with a paid Stripe session / approved MP payment, patches the Medusa payment session, returns the ready list.
   - Frontend `GET /api/cron/reconcile-checkouts` (CRON_SECRET): calls scan, completes each via the existing `/complete`, upserts the mirror, Telegram alert.
   - `vercel.json` cron schedule.
2. [ ] Idempotency: extract a shared `upsertOrderMirror()` (idempotent on `metadata.medusa_order_id`); both webhooks + the cron use it. Kills duplicate mirror rows on webhook retries.
3. [ ] Fail loudly: `start-checkout` returns an error (not a redirect) when the Medusa PaymentSession isn't created — never take money we can't reconcile.

### Session B — MercadoPago payouts via OAuth/Marketplace  (P0)
- Verify the MP primitive first (OAuth + Marketplace split payments, the MP analog of Stripe Connect — NOT the MCP server). Seller authorizes platform; preferences created on-behalf-of with `marketplace_fee`; funds route to seller's MP account.
- Mirror the Stripe Connect onboarding pattern under `metadata.settings.mercadopago`.

### Session C — Real escrow / Compra Protegida  (P1)
- Stripe: `capture_method: 'manual'` (auth at checkout, capture on buyer confirmation / auto-confirm). Wire `escrow_mode` to gate it; `order-autoconfirm` becomes the real release trigger.
- Decide MP escrow story (true holds are hard on MP — likely platform-collected + delayed release, or a managed dispute window). Depends on Session B.

### Session D — Returns → real refunds + consolidate the order store  (P1)
- Wire return approval to Medusa's Return module + call provider `refundPayment` (reverse the Connect transfer on Stripe; MP `/refunds`).
- Make Medusa the single order read model; reduce/retire `marketplace_orders`. Delete orphaned legacy checkout routes; fix `payments.md`.

### After C: Manual payment methods (the original ask)
Once escrow + a pending-payment state exist, turn SPEI/OXXO/cash from display-only cards into real pending orders — ideally routed through MercadoPago so they auto-verify via webhook and stay inside Compra Protegida.

---

## Env vars touched
- `MEDUSA_INTERNAL_SECRET` — already used by `/store/subscriptions`; reused for `scan-incomplete`.
- `CRON_SECRET` — already used by `order-autoconfirm`; reused for `reconcile-checkouts`.

## Repos (autodeploy)
- Frontend: `danybgoode/miyagisanchezcommerce` → Vercel (main)
- Backend: `danybgoode/medusa-bonsai-backend` → Render (main)
</content>
