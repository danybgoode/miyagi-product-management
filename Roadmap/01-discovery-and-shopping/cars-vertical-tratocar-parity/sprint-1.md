# Cars vertical — Sprint 1: Facet browse for autos

**Status:** ✅ MERGED 2026-07-07 — backend-first; both PRs had clean gating pr-reviews + codex advisories addressed. Mobile-sheet real-phone smoke owed to Daniel; BE prod smoke owed post-deploy.
- Backend: [medusa-bonsai-backend#66](https://github.com/danybgoode/medusa-bonsai-backend/pull/66) **squash `bf923ad`** (built `25714d9`, `098861d`; review fix `bd29ae4` — drop redundant land-rover self-alias so the brand map is a literal FE mirror)
- Frontend: [miyagisanchezcommerce#185](https://github.com/danybgoode/miyagisanchezcommerce/pull/185) **squash `d5e41f9`** (built `e592d32`, `fddc1a2`; review fixes `1f0902f` plain datalist options + alias drift-guard, `7a98fb4` pin every shared alias)

> **Reshaped during build (the real substance).** Exploration found an autos filter panel already
> existed on `/l`, but it filtered the wrong metadata namespace. Autos specs live under **two
> un-reconciled namespaces**: the seller capture form writes `metadata.attrs.*`
> (`make`/`model`/`year`/`km`/`fuel_type`/`transmission`), while the store filters read the legacy
> top-level `metadata.brand`/`year`/`km`/`fuel` that **only the seed/bulk-import pipeline writes**
> (documented in `lib/listing-attributes.ts:14-18`). So **real seller-listed cars were unfilterable.**
> Sprint 1's core work is reconciling that (attrs-first, legacy fallback) so the facet rail is built
> from — and filters on — the authoritative specs.
>
> **Confirmed decisions (with Daniel):** (1) keep the existing **English** URL params
> (`?category=autos&brand=&year_from=…`) + one new `model` — the doc's Spanish was illustrative;
> (2) facet counts = **full-catalog availability** (v1); cross-filtered narrowing is a v2 non-goal;
> (3) marca/modelo normalization = a small **alias/casing map + graceful pass-through** (VW→Volkswagen),
> unknown brands never dropped.

## Stories

### Story 1.1 — Facet deriver + namespace reconciliation + `model` filter ✅
**As a** buyer, **I want** the autos category to filter by marca, modelo, año (range), precio (range), km (range) using real listing data, **so that** I shop cars the way every car site works — including cars posted by real sellers, not just seeded ones.
**Acceptance:** pure `lib/car-facets.ts` deriver extracts facets + honest counts from the specs (unit-tested incl. messy/missing/duplicate/aliased); the store filter reads the reconciled `attrs.*` (fallback to legacy keys); `model` added; counts respect visibility; no new tables. ✅
**Built:** BE `_utils/car-listing.ts` (reconciled accessors + `canonicalBrandKey` + `facet_pool`) + FE `lib/car-facets.ts` + `lib/car-brands.ts` + `getAutoFacets()`. Unit tests: BE 13 cases, FE 12 cases. **Live-proven** against a throwaway local Postgres (real `metadata.attrs.*` cars became filterable; the "VW"→Volkswagen alias keeps counts honest).

### Story 1.2 — Browse UI + SEO URLs ✅
**As a** buyer, **I want** a facet rail (desktop) and the existing apply-gated mobile sheet with a live "Ver X resultados", **so that** filtering feels native on both.
**Acceptance:** filter state URL-addressable + crawlable (`/l?category=autos&brand=…&year_from=…`); sort adds año/marca; zero-result state honest with clear-filters; no `/l` perf/static-shell regression. ✅
**Built:** `SearchBar.tsx` autos panel upgraded to a derived marca `<select>` (+counts) + modelo datalist + facet-informed range placeholders, inside the existing GET form + mobile sheet. Added `year_desc`/`year_asc`/`marca` sorts (autos only). **Fixed two slug bugs** (transmission/fuel options submitted `automatica`/`gas` vs the real `automatico`/`gas_lp`). `/` stays static, `/l` dynamic — no regression.

### Story 1.3 — UCP facet parity ✅
**As an** AI agent, **I want** the same facet params on `GET /api/ucp/catalog` + the MCP `search_listings` tool, **so that** "busca un seminuevo Volkswagen 2020+ bajo $300k con menos de 60,000 km" works agent-side.
**Acceptance:** params documented in the manifest + tool schema; contract spec proves a facet param reaches the backend. ✅
**Built:** manifest `catalog.params` + MCP `search_listings` inputSchema/handler now carry `model`/`km_from`/`km_to`/`transmission`/`fuel` + the new sorts (the catalog route already forwarded all params). Dispatch case confirmed present.

## Sprint QA
- **Deterministic gate (green pre-merge):** FE `tsc` + `npm run build` + Playwright `api`; BE `medusa build` + `tsc` + `npm run test:unit` (216 tests). ✅
- **api specs:** `e2e/car-facets.spec.ts` (deriver + brand canonicalizer, messy/missing/dup/alias) · `e2e/cars-facet-parity.spec.ts` (buildQuery `model` + manifest/MCP `tools/list`/catalog round-trip — the round-trip layers assert the new contract, so they light up in **CI vs the branch preview**, not against un-deployed prod).
- **Live reconciliation smoke:** ✅ throwaway local Postgres (agent-owned) — proved seller-captured (`attrs.*`) cars are filterable + alias-honest counts + facet pool.
- **browser smoke owed to Daniel:** yes — mobile sheet filter flow on a real phone (live count recount + apply + crawlable URL).
- **Owed (post-merge, no backend preview):** API-level prod smoke of `/store/listings?category=autos&facets=1` + `&brand=…&model=…` once Cloud Run rolls.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (pre-merge: the PR #185 Vercel **preview** URL; the backend must be merged/deployed first so `facet_pool` exists)

1. Open https://miyagisanchez.com/l?category=autos on desktop.
   → Autos facet rail: **Marca** (a dropdown of real brands with counts, e.g. "Volkswagen (N)"), **Modelo**, **Precio**, **Año**, **Km**, plus año/marca sort options.
2. Pick Marca = Volkswagen and Año desde 2018 / hasta 2022; check the address bar.
   → Grid filters to matching cars; the URL carries `?category=autos&brand=Volkswagen&year_from=2018&year_to=2022`; reload reproduces the exact view (crawlable).
3. On a phone: tap "Filtrar y ordenar", set Precio máx 300000, change Marca.
   → The apply button shows a **live "Ver X resultados"** count that updates before you apply. **(owed to Daniel — real-device)**
4. Set filters that match nothing (e.g. Marca = a rare brand + Año desde 2030).
   → Honest "Sin resultados" empty state with a **"Limpiar filtros"** action.
5. Confirm a real seller-listed car (specs entered via the sell form, not seed) now appears under its Marca filter.
   → It shows up — the namespace reconciliation fix. (Pre-fix it was invisible to the filter.)
6. `GET https://miyagisanchez.com/api/ucp/catalog?category=autos&brand=Volkswagen&year_from=2018&model=Jetta`.
   → Same filtered set as the web; `GET /api/ucp/manifest` lists the new params under `endpoints.catalog.params`.

If any step fails, note the step number + what you saw — that's the bug report.
