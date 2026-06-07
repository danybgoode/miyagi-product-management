# Sprint 1 — Durable manual-payment state machine (the spine)

> Epic: [Checkout & Manual-Payment State Hardening](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned.** Goal: the buyer's "ya pagué" becomes a real, persisted, shared state that
> survives reload and is the single vocabulary both sides (and agents) read.

## Stories

### S1.1 — Persist the manual-payment state on the order
**As** the system, **I want** the manual-payment lifecycle persisted as a durable state on the order
(`pending_payment → buyer_reported_paid → payment_confirmed → processing`), **so that** every surface
reads one source of truth instead of inferring state from local button clicks.
- Model on `order.metadata` (Medusa-first; mirror `print/.../payment-reported` — likely zero new tables).
- One vocabulary in **`lib/manual-payment-state.ts`** (pure transitions + guards), imported by buyer normalizer, seller normalizer, inbox, and the UCP/MCP order object.
- **Acceptance:** the state persists and round-trips through `normalizeMedusaOrder`; an invalid transition (e.g. `pending_payment → processing` skipping confirmation) is rejected by the helper.
- **Risk: HIGH.**

### S1.2 — "Ya hice el pago" durably sets `buyer_reported_paid`
**As** a buyer, **I want** my "ya hice el pago" to durably record `buyer_reported_paid` (with a
timestamp) **and** still ping the seller, **so that** after a reload both of us still see "pago
reportado — en verificación," not a reset to "pending."
- `report-payment/route.ts` writes the state (reuse S1.1 helper) **in addition to** the existing `tgNotify`.
- Buyer (`OrderTrackingClient`) + seller (`OrderDetail`) read the persisted state.
- **Acceptance:** report payment → hard-reload both buyer and seller views → both still show the reported/in-verification state.
- **Risk: HIGH.**

### S1.3 — "Who acts next" copy keyed to state + inbox fix
**As** a buyer or seller, **I want** each state to tell me whose move it is, **so that** I never
mistake an unpaid order for one that's ready to ship.
- Buyer: "Paga ahora" / "Avisaste — el vendedor verifica" / "Pago confirmado". Seller: "Esperando pago" / "Verifica el pago reportado" / "Prepara la entrega".
- Fix `OrdersInbox.tsx:149` so `pending_payment`/`buyer_reported_paid` never render "Listo para enviar".
- **Acceptance:** an unpaid manual order never reads "Listo para enviar" anywhere; each state shows the correct next-actor line on both sides.
- **Risk: HIGH** (seller money-path surface).

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `next build` + Playwright `api`.
- **New specs:** pure-logic spec on `lib/manual-payment-state.ts` (transition table + guards — free coverage, no auth/network); api spec asserting `report-payment` persists the state and `normalizeMedusaOrder` returns it.
- **Browser smoke (owed to Daniel):** authed buyer reports payment → reload → seller sees reported state. Money/auth path — automated browser smoke can't fully cover; **owed to Daniel**. Some rendered-state assertions (copy per state) can run anonymously via a `*.browser.spec.ts` against the preview.
- **Deploy order:** backend (persist + normalize) first or together with frontend; frontend reads degrade gracefully (`?? 'pending_payment'`).

## Sprint 1 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.

```
1. As a buyer, open your pending manual (SPEI) order at https://miyagisanchez.com/account/orders/<order-id>
   → You see "Pago pendiente" with payment instructions and a "Ya hice el pago" button.
2. Click "Ya hice el pago".
   → State changes to "Avisaste — el vendedor verifica".
3. Hard-reload the page.
   → It STILL shows "Avisaste — el vendedor verifica" (not reset to pending).   ← the core fix
4. (money/auth — owed to Daniel) As the seller, open the same order under /shop/manage/orders/<order-id>
   → It shows "Verifica el pago reportado", NOT "Listo para enviar".
5. As the seller, open the orders inbox /shop/manage/orders
   → The order's footer does NOT say "Listo para enviar" while unpaid.

If any step fails, note the step number + what you saw.
```
Steps 1–4 are the **money/auth path** (real seller/buyer sessions) — owed to Daniel.
