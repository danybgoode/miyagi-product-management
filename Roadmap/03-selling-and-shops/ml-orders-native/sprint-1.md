# Sprint 1 — The spine: idempotency + ML order materialization + state mapping

> Epic: [ml-orders-native](README.md) · Risk: **HIGH** (Daniel merges) · Backend-first; dark behind
> `ml.orders_enabled` (default OFF).
>
> **✅ MERGED 2026-07-03** — backend PR [#57](https://github.com/danybgoode/medusa-bonsai-backend/pull/57)
> squashed to `28f4e15` (the per-story commits below, `473b632`/`22b797e`/`860175e` + 4 cross-review fix
> commits, are now superseded by the squash — kept here as the build history); frontend PR
> [#170](https://github.com/danybgoode/miyagisanchezcommerce/pull/170) squashed to `c77a63c`. Daniel
> authorized the merge in-conversation after CI green + 4 rounds of cross-agent review (see Sprint QA
> below). **Still owed before the flag can safely flip ON:** prod `medusa db:migrate` for the new
> `ml_applied_order` table, then the live ML-sandbox smoke (steps 7–12 below).
> **Plan-mode prerequisite:** read the S4 stock-sync code on fresh `origin/main` (local backend
> checkout is stale) and decide the inventory seam: order-creation-with-reservation supersedes the S4
> delta for linked products, or order created inventory-neutral with the delta kept. One ML order =
> exactly one inventory effect. Also confirm in the ML sandbox the exact per-order fee/shipping field
> shapes (`sale_fee_details`, shipments) — capture them in order metadata from day one (Epic B needs them).
>
> **Plan-mode decisions (recorded, see the plan file for full rationale):**
> - **Inventory seam:** order materialization is inventory-neutral by construction — composes
>   `createOrdersStep` directly (confirmed against the installed `@medusajs/core-flows` package: no
>   reservation/stock-adjustment step, unlike the full `createOrderWorkflow`) instead of going through
>   cart completion. The S4 stock decrement (`decrementProductStock` in `ml-sync-apply.ts`) stays the
>   ONLY inventory effect, flag on or off; both effects are gated by the same new `ml_applied_order`
>   durable table, written inside the same per-link Redis lock.
> - **Fee/shipping shapes:** couldn't be confirmed against a live ML sandbox order from this session (no
>   running backend/DB, no test seller token). Rather than guess field names, `materializeMlOrder`
>   captures the FULL raw `GET /orders/:id` and `GET /shipments/:id` responses verbatim on order
>   metadata (`ml_raw_order`, `ml_raw_shipment`) — whatever ML actually calls its fee/shipping fields,
>   they're captured from day one. **Owed to Daniel:** eyeball `ml_raw_order`/`ml_raw_shipment` on one
>   real sandbox order before Epic B (profit-analyzer) starts parsing them.
> - **US-2 webhook scope:** ships reconcile-poll-driven only (`reconcile-ml-order-status`, `*/30`,
>   ≤30 min latency). Mercado Libre has a distinct `shipments` webhook topic for real-time updates, but
>   subscribing to it needs an ML-developer-portal config change this session couldn't make or verify —
>   a stated fast-follow, not an oversight.

## Stories

### US-0 · Durable idempotency table — high ✅
**Built:** `apps/backend` `473b632`. New `ml_applied_order` model/migration, `unique(link_id,
ml_order_id)` — supersedes the capped 500-entry `ml_applied_orders` metadata ring (fully removed, not
left dual-written). Pure decision fn `decideMlOrderApply` (skip if a row exists, regardless of the
flag; else apply, materializing an order only when the flag is on) + `isUniqueViolationError` (defense
in depth against a lock-service-outage race) in `sync-utils.ts`, unit-tested in `ml-sync.unit.spec.ts`.

### US-1 · Materialize a paid ML order as a Medusa order — high ✅
**Built:** `apps/backend` `473b632`. `lib/ml-order-materialize.ts` — idempotent find-or-create the
"Mercado Libre" sales channel; resolves the linked product/variant; builds line items from the ML
order's own `unit_price` (the real transaction, not the live Miyagi listing price); `customer_id` is
deliberately omitted (optional on `CreateOrderDTO`, confirmed against `@medusajs/types`) rather than
standing up a guest-customer subsystem — ML buyers get no Clerk account (AGENTS rule #4). Wired into
`applyMlOrderToLink` (`ml-sync-apply.ts`) inside the same lock as the stock decrement. New
`getShipmentDetail` client fn. `ml.orders_enabled` flag added to both apps (enablement, default OFF).
Secret-gated `/internal/ml/materialize-order` route (the "materialization contract" for the api spec).
**Scope note:** keyed per LINK — an ML order selling from two different linked products becomes two
separate single-item Medusa orders (both carry the same `ml_order_id`), not one combined order.

### US-2 · ML → Medusa state mapping — high ✅
**Built:** `apps/backend` `22b797e`. Pure `mapMlOrderStatusToFulfillment` (paid + shipped/delivered →
the matching transition; everything else — pre-payment, `not_delivered`/`cancelled`, unknown — a
deliberate no-op) + `shouldApplyFulfillmentTransition` (forward-only against real Medusa
`FulfillmentStatus` ranks; a `canceled` order never auto-advances) in `sync-utils.ts`. Applied by the
new `reconcile-ml-order-status` job (`*/30`), reusing the SAME `createOrderFulfillmentWorkflow` /
`markOrderFulfillmentAsDeliveredWorkflow` the seller's manual ship action and the Envia tracking
webhook already use — no new fulfillment primitive.

### US-3 · Source badge + ML metadata in the order UI — low ✅
**Built:** `apps/backend` `473b632` (metadata already selected by `normalizeMedusaOrder`, curated into
`source`/`ml_order_id`/`ml_pack_id` top-level fields — no query change needed) + `apps/miyagisanchez`
`0c735b9`. Pure `lib/ml-order-badge.ts` (`isMlOrder`/`mlOrderBadgeLabel`) feeds a small "Mercado Libre"
badge in `OrdersInbox.tsx`'s list + a detail section in `OrderDetail.tsx` with the ML order/pack id.

## Sprint QA

- One api spec per story: idempotency decision fn (US-0, `ml-sync.unit.spec.ts`), materialization
  contract via the pure `buildMlOrderLineItems` seam (US-1, `ml-order-materialize.unit.spec.ts`) +
  the internal route for a live/fixture check, state-mapping pure fns (US-2, `ml-sync.unit.spec.ts`),
  badge pure fn (US-3, `e2e/ml-order-badge.spec.ts`). Pure seams in next-free `lib/`.
- Backend deploys post-merge (no preview): agent runs the prod API smoke + route-deployed probe; the
  **live ML-sandbox money path is owed to Daniel** (below).
- Signature regression: stock moves exactly once with `ml.orders_enabled` ON and OFF — proven by
  `decideMlOrderApply`'s unit spec (an existing row always skips regardless of the flag) plus the
  unchanged `safeDecrement`/`decrementProductStock` path.
- Deterministic gate, both repos, all green locally before PR: backend `medusa build` → `tsc --noEmit`
  → `npm run test:unit` (117/117); frontend `tsc --noEmit` → `next build` → `playwright test
  --project=api` (1296/1297 passing — the one failure, `not-found-shape.spec.ts`'s `/l/wp-admin` check,
  is a pre-existing, previously-documented Vercel Bot Protection false-positive unrelated to this work).
- **Cross-agent review (`scripts/cross-review.mjs`), backend PR #57, 4 rounds** — codex's token was
  revoked mid-run; the script auto-fell-back to Antigravity for rounds 2–4. Real bugs found and fixed:
  (1) `decideMlOrderApply` treated any existing `ml_applied_order` row as a permanent skip — a
  transient materialization failure would silently strand the sale order-less forever with no
  recovery path; added a `retry-materialize` decision that retries ONLY materialization, never a
  second stock decrement. (2) The `shipped` transition only called `createOrderFulfillmentWorkflow`,
  which advances `fulfillment_status` to `fulfilled`, not `shipped` — confirmed against Medusa's own
  docs and the real order-module source; fixed by also calling `createOrderShipmentWorkflow` (and
  reusing an existing fulfillment id on retry, to avoid re-fulfilling already-fulfilled items). (3)
  `buildMlOrderLineItems` blended multiple ML lines for the same item into one combined-quantity/
  last-price line — a real order-total bug if ML ever splits an item across differently-priced lines;
  now emits one Medusa line item per ML line. (4) `materializeMlOrder` could throw uncaught inside the
  lock, skipping `recordAppliedOrder` entirely for a decrement that already committed — wrapped in a
  `safeMaterialize` helper that never throws.
  **Deliberately deferred, not fixed:** if the Redis lock service itself is down AND two deliveries
  race in that exact window, both could decrement stock before either's `ml_applied_order` insert
  resolves the unique-constraint race — the constraint prevents a duplicate DB row/order, not a
  double decrement in that specific failure mode. This is an architectural characteristic inherited
  from the original S4 stock-sync design (not a Sprint 1 regression — the ring-based predecessor had
  the identical exposure, with a weaker guarantee). Fixing it properly means reordering to
  insert-then-decrement (reserving the row via the DB constraint before any inventory write), which
  is a real design change deserving its own pass, not a rushed fix under review pressure. Two other
  claims were checked against Medusa's actual source/types and found FALSE (order totals compute
  correctly from line items via `decorateCartTotals`/`calculateOrderChange`; the delivered-workflow's
  real input type is genuinely camelCase, not snake_case) — declined with the verification, not
  argument. Final state: 117/117 backend tests green.

## Sprint 1 — Smoke walkthrough (do these in order)

**Deterministic (agent-run, done pre-merge):**
1. Backend: `cd apps/backend && npm run build && npx tsc --noEmit && npm run test:unit` → build succeeds,
   `tsc` clean, 14/14 suites · 117/117 tests green (includes the new `ml-sync.unit.spec.ts`
   idempotency/mapping tests and `ml-order-materialize.unit.spec.ts`).
2. Frontend: `cd apps/miyagisanchez && npx tsc --noEmit && npm run build && npx playwright test
   --project=api` → clean typecheck, build succeeds, `e2e/ml-order-badge.spec.ts` +
   `e2e/flags-admin.spec.ts` (15 known flags, including `ml.orders_enabled`) green.

**Post-merge, backend (Cloud Run, ~12 min, no preview) — agent-run API smoke:**
3. `curl -sf https://<prod-backend-url>/health` → `200`, confirms the new revision is live and boots
   clean with the `ml_applied_order` model registered (a broken model registration fails boot, not a
   500 at request time).
4. `curl -i -X POST https://<prod-backend-url>/internal/ml/materialize-order -H "x-internal-secret:
   wrong"` → `401` (route exists, auth gate holds).
5. Confirm the new migration applied: `medusa db:migrate` ran as part of the standard Cloud Run deploy
   (image-only deploys don't run migrations automatically for this backend — **REQUIRED, same pattern
   as the S5 `ml_sync_event` migration**: run it via the connector-attached Cloud Run Job, or the
   deploy runbook's migrate step, before the flag is ever flipped ON). Verify with `\d ml_applied_order`
   against prod Postgres.

**Post-merge, frontend (Vercel, has a preview per PR):**
6. On the PR's Vercel preview: sign in as any seller, open `/shop/manage/orders` → page renders
   unchanged (no ML orders exist yet with the flag OFF) — confirms US-3's UI change is additive, not
   a regression.

**Owed to Daniel (money/auth/live-ML-sandbox — cannot be automated from this session):**
7. In `/admin/flags` (or directly in `platform_flags`), flip `ml.orders_enabled` **ON** — only after
   step 5's migration is confirmed live. *(The flag row seeds via
   `apps/miyagisanchez/supabase/migrations/20260703160000_ml_orders_enabled_flag.sql` at normal
   Supabase deploy — not applied from this build session, per the established "Supabase has no
   separate dev credential" caution.)*
8. Place one real purchase on a seller's **ML sandbox** listing that's linked via `product_ml_link`.
9. Within a few minutes (webhook) or ≤30 min (reconcile fallback): the order appears at
   `/shop/manage/orders` with the "Mercado Libre" badge, correct item/price, and the seller's stock for
   that product decrements **exactly once** (check Medusa admin inventory before/after — no double
   decrement even though both the webhook and the reconcile job may see the same sale).
10. Open the order detail — confirm `ml_order_id` (and `ml_pack_id` if the ML sale was part of a pack)
    render, and (via `medusa exec` or an admin DB query) eyeball `order.metadata.ml_raw_order` /
    `ml_raw_shipment` to confirm the real fee/shipping field names ML sends — this is the confirmation
    step Epic B (profit-analyzer) needs before it starts parsing those blobs.
11. On the ML sandbox order, mark it shipped, then delivered. Within ≤30 min, confirm
    `/shop/manage/orders/<id>` shows `fulfillment_status` advancing to `shipped` then `delivered` (the
    status stepper on the order page reflects it) — proves US-2's reconcile-poll-driven mapping.
12. Flip `ml.orders_enabled` back **OFF**. Place a second ML sandbox sale. Confirm: stock still
    decrements (S4 behavior unchanged) but **no** new Medusa order appears — the flag-off path is
    byte-identical to pre-Sprint-1 behavior.
