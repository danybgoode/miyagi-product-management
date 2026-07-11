# Platform migrations — Sprint 1: Shopify connector → staging + parity score

**Status:** ✅ both stories built (PR pending). Commits: `b088b58` (Story 1.1), `65396d4` (Story 1.2)
on `feat/platform-migrations` (apps/miyagisanchez).
**Risk:** MED. Behind `migrations.connector_enabled` (enablement, default `false`, created DISABLED
in every env — the flag creation is part of Story 1.1, not an afterthought).

## Context
Shopify's Storefront MCP (UCP-conformant) exposes `search_catalog` / `lookup_catalog` /
`get_product` + `search_shop_policies_and_faqs` on any Shopify shop domain — no credentials, no
merchant install. Catalog: structured (titles, variants, options, prices, availability, images).
Policies/shipping/returns/FAQ: **prose to re-map, not structured settings**. Theme/sections: not
exportable — parity detection works from the storefront surface; capture is presets + manual
dress-up in v1 (Admin-API app explicitly out of scope).

**Wire-contract correction (build-time, verified live against a real Shopify storefront,
2026-07-11) — read before touching `lib/shopify-mcp-client.ts`:**
- Shopify actually exposes catalog search on **two** endpoints. The simpler one,
  `/api/mcp` (no auth, no extra artifact), returns `search_catalog` +
  `search_shop_policies_and_faqs` — but **every tool response on it carries a live
  deprecation notice: "will no longer be accessible after August 31, 2026."** Escalated to
  Daniel before building; the connector builds against the durable
  **`/api/ucp/mcp`** endpoint instead, which requires every request to carry a
  `meta.ucp-agent.profile` URL. Miyagi now publishes one as a static file:
  `public/.well-known/ucp-agent-profile.json`.
- Policy/FAQ text has **no confirmed UCP-conforming replacement yet** — `search_shop_policies_and_faqs`
  only exists on the deprecating `/api/mcp` endpoint. The connector still calls it there,
  best-effort/non-fatal (Story 1.1 acceptance treats policies text as attached-if-available).
  **Re-verify before 2026-08-31** — that call may need a new home.
- The actual product/variant JSON shape differs materially from Shopify's own docs summary: the
  payload is a JSON **string** inside `result.content[0].text` (not `structuredContent`), money is
  already integer **minor units** (no pesos-vs-cents heuristic needed, unlike the ML adapter), and
  images live per-**variant** (`variants[].media`), not reliably at the product top level.
  `lib/shopify-import.ts` and its fixtures (`e2e/migrations-mapper.spec.ts`) are written against
  this confirmed shape.

## Stories

### Story 1.1 — Shopify connector: shop domain → staged supply batch ✅ built (commit `b088b58`)
**As a** merchant (or consultant beside one), **I want** to point at my Shopify shop domain and have
my catalog + policies pulled into Miyagi's import staging, **so that** nothing is re-typed by hand.
**Acceptance:**
- Entering a shop domain (behind the flag) produces a `supply_batch` with staged items — titles,
  variants, options, prices, availability, images — plus the policies text attached to the batch.
- Nothing imports without the existing staging review/confirm step; the shipped idempotent importer
  does the writes (re-running updates in place, never duplicates).
- `migrations.connector_enabled` exists in `DEFAULT_FLAGS` + is **created DISABLED in every env**;
  the connector route 4xxs cleanly when the flag is off.
**Risk:** med

### Story 1.2 — Parity score + merchant-shareable report ✅ built (commit `65396d4`)
**As a** migrating merchant, **I want** an honest report of what maps onto Miyagi and what doesn't,
**so that** I know exactly what I'm getting before any money changes hands.
**Acceptance:**
- The report lists sections detected on the source shop vs our primitives (announcement bar, hero,
  theme, collections, content pages Acerca/FAQ/Políticas), each ✓ mapped / ⚠ partial / ✗ no
  equivalent, plus listing/image counts (the estimate inputs, S2).
- A "very custom" flag is derivable from the score (feeds US-2.3).
- Merchant-shareable (link or PDF-ready page), es-MX, no jargon.
- **Static-pages gap validated:** confirm whether arbitrary extra static pages (beyond the fixed
  content-page set) are a real, common gap — if so, write the finding here and slice a
  "custom pages" story back to the funnel; don't silently absorb it.
**Risk:** med

**Implementation note:** `lib/migration-parity.ts` is a pure scorer. The five section verdicts
(announcement/hero/theme/collections/content_pages) are a **static** comparison, not a per-shop
live feature detection — Sprint 1's connector only pulls the product catalog + policy/FAQ text
(no Admin-API/theme scrape, out of scope per the Context section above), so the *only* per-batch
numbers are what the pull actually measured: listing count, image count, whether policy text came
through, and whether the pull was truncated. `veryCustom` derives from the real Sprint 2 flat-fee
SKU cap (>150 listings, `VERY_CUSTOM_LISTING_THRESHOLD`) or a truncated pull.

