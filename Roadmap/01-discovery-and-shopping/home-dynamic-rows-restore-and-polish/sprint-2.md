# Homepage dynamic rows — restore on prod + polish to spec — Sprint 2: Signed-in polish to spec — ribbon gating, price-drop badge, recently-viewed

**Status:** ⬜ not started

> Reference mockup: `marketplace_search_results_mobile.png` — rail cards carry "Visto ayer" /
> "↓ Bajó $300" / "Favorito" meta; the value-prop ribbon is gone for signed-in ("su trabajo ya
> está hecho").

## Stories

### Story 2.1 — Hide the value-prop ribbon for signed-in users
**As a** returning signed-in buyer, **I want** the orientation ribbon gone, **so that** my
personalized rows sit at the top — the ribbon's job is done.
Wrap `data-testid="home-ribbon"` in `<AuthShow when="signed-out">` (same idiom as the terminal
CTA — prerenders into static HTML, hydrates away signed-in). `/` stays static.
**Acceptance:** anonymous HTML still contains the ribbon (`home-static.spec.ts` green); a signed-in
browser session does not show it. Browser regression spec.
**Risk:** low

### Story 2.2 — Price-drop badge on rail cards ("↓ Bajó $300")
**As a** buyer, **I want** to see when a favorited item got cheaper, **so that** I come back and buy.
Data: snapshot `price_cents_at_favorite` on `marketplace_favorites` at favorite time (Supabase,
non-commerce — rule 2 ✓; fork decided at grooming, see seed — panel offer stands). Endpoint adds
`priceAtFavoriteCents` to `RecentFavorite`; the island renders the badge when
`current < snapshot`. Backend ships first; frontend degrades gracefully when the field is null
(pre-existing favorites have no snapshot → no badge, correct).
**Acceptance:** favorite a listing, lower its price (test shop), reload `/` → card shows
"↓ Bajó $N". Unit spec on the pure derivation seam + endpoint unit spec.
**Risk:** low (additive expand-only Supabase migration; call it out in the PR).

### Story 2.3 — Recently-viewed in the rail ("Visto ayer")
**As a** buyer, **I want** items I looked at yesterday back in front of me, **so that** I resume
browsing, not restart it.
v1 is **device-local**: the PDP records `{id, ts}` to `localStorage` (capped ring, ~20); the rail
merges recently-viewed with favorites client-side (favorites win on collision; combined cap ~6
cards), meta label "Visto hoy/ayer" vs "Favorito". No backend, no cross-device (out of scope per
seed). Card data for viewed-only ids: ONE batched public listing read — no per-card fetches.
**Acceptance:** view a PDP signed-in, return to `/` → its card shows "Visto hoy"; favorited items
keep "Favorito". Pure-logic spec on the extracted merge/label seam in `lib/`.
**Risk:** low

## Sprint QA
- **api spec(s):** merge/label + price-drop derivation as pure `lib/` specs; ribbon-gating browser
  spec; `home-static.spec.ts` untouched-and-green is the rail.
- **browser smoke owed:** yes, to Daniel — signed-in prod pass on his real account/phone (auth path).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

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
