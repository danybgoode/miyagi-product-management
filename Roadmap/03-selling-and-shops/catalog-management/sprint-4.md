# Catalog management — Sprint 4: Profit columns (gated on profit-analyzer)

**Status:** ✅ MERGED 2026-07-10 — backend PR [#77](https://github.com/danybgoode/medusa-bonsai-backend/pull/77)
squash `d094129`, frontend PR [#209](https://github.com/danybgoode/miyagisanchezcommerce/pull/209) squash
`469f6f4`. Both branches cut fresh off `origin/main` in `apps/.worktrees/catalog-management-s4{,-backend}`
(worktrees removed post-merge). Cross-agent (Antigravity/agy) review on both PRs caught and fixed 4 real
issues pre-merge (see below); an independent `pr-reviewer` pass on the frontend PR caught a 5th
(unconditional `delta_cents` write — a deploy-ordering hazard that would have broken the already-live
`catalog.bulk_enabled` feature, not just this sprint's new action type). Mid-merge, a sibling PR
(`#208`, Seller-portal rails foundation) landed on `main` and introduced a real conflict in
`CatalogTable.tsx` (a shared `Toast`/`useToast` extraction) — resolved via a 3-way `git merge-file`,
verified green (tsc + build + specs) before pushing. **Risk tier: HIGH** (Story 4.2 is a live price
mutation + Mercado Libre push) — Daniel explicitly authorized merging on green CI + clean review, with
the **live money-path smoke owed post-merge** (not a pre-merge blocker for this pair, by his explicit
call — see the walkthrough below). `delta_cents` migration applied to prod same day. **Partial live
smoke run 2026-07-10** on a real Chrome session (no test-account sales history available) — everything
short of the actual money-path apply confirmed working in prod; the money-path leg (a real sold product's
suggested price actually applying to Miyagi + ML) is still owed — see the walkthrough's per-step status.

### Review findings — caught and fixed pre-merge
Both PRs went through cross-agent (Antigravity/agy) advisory review + an independent `pr-reviewer`
subagent pass (fresh agent, no build context). Real findings, fixed before merge:
- **Backend `1ef9f95`:** `computeBulkDiff`'s `apply_suggested_price` case called `action.items.find()`
  with no guard against a non-array/missing `items` on a malformed request body — the TS type guarantees
  it, but an actual HTTP body isn't runtime-checked. Would have thrown an unhandled `TypeError` instead of
  a clean per-row invalid result.
- **Frontend `ab92629`:** `BulkActionBar`'s suggested-price solve fetched the ML fee estimate at the
  *current* price only — if the solved candidate price crosses a fee bracket threshold, the actually-
  charged fee differs and the seller's target margin silently misses. Added a second solve pass that
  re-fetches the fee estimate AT the candidate price before staging, mirroring `PricingCard`'s own
  `startConfirm()` re-verification precedent.
- **Frontend `ab92629`:** `profit-bulk-apply.ts` swallowed a non-JSON gateway response (e.g. a 502/504
  HTML error page) into the same generic message a real business rejection gets. Now surfaces the HTTP
  status so an infrastructure drop is distinguishable from an honest apply-price rejection.
- **Frontend `2d0732d` (the real one — caught by the independent `pr-reviewer` pass, not agy):**
  `stageBulkAction`/`stageBulkActionAsAgent` wrote `delta_cents` into **every** batch-item insert
  regardless of action type. A Supabase INSERT referencing an unknown column errors regardless of the
  value — if the frontend deploys before the `delta_cents` migration lands on a given environment, every
  bulk action (not just this sprint's new one) would 500. Fixed to only include the key when the action
  type actually populated it, so the other 7 types' insert payload is byte-identical to before this
  column existed — deploy order between the frontend and the migration no longer matters for them.
- **Dismissed after verification** (both review passes independently confirmed these are non-issues or
  out of scope, not glossed): the "Rule 3 agent-accessibility violation" finding on both PRs (deferring
  `apply_suggested_price` from MCP) — re-derived against the actual codebase, there is no cheap way to
  expose this to agents without either forking the pricing formula server-side (explicitly forbidden by
  this story's own acceptance) or building a full agent-facing equivalent of the ledger + live ML
  fee-estimate compute seam; mirrors 3 existing precedent exclusions from Sprint 3
  (`pause_activate`/`delete`/`publish_channel(ml)`). A "quantity undercounting" finding on
  `computeSkuMarginsByChannel`'s line-attribution fallback — confirmed to be copied verbatim from the
  already-shipped (2026-07-06) `computeSkuMargins`, not introduced by this PR; flagged as a real,
  pre-existing, out-of-scope issue worth a future follow-up seed, not this PR's fix. A "fragile
  signature-based routing" finding on `rejectOrchestrationOnlyPatch`'s new guard — re-verified against
  all 8 `computeBulkDiff` cases: zero collision risk today (no other action type sets `variant_id` in its
  patch), consistent with the codebase's existing `ml_enabled`/`metadata.paused` presence-based guards.
  A "timeout hazard on sequential batch apply" finding — confirmed to be a pre-existing architectural
  characteristic shared by all 4 frontend-orchestrated `applyBulkBatch()` branches
  (`pause_activate`/`delete`/`publish_channel(ml)`/`apply_suggested_price`), not newly introduced.

## Design notes (from planning + build)
- **4.1's per-channel margin** needed a new additive pure function,
  `computeSkuMarginsByChannel()` in `lib/profit.ts` (bucket key gains `::${source}`) — the existing
  `computeSkuMargins()` (dashboard) is untouched, zero regression risk to its own spec.
- **4.1's "sin COGS" acceptance actually needed a THIRD cell state**, not named in the original acceptance
  text: a never-sold product has no ledger row at all (`no_sales`), distinct from a sold product with no
  COGS set (`no_cogs`) — conflating them would mislabel unsold inventory as a data-entry gap. `lib/catalog-margin.ts`'s
  `deriveProductMargin()` renders all three states, never a fake number.
- **4.1's sort-by-margin is client-side, current page only** — margin is a bounded, in-memory ledger
  aggregate with no persisted/indexed product field, so it deliberately does not extend the URL-driven
  server sort (`lib/catalog-query.ts`). Labeled "esta página" in the UI so it's never mistaken for a
  full-catalog sort.
- **4.2's suggested price is computed ONCE, client-side** (`BulkActionBar.tsx`, via the already-shipped
  `solveForPrice()` + a live ML fee-estimate fetch per selected product) — the backend's new
  `apply_suggested_price` action type only validates + previews an already-solved price (mirrors how
  `/store/sellers/me/profit/apply-price` already trusts a caller-computed price with no server-side
  re-derivation). This was a real design correction mid-planning: an earlier draft assumed the backend
  would re-derive the price and needed its own copy of `solveForPrice` — that would have been exactly the
  "forked formula" the acceptance forbids.
- **4.2 rejects multi-variant products at STAGE time** — `updateSellerProduct` already 422s a multi-variant
  price patch with no `variant_id` today (existing `price_set`/`price_pct` can silently fail per-row at
  *apply* time on these products, invisible in preview); the new action type surfaces this explicitly in
  the diff preview instead.
- **4.2's apply step needed its own explicit branch in `applyBulkBatch()`** (a 4th frontend-orchestrated
  type, alongside `pause_activate`/`delete`/`publish_channel(ml)`) — without it, the generic backend
  `bulk-apply` route would have silently Miyagi-only-applied a suggested price and never pushed to Mercado
  Libre. `rejectOrchestrationOnlyPatch()` also gained a matching guard (a `{variant_id, price_cents}` patch
  shape is unique to this action type) as defense in depth.
- **4.2 is NOT exposed to MCP agents this sprint** — no agent tool can compute a suggested price (that
  math lives in the browser's `BulkActionBar`, with no MCP equivalent); `isAgentUnsupportedAction()` and
  the internal bulk-stage route both refuse it with a clear message.
- **4.2's confirm-dialog total** needed a new nullable `delta_cents` column on `catalog_bulk_batch_items`
  (additive migration, NULL for the 7 pre-existing action types) — nothing existing computed a dollar
  total, only per-row before/after.
- **4.2 is manual-multi-select only** — "seleccionar todos (N) que coinciden con el filtro" is disabled for
  this action type, since the suggested-price math needs each product's already-loaded ledger/price data,
  which only exists for products on the currently-rendered page.

## Stories

### Story 4.1 — Margin columns + killer flags ✅ built
**As a** seller, **I want** estimated margin per product per channel in the catalog table (Miyagi vs ML, after fees/shipping/COGS), with margin-killer flags, **so that** the table tells me where I'm silently losing money.
**Acceptance:** consumes profit-analyzer's `lib/profit.ts` + fee estimator (no forked formula); products without COGS show "sin COGS" (link to set it), never a fake margin; behind `ops.profit_enabled`; sortable by margin.
**Risk:** MED
**Built:** frontend, part of PR #209 (squash `469f6f4`) — `computeSkuMarginsByChannel()` (`lib/profit.ts`),
`lib/catalog-margin.ts`'s `deriveProductMargin()` (three-state cells, killer-flag delegated to
`classifyMarginKillers`), `CatalogTable.tsx`'s Margen column + client-only "ordenar por margen (esta
página)" toggle, `page.tsx`'s flag-gated ledger fetch + `force-dynamic`. No backend changes.

### Story 4.2 — Bulk apply suggested prices ✅ built
**As a** seller, **I want** to select underpriced products and bulk-apply the suggested price through the staged pipeline, **so that** repricing is one reviewed action.
**Acceptance:** rides S3's staged diff (old price → suggested price per row); applies via profit-analyzer's apply path (Miyagi price + ML via publish parity, respecting `ml.publish_enabled`); confirm dialog totals the change; audited.
**Risk:** HIGH
**Built:** backend PR #77 (squash `d094129`) — `BulkActionPayload`'s new `apply_suggested_price` variant +
`computeBulkDiff`'s new case (multi-variant rejection, ownership via the existing `pairs` resolution,
`delta_cents`), `rejectOrchestrationOnlyPatch()`'s new guard, `ops.profit_enabled` gate on this action
type specifically (store route flag-gates; internal/agent route refuses it outright), MCP internal route
explicitly refuses it. Frontend PR #209 (squash `469f6f4`) — `BulkActionBar.tsx`'s "Aplicar precio
sugerido" (client-side `resolveSuggestedPriceCandidate` + a two-pass fee-estimate fetch + `solveForPrice`,
small-batch concurrency — re-verifies the fee AT the candidate price before staging),
`lib/profit-bulk-apply.ts`'s `applySuggestedPriceItem()` (one HTTP call per item to the existing
apply-price route, mirrors `listing-status.ts`'s style), `applyBulkBatch()`'s 4th branch,
`isAgentUnsupportedAction()` entry, `BulkDiffPreview.tsx`'s totals line, new `delta_cents` migration
(`supabase/migrations/20260710170000_catalog_bulk_delta_cents.sql`, additive/nullable — **owed: apply to
prod Supabase before or alongside flipping this feature on**; the write path degrades gracefully if it
hasn't landed yet, since `delta_cents` is only included in the insert for this one action type).

## Sprint QA
- **api spec(s):**
  - `e2e/catalog-margin.spec.ts` — `deriveProductMargin()` (all three cell states, killer-flag delegation,
    multi-variant aggregation) + `resolveSuggestedPriceCandidate()` (eligibility: no-sales, multi-variant
    ambiguity, wrong channel, pending COGS, zero units/revenue, missing variant_id).
  - `e2e/profit.spec.ts` — `computeSkuMarginsByChannel()` boundary tests (same-formula-as-blended
    single-channel case, both-channels split, unassigned bucket never source-qualified).
  - `apps/backend/.../catalog-bulk.unit.spec.ts` — `computeBulkDiff`'s `apply_suggested_price` case (valid
    patch + delta_cents, multi-variant rejection, missing-item rejection, invalid-price rejection,
    null-delta when no current price) + `rejectOrchestrationOnlyPatch`'s new guard.
  - `e2e/catalog-bulk-apply-suggested-price.spec.ts` — auth-gate coverage on the three bulk routes for a
    body shaped like this action type specifically.
