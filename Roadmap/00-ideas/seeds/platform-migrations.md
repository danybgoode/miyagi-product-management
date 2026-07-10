---
title: "Platform migrations — Shopify connector, parity score, consultant white-glove SKU"
slug: platform-migrations
status: scaffolded
area: "03"
type: feature
priority: wave-2
risk: high
epic: "03-selling-and-shops/platform-migrations"
build_order: null
updated: 2026-07-09
---

# Platform migrations — Shopify connector, parity score, consultant white-glove SKU

**As a** merchant on another platform (or a consultant standing one up in person), **I want** my
catalog, settings, and look brought onto Miyagi in one guided pass — free at baseline, flat-fee
white-glove on the spot, estimated when big — **so that** switching costs minutes, not weeks.

**Class:** Feature / **Grower** (+1 Bug rider, S0). Success signal: completed migrations (self-serve
batches imported from a connector source; `migration` SKU closes), not just "the connector works."

## Stage-2.5 buckets — this ask is three-in-one
1. **Already possible today:** the import spine. Bulk Import & Express Migration shipped the whole
   file/paste → AI parse → staging → idempotent import pipeline + Storefront-as-Code config + agent
   MCP config patching. CSV/JSON migrations from Tiendanube/WooCommerce/BigCartel exports work *now* —
   that's positioning + a how-to page per platform, not code.
2. **Light enhancement:** the consultant money path. `PROMOTER_SKUS` is a one-line vocabulary
   extension (`'migration'`); platform-set pricing, cash-collect, net-remittance transfer, commission
   ledger all shipped in Promoter v2. The "prices must be platform-set so the merchant sees the same
   number" guarantee is already how every promoter SKU works.
3. **Genuinely new:** the Shopify connector, the section-parity score, the above-threshold estimate
   generator (+ its quoted-estimate record — see Decisions), and the photograph-the-shop →
   agent-sets-it-up packaging.

## Decisions locked at grooming (Daniel, 2026-07-09)
- **Pricing: accepted as proposed** (table below). Admin config can tune per-SKU commission % later.
- **S0 stays in this epic** as the do-first sprint (live customer pain; blocks nothing).
- **Estimate seam: a new quoted-estimate record.** Grooming verified `lib/promoter-pricing.ts`
  resolves *fixed admin-set* per-SKU prices only (whole MXN, clamped) — a per-merchant computed
  amount doesn't fit that seam. S2 therefore adds a small primitive: the estimator persists a quote
  (inputs + computed total, platform-generated), and the promoter close prices the `migration` SKU
  from that record. Anti-abuse by construction: the platform computes and stores it; the merchant
  sees the identical number; the close cannot charge an amount that differs from the stored quote.
- **Cross-agent planning panel: offered, declined** (Daniel skipped; approval remains the only gate).

