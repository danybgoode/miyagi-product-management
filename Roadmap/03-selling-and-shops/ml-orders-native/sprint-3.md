# Sprint 3 — Workflow: tags, bulk actions, agent parity

> Epic: [ml-orders-native](README.md) · Risk: **HIGH** for merge purposes (US-8's extraction touches a
> fulfillment-adjacent endpoint) · Mostly frontend; flag-flip candidacy after this sprint's smokes are
> green.
>
> ✅ **MERGED 2026-07-06** (Daniel authorized "merge on green, same order" in-conversation): **backend
> [#59](https://github.com/danybgoode/medusa-bonsai-backend/pull/59) → `0611d73`** first, then
> **frontend [#174](https://github.com/danybgoode/miyagisanchezcommerce/pull/174) → `bef747d`**;
> branches deleted. Pre-merge both branches were refreshed against latest `main` (clean merges), gates
> re-run green, and the owed cross-review ran (antigravity — no real findings; triage on both PRs).
> `ml.orders_enabled` + `ops.profit_enabled` were flipped ON by Daniel 2026-07-06 (00:26 UTC).
>
> **Scope-doc correction found during planning:** US-9 was framed as "verify-not-build" — the epic
> README's "what already exists" line claims seller MCP order tools already exist. Direct code research
> (`app/api/ucp/mcp/route.ts`'s full `TOOLS` array + `tools/call` switch) found this **false**: no
> order-read MCP tool existed anywhere, and the seller MCP's `ms_agent_…` bearer-token auth
> (`lib/agent-auth.ts`) has no path into the Clerk-gated `/store/sellers/me/orders` route at all. US-9
> below is real (but low-risk, additive, auth-gated) new build, not a verification pass.

## Stories

### US-7 · Order tags: manual CRUD + automatic source tag — low ✅
**Built:** both repos. Tags ride `order.metadata.tags: string[]` — Medusa's Order module has no native
tags concept (unlike Product's real `ProductTag` many-to-many), and every other cross-cutting order flag
in this codebase already rides `metadata` (`source`, `fulfillment_state`, etc.), so this follows the same
pattern rather than a new module/table. New `PATCH /store/sellers/me/orders/:id/tags` (single add/remove
op, not a full-array replace — safer under concurrent edits from two tabs/agents), server-normalized
(trim, cap 30 chars, case-insensitive dedupe). `materializeMlOrder` now stamps `tags: ['mercadolibre']` at
the same spot it already sets `source: 'mercadolibre'`. `normalizeMedusaOrder` surfaces the curated
`tags` field. Frontend: new pure `lib/order-tags.ts` (mirrors `lib/ml-order-badge.ts`) backs a tag chip
editor on `OrderDetail.tsx` and a client-side tag-filter row on `OrdersInbox.tsx` (all orders are already
fetched upfront — no new API call needed for filtering).

### US-8 · Bulk select + bulk fulfillment-status actions — med ✅
**Built:** both repos. Extracted the single-order PATCH's manual-payment eligibility gate + two-workflow
"shipped" dance (`createOrderFulfillmentWorkflow` + `createOrderShipmentWorkflow`) + metadata write into
new `lib/order-status-transition.ts` — behavior-preserving (`[id]/route.ts`'s `PATCH` is now a thin
wrapper around `applyOrderStatusTransition`). New `PATCH /store/sellers/me/orders/bulk-status` reuses it
for **status-only** bulk transitions (processing/shipped/delivered — no bulk carrier/tracking entry; that
matches what the single-order route already supports with just `{status}`). Per-order try/catch loop
(mirrors `reconcile-ml-order-status.ts`'s partial-failure idiom) — one order's failure or ineligibility
never aborts the batch; returns `{ advanced, skipped: [{order_id, reason}] }`. Source-agnostic by
construction (the shared function has no ML/native branching), so mixed selections need zero
special-casing. Frontend: `OrdersInbox.tsx` gets `Set<string>` multi-select (checkbox per card, sited
outside the `<Link>` so it never triggers navigation — the one existing precedent,
`MercadoLibreImport.tsx`, uses the same selection shape but a different visual convention; this reuses the
interaction pattern, not the styling) + a sticky bulk-action bar.

### US-9 · Agent-surface parity — low ✅ (reclassified: real build, not verify)
**Built:** both repos. Extracted `listOrdersForSeller()` from the Clerk-gated `GET` (behavior-preserving)
+ new `GET /internal/sellers/orders?seller_slug=<slug>` (`x-internal-secret`-gated, mirrors
`internal/seller-products/[id]/route.ts`'s exact auth-bridge shape — the agent token has no Clerk JWT to
reach the existing seller route). Frontend: new `lib/agent-orders.ts` bridge + a new `list_orders` MCP
tool (status/source/limit filters) registered in `MCP_SELLER_TOOLS` + `UCP_CAPABILITIES`
(`'seller_orders'`) + the manifest's `endpoints.seller_orders` block — all three stay consistent since
this repo's `lib/ucp/capabilities.ts` is the single source of truth for agent-facing surface.

## Sprint QA

- **Api specs, one per story:** `e2e/order-tags.spec.ts` (US-7, 12 pure-logic tests — normalize/add/
  remove/dedupe, including the automatic `mercadolibre` tag round-tripping like any other); backend
  `src/lib/__tests__/order-status-transition.unit.spec.ts` (US-8, 6 tests — the bulk-eligibility
  predicate the sprint doc names explicitly); `e2e/mcp-order-read.spec.ts` (US-9, 4 tests — `tools/list`
  shape, auth rejection never leaking scope, manifest wiring). Also `e2e/orders-bulk-status.spec.ts`
  (3 tests, route-guard/never-500 for the bulk-status proxy).
- **Deterministic gate, both repos, green:** backend `medusa build` → `tsc --noEmit` →
  `npm run test:unit` (the new eligibility spec, 6/6). Frontend `tsc --noEmit` → `next build` →
  `npm run test:e2e` (api project) run **against a local dev server** (not just the default prod
  baseURL, so the new code was actually exercised, not prod's pre-existing behavior) — **1306 passed**;
  16 pre-existing/environmental failures (empty local seed data for catalog/homepage specs — none touch
  orders, tags, bulk-status, or the MCP tool).
- **Owed to Daniel:** the `ml.orders_enabled` flag-flip decision (unchanged by this sprint — still gated
  on the Sprint 1/2 prod migration + live smoke); a real batch-day walkthrough (tags + bulk-ship on live
  seller data); the `list_orders` live agent round-trip (no `ms_agent_…` test-token fixture exists yet,
  same fixture gap `e2e/agent-connector.spec.ts` already notes — provisioning one is a one-time ask,
  same shape as the existing `MS_TEST_*` secrets).

## Sprint 3 — Smoke walkthrough (do these in order)

**Deterministic (agent-run, ✅ done pre-merge):**
1. Backend: `cd apps/backend && npx medusa build && npx tsc --noEmit && npm run test:unit` → build
   succeeds, `tsc` clean, the new `order-status-transition.unit.spec.ts` passes 6/6.
2. Frontend: `cd apps/miyagisanchez && npx tsc --noEmit && npx next build` → clean typecheck, build
   succeeds.
3. Frontend, against a local `medusa develop` (:9000) + local `next dev` (:3001) round-trip —
   `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test --project=api` → the three new specs
   (`order-tags`, `orders-bulk-status`, `mcp-order-read`) all pass against the REAL new code (not prod's
   pre-existing behavior); full suite 1306 passed / 16 pre-existing failures (see Sprint QA).
4. CI green on both draft PRs before requesting a Daniel merge — backend #59
   (`Type-check + build + unit`), frontend #174 (`Type-check + build`, `Playwright vs preview`).

**Post-merge, backend (Cloud Run, ~12 min, no preview) — agent-run API smoke (✅ run 2026-07-06,
revision `medusa-web-00136-jfh`): step 5 health → 200; step 6 bulk-status unauthenticated → 401;
step 9 manifest `endpoints.seller_orders` + `"seller_orders"` capability → live. Steps 7–8 (authed
browser) fold into Daniel's batch-day walkthrough below.**
5. `curl https://medusa-web-91083034475.us-east4.run.app/health` → `200 OK` on the revision matching
   this sprint's merge commit.
6. `curl -X PATCH https://medusa-web-91083034475.us-east4.run.app/store/sellers/me/orders/bulk-status`
   with no auth header → `401` (route exists, Clerk gate holds).

**Post-merge, frontend (Vercel preview on the PR, then prod):**
7. Now live on `https://miyagisanchez.com`: sign in as a seller with at least one order, open
   `/shop/manage/orders/<id>`, add a tag via the new "Etiquetas" section, refresh the page — the tag
   persists.
8. On `/shop/manage/orders`, check the checkbox on 2–3 orders — the sticky bulk-action bar appears with
   the selected count; click "Procesando" — the bar shows a summary ("N pedidos actualizados") and the
   selection clears.
9. `curl https://miyagisanchez.com/api/ucp/manifest | jq '.endpoints.seller_orders'` → the block exists
   with `mcp_tools: ["list_orders"]`, and `.capabilities` includes `"seller_orders"`.

**Owed to Daniel (money/auth/live-ML-sandbox — cannot be automated from this session):**
10. On a shop with the ML sync entitlement + `ml.orders_enabled` ON: place a real ML-sandbox purchase so
    it materializes, confirm it arrives on `/shop/manage/orders` already tagged `mercadolibre` (US-7's
    automatic tag, live).
11. On that same shop, select 3 orders that mix a native Miyagi sale AND the ML-sandbox order from step
    10, bulk-mark them "Enviado" — confirm each eligible order advances and, if one is a manual-payment
    order not yet confirmed, it's skipped with the "Aún no confirmas el pago…" reason shown (not silently
    forced or silently dropped).
12. Provision one `ms_agent_…` shop-agent token (via the shop's "Agentes e integraciones" settings) for
    the same shop, then call `list_orders` over MCP (Claude Desktop or a raw JSON-RPC `tools/call`) —
    confirm the ML-sandbox order from step 10 appears with `source: "mercadolibre"` and its tag, and that
    filtering by `source: "miyagi"` excludes it.
