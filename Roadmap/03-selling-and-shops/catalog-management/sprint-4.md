# Catalog management — Sprint 4: Profit columns (gated on profit-analyzer)

**Status:** 🚧 built, pre-review/pre-merge · profit-analyzer's US-4 (fee estimator + `lib/profit.ts`) shipped
2026-07-06 (epic ✅) — the hard gate is satisfied. Backend `a3b8efe` (branch `feat/catalog-management`,
worktree `apps/.worktrees/catalog-management-s4-backend`), frontend `8cb0d77`+`194845e` (branch
`feat/catalog-management`, worktree `apps/.worktrees/catalog-management-s4`). Both stories built +
deterministic gate green; **owed: Daniel's money-path smoke** (Story 4.2's live bulk-apply) before merge —
PR risk tier is **HIGH** per the epic's own risk tier (S4 "price writes w/ profit-analyzer").

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
**Built:** frontend `8cb0d77` — `computeSkuMarginsByChannel()` (`lib/profit.ts`), `lib/catalog-margin.ts`'s
`deriveProductMargin()` (three-state cells, killer-flag delegated to `classifyMarginKillers`), `CatalogTable.tsx`'s
Margen column + client-only "ordenar por margen (esta página)" toggle, `page.tsx`'s flag-gated ledger fetch
+ `force-dynamic`. No backend changes.

### Story 4.2 — Bulk apply suggested prices ✅ built
**As a** seller, **I want** to select underpriced products and bulk-apply the suggested price through the staged pipeline, **so that** repricing is one reviewed action.
**Acceptance:** rides S3's staged diff (old price → suggested price per row); applies via profit-analyzer's apply path (Miyagi price + ML via publish parity, respecting `ml.publish_enabled`); confirm dialog totals the change; audited.
**Risk:** HIGH
**Built:** backend `a3b8efe` — `BulkActionPayload`'s new `apply_suggested_price` variant + `computeBulkDiff`'s
new case (multi-variant rejection, ownership via the existing `pairs` resolution, `delta_cents`),
`rejectOrchestrationOnlyPatch()`'s new guard, `ops.profit_enabled` gate on this action type specifically
(both `bulk-stage` routes), MCP internal route explicitly refuses it. Frontend `194845e` —
`BulkActionBar.tsx`'s "Aplicar precio sugerido" (client-side `resolveSuggestedPriceCandidate` +
per-product fee-estimate fetch + `solveForPrice`, small-batch concurrency), `lib/profit-bulk-apply.ts`'s
`applySuggestedPriceItem()` (one HTTP call per item to the existing apply-price route, mirrors
`listing-status.ts`'s style), `applyBulkBatch()`'s 4th branch, `isAgentUnsupportedAction()` entry,
`BulkDiffPreview.tsx`'s totals line, new `delta_cents` migration (not yet applied to prod — lands at
normal deploy time per the merge).

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
- **browser smoke owed:** yes, to Daniel — **money path**: bulk-apply suggested prices on 3 test products, verify Miyagi PDP + ML listing both update
- **deterministic gate:** backend `medusa build` → `tsc --noEmit` → `npm run test:unit` green (350/350, up
  from 317 baseline this session); frontend `tsc --noEmit` + `npm run build` + Playwright `api` green
  locally (1500/1803, matching the pre-existing baseline's pass count — the ~303 failures are a
  pre-existing, unrelated-to-this-branch environmental gap against the `api` project's default prod
  `baseURL`, confirmed via `git status` showing zero changes to any of the affected routes; CI's run
  against the real branch preview is the authoritative gate before merge)

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. With `ops.profit_enabled` ON and COGS set on 3 products (at least one never sold, one sold with no
   COGS, one sold with COGS), open `/shop/manage/catalogo`.
   → Margen column renders per channel: the never-sold product shows "sin ventas", the sold-no-COGS one
   shows "sin COGS" with a link to set it, the third shows a real margin number.
2. Click "Margen (esta página)" to sort ascending, then descending.
   → Rows with a real margin reorder; margin-killer rows (below 5%) show a red flag (⚠); rows with no
   computed margin always sort last regardless of direction.
3. Select 3 products that each have sales history + COGS set, bulk action → "Aplicar precio sugerido",
   set a target margin (e.g. 25%), click Previsualizar.
   → Diff shows old → suggested price per row; a confirm-dialog total line shows the net $ change across
   the batch (not just per-row).
4. (money path) Aplicar.
   → Miyagi PDPs show the new prices; the ML-linked one among the three updates on Mercado Libre too;
   `catalog_bulk_audit_log` records the batch with actor + before/after; the backend's `ml_sync_event`
   log shows a `price_apply` entry per item.
5. Try "seleccionar todos que coinciden con el filtro" with "Aplicar precio sugerido" selected as the
   action.
   → The "seleccionar todos" prompt doesn't appear for this action type (manual selection only, by design).
6. Select a multi-variant product alongside the eligible ones, bulk action → "Aplicar precio sugerido" →
   Previsualizar.
   → That row shows an inline validation error ("varias variantes") rather than a silently wrong price;
   the other rows still preview correctly.

If any step fails, note the step number + what you saw — that's the bug report.
