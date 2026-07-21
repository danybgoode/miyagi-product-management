# Homepage dynamic rows — restore on prod + polish to spec — Sprint 2: Signed-in polish to spec — ribbon gating, price-drop badge, recently-viewed

**Status:** ✅ merged `5ac54d5` (PR #251, squash-merged to `main` 2026-07-15) — Daniel's signed-in prod smoke remains owed

> Reference mockup: `marketplace_search_results_mobile.png` — rail cards carry "Visto ayer" /
> "↓ Bajó $300" / "Favorito" meta; the value-prop ribbon is gone for signed-in ("su trabajo ya
> está hecho").

## Stories

### Story 2.1 — Hide the value-prop ribbon for signed-in users ✅
**As a** returning signed-in buyer, **I want** the orientation ribbon gone, **so that** my
personalized rows sit at the top — the ribbon's job is done.
Wrap `data-testid="home-ribbon"` in `<AuthShow when="signed-out">` (same idiom as the terminal
CTA — prerenders into static HTML, hydrates away signed-in). `/` stays static.
**Acceptance:** anonymous HTML still contains the ribbon (`home-static.spec.ts` green); a signed-in
browser session does not show it. Browser regression spec.
**Risk:** low
**Commit:** `8fa9410` (apps/miyagisanchez) — new `e2e/home-ribbon-auth.browser.spec.ts`, verified
red on a deliberate `when="signed-in"` mutation, then green.

### Story 2.2 — Price-drop badge on rail cards ("↓ Bajó $300") ✅
**As a** buyer, **I want** to see when a favorited item got cheaper, **so that** I come back and buy.
**Finding during build: no new migration was needed.** The snapshot column
(`marketplace_favorites.price_cents_at_save`) already existed — it shipped in an earlier,
unrelated epic (Homepage Polish "Dirección B", 2026-05-25) and was already written at
favorite-time (`app/api/favorites/route.ts`) and rendered on `/account/favorites`. This story
just wired the existing column into the homepage-rail endpoint + island (the field name that
shipped is `priceCentsAtSave`, not the `priceAtFavoriteCents` guessed at grooming). Backend
shipped first (additive field, degrades to `null` → no badge on old frontends); frontend
`derivePriceDrop()` mirrors `/account/favorites`'s exact comparison (`current < snapshot`, both
truthy).
**Acceptance:** favorite a listing, lower its price, reload `/` → card shows "↓ Bajó $N". Unit
spec on the pure derivation seam + endpoint unit spec.
**Risk:** low (no migration after all — confirmed pre-existing column, not additive-expand as
originally assumed).
**Commits:** `fc3de99` (apps/backend), `425d2f3` (apps/miyagisanchez, combined with 2.3 — see
below). Backend: `medusa build` + `tsc --noEmit` + `npm run test:unit` green (39 suites / 422
tests, 2 new price-drop cases). Frontend derivation verified red on a deliberate `<=` mutation,
then green.

### Story 2.3 — Recently-viewed in the rail ("Visto ayer") ✅
**As a** buyer, **I want** items I looked at yesterday back in front of me, **so that** I resume
browsing, not restart it.
v1 is **device-local**: the PDP records `{id, ts}` to `localStorage` (capped ring, 20); the rail
merges recently-viewed with favorites client-side (favorites win on collision; combined cap 6
cards — `RAIL_CAP`), meta label "Visto hoy/ayer" vs "Favorito" (calendar-day boundary, not a raw
24h window). No backend, no cross-device (out of scope per seed). Card data for viewed-only ids:
one batched public read, new `GET /api/listings/by-ids?ids=...` (reuses the same
`marketplace_listings` read-for-display convention `lib/home-favorites.ts` already uses — no new
architectural pattern).
**Acceptance:** view a PDP signed-in, return to `/` → its card shows "Visto hoy"; favorited items
keep "Favorito". Pure-logic spec on the extracted merge/label seam in `lib/`.
**Risk:** low
**Commit:** `425d2f3` (apps/miyagisanchez, combined with 2.2 — both stories evolved the same
`HomeRetomaOffers.tsx` render block with no clean intermediate git state to split at). New
`lib/home-recently-viewed.ts`, `lib/home-recently-viewed-merge.ts`,
`e2e/home-recently-viewed.spec.ts` (11 cases), `RecordRecentView.tsx`. Each new branch
(favorites-win collision, `RAIL_CAP` truncation, dedupe-bump) verified red via a deliberate
mutation, then green.

## Sprint QA
- **api spec(s):** merge/label + price-drop derivation as pure `lib/` specs (all in
  `e2e/home-personalization.spec.ts` + new `e2e/home-recently-viewed.spec.ts`); ribbon-gating
  browser spec (new `e2e/home-ribbon-auth.browser.spec.ts`); `home-static.spec.ts`
  untouched-and-green is the rail.
- **browser smoke owed:** yes, to Daniel — signed-in prod pass on his real account/phone (auth
  path) for all three stories; the price-drop + recently-viewed acceptance steps below in
  particular need a real favorite/PDP-view/price-change round trip.
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ (`/` still prerenders `○` static;
  new `/api/listings/by-ids` route is `ƒ` dynamic as expected) + Playwright `api` green — full
  suite locally: 2228/2262 passed, 7 pre-existing failures confirmed unrelated (2
  curated-listings-empty + 5 launchpad-flag-state, both reproducing identically on unmodified
  code per the exact pattern Sprint 1 documented — none touch a file this sprint changed).
  Backend: `medusa build` + `tsc --noEmit` + `npm run test:unit` green (39 suites / 422 tests).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Signed in, open https://miyagisanchez.com.
   → No green value-prop ribbon at the top; your rail sits first. In a private window the ribbon
   is still there.
2. Open any listing from https://miyagisanchez.com/l, view it, then go back to
   https://miyagisanchez.com.
   → That listing appears in the rail with "Visto hoy".
3. From your test shop, lower the price of a listing you favorited, then reload
   https://miyagisanchez.com. **(auth path — owed to Daniel)**
   → Its rail card shows "↓ Bajó $<difference>".

If any step fails, note the step number + what you saw — that's the bug report.
