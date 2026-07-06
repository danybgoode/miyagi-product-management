# Buyer notifications — money path (Compras dispatch + Medusa-order gating) — Sprint 1: Medusa-order buyer identity — gating bites

**Status:** ⬜ not started

> Two repos: 1.1 is `apps/backend` (Cloud Run, no preview, ~12 min); 1.2/1.3 are `apps/miyagisanchez`.
> Deploy order: backend-first, and the frontend is null-safe regardless (unresolved buyer → today's
> email fall-through). **All stories HIGH — Daniel merges.**

## Stories

### Story 1.1 — Backend: `normalizeMedusaOrder` returns the buyer's Clerk id
**As a** buyer with a Medusa order, **I want** the platform to know the order is mine, **so that** my
notification preferences can apply to it.
**Acceptance:** `GET /store/sellers/me/orders` returns `buyer_clerk_user_id` populated (not `null`) for a
new Medusa order placed while signed in; a guest order still returns `null`; response shape otherwise
unchanged (existing consumers unaffected).
**Risk:** high (backend, order surface)

### Story 1.2 — Persist + resolve the buyer id so Envíos/Devoluciones gating bites on Medusa orders
**As a** buyer who toggled Envíos or Devoluciones, **I want** those choices to apply to my Medusa orders,
**so that** the toggles I already have stop being inert for the majority order type.
**Acceptance:** after a new signed-in Medusa order, the mirror row carries the buyer's Clerk id
(webhooks pass `session.metadata.buyer_clerk_id` → `upsertOrderMirror`; lookup keys
`metadata->>medusa_order_id`, not row `id`); when the seller marks it shipped, the buyer's Envíos prefs
gate the send (Push/TG if opted in; email off if they turned it off); an old order without a persisted id
behaves exactly as today (email fall-through — **no backfill**); guest orders unchanged.
**Risk:** high (order webhooks touched, fulfillment dispatch)

### Story 1.3 — Kill-switch flag `notifications.buyer_moneypath_enabled`
**As** the product owner, **I want** one flag that instantly reverts both new paths to today's behavior,
**so that** a money-path regression is a flag flip, not a deploy.
**Acceptance:** flag added to `lib/flags.ts` `DEFAULT_FLAGS`, default `true`; seed migration riding the
PR creates it ENABLED in `platform_flags` (never a local flip — Supabase local IS prod, LEARNINGS); with
the flag off, Medusa-order buyer resolution and (in Sprint 2) the Compras dispatch are skipped — behavior
is byte-for-byte today's.
**Risk:** high (shared flag infra, money seam)

## Sprint QA
- **api spec(s):** pure-logic spec on the extracted buyer-resolution seam (e.g. `lib/order-buyer.ts` —
  mirror-row/normalizer-field precedence, null-safety, flag-off short-circuit); backend unit test for the
  `normalizeMedusaOrder` mapping (rides `npm run test:unit` in the backend CI gate).
- **browser smoke owed:** yes, to **Daniel** — real signed-in Medusa purchase + seller ship + buyer
  Envíos toggle (money/auth path; no per-branch backend preview).
- **deterministic gate:** frontend `tsc --noEmit` + `npm run build` + Playwright `api`; backend
  `medusa build` + `tsc --noEmit` + `npm run test:unit` — green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (post-merge — the backend has no per-branch preview)

1. Signed in as a test buyer, go to https://miyagisanchez.com/account/notificaciones and turn **Envíos**
   ON for Telegram (buyer Telegram already linked).
   → The toggle persists after reload.
2. **(money path — owed to Daniel)** Buy any Medusa-backed listing while signed in (Stripe test card
   4242…), then as the seller mark it shipped from the orders screen.
   → The buyer gets the shipped notice on **Telegram**; the shipped email still arrives (prefs default).
3. Turn Envíos email OFF for the same buyer; repeat a ship event on a second test order.
   → No shipped email; Telegram still arrives. (This is the gating now biting on Medusa orders.)
4. Repeat step 2 as a **guest** checkout.
   → Guest emails arrive exactly as today; nothing else fires.
5. Flip `notifications.buyer_moneypath_enabled` OFF in `platform_flags`; repeat a ship event.
   → Behavior reverts to today's (email fall-through, no gating). Flip back ON.

If any step fails, note the step number + what you saw — that's the bug report.
