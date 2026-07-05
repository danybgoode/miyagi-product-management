# Catalog management — Sprint 4: Profit columns (gated on profit-analyzer)

**Status:** ⬜ not started · **Hard gate: profit-analyzer US-4 (fee estimator + `lib/profit.ts`) must be merged first.**

## Stories

### Story 4.1 — Margin columns + killer flags
**As a** seller, **I want** estimated margin per product per channel in the catalog table (Miyagi vs ML, after fees/shipping/COGS), with margin-killer flags, **so that** the table tells me where I'm silently losing money.
**Acceptance:** consumes profit-analyzer's `lib/profit.ts` + fee estimator (no forked formula); products without COGS show "sin COGS" (link to set it), never a fake margin; behind `ops.profit_enabled`; sortable by margin.
**Risk:** MED

### Story 4.2 — Bulk apply suggested prices
**As a** seller, **I want** to select underpriced products and bulk-apply the suggested price through the staged pipeline, **so that** repricing is one reviewed action.
**Acceptance:** rides S3's staged diff (old price → suggested price per row); applies via profit-analyzer's apply path (Miyagi price + ML via publish parity, respecting `ml.publish_enabled`); confirm dialog totals the change; audited.
**Risk:** HIGH

## Sprint QA
- **api spec(s):** margin-column deriver (delegates to `lib/profit.ts` — assert no formula fork) · suggested-price batch spec
- **browser smoke owed:** yes, to Daniel — **money path**: bulk-apply suggested prices on 3 test products, verify Miyagi PDP + ML listing both update
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. With `ops.profit_enabled` ON and COGS set on 3 products, open /shop/manage/catalogo.
   → Margen columns render per channel; a product without COGS shows "sin COGS" with a set-it link.
2. Sort by margen ascending.
   → Margin killers float up, flagged.
3. Select the 3, bulk action → "Aplicar precio sugerido" → Previsualizar.
   → Diff shows old → suggested per row with the margin delta.
4. (money path) Aplicar.
   → Miyagi PDPs show new prices; the ML-linked one updates on ML; audit logged.

If any step fails, note the step number + what you saw — that's the bug report.
