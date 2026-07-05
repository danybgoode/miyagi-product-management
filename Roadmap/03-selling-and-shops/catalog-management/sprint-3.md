# Catalog management — Sprint 3: Staged bulk actions

**Status:** ⬜ not started

> ⚠️ **Plan-mode gate:** bulk mutations must run as a Medusa workflow / batch endpoint, never N
> sequential route calls (500-row batches). ML-bound actions respect the ml-sync client's rate
> limiting/queue. The apply path ships behind fail-safe **`catalog.bulk_enabled` (OFF)** until
> Daniel's smoke.

## Stories

### Story 3.1 — Select-across-filter → staged diff → apply
**As a** seller, **I want** to select all products matching my filter, build a bulk change, and see a **preview diff (old → new per row, validation errors inline)** before anything applies, **so that** a bulk edit can never silently wreck my live catalog (the eBay failure mode).
**Acceptance:** selection persists server-side per staged batch (survives refresh — the Shopify failure mode); apply is idempotent (re-apply skips done rows); per-row failures reported individually, partial apply never silent; every batch lands in the audit log with actor + before/after.
**Risk:** HIGH

### Story 3.2 — Action set v1
**As a** seller, **I want** bulk: price set / ±% , publish/unpublish per channel, category change, collection assign, inventory mode, pause/activate, delete (soft), **so that** the daily catalog chores are minutes, not afternoons.
**Acceptance:** each action validates per row through the same staged pipeline (price floor > 0, ML entitlement for ML actions, collection exists); delete uses the native soft-delete precedent; variant-aware (price actions apply across a product's variants explicitly, stated in the preview — the "no update-all-variants" Shopify gap, closed).
**Risk:** HIGH

### Story 3.3 — MCP parity: agent bulk ops
**As a** seller's agent, **I want** the same propose → confirm → apply flow over MCP, **so that** "sube 10% los precios de la colección Zines solo en ML" is one instruction with a human-visible confirmation.
**Acceptance:** agent tools stage a batch and return the diff summary; apply requires the confirm token; audited identically; respects `catalog.bulk_enabled`.
**Risk:** MED

## Sprint QA
- **api spec(s):** staged-diff builder (validation matrix, partial failure, idempotent re-apply) · action-payload specs per action type · MCP propose/confirm contract spec
- **browser smoke owed:** yes, to Daniel — bulk price change on 50+ products **including one deliberately invalid row** (verify per-row failure + the rest applied), then flag flip `catalog.bulk_enabled` ON in prod
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. In https://miyagisanchez.com/shop/manage/catalogo, filter categoría=libros, "Seleccionar todos (N)".
   → Selection banner shows the across-filter count, not just the visible page.
2. Bulk action → Precio +10% → Previsualizar.
   → Diff table: each row old → new price; one product you pre-set to $0 shows an inline validation error.
3. Refresh the page mid-preview.
   → The staged batch survives; preview re-renders.
4. Aplicar.
   → Success summary: N−1 applied, 1 failed (the invalid row), with per-row detail; audit log entry exists.
5. Re-run Aplicar on the same batch.
   → Idempotent: 0 changes, "ya aplicado" summary.
6. Ask your agent via MCP: "pausa todos los productos de la colección X" → confirm.
   → Batch stages, you confirm, products pause; audit shows the agent actor.

If any step fails, note the step number + what you saw — that's the bug report.