## Research (validated 2026-07-09 — cite-before-plan)
- **Shopify Storefront MCP** ([shopify.dev](https://shopify.dev/docs/apps/build/storefront-mcp),
  [catalog](https://shopify.dev/docs/agents/catalog/storefront-catalog)): UCP-conformant since
  2026-04-22 — `search_catalog` / `lookup_catalog` / `get_product` (+ `get_cart`/`update_cart` now
  deprecated toward UCP Cart, legacy until 2026-08-31) and `search_shop_policies_and_faqs`.
  **Validation of Daniel's read: partially confirmed.** Listings: yes (titles, variants, options,
  prices, availability, images). Policies/shipping/returns/FAQ *text*: yes via the policies tool —
  that's the honest answer to "get settings? how?": as prose to re-map, not as structured settings.
  **Theme/sections/settings export: no** — it's a shopping surface, not an admin API. Theme capture =
  storefront page scrape + photos (our AI parse already eats unstructured input), or a Shopify
  Admin-API app (merchant-installed; heavier — defer, revisit only if scrape quality disappoints).
- **Mercado Libre tokens** ([ML docs](https://developers.mercadolivre.com.br/en_us/authentication-and-authorization)):
  access token **6 h**, refresh token **6 months, single-use** (latest-only valid). Our module already
  auto-refreshes (5-min skew) with `needs_reauth` only on a dead refresh token — "reconnect daily" is
  a **Bug to reproduce, not a design gap** (suspect: a lost/raced single-use refresh; the
  `ml_sync_event` `token_refresh` log is the evidence trail).

## Pricing (accepted 2026-07-09)
Benchmarks: subdomain $199/yr · ml_sync $299/yr · custom domain $499/yr (all MXN). Costs to cover:
AI-parse tokens (the one real variable cost), consultant commission, support time.
- **Self-serve: free ≤ 500 listings** (baseline stays free — the acquisition play). Above → estimate.
- **Consultant white-glove (`migration` SKU): $999 MXN flat**, covers ≤ 150 listings + standard
  config/shipping/theme-preset dress-up, closeable on the spot (cash / net-remittance as today).
  Commission: **50% ($499.50)** — the trip has to be worth it; admin config can tune per-SKU %.
- **Above threshold: platform-generated estimate** — inputs (listing count, image count, source
  platform, custom-section flags) → deterministic tiered price ($999 base + $3 MXN/listing beyond
  150 + fixed adders per custom section), persisted as a quoted-estimate record the consultant
  closes on (see Decisions).
- **"Very custom" flag → routes to Daniel** with the parity report attached (feasibility call or
  workaround suggestion — never silently quoted).

## What already exists (reuse, don't rebuild) — code-verified at grooming
- Bulk-import pipeline (`supply_batches`/`supply_items`, AI parse, staging, idempotent import) —
  `lib/supply.ts`, `lib/supply-import.ts`, `lib/catalog-import.ts`, `app/api/supply/*`
  (batches/import/items/schema/status/upload). The Shopify connector is a new **source adapter**
  into this, not new plumbing (same shape as the ML import adapter).
- Storefront-as-Code, MCP config read/patch, `create_listing` (photo URLs fetched into R2).
- Storefront primitives for parity: announcement bar, hero, theme presets, collections, content pages
  (Acerca/FAQ/Políticas) — the parity *score* is new; the sections mostly aren't. Suspected gap:
  arbitrary extra static pages beyond the fixed content-page set — validate during S1 and, if real,
  slice a "custom pages" story (that's the premium-experience gap Daniel guessed at).
- Promoter SKU/commission/transfer rails — `lib/promoter-skus.ts` (one-line vocabulary),
  `lib/promoter-commission.ts` (per-SKU %), `lib/promoter-pricing.ts` (fixed-price seam — see
  Decisions for where the estimate diverges), `lib/promoter-close.ts` + transfer/receipt/notify libs;
  the promoter close flow (photos, interview → shop) is literally the consultant interaction, minus
  the connector.
- ML OAuth module (S0 bug below); the `mercadolibre` module shape as the template for a
  source-connection module if Shopify ever needs stored credentials (Storefront MCP needs none).

## Scope boundary
**In:** S0 ML-token bug; Shopify Storefront-MCP import connector (catalog + policies → staged batch);
parity score + report; `migration` SKU + estimate generator + quoted-estimate record; per-platform
migration landing/how-to pages (recruiting-language: concrete steps, no jargon);
photograph-and-interview consultant runbook page.
**Out (v1):** Shopify Admin-API app; two-way/continuous sync back to source platforms; Tiendanube/
WooCommerce/BigCartel *direct* connectors (their CSV/JSON exports ride the existing importer — pages
only); automated theme cloning (presets + manual dress-up v1).

## Sprints & stories

### S0 — Bug: ML re-auth churn (risk: HIGH — auth)
- **US-0.1** As a connected ML seller, I want my connection to survive without daily reconnects, so
  sync keeps working unattended. **Path:** reproduce from `ml_sync_event` `token_refresh` logs →
  root-cause (suspect a lost/raced single-use refresh token) → fix + regression spec.
  **Acceptance:** a connected account rides ≥2 consecutive refresh cycles with no `needs_reauth`;
  the raced/concurrent-refresh path has a regression spec. **QA:** pure spec on the refresh
  serialization (single-use, latest-only semantics); live 48-h connection smoke **owed to Daniel**.
  *Blocks nothing; do first because it's live customer pain.*

### S1 — Shopify connector → staging + parity score (risk: MED)
- **US-1.1** As a merchant/consultant, I want to point at a Shopify shop domain and get catalog +
  policies pulled into a staged supply batch, so nothing re-types by hand. **Acceptance:** a shop
  domain in → a `supply_batch` staged with items (titles, variants, options, prices, availability,
  images) + policies text attached; nothing imports without the existing review/confirm step; route
  gated on `migrations.connector_enabled`. **QA:** pure-logic spec on the UCP→staging mapper against
  fixture Storefront-MCP responses; api spec on the gated route.
- **US-1.2** As a merchant, I want a parity report showing what maps onto Miyagi and what doesn't, so
  the offer is honest before any money. **Acceptance:** merchant-shareable report — sections detected
  vs our primitives (announcement bar, hero, theme, collections, content pages), gaps flagged, "very
  custom" flag surfaced. **QA:** pure spec on the scorer. **Validate the static-pages gap here**; if
  real, slice a "custom pages" story back into the funnel rather than silently absorbing it.

### S2 — Money path (risk: HIGH — money; Daniel merges)
- **US-2.1** `migration` SKU: one-line `PROMOTER_SKUS` extension + commission rate (50%) + admin SKU
  label + $999 MXN price via existing admin config. **Acceptance:** a promoter closes a ≤150-listing
  migration at $999 with commission accrual, cash/net-remittance both working, identical to other
  SKUs. **QA:** api spec on SKU close.
- **US-2.2** Estimate generator + quoted-estimate record. Pure estimator (listing count, image count,
  source platform, custom-section flags → deterministic tiered price); the platform persists the
  quote; the close prices the SKU from the stored record. **Acceptance:** same inputs ⇒ same number
  on every surface (merchant view, consultant view, close); a close referencing a quote cannot charge
  a different amount; no quote ⇒ flat-fee path only. **QA:** pure spec on the estimator; api spec on
  close-from-quote (incl. the tamper case).
- **US-2.3** "Very custom" routing: the flag routes to Daniel with the parity report attached —
  never silently quoted. **Acceptance:** flagged estimate produces a notification + no closeable
  price. **QA:** api spec.

### S3 — Packaging (risk: LOW)
- **US-3.1** Per-platform migration landing/how-to pages — Shopify (connector) + Tiendanube/
  WooCommerce/BigCartel (CSV/JSON export → existing importer). Recruiting language: concrete steps,
  no jargon; es-MX (not on the bilingual allow-list). **Acceptance:** each page walks a real export
  → import end-to-end. **QA:** api spec on routes/meta; copy sign-off owed to Daniel.
- **US-3.2** Consultant runbook page (photograph the shop → interview → agent sets it up) + `/vende`
  + sell-sheet integration. **Acceptance:** a promoter can follow it blind on a real close.

## Kill-switch decision (risk: high — Stage 6b)
**Recommended flag story:** `migrations.connector_enabled` — enablement polarity, default `false`,
**created DISABLED in every env**, flipped deliberately; seam: the connector import route
(staging-side; the importer itself stays always-on since it's shipped); mechanism: the in-house
`platform_flags` reader behind `isEnabled()` (node/server seam — no Edge involvement). The SKU rides
the existing promoter-SKU config (an unpriced SKU is unsellable — natural dark launch, no second
flag).

## Smoke walkthrough owner: Daniel
One real Shopify store pulled to staging → parity report → import → estimate above threshold →
SKU close as a promoter (money path — owed to Daniel by name).
