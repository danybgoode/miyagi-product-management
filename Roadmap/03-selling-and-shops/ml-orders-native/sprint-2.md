# Sprint 2 — Full lifecycle: cancel/refund, notifications, entitlement + kill-switch

> Epic: [ml-orders-native](README.md) · Risk: **HIGH** (US-4) · Backend-first; still dark behind
> `ml.orders_enabled` until this sprint completes the lifecycle.
>
> **Built, PRs open (draft):** backend
> [#58](https://github.com/danybgoode/medusa-bonsai-backend/pull/58) (branch
> `feat/ml-orders-native-s2`, fresh off `origin/main` — S1's branch was squash-merged); frontend
> [#172](https://github.com/danybgoode/miyagisanchezcommerce/pull/172) (same branch name, own repo).
> CI running as of this writing. **Daniel merges** (risk tier HIGH, per WAYS-OF-WORKING).
>
> **Plan-mode findings that sharpened the scope doc below (see the plan file for full rationale):**
> - US-6's *flag* half was already live from Sprint 1 (`decideMlOrderApply`, the webhook, both reconcile
>   jobs already check `ml.orders_enabled`) — the real gap was the missing per-seller *entitlement* check,
>   so US-6 below is scoped to that only.
> - ML-materialized orders carry **no Miyagi `payment_collection`** (ML buyers pay Mercado Libre directly,
>   never Miyagi's Stripe/MercadoPago) — so US-4's "refund" is restock + cancel, never a
>   `refundPaymentWorkflow` call.
> - The full `cancelOrderWorkflow` (`@medusajs/core-flows`) explicitly forbids cancelling a `completed`
>   order — and every ML order is created `status: 'completed'`. US-4 composes `cancelOrdersStep` directly
>   instead, the same "step over the full workflow" precedent Sprint 1 established for `createOrdersStep`.

## Stories

### US-4 · Cancellation / refund mapping — high ✅
**Built:** `apps/backend`. New `cancelled_at` column on `ml_applied_order`
(`Migration20260703180000.ts`) — the exactly-once guard for the reverse direction, mirroring
`medusa_order_id`'s role in the forward direction. Pure `decideMlOrderCancel` (+ `isMlCancelledStatus`) in
`sync-utils.ts`: skip (never materialized / already cancelled / not an ML cancel), `restock-and-cancel`
(the common case — restocks exactly the row's own `inventory_delta`, never ML's sold qty, so a
previously-clamped decrement can't be over-restocked), or `log-edge` (ML cancels **after** Miyagi already
shipped — a post-fulfillment return/mediation, never guessed, logged via `recordSyncEvent` for manual
review instead). Wired into `reconcile-ml-order-status.ts` (checked before the shipment fetch, since a
cancelled order never maps to a fulfillment transition either way); the actual restock + cancel runs in
new `lib/ml-order-cancel-apply.ts`, inside the SAME per-link Redis lock Sprint 1 already uses, composing
`cancelOrdersStep` directly (see the plan-mode finding above) plus the first **positive**
`adjustInventory` call in the ML pipeline (the mirror of `decrementProductStock`). Reconcile-poll-only
(≤30 min), same stated gap as Sprint 1's shipments-webhook subscription — real-time ML cancel webhooks are
a fast-follow, not this sprint's scope.

### US-5 · Seller notifications for ML orders — med ✅
**Built:** both repos. New `POST /api/internal/ml/notify-seller` (frontend), authenticated via
`x-internal-secret` — the same pattern `reconcile-checkouts.ts`/`sweepstakes-draw.ts` already use to call
INTO this app. Routes all four ML lifecycle events (`ml_order_new`/`_shipped`/`_delivered`/`_cancelled`)
through the existing `dispatchToSeller` seam and the `orders` ("Pedidos") preference group — added to
`EVENT_GROUP` in `lib/notifications/preferences.ts`, no new preference surface. One lean
`sendMlOrderEventToSeller` email template (data-driven copy, not four near-duplicates) in `lib/email.ts`.
Unlike native `order_shipped`/`order_delivered` (deliberately NOT routed — seller-self-triggered), ML
transitions are never seller-initiated in Miyagi, so all four notify — consistent with, not an exception
to, the self-notify rule. Backend: new `lib/ml-notify-seller.ts` resolves `clerk_user_id` **in-process**
via the backend's own `Seller` module (`ml_connection.seller_id`/`product_ml_link.seller_id` already ARE
the Medusa `seller.id` — no Supabase round-trip needed), fire-and-forget from `ml-sync-apply.ts`
(new order), `reconcile-ml-order-status.ts` (shipped/delivered/cancelled).

### US-6 · Entitlement + kill-switch wiring — med ✅
**Built:** `apps/backend` (+ a frontend copy tweak). New `ml.sync_paywall_enabled` FlagKey on the
backend (previously frontend-only). New `lib/ml-orders-entitlement.ts`: `deriveMlOrdersEntitlement` is a
deliberate backend-native port of the frontend's `deriveMlSyncEntitlement`/`deriveDomainEntitlement` (same
grant precedence: flag off → grandfather → comp → live one-time grant → active subscription → none) — no
cross-app shared package exists in this architecture, so this mirrors the already-established
`flags-cache.ts` "keep two copies in lockstep" precedent. `resolveMlOrdersEntitlement(scope, sellerId)`
composes it fully server-side: `clerk_user_id` via the `Seller` module, the grant via the backend's
read-only Supabase client (`marketplace_shops.metadata`, same precedent as
`store/home/personalization/route.ts`'s `readShop`), and the active subscription via the SAME in-process
`SubscriptionsModuleService` the `/internal/ml-sync-subscription` route already uses (no HTTP self-call).
Wired at both apply sites — the webhook and `reconcile-ml-inventory.ts`'s missed-sale recovery — so
`materializeOrder = globalFlagOn && entitled`; the S4 stock decrement stays ungated either way. Frontend:
presentational-only copy tweak on the existing entitlement card (`MercadoLibreStatus.tsx`) — mentions
order import alongside stock sync (same SKU/grant), not a second paywall surface.

## Sprint QA

- **Api specs, one per story:** `decideMlOrderCancel` (US-4, `ml-sync.unit.spec.ts`) — never-materialized
  / already-cancelled / happy-path / post-fulfillment-edge; ML event→group mapping (US-5,
  `notification-preferences.spec.ts`); `deriveMlOrdersEntitlement` (US-6, new
  `ml-orders-entitlement.unit.spec.ts`) — mirrors the frontend's own entitlement matrix.
- **Signature regression smoke, re-run + extended:** a new scenario test
  (`ml-sync.unit.spec.ts` · "signature regression smoke") chains `decideMlOrderApply` +
  `decideMlOrderCancel` through a full apply → cancel → replay sequence, both flag states — proves one
  decrement, one matching restock (net stock unchanged), and no double-move on either a cancel replay or
  the ORIGINAL sale notification replaying after cancellation.
- **Deterministic gate, both repos, green locally before PR:** backend `medusa build` → `tsc --noEmit` →
  `npm run test:unit` — **135/135 tests, 15/15 suites** (was 117/14 at Sprint 1 close: +5 US-4, +10 US-6,
  +3 signature-smoke additions). Frontend `tsc --noEmit` → `next build` → `playwright test --project=api`
  — **1292 passed**; 6 failures are pre-existing live-prod rate-limiting/bot-protection flakiness
  (`promoter-applications`, `not-found-shape`, `mobile-filter` — none touch this sprint's surfaces),
  consistent with WAYS-OF-WORKING's note that a local run against prod isn't the authoritative gate.
- **Cross-agent review — unavailable this session, noted on both PRs, not silently skipped.** codex is
  over its usage cap (resets Aug 1, 2026); antigravity drifted to `1.0.16` vs the pinned `1.0.10`, and
  `scripts/cross-review.mjs` correctly refused to run rather than risk a bad read against an unverified
  CLI contract change (per the LEARNINGS entry on exactly this failure mode). Advisory-only — doesn't
  block review/merge — but flagged explicitly rather than gone unmentioned.
- **Owed to Daniel:** live ML-sandbox cancel/refund walkthrough + Telegram notification receipt + the
  entitlement upsell check on a non-entitled shop — see the numbered walkthrough below. (Also still owed
  from Sprint 1, unrelated to this sprint's changes: the prod `ml_applied_order` migration double-check
  and its own live-sandbox smoke, sprint-1.md steps 7–12.)

## Sprint 2 — Smoke walkthrough (do these in order)

**Deterministic (agent-run, done pre-merge):**
1. Backend: `cd apps/backend && npx medusa build && npx tsc --noEmit && npm run test:unit` → build
   succeeds, `tsc` clean, 15/15 suites · 135/135 tests green (includes the new
   `decideMlOrderCancel`/`ml-orders-entitlement` specs and the signature-regression scenario).
2. Frontend: `cd apps/miyagisanchez && npx tsc --noEmit && npx next build && npx playwright test
   --project=api` → clean typecheck, build succeeds, `e2e/notification-preferences.spec.ts`'s
   event→group map covers all four new `ml_order_*` events.

**Post-CI, both repos:**
3. Confirm GitHub Actions CI is green on backend
   [PR #58](https://github.com/danybgoode/medusa-bonsai-backend/pull/58) (`Type-check + build + unit`)
   and frontend [PR #172](https://github.com/danybgoode/miyagisanchezcommerce/pull/172) (`Type-check +
   build`, `Playwright vs preview`) before requesting merge.

**Post-merge, backend (Cloud Run, ~12 min, no preview) — agent-run API smoke:**
4. `curl https://medusa-web-91083034475.us-east4.run.app/health` → `200 OK` on the revision matching
   this PR's merge commit.
5. `curl -X POST .../internal/ml/notify-seller -H "x-internal-secret: wrong"` on the **frontend** origin
   → `401` (route exists, auth gate holds) — mirrors Sprint 1's `materialize-order` auth check.

**Post-merge, frontend (Vercel preview on the PR, then prod):**
6. On the PR's Vercel preview (currently
   `https://miyagisanchez-cylc94lyn-danybgoodes-projects.vercel.app` — a fresh push rebuilds a new
   preview URL, use the PR's latest): sign in as a seller connected to Mercado Libre with
   `ml.sync_enabled` ON
   but the `ml_sync` grant absent/lapsed (paywall on) → `/shop/manage/mercadolibre` shows the upsell card
   with the updated copy mentioning both stock sync AND order import (US-6's presentational check — no
   backend/ML sandbox needed for this step).

**Owed to Daniel (money/auth/live-ML-sandbox — cannot be automated from this session):**
7. On a seller shop that already has the `ml_sync` entitlement (grant or active subscription) and
   `ml.orders_enabled` ON: place a real ML-sandbox purchase, let it materialize (per Sprint 1's own
   walkthrough), then **cancel or refund that order on the Mercado Libre sandbox side**. Within ≤30 min,
   confirm at `/shop/manage/orders/<id>`: the order shows cancelled, and the product's stock in Medusa
   admin inventory is back to its pre-sale level (restocked exactly once — check inventory before/after,
   not just "some restock happened").
8. Replay the same ML cancel notification (or simply wait for the next `*/30` reconcile pass to see the
   same order again) — confirm nothing changes a second time (no double-restock, order stays cancelled).
9. Confirm the seller received the cancellation notification on whichever channels they have ON for
   "Pedidos" (email inbox / push / Telegram) — the copy should read as a Mercado Libre cancellation, in
   es-MX.
10. On a **different**, non-entitled seller shop (paywall on, no grant, no subscription) with
    `ml.orders_enabled` ON globally: place an ML-sandbox sale. Confirm the product's stock still
    decrements (S4 behavior unchanged) but **no** Medusa order materializes — the entitlement gate holds
    even with the global flag on.
11. On that same non-entitled shop, confirm `/shop/manage/mercadolibre` shows the upsell (not the toggle)
    — the live confirmation of step 6's UI check against a real non-entitled account.
12. Ship a real ML-sandbox order to `shipped` then `delivered` on an **entitled** shop — confirm the
    seller gets a notification for each transition (this is new in Sprint 2; Sprint 1 only proved the
    order's own status stepper advances, not that the seller was told).
