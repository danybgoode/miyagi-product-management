# Catalog management — Sprint 3: Staged bulk actions

**Status:** ✅ MERGED + deployed + **smoked (all 11 steps pass)** — backend PR
[#72](https://github.com/danybgoode/medusa-bonsai-backend/pull/72) squash `0ff8dc36`, frontend PR
[#199](https://github.com/danybgoode/miyagisanchezcommerce/pull/199) squash `a0f2868b`, both live in
prod 2026-07-09. `catalog.bulk_enabled` flipped **ON** in prod 2026-07-09 after Daniel's live smoke
walkthrough passed in full (see results below). The smoke test itself surfaced a second live
incident — see "Second incident" below, backend PR
[#74](https://github.com/danybgoode/medusa-bonsai-backend/pull/74) squash `62f32c1b`, also merged +
deployed + verified same day.

> ⚠️ **Plan-mode gate — resolved during planning, confirmed against source:** "Medusa workflow /
> batch endpoint, never N sequential route calls" is satisfied by ONE new backend route
> (`bulk-apply`) that loops in-process over the existing `updateSellerProduct()` per item — not a
> formal Medusa `createWorkflow`, since compensation/rollback semantics don't fit "partial apply is
> the intended behavior, report per-row" (3.1's own acceptance). Batch cap: 1,000 items/batch v1.

## Mid-build finding, fixed before shipping
S1/S2 were confirmed live and unchanged on `origin/main` for both repos before planning began — the
first research pass had read a **stale local checkout** missing both merge commits (the exact "main
moves under you" trap `LEARNINGS.md` warns about). Caught via `git fetch` + `git show origin/main:…`
before any code was written; both worktrees for this sprint were cut fresh from `origin/main`, not
the stale local `main`.

**Real correctness gap found and fixed mid-build:** `pause_activate`'s side effects (the Sprint 1.3
`metadata.paused` fix, the checkout-viability gate, the Supabase `marketplace_listings` mirror, the
ML-close cascade) all lived in the frontend PATCH route (`app/api/sell/listing/[id]/route.ts`), not
in the backend `updateSellerProduct()`. A bulk pause routed through a raw backend patch would have
silently reintroduced the exact pausado/borrador regression Sprint 1.3 fixed, for every bulk-paused
product. Fixed by extracting that orchestration into `lib/listing-status.ts` (`setListingStatus`,
`deleteListing`) and `lib/ml-channel-toggle.ts` (`toggleMlChannel`), reused by both the single-row
routes and the bulk-apply path — never bypassed, never duplicated.

## Review findings — real bugs caught and fixed pre-merge

Both PRs went through **cross-agent (codex) advisory review** + an **independent `pr-reviewer`
subagent pass** (a fresh agent, no context from the build). Real findings, all fixed before merge:

**Backend PR #72** (commits `cbd1c85`, `e28ae0e`):
- **Blocking (codex):** the generic `bulk-apply` routes had no guard against a patch shaped like the
  three action types needing frontend-only orchestration (`pause_activate`'s `metadata.paused`,
  `publish_channel`'s `ml_enabled`, `delete`'s null patch) — a direct caller bypassing the frontend's
  routing could reintroduce the exact bugs `setListingStatus()`/`toggleMlChannel()`/`deleteListing()`
  exist to prevent. Fixed with `rejectOrchestrationOnlyPatch()`.
- **Should-fix (codex):** `price_pct` had no guard against a non-finite `percent` — `NaN` fails every
  `<= 0` comparison (always false), so a malformed request could produce a `NaN` price patch with no
  downstream guard in `updateSellerProduct()`. Fixed with `Number.isFinite` checks.
- **Should-fix (codex):** both internal routes dereferenced `body.seller_slug` before confirming
  `body` itself exists — an empty/malformed body 500'd instead of a clean 400. Fixed with optional
  chaining.
- **Real IDOR (independent `pr-reviewer` pass, NOT caught by the first cross-review round):** both
  `bulk-apply` routes called `updateSellerProduct()` on caller-supplied product ids with **no
  ownership check** — `updateSellerProduct()` doesn't check this itself (its own doc comment: callers
  must). Any authenticated seller could forge a bulk-apply body targeting another seller's product
  (ids are enumerable via public storefront APIs); on the internal route, any holder of
  `MEDUSA_INTERNAL_SECRET` + any `seller_slug` had the same reach across every seller on the
  platform. `bulk-stage` was already correctly scoped (routes through `querySellerCatalog`), which is
  likely why the first review pass missed this — it only found the orchestration gap, not the
  ownership gap. Fixed: new `resolveSellerProductIds()` (extracted, shared with `querySellerCatalog`)
  resolves the seller's owned product-id set once per request; both routes now reject any
  out-of-scope `item.id` per-row before ever calling `updateSellerProduct()`.

**Frontend PR #199** (commits `cd93928`, `3b9cde9`):
- CI's "Playwright vs preview" caught a real regression before either review round even ran:
  `e2e/flags-admin.spec.ts` hard-asserts an exact known-flag count (22), and this sprint's new
  `catalog.bulk_enabled` made it 23 — bumped + added the missing spot-check assertion.
- **Blocking (codex):** `catalog.bulk_enabled` was bypassable — the generic backend `bulk-apply`
  route checks the flag, but `pause_activate`/`delete`/`publish_channel(ml)` route through frontend
  orchestration helpers that never checked it, so an already-staged batch could still apply after the
  flag flipped OFF. Fixed: both `applyBulkBatch()` and `applyBulkBatchAsAgent()` now re-check the
  flag before touching any batch.
- **Should-fix (codex):** apply wasn't atomic under concurrency — a plain filter-then-process-then-
  write let two concurrent apply calls (double-click, two tabs) both claim and re-apply the same
  items. Fixed with `claimPendingItems()` — a single atomic `UPDATE ... WHERE status='pending'
  RETURNING *` (new `'applying'` status value).
- **Should-fix (codex):** the three new Supabase tables had no RLS, unlike the newest precedent in
  this migration history (`platform_flags`/`platform_copy_overrides`). Added RLS-ON-no-policies
  (service-role-only reads/writes) as defense in depth — this Supabase project is shared across
  despachobonsai tenants.
- **Dismissed after verification** (both rounds independently confirmed these are non-issues, not
  glossed): codex's claim that `publish_channel(ml)`'s `ml_enabled` field "isn't implemented" — it's
  real, just pre-existing from Sprint 2, outside the diff a single-repo review could see. Codex's "MCP
  agent access is incomplete" for bulk pause/delete/ML-toggle — this is Story 3.3's own stated,
  documented scope cut (those three need agent-safe equivalents of orchestration this internal-secret
  layer has no access to — real follow-up work, not something to rush under review pressure). The
  "Miyagi (marketplace)" English nit — matches `CatalogTable.tsx`'s own existing S2 copy convention
  (an accepted loanword in this codebase's es-MX).
- The `pr-reviewer` pass additionally flagged the branch was behind `origin/main` in a file both this
  PR and two sibling PRs (#197/#198) edited (`app/api/ucp/mcp/route.ts`) — merged `origin/main` in
  before merge (clean auto-merge, both sides' additions verified intact) to avoid a real conflict
  risk, not just a hypothetical one.

## Second incident — found live during the smoke test itself, fixed same day

Step 10 (bulk soft-delete) triggered a **real production incident**: right after the delete
succeeded, the seller's whole `/shop/manage/catalogo` page started crashing on every load ("This
page couldn't load / A server error occurred"). Diagnosed via Vercel `get_runtime_errors` +
`gcloud logging read`: `remoteQuery`'s `seller → products.id` link returns a sparse/null array slot
for a product right after `productService.softDeleteProducts()` sets its `deleted_at` — the
module-link row survives, the joined product resolves to null, and the pre-existing
`.map((p) => p.id)` threw `Cannot read properties of undefined (reading 'id')` on every subsequent
fetch. Pre-existing since Sprint 1 in three separate call sites (this sprint's own
`resolveSellerProductIds()` extraction centralized the bug into one function without curing it).

Fixed same day, backend PR [#74](https://github.com/danybgoode/medusa-bonsai-backend/pull/74) squash
`62f32c1b`: `resolveSellerProductIds()` now filters null/undefined product slots before mapping to
ids; both single-row ownership routes (`sellers/me/products/[id]`, `internal/seller-products/[id]`)
refactored to reuse the fixed shared function instead of duplicating the vulnerable inline query. New
regression test (`seller-catalog-query.unit.spec.ts`) covers the null-slot case explicitly.
Independently reviewed (`pr-reviewer` subagent) — approved (fail-closed direction, cannot introduce
an IDOR, no authorization-semantics change) but flagged that the same unfixed `.map()` shape exists
in roughly **18 other routes**, including money-path seller-order routes (`release-escrow`,
`confirm-payment`, `return-request`, `ship`, `bulk-status`). Daniel's call: track as a follow-up
sweep story rather than expand this hotfix — **owed, not yet scoped**, prioritize the money-path
routes.

Verified live: reloaded the crashed page after deploy (confirmed fixed), then re-ran a real 7-product
bulk soft-delete through the same code path as the original incident (via the smoke test's own
Step 10 cleanup) — page loaded cleanly at zero-state both immediately after and on a later reload.

## Stories

### Story 3.1 — Select-across-filter → staged diff → apply
**As a** seller, **I want** to select all products matching my filter, build a bulk change, and see a **preview diff (old → new per row, validation errors inline)** before anything applies, **so that** a bulk edit can never silently wreck my live catalog (the eBay failure mode).
**Acceptance:** selection persists server-side per staged batch (survives refresh — the Shopify failure mode); apply is idempotent (re-apply skips done rows); per-row failures reported individually, partial apply never silent; every batch lands in the audit log with actor + before/after.
**Risk:** HIGH
**Built:** ✅ Backend `0849d16` — `seller-catalog-query.ts`'s `querySellerCatalog()` extracted from the S1 GET route (behavior-preserving refactor) so bulk-stage resolves "everything matching the seller's active filter" through the identical code path the table itself uses; `catalog-bulk.ts`'s `computeBulkDiff()` (pure, price_set/price_pct/pause_activate for this story) + `MAX_BULK_ITEMS=1000`; two new routes `POST /store/sellers/me/products/bulk-stage` (resolve+validate+diff, writes nothing) and `bulk-apply` (loops `updateSellerProduct()` per item, per-row try/catch, ownership-checked). Frontend `ec0417c` — new Supabase tables `catalog_bulk_batches`/`catalog_bulk_batch_items`/`catalog_bulk_audit_log` (staging state, not commerce truth — AGENTS rule 2; RLS-on-no-policies), three API routes (`POST /api/sell/catalog/bulk`, `GET .../[batchId]`, `POST .../[batchId]/apply`); `CatalogTable.tsx` gains row checkboxes + "seleccionar todos (N) across filter"; `BulkActionBar.tsx` + `BulkDiffPreview.tsx` (old→new table, refresh-safe via a `?batch=` URL param); `lib/listing-status.ts`'s `setListingStatus()` extraction (see "Mid-build finding" above).

### Story 3.2 — Action set v1
**As a** seller, **I want** bulk: price set / ±% , publish/unpublish per channel, category change, collection assign, inventory mode, pause/activate, delete (soft), **so that** the daily catalog chores are minutes, not afternoons.
**Acceptance:** each action validates per row through the same staged pipeline (price floor > 0, ML entitlement for ML actions, collection exists); delete uses the native soft-delete precedent; variant-aware (price actions apply across a product's variants explicitly, stated in the preview — the "no update-all-variants" Shopify gap, closed).
**Risk:** HIGH
**Built:** ✅ Backend `4f9231c` + `e3e55ee` — `computeBulkDiff()` extended with `publish_channel`/`category`/`collection_assign`/`inventory_mode`/`delete`; new `SellerProductUpdateBody.category_handle` field (the gap found in 3.1 planning — only `collection_ids` existed; every product has at most ONE platform category, addressed by HANDLE like everywhere else in this codebase, not by internal Medusa id — fixed in a follow-up commit after the first pass wrongly used an id); `CatalogPair` now carries `mlLinked` so the channel-toggle diff shows an accurate before-state. Frontend `8c337ef` — `BulkActionBar.tsx` gets the full action picker (channel toggle, category select, collection multi-select fetched live, inventory mode + dispatch estimate, delete); `lib/listing-status.ts` gains `deleteListing()` (extracted from the DELETE handler, same Supabase-mirror + ML-close cascade a single-row delete always ran); new `lib/ml-channel-toggle.ts`'s `toggleMlChannel()` (entitlement check + publish/close reconcile, extracted from the PUT handler's `ml_enabled` path) — reused so a bulk ML-channel toggle can't flip the stored flag without actually publishing/closing the real Mercado Libre listing.

### Story 3.3 — MCP parity: agent bulk ops
**As a** seller's agent, **I want** the same propose → confirm → apply flow over MCP, **so that** "sube 10% los precios de la colección Zines solo en ML" is one instruction with a human-visible confirmation.
**Acceptance:** agent tools stage a batch and return the diff summary; apply requires the confirm token; audited identically; respects `catalog.bulk_enabled`.
**Risk:** MED
**Built:** ✅ Backend `03d2d9d` — `/internal/seller-products/bulk-stage` + `bulk-apply` (x-internal-secret + `seller_slug`, the existing internal-route family's auth shape — sibling of `/internal/seller-products/:id` PATCH), calling the identical `querySellerCatalog`/`computeBulkDiff`/`updateSellerProduct` the Clerk-authed routes use, so an agent can never see a different diff than a seller would. Frontend `ae669dd` — two new MCP tools, `stage_bulk_action` (propose) + `apply_bulk_action` (confirm — the `batch_id` itself is the confirm token, since the agent already saw the diff); `lib/catalog-bulk.ts`'s `stageBulkActionAsAgent()`/`applyBulkBatchAsAgent()` mirror `lib/seller-products.ts`'s `patchSellerProductViaInternal` pattern; batches share the same Supabase tables as the web path, audited with `actor_type:'agent'`.
**Scope cut, stated not glossed:** the agent tools deliberately do NOT cover `pause_activate`, `delete`, or `publish_channel` targeting `ml` — those need the frontend-only orchestration (Supabase mirror, ML cascade, checkout-viability gate) the internal-secret layer has no access to; both the tool's `inputSchema` (enum excludes them) and a runtime check reject them with a clear message rather than silently skipping those side effects. An agent uses the existing single-item `set_listing_status`/`update_listing` tools for those, or the seller uses the web portal for the bulk case.

## Sprint QA
- **api spec(s):** `src/api/store/_utils/__tests__/catalog-bulk.unit.spec.ts` (backend Jest — `computeBulkDiff` + `rejectOrchestrationOnlyPatch` per action type, 33 cases: price floor validation, NaN/Infinity rejection, no-op detection, ml-link-aware channel diff, category/collection/inventory-mode patches, delete's null-patch signal, orchestration-guard coverage) · `e2e/catalog-bulk.spec.ts` (frontend Playwright `api` — auth-gate coverage on all three new routes)
- **browser smoke: ✅ DONE** (Daniel + Claude, 2026-07-09) — all 11 steps below executed against real production data (8 disposable "TEST BULK zine" listings + 1 test collection in Daniel's own live shop); every step passed, see per-step results inline below. `catalog.bulk_enabled` flipped ON in prod immediately after.
- **deterministic gate:** backend `medusa build` → `tsc --noEmit` → `npm run test:unit` green (304/304, up from 278 at S1 baseline); frontend `tsc --noEmit` + `npm run build` + Playwright `api` green (46/46) — verified against a local `next dev` server (the `api` project's default `baseURL` is prod, which 404s on routes an unmerged branch hasn't shipped yet — known, documented gotcha from S2) and confirmed green again on CI's real preview run before merge

## Sprint 3 — Smoke walkthrough (do these in order) — ✅ all steps passed, 2026-07-09
Env: production · https://miyagisanchez.com. `catalog.bulk_enabled` is now **ON**.

1. In `/shop/manage/catalogo`, filter categoría=libros, check the "select all visible" header checkbox, then click "Seleccionar todos (N) que coinciden con el filtro".
   → Selection banner shows the across-filter count, not just the visible page.
2. Bulk action → Cambiar precio (%) → 10 → Previsualizar.
   → Diff table: each row's price old → new; one product you pre-set to $0 (or a "precio a convenir" listing) shows an inline validation error, not a silent skip.
3. Refresh the page mid-preview.
   → The `?batch=` URL param re-fetches the SAME staged batch from Supabase; preview re-renders identically.
4. Aplicar.
   → Success summary: N−1 applied, 1 failed (the invalid row), with per-row status chips; a `catalog_bulk_audit_log` row exists per applied item with actor + before/after.
5. Click "Aplicar" again on the same (now-applied) batch.
   → Idempotent: 0 newly applied, "ya aplicado" summary — no re-write, no duplicate audit rows.
6. Bulk action → Pausar/activar → Pausar → apply on 2-3 listings.
   → Each pauses; reload the catalog table — still shows "Pausado" (the Sprint 1.3 regression check, now proven for the bulk path too); a paused, ML-linked listing's ML item closes.
7. Bulk action → Cambiar categoría → pick a category → apply on one listing.
   → Category updates; the listing's own seller collections are untouched.
8. Bulk action → Asignar colecciones → pick one or two → apply.
   → Collections replace the previous set (full replacement, not additive — the preview said so).
9. Bulk action → Modo de inventario → Sobre pedido → pick an envío estimado → apply.
   → PDP shows the sobre-pedido pill; buy box never blocks even at qty 0.
10. Bulk action → Eliminar → apply on one disposable test listing.
    → Listing soft-deletes (drops from the table + `/l` browse); its ML item closes if it had one.
    → **Result: passed, but surfaced the second incident** (see above) — right after this delete, the
      Catálogo page crashed on every load. Fixed same day (PR #74); re-verified by re-running a real
      7-listing bulk soft-delete through the same path post-fix (see "Second incident" for detail).
11. Ask your agent via MCP: "sube 10% los precios de la colección X" (or similar) using `stage_bulk_action`, review the diff summary it returns, then confirm with `apply_bulk_action` passing the returned `batch_id`.
    → Batch stages, diff shown, apply confirms; audit shows `actor_type: agent`. Ask it to "pausa todos los productos de la colección X" instead — expect a clear refusal pointing at `set_listing_status` (bulk pause is web-portal-only by design, see Story 3.3's scope cut).
    → **Result: passed.** No agent token existed yet for the test shop — provisioned one via the
      shop's own "Agentes e integraciones" settings (Daniel's explicit go-ahead), then called the
      real personal MCP connector URL directly: staged a +10% price bump on one listing ($110→$121),
      applied it, re-applied the same `batch_id` (idempotent — "0 aplicado(s) · 1 ya aplicado(s)
      previamente"), confirmed the storefront table reflected the new price, and confirmed
      `catalog_bulk_audit_log` recorded `actor_type: 'agent'` with the correct before/after. A bulk
      `pause` action attempt was refused exactly as designed: "type de acción no reconocido o no
      disponible por el agente (usa la app web para pausar/activar, eliminar, o publicar en Mercado
      Libre en bloque)."

All 11 steps passed. Test data (7 remaining "TEST BULK zine" listings + "TEST BULK collection")
cleaned up via a real bulk-delete through the web portal after the walkthrough completed.
