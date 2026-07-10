# Platform migrations — Sprint 3: Packaging — landings + consultant runbook

**Status:** ⬜ not started
**Risk:** LOW (copy + non-commerce pages; reviewer may auto-merge on green CI).

## Context
Bucket-1 of the seed: CSV/JSON migrations from Tiendanube/WooCommerce/BigCartel exports already work
on the shipped importer — what's missing is **positioning**: a concrete, jargon-free how-to per
platform. Shopify gets the connector path (S1). The consultant interaction (photograph the shop →
interview → agent sets it up) is the promoter close flow — it needs a runbook, not code. All copy
es-MX, recruiting register (concrete steps, no jargon), **not** on the bilingual allow-list.

## Stories

### Story 3.1 — Per-platform migration landing/how-to pages
**As a** merchant on Shopify/Tiendanube/WooCommerce/BigCartel, **I want** a page that shows me
exactly how to move to Miyagi, **so that** I can judge the switch in five minutes.
**Acceptance:**
- One page per platform (under the `/vende` family): Shopify → the connector path (S1); the CSV/JSON
  platforms → export steps with real screenshots/names of their export menus → the existing importer.
- Each page walks a real export → import end-to-end (verified against a real export file per
  platform during the build).
- The free-≤500-listings baseline and the white-glove option are both stated honestly; per-page SEO
  meta; es-MX throughout.
**Risk:** low

### Story 3.2 — Consultant runbook + `/vende` + sell-sheet integration
**As a** promoter, **I want** a photograph-the-shop → interview → agent-sets-it-up runbook,
**so that** I can close a migration in one visit without improvising.
**Acceptance:**
- A runbook page (handbook style, like `/vende/promotor/sell-sheet`): what to photograph, the
  interview questions, how to run the pull/import, when to quote flat vs estimate vs route to Daniel.
- The migration offer appears on `/vende` (persona-appropriate) and in the promoter sell-sheet with
  the real prices from admin config (no hardcoded numbers).
**Risk:** low

## Sprint QA
- **api spec(s):** api spec on the new routes (200, es-MX meta present, no orphan/hardcoded prices —
  prices sourced from config); copy-completeness check per the es-MX gate.
- **browser smoke owed:** copy sign-off to Daniel (register/honesty judgment).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/vende → the migration offer is visible and links to the
   per-platform pages.
2. Open the Shopify page → it walks the connector path; the Tiendanube/WooCommerce/BigCartel pages
   each show that platform's real export steps → import.
3. Follow one CSV path end-to-end with a real export file.
   → The catalog lands via the existing importer exactly as the page promises.
4. Open the consultant runbook from the promoter sell-sheet.
   → Prices shown match the admin config; the flat/estimate/route-to-Daniel decision tree is stated.

If any step fails, note the step number + what you saw — that's the bug report.
