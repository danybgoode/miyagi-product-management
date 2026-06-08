# Sprint 1 — Buyer preference center + buyer dispatch (email/push; Telegram stub)

> Epic: [Buyer Telegram channel + Buyer preference center](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: ✅ SHIPPED to `main` 2026-06-07 — [PR #46](https://github.com/danybgoode/miyagisanchezcommerce/pull/46),
> merge `7fa9c4e`.** Deterministic gate green (tsc + build + Playwright `api`); merged on Daniel's explicit
> green-light (HIGH risk). Goal met: a signed-in buyer gets granular control over Envíos/Ofertas/Devoluciones
> — with **Compras email always-on** — reusing #5's seam, resolver, tables and grid component. Built on
> `feat/buyer-notifications` off `main` (#5 — c5cf6c7 confirmed merged first). **Live money/auth smoke owed
> to Daniel** (steps 5–8 below). One CI note: an initial red was a stale-preview failure on the sibling
> `seller-acquisition-seo` spec (main had advanced via PR #45 adding `/vende/*/opengraph-image`); fixed by
> merging latest `main` — not a buyer-notifications defect.
>
> **Scope landed (vs. plan):** S1 is **email-only for buyers** — the grid's **Push + Telegram** columns are
> inert ("Pronto" / "Conecta para activar") and both wire in **Sprint 2**. **Compras (order/payment
> confirmed) deferred to S2** (those fire from the live Stripe/MP payment webhooks — kept off the money-path
> this sprint, Daniel's call); the Compras row still shows with its locked **Compras×Email = "Siempre"**
> receipt cell. **Buyer-pref gating is active wherever the buyer's Clerk id is resolvable** (offers + legacy
> Supabase orders); **Medusa orders fall through to email exactly as today** because the backend normalizer
> returns `buyer_clerk_user_id: null` — capturing it needs a backend change (deferred). The **guest
> fall-through** guarantees no regression in every case.

## Pre-req gate
#5 must have merged: `lib/notifications/dispatch.ts` + `lib/notifications/preferences.ts`, the
`notification_preferences` + `telegram_links` Supabase tables, and the settings-grid component. This
sprint **extends** them — it does not recreate them. Confirm they exist on `main` before planning.

## Stories

### B1.1 — `dispatchToBuyer(clerkUserId, event)` seam ✅ `43713ee`
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

### B1.2 — Buyer prefs in the existing tables (reuse, namespaced) ✅ `d7b2020`
**As** the system, **I want** buyer preferences persisted in #5's tables without colliding with seller
prefs, **so that** a person who is both keeps independent buyer/seller choices.
- **Reuse** `notification_preferences` + `telegram_links` (keyed by `clerk_user_id`). Add
  **audience-namespaced** buyer event-group keys (`buyer.compras` / `buyer.envios` / `buyer.ofertas` /
  `buyer.devoluciones`) — or an `audience` discriminator column. RLS already by `clerk_user_id`;
  **default-on read, no backfill** for existing buyers.
- **Acceptance:** a buyer with zero rows gets the documented buyer defaults; a written toggle persists
  across reload; a user who is also a seller keeps independent buyer/seller prefs (no cross-read).
- **Risk: HIGH** (shared tables; additive — must not reinterpret the seller rows #5 wrote).

### B1.3 — Buyer preference center in the account area ✅ `ba6da6a`
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

### B1.4 — Route in-scope buyer events through the seam (guest-safe) ✅ `fd5c09f`
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

## Sprint QA — what shipped
- **Deterministic gate — GREEN before merge:** `tsc --noEmit` clean · `next build` passed (both new routes
  `/account/notificaciones` + `/api/account/notification-preferences` compiled) · Playwright `api` 40/40
  (18 new buyer + 22 seller, the seller suite proving the shared-core refactor didn't regress).
- **New specs:**
  - `e2e/buyer-notification-prefs.spec.ts` — pure-logic on the **buyer** resolver (no auth/network):
    event→group incl. Devoluciones; **forced-on Compras×Email even when a row says off**; default fallback;
    **buyer/seller audience isolation** (a seller `orders` row never reads as `buyer.compras` and v.v.);
    Telegram-target resolution; copy completeness.
  - `e2e/buyer-notification-prefs-api.spec.ts` — the buyer API **auth gate** (GET + PATCH → 401 anon);
    runs live in CI against the SSO-gated preview (bypass token).
  - *Guest fall-through + "email actually stops" on toggle* aren't unit-testable (`dispatchToBuyer` is
    `server-only` → the Playwright runner can't import it); the pure resolver spec proves the gating
    decision, the live behaviour is **owed to Daniel** (below).
- **Browser smoke (owed to Daniel — money/auth):** authed buyer toggles **Envíos→Email** off → the shipped
  email stops (and back on restores it); **Devoluciones→Email** off → return-update email stops; the
  **Compras×Email** cell can't be turned off; a **guest** order still emails as today. Rendered-grid +
  locked-cell + persisted-toggle assertions can also land as a `*.browser.spec.ts` against the preview.
- **No schema delta / no migration** — buyer prefs reuse #5's `notification_preferences` table with
  audience-namespaced (`buyer.*`) `event_group` values; default-on read, no backfill. **Frontend-only**
  (no backend/Cloud Run change). Reads degrade gracefully (`?? BUYER_DEFAULT_PREFS`). Announce the shared
  surface touched: `lib/notifications/{preferences,dispatch}.ts`, the lifted
  `app/components/NotificationPreferencesGrid.tsx`, the seller panel, and `app/account` nav.

## Sprint 1 — Smoke walkthrough
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com`
after merge. Steps 1–4 are agent/anyone-runnable (auth only); steps 5–8 are the **money/auth path** (real
buyer/guest sessions + a real listing) — **owed to Daniel**.

```
1. As a signed-in buyer, open https://miyagisanchez.com/account/notificaciones
   (also reachable: Mi cuenta → "Notificaciones").
   → A grid renders: rows Compras / Envíos / Ofertas / Devoluciones; columns Email / Push / Telegram.
2. Look at the Compras → Email cell.
   → It shows a locked switch reading "Siempre" — it cannot be switched off
     (footer hint: "El recibo de tu compra y pago siempre llega por correo").
3. Look at the Push and Telegram columns.
   → Push header reads "Pronto"; Telegram header reads "Conecta para activar". Every Push/Telegram switch
     is disabled (greyed). This sprint is EMAIL-only; both channels light up in Sprint 2.
4. Turn OFF "Envíos → Email". Reload the page.
   → The Envíos → Email switch is STILL off after reload.   ← preference persisted
     (Ofertas / Devoluciones → Email toggle + persist the same way.)
5. (owed to Daniel) As that buyer, on a LEGACY order, have the seller mark it shipped.
   → You do NOT receive the "pedido enviado" email (you turned Envíos→Email off). Toggle it back ON,
     ship again → the email arrives.   ← pref gating actually suppresses/restores the email
6. (owed to Daniel) As that buyer, make an offer; have the seller decline/counter/accept it.
   → With "Ofertas → Email" ON you get the response email; turn it OFF → you don't. (Offers carry the
     buyer's id, so gating works for every order type here.)
7. (owed to Daniel) Place a NEW order as that buyer (default prefs).
   → You still get the purchase/payment receipt email exactly as before — Compras email is mandatory.
8. (owed to Daniel) Place an order as a GUEST (not signed in), then have it shipped / open a return.
   → The guest still gets confirmation / shipped / return emails exactly as today (no prefs, no drop).

Known S1 limitation (stated, by design): for Medusa orders (order_*), the shipped/delivered/return email
is NOT yet gated by the buyer's Envíos/Devoluciones toggle — it always sends (no regression). The backend
normalizer returns buyer_clerk_user_id: null, so the seller-triggered routes can't resolve the buyer's
Clerk id; capturing it is a backend follow-up (S2). Offers + legacy orders ARE gated today.

If any step fails, note the step number + what you saw.
```
