# Homepage dynamic rows — restore on prod + polish to spec — Sprint 3: Signed-out first-visit iteration — hero, Recién llegado, Pasillos, seller block

**Status:** ⬜ not started

> Reference mockup: `mercado-libre-search-results.png` (signed-out · primera visita). Hard rail:
> `/` stays an ISR static asset — every section below is server-rendered from cached reads or
> client-gated via `AuthShow`; no `currentUser()`/`headers()`.

## Stories

### Story 3.1 — Hero + trust badges (signed-out)
**As a** first-time visitor, **I want** an instant read on what this place is ("Lo que tu barrio
vende, compra y recomienda") with trust badges (Compra protegida · Haz tu oferta · 0% comisiones),
**so that** I trust it enough to browse.
Replaces the thin ribbon *for signed-out* (2.1 already removed it signed-in — this supersedes the
ribbon entirely; reconcile with 2.1: hero is signed-out-only via `AuthShow`, prerendered). Copy as
new `home.hero.*` dictionary keys (admin-editable, es-MX).
**Acceptance:** incognito `/` shows hero + 3 badges in the prerendered HTML; signed-in shows
neither hero nor ribbon. Static marker for `/` preserved.
**Risk:** low

### Story 3.2 — "Recién llegado al barrio" row
**As a** visitor, **I want** the newest neighborhood listings with "Nuevo hoy" badges, **so that**
the marketplace feels alive.
Newest-first cached read (same ISR/`revalidate` policy as `getCuratedListings`; extend
`lib/listings.ts`), 3–4 cards, "Nuevo hoy" when `<24 h` (reuse `isRecentForBadge`/`timeAgo`
thresholds), "Ver todo →" → `/l?sort=newest` (or existing equivalent). Dedupe against Selección
picks so the two rows never show the same listing twice.
**Acceptance:** row renders in anonymous static HTML with newest listings; a listing published
today carries "Nuevo hoy"; no overlap with Selección. Pure-logic spec on the dedupe/badge seam.
**Risk:** low

### Story 3.3 — "Pasillos" chips with live counts
**As a** visitor, **I want** category chips with counts (Electrónica 14 · Hogar y jardín 9 …),
**so that** I can dive into an aisle in one tap.
Reuse `getCategoryCounts` (already fetched on `/`) + extend `CategoryChips` with a count variant +
a "Todas →" chip. Only categories with ≥1 active listing (existing rule).
**Acceptance:** chips show label + count matching the Categorías section's numbers; tap →
`/l?category=<key>`. Existing chips elsewhere unchanged.
**Risk:** low

### Story 3.4 — Seller block + terminal CTA restyle
**As a** would-be seller, **I want** "Pon tu puesto en el barrio" with the three reassurances
(gratis y sin comisiones · tu propio dominio · pagos protegidos) and "Abre tu tienda gratis",
**so that** browsing converts into selling.
Restyle/extend the existing signed-out terminal CTA (`AuthShow when="signed-out"`, same gating) to
the mockup's dark card; keep "Crear cuenta / Seguir explorando" as the final row. Copy via
`home.terminalCta.*` / new `home.sellerBlock.*` keys. `data-testid="home-unete-signup"` must
survive (nav-entry-points spec).
**Acceptance:** incognito bottom-of-page matches mockup structure; signed-in still gets
`HomeSellerModule` instead; existing specs green.
**Risk:** low

## Sprint QA
- **api spec(s):** extend `home-static.spec.ts`/`home-curation.spec.ts` for hero + Recién llegado +
  Pasillos in anonymous HTML; pure-logic specs for dedupe/badge; nav-entry-points spec stays green.
- **browser smoke owed:** no — fully anonymous surface; agent covers it (Daniel eyeballs design).
- **deterministic gate:** `tsc --noEmit` + `npm run build` (static marker for `/`) + Playwright `api`.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com in a private window.
   → Hero "Lo que tu barrio vende, compra y recomienda" + 3 trust badges at the top (no green
   ribbon anywhere).
2. Scroll once.
   → "Recién llegado al barrio" row with the newest listings; anything published today shows
   "Nuevo hoy". None of these repeat in "Selección de la semana" below.
3. Find the "Pasillos" chips.
   → Each chip shows a count; tapping "Electrónica <n>" lands on
   https://miyagisanchez.com/l?category=electronica with listings.
4. Scroll to the bottom.
   → Dark "Pon tu puesto en el barrio" card with "Abre tu tienda gratis", then
   "Crear cuenta / Seguir explorando".
5. Sign in and reload https://miyagisanchez.com.
   → Hero and seller block are gone; your rail (S1) and seller snapshot render instead.

If any step fails, note the step number + what you saw — that's the bug report.
