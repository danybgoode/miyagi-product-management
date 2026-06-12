# Homepage Polish — Dirección B — Sprint 2: Signed-out merchandising core

**Status:** ⬜ not started · **Risk:** LOW (read-only Medusa reads; frontend-only)

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
Env: production · https://miyagisanchez.com  (or the branch preview URL while pre-merge)

1. Open https://miyagisanchez.com in a private window (signed-out).
   → A "Selección de la semana" featured card sits above a 4-card grid; the **price is the boldest text** on each card.
2. Look at any grid card.
   → Exactly one meta line (location · condition); a timestamp shows only if the listing is <48h old.
3. (admin) Set `metadata.featured = true` on a product, wait ~5 min / redeploy preview.
   → That product becomes the featured card.
4. Scroll to "Categorías".
   → Only categories with listings appear, each with a live count; clicking one → `/l?category=…` shows those listings.

If any step fails, note the step number + what you saw — that's the bug report.