**Decision (confirmed with Daniel, 2026-07-11):** the parity report is an **authenticated
seller-dashboard page** (`/shop/manage/shopify/import/parity/[batchId]`), not a new public
token-linked route — simplest, matches how the smoke walkthrough below is run (from inside a
logged-in seller session), no new public-surface risk in a MED-risk sprint.

#### Findings — static-pages gap (validated, real)
Code-verified against `lib/shop-settings/types.ts`, the seller settings UI
(`app/(shell)/shop/manage/settings/_sections/Paginas.tsx`), and the public content routes
(`app/(shell)/s/[slug]/{acerca,faq,politicas}/page.tsx`): **a seller cannot create a new, arbitrary
static page** (e.g. "Nuestra Historia," "Guía de Tallas"). Miyagi's content-page model is closed to
exactly **three fixed routes** per shop:
- `/s/[slug]/acerca` — one free-text field (`metadata.settings.about.body`, ≤600 chars)
- `/s/[slug]/faq` — one Q/A array (`metadata.settings.faq.items[]`, max 12 pairs)
- `/s/[slug]/politicas` — **not even independently authored** — it derives from the existing
  `returns_policy` (Devoluciones) setting

There is no `pages` table, no dynamic `[page]`/`[slug]` route segment, no title/slug input in any
settings UI, and no API endpoint for creating/listing/deleting arbitrary pages. This is a genuine
parity gap vs. Shopify (which allows any number of custom pages) — `content_pages` in the parity
scorer is always rated `partial`, never `mapped`. Per the acceptance above, this is **not silently
absorbed**: a new seed re-enters the grooming funnel —
[`00-ideas/seeds/custom-static-pages.md`](../../00-ideas/seeds/custom-static-pages.md) — for a
future epic to size and slice (adding a generic pages model, a dynamic route, and nav-link
generation) rather than being built as an unplanned add-on here.

## Sprint QA
- **api spec(s):** pure-logic spec on the Shopify→staging mapper against fixture UCP-catalog
  responses (`e2e/migrations-mapper.spec.ts`, includes the connector routes' 401 auth-gate); pure
  spec on the parity scorer (`e2e/migrations-parity.spec.ts`, fixture section sets ⇒ deterministic
  score/verdict, incl. the veryCustom threshold boundary, plus the parity route's 401 gate);
  `e2e/flags-admin.spec.ts` updated for the new flag count.
- **browser smoke owed:** yes, to Daniel — one real Shopify store pulled to staging + the parity
  report eyeballed for honesty (quality judgment an assert can't make).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge —
  confirmed green 2026-07-11 (21/21 new+touched specs; 5 pre-existing unrelated failures in this
  build sandbox traced to no local Medusa backend running, not this diff — home/launchpad specs
  that assert on live catalog content, untouched by this PR).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (flag ON in a controlled window, or preview URL pre-merge)

1. Go to https://miyagisanchez.com/shop/manage/import → a "Migrar desde Shopify" card appears
   (flag ON) with an "Empezar →" link.
2. Click it → lands on `/shop/manage/shopify/import`. Enter a real Shopify shop domain (e.g.
   `mitienda.com` or `mitienda.myshopify.com`) and click "Traer mi catálogo de Shopify".
   → Within ~1 min the screen switches to a review list of the shop's products (titles, prices,
   images), pre-selected. A "Ver reporte de paridad antes de importar →" link appears.
3. Click the parity-report link.
   → `/shop/manage/shopify/import/parity/[batchId]` shows: product/image counts, whether policy
   text was found, and all 5 sections (Barra de anuncio / Sección destacada / Tema y colores /
   Colecciones / Páginas de contenido) each rated Igual / Parcial / Sin equivalente — nothing
   claims a section Miyagi doesn't have. "Páginas de contenido" should always show Parcial (the
   confirmed static-pages gap — see Findings above).
4. Go back, select the products to import, click "Importar seleccionados".
   → Products land in the seller's catalog as **drafts** (not immediately public — review before
   publishing, matching the epic's "nothing before review" ethos); re-running the import on the
   same batch does not duplicate them (default source_url dedupe).
5. Flip `migrations.connector_enabled` OFF and reload `/shop/manage/import` and
   `/shop/manage/shopify/import`.
   → The "Migrar desde Shopify" card disappears from `/shop/manage/import`; the connector page
   itself 404s cleanly (no crash).

If any step fails, note the step number + what you saw — that's the bug report.
