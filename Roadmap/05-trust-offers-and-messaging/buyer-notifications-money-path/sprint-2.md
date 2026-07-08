# Buyer notifications — money path (Compras dispatch + Medusa-order gating) — Sprint 2: Compras on the money path + grid unlock

**Status:** ⬜ not started

> Frontend-only (`apps/miyagisanchez`); follows Sprint 1. 2.1/2.2 edit the **live payment webhooks** —
> HIGH, Daniel merges. **Compras email behavior stays byte-for-byte** (it already always fires; this
> sprint only *adds* Push + Telegram behind the buyer's toggles and the Sprint-1 kill-switch).

## Stories

### Story 2.1 — Stripe webhook routes Compras through `dispatchToBuyer`
**As a** signed-in buyer, **I want** my order/payment confirmations on the channels I chose, **so that**
the receipt reaches me in real time, not only by email.
**Acceptance:** after a Stripe purchase, `order_confirmed`/`payment_confirmed` fire through
`dispatchToBuyer` (group `buyer.compras`, builders added to `buyer-messages.ts`, es-MX) — Push/Telegram
arrive iff opted in; the confirmation email is unchanged byte-for-byte and cannot be turned off (resolver
forces Compras email on); webhook idempotency + the guest fall-through preserved (guest ⇒ email only,
nothing new fires); fire-and-forget — a dispatch failure never breaks the webhook response.
**Inherited from Sprint 1** (rescoped 2026-07-08): this story also does the mirror-row persistence
originally slated for S1.2 — add an explicit `fields` param to the `/store/carts/:id/complete` call in
`completeMedusaCart`/`handleMedusaCheckoutComplete` (`app/api/webhooks/stripe/route.ts`) that preserves
every field the handler already consumes off `data.order` **plus** `customer.metadata`, extract
`data.order.customer?.metadata?.clerk_user_id`, add `buyerClerkId?: string | null` to `OrderMirrorInput`
(`lib/order-mirror.ts` — the underlying `marketplace_orders.buyer_clerk_user_id` column already exists,
no migration needed) and thread it through the `upsertOrderMirror` call, gated by
`notifications.buyer_moneypath_enabled` (else pass `null`, reproducing today's row exactly). Remember:
Medusa's `fields` param *replaces* the default field list, not appends — enumerate the full list actually
read off `data.order` before finalizing the string.
**Risk:** high (live Stripe webhook)

### Story 2.2 — MP webhook + `finalize-manual` route Compras the same way
**As a** buyer paying via Mercado Pago or pago directo, **I want** the same channel choices to apply,
**so that** Compras behaves identically across payment rails.
**Acceptance:** same checks as 2.1 on the MP webhook and on `finalize-manual` (Clerk-authed — buyer id
from `auth()`); manual-order pending-payment email unchanged.
**Inherited from Sprint 1** (rescoped 2026-07-08): same `fields`+`customer.metadata` + `OrderMirrorInput`
treatment as 2.1, applied to **both** completion helpers in `app/api/webhooks/mercadopago/route.ts`
(`completeMedusaCartWithMp` and `completeMedusaCart`).
**Risk:** high (live MP webhook + manual money path)

### Story 2.3 — Grid: Compras × Push/Telegram cells go live
**As a** buyer, **I want** the Compras Push/Telegram toggles to actually work, **so that** the grid stops
promising "pronto".
**Acceptance:** in `BuyerNotificationPreferences.tsx` the `lockedS2` lock is removed from Compras ×
Push/Telegram (Compras × Email stays locked-on); toggles persist and are honored by 2.1/2.2 sends.
**Risk:** low (non-commerce UI on an existing authed page)

### Story 2.4 — Pref centers consume `{ rowDeleted }` on disconnect
**As a** buyer/seller disconnecting Telegram for one audience, **I want** the center to say whether the
link was removed or kept for my other role, **so that** the UI reflects reality instead of optimistically
showing disconnected.
**Acceptance:** the buyer and seller centers read the `{ rowDeleted }` the unlink endpoints
(`app/api/account/telegram/link`, `app/api/sell/telegram/link`) already return and render kept-vs-removed
correctly (es-MX copy).
**Risk:** low

## Sprint QA
- **api spec(s):** pure-logic specs on the new `order_confirmed`/`payment_confirmed` builders in
  `buyer-messages.ts` (extracted seam, no network); one authed api spec asserting the grid renders Compras
  Push/Telegram as live toggles (reads `MS_TEST_*` secrets, **skips gracefully** when unset).
- **browser smoke owed:** yes, to **Daniel** — the Stripe test-card + MP + pago-directo purchases below
  (money path; automated smoke can't cover capture → receipt).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Signed in as a test buyer, go to https://miyagisanchez.com/account/notificaciones.
   → Compras row: Email is locked ON; **Push and Telegram are live toggles** (no "pronto").
2. Turn Compras × Telegram ON (buyer Telegram linked).
   → Toggle persists after reload.
3. **(money path — owed to Daniel)** Buy a Medusa listing with Stripe test card 4242….
   → Confirmation **email arrives exactly as before**, plus a Telegram order/payment confirmation.
4. **(money path — owed to Daniel)** Repeat with Mercado Pago, then with pago directo (manual).
   → Same: email unchanged, Telegram receipt arrives on each rail.
5. Turn Compras × Telegram OFF; buy once more.
   → Email only — no Telegram. (Email can never be toggled off.)
6. Checkout as a **guest**.
   → Guest gets today's emails only; nothing new fires.
7. In the buyer center, disconnect Telegram (while the same person is also Telegram-linked as a seller).
   → The UI says the connection was **kept for the seller side** (rowDeleted=false), not "disconnected".

If any step fails, note the step number + what you saw — that's the bug report.
