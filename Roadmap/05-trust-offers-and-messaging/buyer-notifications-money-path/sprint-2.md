# Buyer notifications — money path (Compras dispatch + Medusa-order gating) — Sprint 2: Compras on the money path + grid unlock

**Status:** ✅ MERGED + LIVE 2026-07-08 — [PR #195](https://github.com/danybgoode/miyagisanchezcommerce/pull/195)
squash `6a88810`. Deterministic gate green (`tsc`+`build`+Playwright `api`); pre-story commits: 2.1
`b2dab4b` · 2.2 `2ff7f1c` · 2.3 `550c779` · 2.4 `4cbfff9` · specs `9112c99`. Cross-agent review
(Codex) + the fresh `pr-reviewer` subagent both ran clean — Codex's one "Blocking" finding
(claimed a missing DB migration for `buyer_clerk_user_id`) was a **false positive**: that column
was added by `20260526000000_order_management_shipping.sql` over a month before this epic and is
already used by the legacy Stripe flow — verified against `origin/main` before merging past it, not
assumed. Vercel prod deploy confirmed rolled (commit status `success`) before this doc was updated.
Owed: Daniel's money-path smoke below (steps 3-6, can't be self-run — real Stripe/MP/pago-directo
purchases + Telegram delivery). This was the epic's **last scoped sprint** — epic close-out (poster,
retro, LEARNINGS) is a separate follow-up once the smoke confirms the money path live.

> Frontend-only (`apps/miyagisanchez`); follows Sprint 1. 2.1/2.2 edit the **live payment webhooks** —
> HIGH, Daniel merges. **Compras email behavior stays byte-for-byte** (it already always fires; this
> sprint only *adds* Push + Telegram behind the buyer's toggles and the Sprint-1 kill-switch).

**Implementation note (found while building, not assumed):** the `fields` query param on Medusa's
`/store/carts/:id/complete` supports a `+` prefix that **adds** to the default field set instead of
replacing it (confirmed by reading the installed `@medusajs/framework` field-parser source, since
mutating a real cart isn't a safe way to probe it) — so `fields=+customer.metadata` was enough to
surface `customer.metadata.clerk_user_id` without needing to enumerate/replace every other field the
webhook handlers already read off `data.order`. Simpler and lower-risk than the enumerate-and-replace
approach this doc originally sketched.

## Stories

### Story 2.1 — Stripe webhook routes Compras through `dispatchToBuyer` ✅ `b2dab4b`
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
`notifications.buyer_moneypath_enabled` (else pass `null`, reproducing today's row exactly). **Built as
`fields=+customer.metadata`** (see the implementation note above) — the `+` prefix appends to Medusa's
default field set instead of replacing it, so every field the handler already read off `data.order`
stayed untouched with zero risk of dropping one.
**Risk:** high (live Stripe webhook)

### Story 2.2 — MP webhook + `finalize-manual` route Compras the same way ✅ `2ff7f1c`
**As a** buyer paying via Mercado Pago or pago directo, **I want** the same channel choices to apply,
**so that** Compras behaves identically across payment rails.
**Acceptance:** same checks as 2.1 on the MP webhook and on `finalize-manual` (Clerk-authed — buyer id
from `auth()`); manual-order pending-payment email unchanged.
**Inherited from Sprint 1** (rescoped 2026-07-08): same `fields`+`customer.metadata` + `OrderMirrorInput`
treatment as 2.1, applied to **both** completion helpers in `app/api/webhooks/mercadopago/route.ts`
(`completeMedusaCartWithMp` and `completeMedusaCart`).
**Risk:** high (live MP webhook + manual money path)

### Story 2.3 — Grid: Compras × Push/Telegram cells go live ✅ `550c779`
**As a** buyer, **I want** the Compras Push/Telegram toggles to actually work, **so that** the grid stops
promising "pronto".
**Acceptance:** in `BuyerNotificationPreferences.tsx` the `lockedS2` lock is removed from Compras ×
Push/Telegram (Compras × Email stays locked-on); toggles persist and are honored by 2.1/2.2 sends.
**Risk:** low (non-commerce UI on an existing authed page)

### Story 2.4 — Pref centers consume `{ rowDeleted }` on disconnect ✅ `4cbfff9`
**As a** buyer/seller disconnecting Telegram for one audience, **I want** the center to say whether the
link was removed or kept for my other role, **so that** the UI reflects reality instead of optimistically
showing disconnected.
**Acceptance:** the buyer and seller centers read the `{ rowDeleted }` the unlink endpoints
(`app/api/account/telegram/link`, `app/api/sell/telegram/link`) already return and render kept-vs-removed
correctly (es-MX copy).
**Risk:** low

## Sprint QA
- **api spec(s):** pure-logic completeness spec on the new `order_confirmed`/`payment_confirmed`
  builders in `buyer-messages.ts` (extended the existing `BUYER_MESSAGE_KINDS`-driven loop in
  `e2e/buyer-messages.spec.ts` + a dedicated amount-copy assertion — extracted seam, no network).
- **browser spec (not api, revised from the original sketch):** `e2e/buyer-notification-prefs-compras.browser.spec.ts`
  asserts the grid actually **renders** Compras × Push/Telegram as live toggles (and the old "pronto"
  text is gone) — a rendered-DOM claim the network-only `api` project can't observe, so it lives in
  the `browser` project per repo convention (gated `MS_TEST_BROWSER_AUTH`, **skips gracefully** when
  unset), not as an api spec.
- **browser smoke owed:** yes, to **Daniel** — the Stripe test-card + MP + pago-directo purchases below
  (money path; automated smoke can't cover capture → receipt).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green — confirmed. 9
  pre-existing failures (launchpad flag-state, promoter-applications rate-limiting, not-found-shape)
  reproduce identically on unmodified `main` with this sprint's changes stashed — ruled out as
  unrelated before opening the PR.

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
