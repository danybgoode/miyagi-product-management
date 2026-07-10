# Comparador de costos — Sprint 1: Calculator + dataset + teaser

**Status:** ⬜ not started

## Stories

### Story 1.1 — Pure cost model
**As a** merchant, **I want** my stacked platform costs computed correctly from my volume, AOV, plan
tier, commission band, and paid apps, **so that** the comparison is arithmetic, not marketing.
**Acceptance:** a next-free `lib/cost-comparator.ts` computes monthly + annual stacked cost per
platform (Shopify plan tiers, ML commission bands, WooCommerce hosting, Tiendanube, "marketplace +
own site" combos) and Miyagi (SKU costs only, 0% commission); every input user-overridable; unit
specs cover each platform shape + an override + the Miyagi side.
**Risk:** low

### Story 1.2 — Sourced, editable dataset
**As an** admin, **I want** every competitor figure sourced + dated and editable without a deploy,
**so that** the tool stays honest as prices change.
**Acceptance:** baseline versioned JSON in-repo with source + date on every figure; merged through the
shipped content-overrides seam (`applyCopyOverrides` shape, fail-open to baseline); the UI shows the
dataset's verified date (the `/vende` benchmark pattern); a CI guard fails on an unsourced figure.
Competitor prices web-verified + cited at build time. *(Note: runtime editing lights up only once the
missing prod `platform_copy_overrides` table is applied — owed to Daniel; fail-open keeps the feature
working regardless.)*
**Risk:** low

### Story 1.3 — `/comparador` calculator UI
**As a** merchant (or consultant on a phone), **I want** an anonymous, mobile-first calculator with
stacked cost bars, **so that** I see my real numbers next to Miyagi's in under a minute.
**Acceptance:** `/comparador` renders anonymous (no login path anywhere); platform picker(s), monthly
volume + AOV inputs, premium-app toggles each showing typical price with the Miyagi equivalent marked
*incluido*; stacked monthly/annual bars vs Miyagi; every cost field editable inline, nothing
hardcoded-opaque; all copy es-MX; usable at 360/390/414px with no overflow.
**Risk:** low

### Story 1.4 — Homepage teaser + attribution
**As a** visitor, **I want** to discover the comparator from the homepage, **so that** the sales tool
actually gets traffic.
**Acceptance:** a teaser card on `/` links `/comparador`; `/` remains a static prerender (no new
dynamic API — assert in the spec); Clarity events + UTM attribution wired like the `/vende` pages.
**Risk:** low

## Sprint QA
- **api spec(s):** unit specs on `lib/cost-comparator.ts` + the dataset merge/guard (1.1, 1.2);
  `e2e/comparador.spec.ts` — route renders, key figures + verified-date present, prefill of a known
  input produces the lib's number (1.3); homepage spec asserts `/` still static + card present (1.4).
- **browser smoke owed:** yes, to Daniel — phone, anonymous: teaser → comparison → inline override.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com on your phone.
   → A "Comparador de costos" teaser card is on the homepage; the page loads instantly (still static).
2. Tap the card.
   → `/comparador` opens, no login prompt, es-MX copy, a verified-date visible near the figures.
3. Pick "Shopify (plan Básico)" + enter volume 100 ventas/mes, AOV $500.
   → Stacked monthly and annual bars appear for Shopify vs Miyagi; Shopify includes plan + fees;
     Miyagi shows SKU costs only, 0% comisión.
4. Toggle a premium app (e.g. reseñas).
   → The app's typical price stacks onto Shopify's bar; the Miyagi side marks it *incluido*.
5. Tap any competitor figure and change it.
   → The bars recompute immediately with your number; a hint shows the original sourced value.

If any step fails, note the step number + what you saw — that's the bug report.
