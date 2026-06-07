# Sprint 2 — Block ship before paid (UI + server)

> Epic: [Checkout & Manual-Payment State Hardening](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned.** Goal: a seller physically cannot ship a manual order before confirming
> payment — enforced in the **API**, with the UI as the courtesy layer. Builds on S1's durable state.

## Stories

### S2.1 — Seller ship affordance gated on payment
**As** a seller, **I want** the shipping controls to be unavailable until I've confirmed payment on a
manual order, **so that** I can't accidentally ship before the funds land.
- Gate `ShippingSection` (`OrderDetail.tsx:827`) on `paymentSettled` (reuse `:709`) — hidden/disabled with a clear reason ("Esperando pago — confirma el depósito antes de enviar").
- Reorder so the "Confirmar pago recibido" card precedes the shipping block.
- **Acceptance:** an unpaid manual order shows **no enabled** ship/label action; confirming payment reveals it.
- **Risk: HIGH.**

### S2.2 — Server-side ship gate on both routes
**As** the platform, **I want** the ship APIs to reject manual orders that aren't paid, **so that** the
guarantee holds even if the UI is bypassed (the UI alone is not foolproof).
- Add a `payment_received` guard to **both** `backend …/sellers/me/orders/[id]/ship/route.ts` and frontend `app/api/orders/[id]/ship-manual/route.ts` → **422** "Aún no confirmas el pago de este pedido." for manual orders not yet confirmed.
- Non-manual (card/MP, already captured) paths unchanged — gate on presence (`isSpeiOrder`) so the 99% path stays byte-for-byte the same.
- **Acceptance:** a direct API ship call on an unpaid manual order returns 422; the same call after confirmation succeeds; card orders unaffected.
- **Risk: HIGH.**

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `next build` + Playwright `api` green before merge.
- **New specs:** **api spec** asserting the 422 on an unpaid manual ship attempt (the real gate) and a 200 after confirmation; pure-logic spec on the gate predicate (reused `paymentSettled` shape). A card order ship attempt stays unaffected (regression guard).
- **Browser smoke (owed to Daniel):** seller view of an unpaid manual order shows the disabled ship affordance + reason. Rendered-state assertion can run anonymously where possible; the authed seller confirmation→ship transition is the **money/auth path owed to Daniel**.
- **Deploy order:** backend `ship` gate first; then frontend `ship-manual` gate + UI. Frontend degrades gracefully if the backend gate isn't live yet (still hides the affordance client-side).

## Sprint 2 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.

```
1. (money/auth — owed to Daniel) As the seller, open an unpaid manual (SPEI) order at
   https://miyagisanchez.com/shop/manage/orders/<order-id>
   → The shipping/label controls are absent or disabled, with "Esperando pago…" shown.
2. Click "✓ Confirmar pago recibido".
   → The shipping/label section now appears/enables.
3. (API check — agent can run) POST a ship request to the order BEFORE confirming payment on a fresh
   unpaid manual order (api spec / curl with a test seller token).
   → Response is 422 "Aún no confirmas el pago…", no label created.
4. Repeat the POST after confirming payment.
   → 200, label/tracking created.
5. Place + pay a CARD order, then ship it.
   → Ships normally (no regression for already-captured payments).

If any step fails, note the step number + what you saw.
```
Steps 1–2 and the live confirmation are the **money/auth path** — owed to Daniel; step 3–4 the agent covers via the api spec.
