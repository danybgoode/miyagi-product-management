# Custom print products — Sprint 1: Storefront honesty + flagship ops

**Status:** ✅ done — both stories shipped + smoke-confirmed by Daniel (2026-07-04). Fuller catalog seeding continues as a separate backlog item (not a Sprint 1 blocker).

## Stories

### Story 1.1 — Hide print placements from every shop-storefront surface ✅ merged (PR [#171](https://github.com/danybgoode/miyagisanchezcommerce/pull/171), squash-merged as `8552974` to `main`, apps/miyagisanchez) — live in prod
**As a** buyer on any shop storefront (marketplace `/s/[slug]`, subdomain, custom domain, embed, UCP shop catalog), **I want** to never see `is_print_placement` products, **so that** miyagiprints (and any future print provider) shows only real, buyable offerings.
**Acceptance:** https://miyagiprints.miyagisanchez.com and https://miyagisanchez.com/s/miyagiprints show zero ad-placement listings; the listing count on the shop header matches; general browse/search exclusion (already live in `apps/backend/src/api/store/listings/route.ts`) untouched; placements still purchasable via the backoffice ad flow. Filter lives in ONE shared seam (`getShopListings()` in `lib/listings.ts` — check the embed + UCP shop-catalog paths hit it too), with a regression spec.
**Risk:** LOW
**Built:** root cause was `getShopListings()` reading `GET /store/sellers/:slug/products` (backend `apps/backend/src/api/store/sellers/[slug]/products/route.ts`), which only filtered `isHiddenCatalogProduct()` — never `is_print_placement`, unlike the general-catalog `/store/listings` route. Added a pure `isPrintPlacementListing()` predicate to `lib/listing-query.ts` (kept `next/*`-free so it's unit-testable) and applied it inside `getShopListings()` before mapping — this single seam covers marketplace `/s/[slug]`, subdomain + custom domain (same route), embed (`/embed/s/[slug]`), `sitemap.ts`, and the PDP "more from this shop" block. The UCP shop catalog forwards to `/store/listings` directly, already filtered — confirmed no change needed there. No backend changes.
**Reviewed:** a fresh cross-agent (`general-purpose`) reviewer independently verified the coverage claim (grepped the exact 4 `getShopListings()` call sites, confirmed no bypass, confirmed the UCP-unaffected claim) — no blocking issues. Codex + Antigravity local cross-review were both unavailable this round (Codex: usage-limited until Aug 1, 2026; Antigravity: CLI drifted to 1.0.16 vs the pinned 1.0.10, and `scripts/lib/cross-agent-cli.mjs` fails loud rather than risk a silently-broken print contract — re-pinning needs a separate verification pass, out of scope here). Advisory-only per WAYS-OF-WORKING, so this didn't block merge.
**Deployed:** merged 2026-07-04, live on `https://miyagisanchez.com` (Vercel `dpl_EcTjwTP1BB1E9tV3DGDcNVfs4Mk4`, production, READY).

### Story 1.2 — miyagiprints ops checklist (grants · email · real catalog) ✅ done (grants) / 🔵 catalog continues as backlog
**As** Daniel (admin), **I want** miyagiprints fully outfitted, **so that** it's the flagship configurator shop.
Checklist (ops, ~no code):
1. ~~Run `select owner_email, owner_clerk_id from marketplace_shops where slug = 'miyagiprints'` → record the shop email~~ — correction: the table has no `owner_email`/`owner_clerk_id` columns, the actual field is `clerk_user_id` (`user_3EPtNxXf04yiQEEVj5L3lhnmifH`); email lookup lives in Clerk, not this table.
2. ✅ `metadata.subdomain_grant` confirmed — grandfathered from the 179-shop backfill (`type: grandfather`, `granted_at: 2026-06-30T21:59:23Z`).
3. ✅ `comp` grants set: `metadata.custom_domain_grant` (`granted_at: 2026-07-04T02:51:53Z`) + `metadata.ml_sync_grant` (`granted_at: 2026-07-04T03:10:30Z`, set by Daniel via the admin panel) — both verified live in Supabase `marketplace_shops`.
4. 🔵 Seed miyagiprints' real public catalog (stickers die-cut / kiss-cut / sheet, zines, flyers): **1 real product live** (`Stickers personalizados`, confirmed via `/api/ucp/catalog?seller_slug=miyagiprints` — 0 placement products, matching Story 1.1's fix). Daniel is adding the rest of the SKU lineup separately — **not a Sprint 1 blocker**, tracked as backlog.
**Acceptance:** Canal propio shows domain + subdomain entitled with no upsell; `/shop/manage/mercadolibre` shows entitled; storefront shows the real offerings. ✅ grants + at least one real offering confirmed live.
**Risk:** LOW (ops)

## Sprint QA
- **api spec(s):** 1.1 → `e2e/shop-listings-placement-filter.spec.ts` (corrected path — this repo's specs live flat in `e2e/*.spec.ts`; `api` is the Playwright *project* name, not a subfolder). Pure predicate test: placement products excluded, normal + hidden-catalog products untouched, null/undefined-safe. ✅ 5/5 passing.
- **browser smoke:** ✅ confirmed green by Daniel (2026-07-04) — all four channels (marketplace / subdomain / custom domain / embed); walkthrough below
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ + Playwright `api` ✅ (1301 passed, 1 pre-existing unrelated failure — see PR note) green before merge

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
