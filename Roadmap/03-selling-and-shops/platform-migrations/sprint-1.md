# Platform migrations — Sprint 1: Shopify connector → staging + parity score

**Status:** ⬜ not started
**Risk:** MED. Behind `migrations.connector_enabled` (enablement, default `false`, created DISABLED
in every env — the flag creation is part of Story 1.1, not an afterthought).

## Context
Shopify's Storefront MCP (UCP-conformant) exposes `search_catalog` / `lookup_catalog` /
`get_product` + `search_shop_policies_and_faqs` on any Shopify shop domain — no credentials, no
merchant install. Catalog: structured (titles, variants, options, prices, availability, images).
Policies/shipping/returns/FAQ: **prose to re-map, not structured settings**. Theme/sections: not
exportable — parity detection works from the storefront surface; capture is presets + manual
dress-up in v1 (Admin-API app explicitly out of scope).

## Stories

### Story 1.1 — Shopify connector: shop domain → staged supply batch
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

### Story 1.2 — Parity score + merchant-shareable report
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

## Sprint QA
- **api spec(s):** pure-logic spec on the Shopify→staging mapper against fixture Storefront-MCP
  responses (`e2e/migrations-mapper.spec.ts`); pure spec on the parity scorer (fixture section sets ⇒
  deterministic score); api spec asserting the connector route is flag-gated (OFF ⇒ 4xx).
- **browser smoke owed:** yes, to Daniel — one real Shopify store pulled to staging + the parity
  report eyeballed for honesty (quality judgment an assert can't make).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (flag ON in a controlled window, or preview URL pre-merge)

1. Go to https://miyagisanchez.com/shop/manage/import → a "Migrar desde Shopify" option appears
   (flag ON).
2. Enter a real Shopify shop domain and start the pull.
   → Within ~1 min a staged batch appears with the shop's products (titles, variants, prices,
   images) and a policies text block.
3. Open the parity report for the batch.
   → Every section of the source shop is listed as mapped / partial / no-equivalent; listing +
   image counts shown; nothing claims a section we don't have.
4. Confirm the import from staging.
   → Products land in the catalog; re-running the import does not duplicate them.
5. Flip `migrations.connector_enabled` OFF and retry step 2.
   → The connector refuses cleanly (no crash, es-MX message).

If any step fails, note the step number + what you saw — that's the bug report.
