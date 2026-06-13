# Homepage Polish — Dirección B — Sprint 2: Signed-out merchandising core

**Status:** 🏗️ BUILT — draft PR [#85](https://github.com/danybgoode/miyagisanchezcommerce/pull/85) (`2a38f93`), gate green, pending review/merge · **Risk:** LOW (read-only Medusa reads; frontend-only)

> The heart of the signed-out page: something worth buying, above the fold, with price as the loudest element.

## Stories

### Story 2.1 — Curated "Selección de la semana" + card hierarchy
**As a** signed-out buyer, **I want** a curated featured pick + a clean grid where the price stands out,
**so that** I immediately see something worth buying instead of a raw recency dump.
**Acceptance:**
- New `getCuratedListings(n)` + `getFeaturedListing()` in `lib/listings.ts` (Medusa). Curation rule
  (cold-start, not recency): active listings WITH ≥1 image AND a price, fresh-first, exclude >14 days unless
  pinned. Pinned = `metadata.featured = true` on the Medusa product → featured card; else featured = newest
  qualifying listing.
- Featured card: full-width 16:9, "Destacado" pill, title + location + verified shop (`iconoir-badge-check`),
  **price 18px semibold accent**.
- Grid: 4 cards, 2-col; image `aspect-ratio:1/1`, **price 16px semibold `t-price`** (loudest), title 12.5px
  2-line clamp, ONE meta line (`Location · Condition`), favorite heart overlay retained.
- Timestamps show **only when <48h** (`badge-soft` on image); hidden otherwise. "Ver todo →" → `/l`.
**Risk:** LOW.

### Story 2.2 — Categorías with life (counts, only live categories)
**As a** signed-out buyer, **I want** category rows that show only categories with listings and how many,
**so that** I don't click into empty categories.
**Acceptance:**
- New `getCategoryCounts()` in `lib/listings.ts`, aggregating from Medusa (build on existing `countListings`),
  cached ~5 min via `unstable_cache`.
- Renders **only categories with ≥1 active listing** as list rows (not chips): Iconoir 17px · label 13.5px ·
  count 12px · `iconoir-arrow-right`. Card-panel container, divided rows. → `/l?category=X`.
**Risk:** LOW.

## Sprint QA
- **api spec(s):** pure-logic spec on the curation + count seams (extract the filter/sort/qualify logic into a
  next-free helper so it tests without network) — `e2e/home-curation.spec.ts`. Assert: a >14-day unpinned
  listing is excluded, a pinned one is featured, empty categories drop out.
- **browser smoke owed:** no — anonymous; assert price is the loudest element + no >48h timestamp + heart overlay.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: **branch preview** (PR [#85](https://github.com/danybgoode/miyagisanchezcommerce/pull/85), pre-merge)
or **production · https://miyagisanchez.com** once merged. All steps are anonymous — no auth/money path,
so nothing here is owed to Daniel (optional: a phone-width eyeball).

1. Open the homepage in a private window (signed-out).
   → A **"Selección de la semana"** heading sits above the Categorías module; a featured card (full-width,
   16:9, "Destacado" pill) leads, with a 4-card grid below it.
2. Read any grid card top-to-bottom.
   → The **price is the boldest/largest text** on the card; below it a 2-line title, then **exactly one**
   meta line (`location · condition`); a favorite heart sits over the image.
3. Look for a timestamp badge on the grid images.
   → It appears **only** on listings younger than 48h (e.g. "Hace 3 h") and is **absent** on older ones —
   no "Hace 2 semanas" anywhere.
4. Confirm the featured card is not duplicated.
   → The listing shown as the big "Destacado" card does **not** also appear in the 4-card grid.
5. (admin) Set `metadata.featured = true` on any Medusa product, then reload after ~1 min (curated pool
   cache = 60s).
   → That product becomes the **featured card** even if it's older than 14 days (pin overrides the cutoff).
6. Scroll to **"Categorías"**.
   → Only categories that actually have listings appear, each with a live **count** on the right; an empty
   category (no listings) is **not** shown. Clicking a row → `/l?category=…` lists exactly those listings.

If any step fails, note the step number + what you saw — that's the bug report.