- **browser smoke owed:** yes, to Daniel, **post-merge** (explicit call, HIGH-tier gate consciously
  deferred rather than blocking this merge) — **money path**: apply the `delta_cents` migration to prod
  Supabase, then bulk-apply suggested prices on 3 test products, verify Miyagi PDP + ML listing both
  update, per the walkthrough below.
- **deterministic gate:** backend `medusa build` → `tsc --noEmit` → `npm run test:unit` green (318/318
  locally pre-merge, CI green on the merged PR); frontend `tsc --noEmit` + `npm run build` + Playwright
  `api` green both locally and on CI against the real branch preview (the merge commit's own CI run
  — `29130705888` — passed after resolving a real conflict with a same-day sibling PR, #208)

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com. **Both PRs merged 2026-07-10, `delta_cents` migration applied
same day. Partial live smoke run 2026-07-10 (Claude + Daniel, real Chrome session): everything short of the
actual money-path apply is confirmed live in prod. The money-path leg (steps 3-4 against a product with
REAL sales history) is still owed — genuinely can't be faked without executing a real payment.**

0. ✅ **DONE 2026-07-10.** `delta_cents` migration applied directly via Supabase MCP (`ALTER TABLE
   catalog_bulk_batch_items ADD COLUMN delta_cents INTEGER` — nullable/additive, zero data risk). Verified
   via `information_schema.columns`; `get_advisors` shows no new issues, same pre-existing RLS-info-level
   pattern as the rest of `catalog_bulk_*`.
1. ✅ **DONE 2026-07-10** (partial — no real sales data available on the test account, see below).
   `ops.profit_enabled` confirmed ON in prod (Margen column rendered without any extra flip needed).
   Created a disposable test listing ("TEST S4 SMOKE — borrar después", VP Shops account, no order
   history) → Margen column showed **"Miyagi: sin ventas"** exactly as coded — confirms the `no_sales`
   state, the flag gate, and the whole margin-cell pipeline render correctly end-to-end in prod. Could NOT
   verify the "sin COGS" or "computed" cell states — this account had no product with either real sales or
   a COGS-but-no-sale history, and fabricating ledger rows directly would test against fake data, not a
   real smoke. **Owed:** verify "sin COGS" and "computed" states + margin-killer flag on a shop with real
   order history.
2. ✅ **DONE 2026-07-10.** Clicked "Margen (esta página)" — header toggled to show an ascending-sort
   indicator (↑), confirming the client-side sort state machine works. Full reorder behavior across
   multiple rows with real margins is still owed (only 1 row existed on the test account).
3. ⬜ **STILL OWED — money path, needs a shop with real sales + COGS.** Select products with sales
   history + COGS, bulk action → "Aplicar precio sugerido", set a target margin, Previsualizar → verify
   the diff + confirm-dialog total.
   **Partial confirmation done 2026-07-10:** selecting a product with NO sales and choosing "Aplicar
   precio sugerido" correctly showed the real client-side ineligibility message — **"Ninguno de los
   productos seleccionados tiene datos suficientes (ventas registradas + costo unitario) para sugerir un
   precio."** — no crash, no backend call made (client-side short-circuit confirmed working). This proves
   `resolveSuggestedPriceCandidate()`'s `no_sales` rejection path is live and correct, but NOT the
   happy-path diff/total rendering (needs a real eligible candidate).
4. ⬜ **STILL OWED — the actual money path.** Aplicar on a real eligible batch → verify Miyagi PDP + the
   ML-linked listing both update + `catalog_bulk_audit_log` + `ml_sync_event` `price_apply` entries.
   **Regression check done instead, 2026-07-10:** ran the PRE-EXISTING `price_pct` bulk action (Sprint 3,
   unchanged action type) end-to-end on the disposable test listing — staged $250→$275, applied, confirmed
   "1 aplicado" and the new price persisted on reload. This proves my Sprint 4 changes (the new 4th branch
   in `applyBulkBatch()`) did NOT break the existing bulk-apply pipeline — a real, live regression check —
   but is not a substitute for exercising the NEW `apply_suggested_price` branch itself, which still needs
   a product with real sales.
5. ⬜ **Not cleanly verified 2026-07-10** — the test account only had 1 total product, so the
   "seleccionar todos" prompt was already suppressed by 100%-selection alone; that run couldn't isolate
   whether the action-type-specific hiding logic itself fires. Needs a shop with >1 product: select a
   subset (not all), pick "Aplicar precio sugerido", confirm "seleccionar todos que coinciden con el
   filtro" still doesn't appear (unlike every other action type, where it would).
6. ⬜ **Still owed.** Select a multi-variant product alongside eligible ones, bulk action → "Aplicar
   precio sugerido" → Previsualizar.
   → That row shows an inline validation error ("varias variantes") rather than a silently wrong price;
   the other rows still preview correctly.

If any step fails, note the step number + what you saw — that's the bug report.

**Summary of 2026-07-10's partial smoke:** verified live — the flag gate, the `no_sales` margin state,
the sort-toggle interaction, the `apply_suggested_price` ineligibility path (real client-side check, no
crash), and a full regression pass on the pre-existing `price_pct` bulk pipeline (proving Sprint 4's new
`applyBulkBatch()` branch didn't break the old one). **Not yet verified** (all require a shop with real
order history + COGS, which wasn't available in this session): the "sin COGS"/"computed" margin states,
margin-killer flagging, the actual suggested-price diff+total render, the money-path apply (Miyagi + ML
both updating), and the multi-variant rejection at stage time.
