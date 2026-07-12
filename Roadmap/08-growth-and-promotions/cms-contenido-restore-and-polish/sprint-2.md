# CMS restore & polish — Sprint 2: findability polish (fast-follow, requested 2026-07-12)

**Status:** ⬜ not started

Daniel's fast-follow ask after Sprint 1 shipped: the ~119-key editor list is hard to scan, and the
bulk export/import scope fields are free-text guesswork. Both stories reuse existing, already-shipped
patterns rather than inventing new UI language.

## Stories

### Story 2.1 — Search/filter/sort/pagination + page/URL labeling
**As** Daniel, **I want** the key list to behave like our other admin lists (search, filter, sort,
paginate) and to show which page/URL each key renders on, **so that** I can find a section fast and
know exactly where an edit will show up.
**How:** mirror `/admin/flags`'s already-shipped, server-side URL-search-param-driven pattern
(`lib/flags-admin-view.ts` + `FlagsFilterBar.tsx` + `FlagsPagination.tsx`, admin-flags-cleanup epic) —
`page.tsx` computes the filtered/sorted/paginated slice server-side from `searchParams`; the client
component only renders the current page's rows. New pure `lib/copy-overrides-routes.ts` maps each
`namespace`(`.section`) to its real route, verified against the actual route files (not guessed):
`home`→`/`, `terms`→`/terminos`, `acerca`→`/acerca`, `sweepstakes`→`/g/[slug]`, `events`→`/e/[slug]`,
`platformTheme`/`pwaSearch`→site-wide config (no single page), and each `sellerAcquisition.<section>`
→ its `/vende/*` page (`anchor`→`/vende`, `creadores`→`/vende/creadores`, …, `shared`→ no single page,
used across all of `/vende/*`).
**Acceptance:** a search box filters by namespace/key/text; a namespace filter + an "has override"
status filter; sort options (namespace, most-recently-edited); results paginate (shareable/bookmarkable
via URL params, survives a refresh); every key row shows its resolved page label + path (or an explicit
"usado en varias páginas de /vende" / "config, sin página propia" for the ones with no single URL).
**Risk:** low

### Story 2.2 — Bulk export/import: dropdowns with a default + plain-language summary
**As** Daniel, **I want** the export scope fields to be dropdowns with sensible defaults instead of
free-text, and a plain sentence telling me what the combination will produce, **so that** I don't have
to guess a valid namespace/section spelling.
**How:** `ContenidoImportExportPanel.tsx`'s `scopeNamespace`/`scopeSection` free-text `<input>`s become
`<select>`s. Namespace select: the known 8 namespaces + a default "Todas las páginas" (empty scope).
Section select: cascades from the selected namespace (options computed server-side via
`flattenDictionary`, passed down as a prop — no new client-side dictionary import) + a default "Todas
las secciones"; disabled/hidden when the namespace has no sub-sections. A live summary sentence above
the export buttons states the exact scope in simple es-MX (e.g. *"Esto exportará 14 claves de Vende →
Autos, en el formato que elijas."*).
**Acceptance:** both selects always have a valid default selected (never blank/free-text); changing
namespace updates the section options; the summary sentence updates live and names the actual key count
+ page label + what "confirmar e importar" will write; the import diff table/apply flow is unchanged.
**Risk:** low

## Sprint QA
- **api spec(s):** pure spec on `lib/copy-overrides-routes.ts`'s namespace/section→route resolution
  (2.1); pure spec on the section-options-per-namespace + summary-sentence builder (2.2) — both
  next-free, Playwright-loadable, no live infra.
- **browser smoke owed:** yes, to Daniel — visual scan/filter/pagination behavior and the dropdown/
  summary UX are best confirmed by eye; no money/auth path involved so this is UX confirmation, not a
  auth-gated round-trip like Sprint 1.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com/admin/contenido

1. Go to `/admin/contenido`.
   → The list is no longer one long unpaginated scroll — search box, namespace/status filters, sort,
   and page controls are visible.
2. Type a partial page name (e.g. "autos") into search.
   → Only matching keys show; each visible row names its page (e.g. "Vende — Autos") and path
   (`/vende/autos`).
3. Clear the search, open the "Exportar / importar en bloque" panel.
   → Both scope fields are dropdowns (not free-text boxes), each with a sensible default already
   selected.
4. Pick a specific page from the namespace dropdown.
   → The section dropdown updates to that page's real sections; the summary sentence above the export
   buttons updates to describe exactly what will be exported.

If any step fails, note the step number + what you saw — that's the bug report.
