---
title: "Platform migrations — Shopify connector, parity score, consultant white-glove SKU"
slug: platform-migrations
status: ready
area: "03"
type: feature
priority: wave-2
risk: high
epic: null
build_order: null
updated: 2026-07-09
---

# Platform migrations — Shopify connector, parity score, consultant white-glove SKU

**As a** merchant on another platform (or a consultant standing one up in person), **I want** my
catalog, settings, and look brought onto Miyagi in one guided pass — free at baseline, flat-fee
white-glove on the spot, estimated when big — **so that** switching costs minutes, not weeks.

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
   generator, and the photograph-the-shop → agent-sets-it-up packaging.

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

## Pricing proposal (Daniel adjusts at the gate)
Benchmarks: subdomain $199/yr · ml_sync $299/yr · custom domain $499/yr. Costs to cover: AI-parse
tokens (the one real variable cost), consultant commission, support time.
- **Self-serve: free ≤ 500 listings** (baseline stays free — the acquisition play). Above → estimate.
- **Consultant white-glove (`migration` SKU): $999 MXN flat**, covers ≤ 150 listings + standard
  config/shipping/theme-preset dress-up, closeable on the spot (cash / net-remittance as today).
  Commission suggestion: 50% ($499.50) — the trip has to be worth it; admin config can tune per-SKU %.
- **Above threshold: platform-generated estimate** — inputs (listing count, image count, source
  platform, custom-section flags) → deterministic tiered price ($999 base + $3/listing beyond 150 +
  fixed adders per custom section), rendered as a merchant-visible SKU the consultant collects on.
  Anti-abuse by construction: the platform computes it, the merchant sees the identical number.
- **"Very custom" flag → routes to Daniel** with the parity report attached (feasibility call or
  workaround suggestion — never silently quoted).

## What already exists (reuse, don't rebuild)
- Bulk-import pipeline (`supply_batches`/`supply_items`, AI parse, staging, idempotent import),
  Storefront-as-Code, MCP config read/patch, `create_listing` (photo URLs fetched into R2).
- Storefront primitives for parity: announcement bar, hero, theme presets, collections, content pages
  (Acerca/FAQ/Políticas) — the parity *score* is new; the sections mostly aren't. Suspected gap:
  arbitrary extra static pages beyond the fixed content-page set — validate during S1 and, if real,
  slice a "custom pages" story (that's the premium-experience gap Daniel guessed at).
- Promoter SKU/commission/transfer rails; the promoter close flow (photos, interview → shop) is
  literally the consultant interaction, minus the connector.
- ML OAuth module (S0 bug below); the `mercadolibre` module shape as the template for a
  source-connection module if Shopify ever needs stored credentials (Storefront MCP needs none).

## Scope boundary
**In:** S0 ML-token bug; Shopify Storefront-MCP import connector (catalog + policies → staged batch);
parity score + report; `migration` SKU + estimate generator; per-platform migration landing/how-to
pages (recruiting-language: concrete steps, no jargon); photograph-and-interview consultant runbook
page.
**Out (v1):** Shopify Admin-API app; two-way/continuous sync back to source platforms; Tiendanube/
WooCommerce/BigCartel *direct* connectors (their CSV/JSON exports ride the existing importer — pages
only); automated theme cloning (presets + manual dress-up v1).

## Sprint slicing
1. **S0 — Bug: ML re-auth churn.** Reproduce from `ml_sync_event` logs → root-cause → fix + regression
   spec. Risk: HIGH (auth/money-adjacent). *Blocks nothing; do first because it's live customer pain.*
2. **S1 — Shopify connector → staging.** Point at a shop domain, pull catalog + policies via
   Storefront MCP into a supply batch; parity-score v1 (sections detected vs our primitives) rendered
   as a merchant-shareable report. Validate the static-pages gap here. Risk: MED. QA: pure-logic spec
   on the UCP→staging mapper against fixture responses.
3. **S2 — Money path.** `migration` SKU, estimate generator (pure, unit-tested), merchant-visible
   estimate, "very custom" → Daniel routing. Risk: **HIGH** (money). QA: pure spec on the estimator;
   api spec on SKU close.
4. **S3 — Packaging.** Migration landing pages (per-platform), consultant runbook, `/vende` +
   sell-sheet integration. Risk: LOW.

## Kill-switch decision (risk: high)
**Recommend a flag story:** `migrations.connector_enabled` — enablement polarity, default `false`,
created DISABLED in every env; seam: the connector import route (staging-side; the importer itself
stays always-on since it's shipped). The SKU rides the existing promoter-SKU config (an unpriced SKU
is unsellable — natural dark launch, no second flag).

## Smoke walkthrough owner: Daniel (one real Shopify store pulled to staging → parity report → import → estimate above threshold → SKU close as a promoter).
