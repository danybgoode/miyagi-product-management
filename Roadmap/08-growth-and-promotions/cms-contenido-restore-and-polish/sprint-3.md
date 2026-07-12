# CMS restore & polish — Sprint 3: the redesign — page-first IA, batched save, tokens (from Daniel's prototype)

**Status:** ⬜ not started

Origin: Daniel's prototype `references/cms_redesign.tsx` (2026-07-12), reviewed + adapted at grooming.
**Adopted:** page/section sub-navigation, single floating batched save, status chips, sidebar grouping.
**Adapted:** raw Tailwind slate/emerald + lucide → our semantic tokens + Iconoir; its standalone
double-sidebar shell → keep AdminShell as the outer rail; batched save → the already-shipped bulk
upsert. **Dropped:** hand-curated label map (1,121 keys) → labels derived from the key path (Daniel,
2026-07-12); curate top namespaces later only if needed.

## Stories

### Story 3.1 — Page-first sub-navigation (the IA fix)
**As** Daniel, **I want** to pick a page/section (e.g. "Acerca · /acerca") and edit only its fields in
context, **so that** I stop paging through 57 pages of a flat key list.
**How:** a `contenido`-local nav column (inside the existing AdminShell rail, NOT a new shell) listing
namespace groups with their route labels — reuse Sprint 2's `lib/copy-overrides-routes.ts` mapping.
Field labels derived from the key path (pure `humanizeKeyPath()` in a next-free lib), original value
shown as context. Search + Editadas/Sin editar filters stay, scoped to the selected group.
**Acceptance:** selecting a group shows only its fields with derived labels + originals; URL reflects
the selection (deep-linkable); existing search/filter behaviour intact.
**Risk:** low

### Story 3.2 — Batched save: dirty-state + floating "Guardar cambios" bar
**As** Daniel, **I want** one save action for everything I've edited on screen, **so that** I stop
clicking 1,121 per-field Guardar buttons.
**How:** client dirty-map + a sticky bottom action bar within the editor column (not the prototype's
brittle `fixed left-[calc(...)]`); save rides the **existing bulk upsert shape**
(`content-overrides/import/apply`'s `onConflict: 'namespace,key,locale'` upsert — thin batch handler
or direct reuse), one `revalidateTag` per batch. Per-field save removed; per-field «restaurar» stays.
**Acceptance:** edit 3 fields across 2 groups → one Guardar → all 3 persist (verifiable via GET) and
are live within ≤1 min; navigating away with unsaved changes warns; failure reports which keys failed.
**Risk:** low

### Story 3.3 — Token/Iconoir re-skin + AdminShell grouping & overflow fix (shared surface — ANNOUNCE)
**As** an admin user, **I want** the CMS and admin nav to look and behave like the rest of the product,
**so that** the admin stops being the un-designed corner.
**How:** re-skin `/admin/contenido` + `AdminShell` on semantic tokens (`--accent`, `--surface-muted`,
`.btn`, `.chip`, `.t-*`) and Iconoir (NO lucide, NO raw slate/emerald hex — the prototype's palette
maps to tokens). Group `ADMIN_SECTIONS` with section headers (General / Sitio / Administración — add a
`group` field to the registry). Fix the sticky rail: `max-height: calc(100vh - 32px)` + internal
`overflow-y: auto` (it's already `position: sticky`; it outgrew the viewport, which is why it "scrolls
with the page"). ⚠️ `AdminShell.tsx` wraps every `/admin/*` page — announce before merging (LEARNINGS
shared-surface rule).
**Acceptance:** rail stays pinned with internal scroll on a short viewport; sections grouped; zero raw
hex / non-token colors in the touched files; mobile chip nav unchanged.
**Risk:** low

### Story 3.4 — Extend the design-token guard to the touched admin files
**As** the team, **I want** the re-skinned admin files under the raw-hex/token CI guard, **so that**
the redesign can't silently regress (Daniel, 2026-07-12: incremental extension approved).
**How:** add exactly the files this sprint touched (`AdminShell.tsx`, `contenido/*`) to the guard's
enforced list — the `enforcedSweptPaths` incremental-adoption shape from LEARNINGS; the guard scans
broadly, asserts hard only on the swept list. Other admin pages stay excluded until touched.
**Acceptance:** guard spec green on the sprint's files; deliberately adding a raw hex to a swept file
fails the spec (observed red once, then reverted).
**Risk:** low

## Sprint QA
- **api spec(s):** `humanizeKeyPath` + group-mapping unit spec (3.1, next-free lib); batch-save
  round-trip api spec incl. partial-failure reporting (3.2); design-token guard extension (3.4 — with
  the observed-red mutation check).
- **browser smoke owed:** yes, to Daniel — the visual/aesthetic sign-off on the redesigned editor and
  the grouped rail (no money path).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (preview URL pre-merge)

1. Go to https://miyagisanchez.com/admin/contenido (as admin, desktop).
   → A page/section list appears alongside the editor; pick "Acerca (plataforma)".
   → Only its fields show, with readable derived labels + the original text under each.
2. Edit two fields, scroll — a "Cambios sin guardar" bar appears pinned at the bottom of the editor.
   → Click «Guardar cambios» → success; both edits live on /acerca within ≤1 min.
3. Edit a field, try to navigate to another group without saving.
   → You get an unsaved-changes warning.
4. On any /admin page, shrink the browser window height.
   → The left rail stays pinned and scrolls internally; sections show General / Sitio / Administración
     headers; icons are Iconoir, colors match the product (no gray/emerald prototype palette).
5. On a phone, open /admin/contenido.
   → The horizontal chip nav still works; the editor is usable single-column.

If any step fails, note the step number + what you saw — that's the bug report.
