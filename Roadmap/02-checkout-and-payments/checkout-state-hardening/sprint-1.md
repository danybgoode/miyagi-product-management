# Sprint 1 — Durable manual-payment state machine (the spine)

> Epic: [Checkout & Manual-Payment State Hardening](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 🟡 Built — green gate, awaiting Daniel merge.** Goal: the buyer's "ya pagué" becomes a
> real, persisted, shared state that survives reload and is the single vocabulary both sides (and
> agents) read.
>
> **PRs (draft, HIGH risk → Daniel merges):**
> backend `medusa-bonsai-backend#13` · frontend `miyagisanchezcommerce#36`.
> **Deploy order:** merge backend first or together; frontend degrades gracefully across the
> ~12-min Cloud Run window. Rebase latest `main` before merge (parallel agents).

## Stories

### S1.1 — Persist the manual-payment state on the order ✅
**As** the system, **I want** the manual-payment lifecycle persisted as a durable state on the order
(`pending_payment → buyer_reported_paid → payment_confirmed → processing`), **so that** every surface
reads one source of truth instead of inferring state from local button clicks.
- Model on `order.metadata` (Medusa-first; mirror `print/.../payment-reported` — zero new tables).
- One vocabulary in **`lib/manual-payment-state.ts`** (pure derive + transitions + guards + es-MX copy); the backend `normalizeMedusaOrder` emits the same derived `manual_payment_state` (+ `buyer_reported_paid`) so buyer, seller, inbox, and the UCP/MCP order object share it.
- **Acceptance:** the state round-trips through `normalizeMedusaOrder`; an invalid transition (e.g. `pending_payment → processing` skipping confirmation) is rejected by the helper. ✓
- **Done:** FE `9421583` (helper + 17-case pure-logic spec) · BE `6b5c373` (normalizer). **Risk: HIGH.**

### S1.2 — "Ya hice el pago" durably sets `buyer_reported_paid` ✅
**As** a buyer, **I want** my "ya hice el pago" to durably record `buyer_reported_paid` (with a
timestamp) **and** still ping the seller, **so that** after a reload both of us still see "pago
reportado — en verificación," not a reset to "pending."
- New backend `POST /store/buyer/me/orders/:id/report-payment` persists the flag + timestamp (auth + ownership; 422 non-manual, 409 already-confirmed, idempotent). Frontend `report-payment/route.ts` proxies to it (Clerk JWT) **in addition to** the existing `tgNotify`.
- Buyer (`OrderTrackingClient`) + seller (`OrderDetail`) read the persisted state from the curated top-level normalized fields. **Latent fix:** those surfaces read raw `order.metadata` (not passed through for Medusa orders) → the manual confirm/report sections never rendered for Medusa orders; now they read `payment_method`/`payment_received`/`buyer_reported_paid` and work.
- **Acceptance:** report payment → hard-reload both buyer and seller views → both still show the reported/in-verification state. ✓ (full authed round-trip owed to Daniel — see smoke).
- **Done:** BE `c2635e1` (route) · FE `bcdbc03` (proxy + reads + anonymous-401 api spec). **Risk: HIGH.**

### S1.3 — "Who acts next" copy keyed to state + inbox fix ✅
**As** a buyer or seller, **I want** each state to tell me whose move it is, **so that** I never
mistake an unpaid order for one that's ready to ship.
- Buyer: "Paga ahora" / "Avisaste — el vendedor verifica" / "Pago confirmado". Seller: "Esperando pago" / "Verifica el pago reportado" / "Prepara la entrega" (all from the helper's `whoActsNext`).
- Fixed `OrdersInbox.tsx:149` so `pending_payment`/`buyer_reported_paid` never render "Listo para enviar" — it shows the seller's next move; a reported order badges "Pago reportado — en verificación".
- **Acceptance:** an unpaid manual order never reads "Listo para enviar" anywhere; each state shows the correct next-actor line on both sides. ✓
- **Done:** FE `cf5a069`. **Risk: HIGH** (seller money-path surface).

## Sprint QA — what ran (green)
- **Deterministic gate (green before merge):** `tsc --noEmit` ✓ (both repos) · `next build` ✓ · Playwright `api` ✓ (122 passed, 1 pre-existing skip).
- **New specs:** `e2e/manual-payment-state.spec.ts` — pure-logic on the helper (derivation precedence, transition table incl. the rejected `pending_payment → processing`, copy completeness; 17 cases, no auth/network). `e2e/manual-payment-report.spec.ts` — asserts the buyer report-payment endpoint rejects anonymous POST (401, no anonymous state writes).
- **Why not a deterministic persist→reload api spec:** the full round-trip needs a real Clerk buyer **and** seller session on a live manual order (money/auth-gated) → it's the browser smoke owed to Daniel below. The helper's derivation/guards are unit-covered; the endpoint's auth boundary is api-covered.
- **Deploy order:** backend (persist + normalize) first or together; frontend reads degrade gracefully (`buyer_reported_paid ?? false`) across the ~12-min Cloud Run window.

## Sprint 1 — Smoke walkthrough (production)
Env: PR Vercel preview (pre-merge, SSO-gated) → production `https://miyagisanchez.com` after merge.
Backend has no preview — its half (persist) is confirmed **post-merge** against prod (~12 min after merge).
Every step here needs a **real buyer and seller session on a live manual (SPEI/DiMo/cash) order** —
the money/auth path an automated browser smoke can't fully drive → **owed to Daniel**.

```
1. As the BUYER, open your pending manual order:
   https://miyagisanchez.com/account/orders/<order-id>
   → A "Pago pendiente de verificación" panel shows a "Ya hice el pago" button.
2. Click "Ya hice el pago".
   → Button becomes "✓ Avisaste al vendedor"; the panel reads "Pago reportado — en verificación".
3. Hard-reload the page (Cmd/Ctrl-Shift-R).
   → It STILL shows "Pago reportado — en verificación" / "✓ Avisaste al vendedor"
     (NOT reset to "Pago pendiente").                                       ← the core fix
4. As the SELLER, open the same order:
   https://miyagisanchez.com/shop/manage/orders/<order-id>
   → It shows "El comprador avisó que ya pagó" with "✓ Confirmar pago recibido"
     (NOT "Listo para enviar").
5. As the SELLER, open the orders inbox: https://miyagisanchez.com/shop/manage/orders
   → That order's footer reads "Verifica el pago reportado" (and badges
     "Pago reportado — en verificación") — it NEVER says "Listo para enviar" while unpaid.
6. As the SELLER, click "✓ Confirmar pago recibido" on the order; then as the BUYER reload step 1.
   → Buyer sees "Pago confirmado por el vendedor"; the order is no longer pending.

If any step fails, note the step number + exactly what you saw.
```
**All 6 steps are the money/auth path — owed to Daniel.** Step 1's payment instructions block renders
when the order's `payment_method` is `manual`; the report flow itself works for `manual/spei/cash/dimo`.
