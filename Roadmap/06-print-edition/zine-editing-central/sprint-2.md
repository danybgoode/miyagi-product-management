# Zine editing central — Sprint 2: variable sheets + the other two sources

**Status:** ⬜ not started

## Stories

### Story 2.1 — Variable booklet sheets
**As** Daniel (editor), **I want** the booklet to grow/shrink in pliegos (multiples of 4 pages — one
folded oficio sheet = 4 pages) instead of the hardcoded 12, with the editorial sections staying
fixed/pinned, **so that** an issue with more or fewer sold ads still imposes and prints correctly.
**Acceptance:** add a pliego → 4 new ad-capable pages appear in reading order; remove one (only if
its pages are empty) → back down; editorial sections keep their positions; the imposition view and
exported PDF pair pages correctly for 8, 12, 16, 20 pages (saddle-stitch: first↔last, etc.).
**Note:** booklet-only — the trifold's sheet count is fixed by the physical fold.
**Risk:** LOW (vitest-heavy: imposition pairing is a pure function)

### Story 2.2 — Catalog pull: live listings as house-ads
**As** Daniel (editor), **I want** to search live marketplace listings from zine and drop one in as
a courtesy/house ad with auto-generated QR + `mschz.org` short link, **so that** I can fill unsold
space with real catalog the way Maqueta's curation drawer did.
**Acceptance:** search by keyword returns live listings (title, price, photo, shop); placing one
auto-fills a house-ad block with QR resolving to the listing; snapshot + `ref_id` kept.
**Risk:** LOW

### Story 2.3 — Social pull: community submissions into the social section
**As** Daniel (editor), **I want** approved community submissions (recomendaciones, eventos,
saludos…) pulled into the zine's community/social editorial section, **so that** the reader-facing
section fills from real submissions instead of hand-typing.
**Acceptance:** approved social submissions for the edition are listable and placeable into the
social section blocks (caption, body, photos, zone, type label); placement snapshots content.
**Risk:** LOW

## Sprint QA
- **unit (apps/zine vitest):** imposition pairs for 8/12/16/20 pages · listing→house-ad mapping ·
  social→block mapping · "remove pliego blocked when pages occupied".
- **api spec(s):** none new — reads ride Sprint 1's `print-studio-api.spec.ts` (catalog + social
  shapes asserted there if not already).
- **browser smoke owed:** yes, to Daniel — visual imposition check on the exported PDF (fold a
  printed proof: page order correct).
- **deterministic gate:** `tsc --noEmit` + builds + suites green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: local zine + production marketplace

1. Open a 12-page booklet edition → "Agregar pliego".
   → Pages 13–16 appear; editorial sections didn't move.
2. Export the PDF → check the imposition sheets.
   → Pliego pairing is correct for 16 pages (p1↔p16 on the outer sheet, center spread intact).
3. Search a real listing in the catalog drawer → place it.
   → House-ad block fills with title/price/photo; QR scans to the listing (short link).
4. Open the social drawer → place an approved recomendación.
   → It lands in the community section with caption/photo/zone.
5. Remove the added pliego after emptying its pages.
   → Back to 12 pages; export still imposes correctly.

If any step fails, note the step number + what you saw — that's the bug report.
