# Catalog management — Sprint 1: The Catálogo home (nav group + table)

**Status:** ⬜ not started

## Stories

### Story 1.1 — Seller-nav restructure: the Catálogo group
**As a** seller, **I want** the rail to read Operar / **Catálogo** (Anuncios · Colecciones · Canales · Precios · Importar) / Crecer / Configuración, **so that** everything about my products lives in one place.
**Acceptance:** `lib/seller-nav.ts` (SSOT) reshaped; Importar + Mercado Libre entries move under Catálogo (ML becomes "Canales"); dashboard keeps a compact "Mis anuncios" summary card linking to the table; breadcrumbs derive correctly; `e2e/seller-mode.spec.ts` updated (every entry → real page); mobile "Más" overflow still works. Entries for not-yet-built pages (Precios) are NOT added until their sprint ships (nav never links 404s).
**Risk:** LOW

### Story 1.2 — The catalog table
**As a** seller with hundreds of products, **I want** `/shop/manage/catalogo`: a server-filtered, paginated table (search, status, channel, stock state, category/collection) with saved views and sort, **so that** finding and inspecting any slice of my catalog takes seconds.
**Acceptance:** columns: photo, title, SKU, price(s), stock/mode, channels, status; row click → existing edit screen; filters are URL-addressable (shareable/bookmarkable); pagination server-side (no 500-row client render); empty/filtered-empty states honest; visibility predicates reuse `lib/listing-query.ts` (one deriver).
**Risk:** MED

### Story 1.3 — First-class status filters
**As a** seller, **I want** activo / borrador / pausado / agotado as filterable states, **so that** "what's sellable right now" is one click.
**Acceptance:** states derived from existing data (published/draft/paused/stock), pure deriver unit-tested; counts per state shown; agotado links to the S2 inventory-mode story (teaser copy, no dead control).
**Risk:** LOW

## Sprint QA
- **api spec(s):** filter-query builder spec (params → query, URL round-trip) · status deriver spec · updated seller-nav spec
- **browser smoke owed:** yes, to Daniel — table on a real phone (miyagiprints + one large-catalog test shop)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/shop/manage (as miyagiprints).
   → Rail shows Operar / Catálogo / Crecer / Configuración; dashboard shows a compact "Mis anuncios" card.
2. Open https://miyagisanchez.com/shop/manage/catalogo.
   → Table with your products: photo, título, precio, stock, canales, estado.
3. Search "sticker", filter estado=activo; copy the URL into a private window (logged in).
   → Same filtered view loads from the URL.
4. Save the view ("Solo activos"), reload.
   → Saved view persists and reapplies.
5. Click a row.
   → Lands on the existing edit screen for that listing.

If any step fails, note the step number + what you saw — that's the bug report.
