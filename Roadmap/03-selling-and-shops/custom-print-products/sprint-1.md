# Custom print products — Sprint 1: Storefront honesty + flagship ops

**Status:** ⬜ not started

## Stories

### Story 1.1 — Hide print placements from every shop-storefront surface
**As a** buyer on any shop storefront (marketplace `/s/[slug]`, subdomain, custom domain, embed, UCP shop catalog), **I want** to never see `is_print_placement` products, **so that** miyagiprints (and any future print provider) shows only real, buyable offerings.
**Acceptance:** https://miyagiprints.miyagisanchez.com and https://miyagisanchez.com/s/miyagiprints show zero ad-placement listings; the listing count on the shop header matches; general browse/search exclusion (already live in `apps/backend/src/api/store/listings/route.ts`) untouched; placements still purchasable via the backoffice ad flow. Filter lives in ONE shared seam (`getShopListings()` in `lib/listings.ts` — check the embed + UCP shop-catalog paths hit it too), with a regression spec.
**Risk:** LOW

### Story 1.2 — miyagiprints ops checklist (grants · email · real catalog)
**As** Daniel (admin), **I want** miyagiprints fully outfitted, **so that** it's the flagship configurator shop.
Checklist (ops, ~no code):
1. Run `select owner_email, owner_clerk_id from marketplace_shops where slug = 'miyagiprints'` → record the shop email (expected: `miyagi@despachobonsai.com`).
2. Verify `metadata.subdomain_grant` (should be grandfathered from the 179-shop backfill); if absent, set a `comp` grant.
3. Set `comp` grants: `domain_grant` + the ML-sync grant key (mirror an existing comp-grant shape; the entitlement derivers already honor `type: 'comp'`).
4. Seed miyagiprints' real public catalog (stickers die-cut / kiss-cut / sheet, zines, flyers) with existing listing tools + text personalization (upgraded to the configurator in S2/S3).
**Acceptance:** Canal propio shows domain + subdomain entitled with no upsell; `/shop/manage/mercadolibre` shows entitled; storefront shows the real offerings.
**Risk:** LOW (ops)

## Sprint QA
- **api spec(s):** 1.1 → `e2e/api/shop-listings-placement-filter.spec.ts` (pure filter seam: placement products excluded, normal products untouched, count parity)
- **browser smoke owed:** yes, to Daniel — visual check on all four channels (marketplace / subdomain / custom domain / embed)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/s/miyagiprints in a private window.
   → No "anuncio impreso / placement" listings; only real print offerings; header listing count matches the grid.
2. Open https://miyagiprints.miyagisanchez.com (subdomain, white-label).
   → Same clean catalog, no platform chrome.
3. Open the embed demo page for miyagiprints (seller settings → Embed snippet preview).
   → Grid shows no placements.
4. In the backoffice, open the printed-ad purchase flow (`/shop/manage` → Print edition card).
   → Placements are still buyable there (unchanged).
5. Settings → Canal propio: domain + subdomain sections show "incluido/activo", no paywall upsell; `/shop/manage/mercadolibre` loads entitled.
   → Grants landed.

If any step fails, note the step number + what you saw — that's the bug report.
