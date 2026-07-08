# Catalog management — Sprint 1: The Catálogo home (nav group + table)

**Status:** ✅ built, PR open (real-phone table smoke owed to Daniel)

## Stories

### Story 1.1 — Seller-nav restructure: the Catálogo group
**As a** seller, **I want** the rail to read Operar / **Catálogo** (Anuncios · Colecciones · Canales · Precios · Importar) / Crecer / Configuración, **so that** everything about my products lives in one place.
**Acceptance:** `lib/seller-nav.ts` (SSOT) reshaped; Importar + Mercado Libre entries move under Catálogo (ML becomes "Canales"); dashboard keeps a compact "Mis anuncios" summary card linking to the table; breadcrumbs derive correctly; `e2e/seller-mode.spec.ts` updated (every entry → real page); mobile "Más" overflow still works. Entries for not-yet-built pages (Precios) are NOT added until their sprint ships (nav never links 404s).
**Risk:** LOW
**Built:** ✅ FE `f3e9f86` — four rail groups (Operar / Catálogo / Crecer / Configuración). Colecciones (already shipped in `own-shop-premium-presentation` S2, `/shop/manage/collections`) joins the group too — discovered live in `main` during build, not a Precios-style placeholder. Precios stays out (no page exists). Mobile primary/overflow rebuilt as explicit curated arrays (Resumen·Pedidos·Ofertas·Anuncios primary, everything else in overflow) since the old "first two groups" slice broke with four groups.

### Story 1.2 — The catalog table
**As a** seller with hundreds of products, **I want** `/shop/manage/catalogo`: a server-filtered, paginated table (search, status, channel, stock state, category/collection) with saved views and sort, **so that** finding and inspecting any slice of my catalog takes seconds.
**Acceptance:** columns: photo, title, SKU, price(s), stock/mode, channels, status; row click → existing edit screen; filters are URL-addressable (shareable/bookmarkable); pagination server-side (no 500-row client render); empty/filtered-empty states honest; visibility predicates reuse `lib/listing-query.ts` (one deriver).
**Risk:** MED
**Built:** ✅ BE `c28a6c3`+`d50c65a`, FE `ba3dc70`. Backend: `GET /store/sellers/me/products` now pushes `id`/`status`/`title`/`category` into the `remoteQuery` filter (real DB-level filtering + pagination via `metadata.count`, replacing the old unconditional 2000-row fetch-then-slice — also fixed a latent bug where that unscoped fetch could silently omit a seller's own products once total store inventory passed 2000 rows). Stock-state, the ML channel badge, and the hidden-catalog exclusion (`isHiddenCatalogProduct` — the existing "one visibility deriver," reused not forked) stay in-memory on the already-narrowed, seller-scoped batch. Frontend: `lib/catalog-query.ts`'s `buildCatalogQuery()` mirrors `lib/listing-query.ts`'s `buildQuery()`; zero-JS filter form + `Link`-based pagination (same pattern as `app/(shell)/l`). Row pause/activate/delete actions moved into the table itself (same `/api/sell/listing/[id]` endpoints `ManageDashboard` used) since the edit screen has no such controls of its own. **Scope note:** saved views were descoped to URL-addressable filters only for S1 (the URL query string *is* the shareable view — an explicit saved-preset layer, if wanted, is Supabase-backed future work, no Medusa concept for it).

### Story 1.3 — First-class status filters
**As a** seller, **I want** activo / borrador / pausado / agotado as filterable states, **so that** "what's sellable right now" is one click.
**Acceptance:** states derived from existing data (published/draft/paused/stock), pure deriver unit-tested; counts per state shown; agotado links to the S2 inventory-mode story (teaser copy, no dead control).
**Risk:** LOW
**Built:** ✅ BE `c28a6c3`, FE `9e55ffd`. Discovered during build: "pausado" and "borrador" were previously **indistinguishable** — the PATCH route mapped both to Medusa's native `status: 'draft'`, and the only place the distinction lived (a Supabase mirror column) got silently overwritten back to the Medusa-derived value on every dashboard reload. Fixed at the root: the PATCH route now also sets `metadata.paused` on the Medusa product in the same call that flips status; `toListingShape` (the one shared listing normalizer) derives `'paused'` from it. `lib/catalog-status.ts`'s `deriveCatalogStatus()` is the pure, unit-tested four-state deriver (agotado takes precedence over activo for a sold-out managed item); status chips show live counts per state.

## Sprint QA
- **api spec(s):** `e2e/catalog-query.spec.ts` (filter-query builder — params → query, URL round-trip), `e2e/catalog-status.spec.ts` (status deriver — all four states + the fixed pausado/borrador regression), `e2e/seller-mode.spec.ts` (updated for the four-group nav)
- **browser smoke owed:** yes, to Daniel — table on a real phone (miyagiprints + one large-catalog test shop), including the pause→reload→still-shows-Pausado check
- **deterministic gate:** frontend `tsc --noEmit` + `npm run build` + Playwright `api` green; backend `medusa build` → `tsc --noEmit` → `npm run test:unit` green (264/264)

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (pre-merge) · production https://miyagisanchez.com (post-merge)

1. Open `<preview-or-prod>/shop/manage` (as miyagiprints or another seller with products).
   → Rail shows Operar / Catálogo / Crecer / Configuración; dashboard shows a compact "Mis anuncios" card (thumbnails + count) instead of the old full grid.
2. Click the "Mis anuncios" card (or the Catálogo → Anuncios rail entry).
   → Lands on `/shop/manage/catalogo`: a table with photo, título, SKU, precio, stock, canales, estado columns.
3. Type "sticker" (or any real product word) into the search box, click Filtrar.
   → Table narrows to matching titles; the URL now carries `?q=sticker`.
4. Click the "Activo" status chip; note the count in parentheses.
   → Table shows only activo listings; copy the URL into a private/incognito window (logged in as the same seller) — the same filtered view loads from the URL alone.
5. Pause an active listing from the table (the pause icon in its row), confirm the toast, then reload the page.
   → The listing now shows "Pausado" — and **stays** "Pausado" after the reload (this is the regression check for the fixed bug: before this sprint it would silently revert to "Borrador").
6. Click a product's title/photo.
   → Lands on the existing `/sell/edit/[id]` edit screen for that listing.

If any step fails, note the step number + what you saw — that's the bug report.
