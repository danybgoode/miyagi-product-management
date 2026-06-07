# Sprint 1 — Buyer preference center + buyer dispatch (email/push; Telegram stub)

> Epic: [Buyer Telegram channel + Buyer preference center](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned.** Goal: a signed-in buyer gets granular control over Envíos/Ofertas/Devoluciones
> on email + push — with **Compras email always-on** — before Telegram delivery lights up, reusing #5's
> seam, resolver, tables and grid component. **Build only after #5 has merged.**

## Pre-req gate
#5 must have merged: `lib/notifications/dispatch.ts` + `lib/notifications/preferences.ts`, the
`notification_preferences` + `telegram_links` Supabase tables, and the settings-grid component. This
sprint **extends** them — it does not recreate them. Confirm they exist on `main` before planning.

## Stories

### B1.1 — `dispatchToBuyer(clerkUserId, event)` seam
**As** the system, **I want** a single buyer dispatch seam that resolves the buyer's prefs and fans out
to enabled channels, **so that** every in-scope buyer event respects preferences in one place — while
the purchase receipt can never be silenced.
- Add `dispatchToBuyer` to `lib/notifications/dispatch.ts`, **reusing** `lib/notifications/preferences.ts`
  with a **buyer** event→group map (Compras / Envíos / Ofertas / Devoluciones) + a **buyer**
  `DEFAULT_PREFS` section. **Compras email is forced-on in the resolver** (single source of truth — not
  just hidden in the UI), so no caller/agent can suppress a receipt. Reuse `lib/email.ts` buyer senders
  + `lib/notify.ts` push; Telegram branch is a stub no-op until Sprint 2. Fire-and-forget — **never
  throws on the request path** (same contract as `tgNotify`/`notify`).
- **Acceptance:** a unit call with buyer prefs `{envios.email:off}` skips the shipped email; an
  order-confirmed (Compras) email **always** sends regardless of prefs; a Devoluciones event respects
  its toggle; an absent pref falls back to the documented buyer default.
- **Risk: HIGH** (carries money/transactional buyer mail).

### B1.2 — Buyer prefs in the existing tables (reuse, namespaced)
**As** the system, **I want** buyer preferences persisted in #5's tables without colliding with seller
prefs, **so that** a person who is both keeps independent buyer/seller choices.
- **Reuse** `notification_preferences` + `telegram_links` (keyed by `clerk_user_id`). Add
  **audience-namespaced** buyer event-group keys (`buyer.compras` / `buyer.envios` / `buyer.ofertas` /
  `buyer.devoluciones`) — or an `audience` discriminator column. RLS already by `clerk_user_id`;
  **default-on read, no backfill** for existing buyers.
- **Acceptance:** a buyer with zero rows gets the documented buyer defaults; a written toggle persists
  across reload; a user who is also a seller keeps independent buyer/seller prefs (no cross-read).
- **Risk: HIGH** (shared tables; additive — must not reinterpret the seller rows #5 wrote).

### B1.3 — Buyer preference center in the account area
**As** a buyer, **I want** a clear grid of channels × event-groups in my account, **so that** I control
what reaches me where, in one glance — and can see my receipt is guaranteed.
- New page `app/account/notificaciones` **reusing the #5 grid component**: rows
  Pedidos→**Compras**/Envíos/Ofertas/Devoluciones, columns Email/Push/Telegram. **Compras×Email renders
  as a locked "Siempre" cell** with a short why ("recibos de compra y pago"). Telegram column shows
  "Conecta para activar" (links to the Sprint-2 flow). Add a nav link from `app/account`. es-MX strings
  (+ en dictionary).
- **Acceptance:** toggling "Envíos → Email" off stops shipped/delivered emails to that buyer;
  Compras×Email cannot be toggled; "Devoluciones → Email" off stops return-update emails; toggle state
  survives reload.
- **Risk: HIGH** (gates real buyer email).

### B1.4 — Route in-scope buyer events through the seam (guest-safe)
**As** the platform, **I want** the in-scope buyer events to flow through `dispatchToBuyer` instead of
the direct email call, **so that** preferences take effect for signed-in buyers with **no regression**
and **guests are never dropped**.
- Route through the seam, **default-on**: order-confirmed (`orders/route.ts`), payment-confirmed
  (`orders/finalize-manual/route.ts`), shipped (`orders/[id]/ship[-manual]/route.ts`), delivered
  (`orders/[id]/confirm-delivery/route.ts`), offer accepted/countered/declined
  (`offers/[id]/buyer-respond/route.ts` + `offers/route.ts`), and returns
  (`orders/[id]/return-request/route.ts` + `…/[requestId]/route.ts`).
- **Guest guard (safety-critical):** if the order has **no `buyer_clerk_user_id`**, the seam degrades to
  *exactly today* — send the transactional email to `buyer_email`, skip prefs/push/Telegram. Buyer email
  call-sites outside the in-scope set stay untouched.
- **Acceptance:** signed-in buyer with default prefs gets every event's email exactly as today; a
  **guest** order still emails confirmation/shipped/return exactly as today; turning "Envíos → Email"
  off stops a signed-in buyer's shipped email; "Devoluciones → Email" off stops the return-update email.
- **Risk: HIGH** (buyer order/payment/ship/return dispatch).

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `next build` + Playwright `api`.
- **New specs:** pure-logic spec on the **buyer** resolver path in `lib/notifications/preferences.ts`
  (event→group incl. Devoluciones, **forced-on Compras email**, channel resolution, default fallback,
  buyer/seller audience isolation — free coverage, no auth/network); api spec asserting default-on buyer
  read + persisted toggle + audience isolation (B1.2), and **parity for signed-in + guest** plus
  suppression-on-toggle incl. Devoluciones (B1.4).
- **Browser smoke (owed to Daniel):** authed buyer toggles a group off → that email stops; the locked
  Compras×Email cell can't be turned off. Rendered-grid + locked-cell + persisted-toggle assertions can
  run via a `*.browser.spec.ts` against the preview; the authed "email actually stops" check is **owed
  to Daniel**.
- **Deploy order:** Supabase schema delta first (CLI) if a column/keys are added; frontend reads degrade
  gracefully (`?? DEFAULT_PREFS`). Announce the `lib/notifications/` + grid-component + `app/account` nav
  changes (shared surface).

## Sprint 1 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.

```
1. As a signed-in buyer, open https://miyagisanchez.com/account/notificaciones
   → You see a "Notificaciones" grid: rows Compras/Envíos/Ofertas/Devoluciones, columns Email/Push/Telegram.
2. Look at the Compras → Email cell.
   → It reads "Siempre" and can't be switched off (with a hint: recibos de compra y pago).
3. The Telegram column reads "Conecta para activar" (not yet enabled — that's Sprint 2).
   → Email + Push toggles are interactive; Telegram is disabled with the connect hint.
4. Turn OFF "Envíos → Email". Reload the page.
   → The toggle is STILL off after reload.   ← preferences persist
5. (money/auth — owed to Daniel) As that buyer, receive a "pedido enviado" event.
   → You do NOT get the shipped email (you turned it off); turning it back on restores it.
6. (money/auth — owed to Daniel) Place a NEW order as that buyer with default prefs.
   → You still get the order-confirmation email exactly as before (Compras email is mandatory).
7. (money/auth — owed to Daniel) Place an order as a GUEST (not signed in).
   → The guest still gets confirmation/shipped emails exactly as today (no prefs, no drop).

If any step fails, note the step number + what you saw.
```
Steps 5–7 are the **money/auth path** (real buyer/guest sessions) — owed to Daniel.
