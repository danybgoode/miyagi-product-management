# Cars vertical — Sprint 1: Facet browse for autos

**Status:** ⬜ not started

## Stories

### Story 1.1 — Facet deriver + server filters
**As a** buyer, **I want** the autos category to filter by marca, modelo, año (range), precio (range), km (range), **so that** I shop cars the way every car site works.
**Acceptance:** pure `lib/` deriver extracts facets + counts from autos specs metadata (unit-tested incl. messy/missing specs); listings query accepts the params server-side; counts honest (respect visibility predicates); no new tables.
**Risk:** MED

### Story 1.2 — Browse UI + SEO URLs
**As a** buyer, **I want** a facet rail (desktop) and the existing apply-gated mobile sheet with live "Ver X resultados", **so that** filtering feels native on both.
**Acceptance:** filter state is URL-addressable (`/l?categoria=autos&marca=…&anio_min=…`) and crawlable; sort adds año/marca (tratocar parity); zero-result state honest with clear-filters; no `/l` perf regression.
**Risk:** MED

### Story 1.3 — UCP facet parity
**As an** AI agent, **I want** the same facet params on `GET /api/ucp/catalog`, **so that** "busca un seminuevo 2020+ bajo $300k" works agent-side.
**Acceptance:** params documented in the manifest; contract spec.
**Risk:** LOW

## Sprint QA
- **api spec(s):** facet-deriver spec (extraction, ranges, missing-spec tolerance, honest counts) · filter URL round-trip spec · UCP contract spec
- **browser smoke owed:** yes, to Daniel — mobile sheet filter flow on a real phone
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/l?categoria=autos on desktop.
   → Facet rail: Marca, Modelo, Año, Precio, Km — with counts.
2. Pick Marca=Volkswagen + Año 2018–2022; check the URL.
   → Grid filters; URL carries the params; reload reproduces the view.
3. Same on a phone: open the filter sheet, set Precio ≤ $300,000.
   → Live "Ver X resultados" count updates before applying.
4. Set filters that match nothing.
   → Honest empty state with "limpiar filtros".
5. `GET /api/ucp/catalog?categoria=autos&marca=volkswagen&anio_min=2018`.
   → Same filtered set as the web.

If any step fails, note the step number + what you saw — that's the bug report.
