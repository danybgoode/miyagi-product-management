# CMS restore & polish — Sprint 2: findability polish (fast-follow, requested 2026-07-12)

**Status:** ✅ merged 2026-07-12 (PR #238, squash commit `09f5421`) — CI green, `pr-reviewer`
(request-changes → fixed pre-merge: 3 missing `sellerAcquisition` route mappings) + Codex cross-review
(3 findings, all fixed pre-merge) both cleared; admin-UI visual smoke still owed to Daniel

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
**Acceptance:** a search box filters by namespace/key/text; a namespace filter + a status filter
(Todas/Editadas/Sin editar); sort options (página A-Z, editado recientemente); results paginate
(shareable/bookmarkable via URL params, survives a refresh); each SECTION header (the existing
namespace→section grouping) shows its resolved page label + path, or an explicit "config., sin página
propia" for the ones with no single URL (`sellerAcquisition.shared`, `platformTheme`, `pwaSearch`).
**Risk:** low
**✅ Done 2026-07-12** (commits `7e1f9c8`, `5e8d988` on `feat/cms-contenido-restore-and-polish-s2`) —
`lib/copy-overrides-admin-view.ts` (filter/sort/paginate + URL builder, mirrors `flags-admin-view.ts`),
`lib/copy-overrides-routes.ts` (namespace/section→route map), `ContenidoFilterBar.tsx` +
`ContenidoPagination.tsx` (mirror the Flags versions). 14+9(+3 fix-commit)+… → 20 pure spec cases across
`copy-overrides-routes.spec.ts` + `copy-overrides-admin-view.spec.ts`.

### Story 2.2 — Bulk export/import: dropdowns with a default + plain-language summary
**As** Daniel, **I want** the export scope fields to be dropdowns with sensible defaults instead of
free-text, and a plain sentence telling me what the combination will produce, **so that** I don't have
to guess a valid namespace/section spelling.
**How:** `ContenidoImportExportPanel.tsx`'s `scopeNamespace`/`scopeSection` free-text `<input>`s become
`<select>`s. Namespace select: the known 8 namespaces (from a lightweight `keyIndex` prop, namespace+key
pairs only — no full-dictionary import needed client-side) + a default "Todas las páginas" (empty
scope). Section select: cascades from the selected namespace, computed client-side from the same
`keyIndex` (`lib/copy-overrides-export-scope.ts`) + a default "Todas las secciones"; disabled while no
namespace is chosen. A live summary sentence above the export buttons states the exact scope in simple
es-MX (e.g. *"Esto exportará 2 claves de Vende — Autos, en el formato que elijas."*), mirroring the
export route's own `matchesScope` semantics so it can never overstate/understate what gets exported.
**Acceptance:** both selects always have a valid default selected (never blank/free-text); changing
namespace updates the section options; the summary sentence updates live and names the actual key count
+ page label + what "confirmar e importar" will write; the import diff table/apply flow is unchanged.
**Risk:** low
**✅ Done 2026-07-12** (commit `7e1f9c8`) — `lib/copy-overrides-export-scope.ts` (10 pure spec cases in
`copy-overrides-export-scope.spec.ts`).

## Sprint QA
- **api spec(s):** `copy-overrides-routes.spec.ts` (14 cases, 2.1 route map), `copy-overrides-admin-view.spec.ts`
  (12 cases, 2.1 filter/sort/paginate/URL-build + the `firstOf` fix below), `copy-overrides-export-scope.spec.ts`
  (10 cases, 2.2) — all pure/next-free, zero live infra.
- **browser smoke owed:** yes, to Daniel — visual scan/filter/pagination behavior and the dropdown/
  summary UX are best confirmed by eye; no money/auth path involved so this is UX confirmation, not an
  auth-gated round-trip like Sprint 1.
- **deterministic gate:** ✅ green 2026-07-12 — `tsc --noEmit` clean, `npm run build` clean, Playwright
  `api` 2107 passed / 2113 (same 6 pre-existing unrelated failures as Sprint 1 — zero file overlap).
- **Review findings fixed pre-merge** (Codex cross-review, commit `5e8d988`): a repeated query key
  (`?q=a&q=b`) would have delivered `searchParams.q` as a `string[]` at runtime and thrown on `.trim()`
  (500'd the admin page) — fixed with a new `firstOf()` normalizer at the page boundary; the filter
  bar's hidden `status` input echoed the raw, possibly-invalid query param instead of the clamped
  value; the pagination window shrank to 3 pills near the last page instead of 5. All three fixed and
  re-verified green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com/admin/contenido

1. Go to `/admin/contenido`.
   → The list is no longer one long unpaginated scroll — search box, namespace/status filters, sort,
   and page controls are visible.
2. Type a partial page name (e.g. "autos") into search.
   → Only matching keys show; the section header above them names the page (e.g. "autos — Vende —
   Autos · /vende/autos").
3. Clear the search, open the "Exportar / importar en bloque" panel.
   → Both scope fields are dropdowns (not free-text boxes), each with a sensible default already
   selected.
4. Pick a specific page from the namespace dropdown.
   → The section dropdown updates to that page's real sections; the summary sentence above the export
   buttons updates to describe exactly what will be exported.

If any step fails, note the step number + what you saw — that's the bug report.
