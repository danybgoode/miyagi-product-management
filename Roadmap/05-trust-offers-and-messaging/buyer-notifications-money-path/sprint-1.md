# Buyer notifications — money path (Compras dispatch + Medusa-order gating) — Sprint 1: Medusa-order buyer identity — gating bites

**Status:** ✅ built, cross-reviewed, PRs open (draft) — [backend #70](https://github.com/danybgoode/medusa-bonsai-backend/pull/70)
(1.1 `55e5b06`, review-fix `143f28e`) · [frontend #194](https://github.com/danybgoode/miyagisanchezcommerce/pull/194)
(1.3 `cfe005f`, 1.2 `f8a940b`, review-fix `0f62bfb`). Deterministic gate green both repos. Owed:
Daniel's merge + the money-path smoke below.

**Cross-agent review (Codex, both PRs) — one real finding, fixed:** the seller orders list/detail
server components (`app/(shell)/shop/manage/orders/{page.tsx,[id]/page.tsx}`) were spreading the
full `normalizeMedusaOrder` object — including `buyer_clerk_user_id`, a stable Clerk auth
identifier — into `'use client'` component props via RSC serialization. Fixed with a new
`stripBuyerClerkId()` helper in `lib/order-buyer.ts`, applied at both call sites, with new
Playwright coverage. Also fixed two smaller findings: the flag-seed migration's `polarity` string
didn't match the rest of the codebase's `'killswitch'` spelling, and a dispatch-site comment was
ambiguous about whether "absent" meant the flag or the buyer id. One claimed blocking finding
(missing `isEnabled` import) was a false positive — `tsc` was clean before and after. Full detail
in the PR comment threads.

> Two repos: 1.1 is `apps/backend` (Cloud Run, no preview, ~12 min); 1.2/1.3 are `apps/miyagisanchez`.
> Deploy order: backend-first, and the frontend is null-safe regardless (unresolved buyer → today's
> email fall-through). **All stories HIGH — Daniel merges.**

## Stories

### Story 1.1 — Backend: `normalizeMedusaOrder` returns the buyer's Clerk id ✅ `55e5b06`
**As a** buyer with a Medusa order, **I want** the platform to know the order is mine, **so that** my
notification preferences can apply to it.
**Acceptance:** `GET /store/sellers/me/orders` returns `buyer_clerk_user_id` populated (not `null`) for a
new Medusa order placed while signed in; a guest order still returns `null`; response shape otherwise
unchanged (existing consumers unaffected).
**Risk:** high (backend, order surface)

### Story 1.2 — Resolve the buyer id at dispatch time so Envíos/Devoluciones gating bites on Medusa orders ✅ `f8a940b`
**As a** buyer who toggled Envíos or Devoluciones, **I want** those choices to apply to my Medusa orders,
**so that** the toggles I already have stop being inert for the majority order type.
**Acceptance:** `ship-manual`, `ship`, and `return-request/[requestId]` already re-fetch the order from
`GET /store/sellers/me/orders/:id` (the Medusa-order branch) for other fields — once Story 1.1 ships, each
reads the now-populated `buyer_clerk_user_id` off that same response (gated by the Story 1.3 flag) instead
of hardcoding/discarding it; when the seller marks it shipped, the buyer's Envíos prefs gate the send
(Push/TG if opted in; email off if they turned it off); guest orders unchanged.
**Revised from the original scope** (2026-07-08, in-session with Daniel): persisting the buyer id onto the
Supabase order-mirror row (webhooks → `upsertOrderMirror`) moves to **Sprint 2**, since Sprint 2 already
edits the same Stripe/MP webhook files for Compras dispatch — one round of webhook surgery instead of two.
This story's acceptance (gating bites on ship/return) is fully met without touching the webhooks at all.
**Risk:** high (fulfillment dispatch routes touched)

### Story 1.3 — Kill-switch flag `notifications.buyer_moneypath_enabled` ✅ `cfe005f`
**As** the product owner, **I want** one flag that instantly reverts both new paths to today's behavior,
**so that** a money-path regression is a flag flip, not a deploy.
**Acceptance:** flag added to `lib/flags.ts` `DEFAULT_FLAGS`, default `true`; seed migration riding the
PR creates it ENABLED in `platform_flags` (never a local flip — Supabase local IS prod, LEARNINGS); with
the flag off, Medusa-order buyer resolution and (in Sprint 2) the Compras dispatch are skipped — behavior
is byte-for-byte today's.
**Risk:** high (shared flag infra, money seam)

## Sprint QA
- **api spec(s):** pure-logic spec on the extracted buyer-resolution seam (`lib/order-buyer.ts` —
  null-safety, flag-off short-circuit); backend unit test for the `normalizeMedusaOrder` mapping (rides
  `npm run test:unit` in the backend CI gate).
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
