# Sprint 1 — Listing-type taxonomy (filterable)

> Epic: [Discovery Polish](README.md) · **Risk: LOW** (read-only discovery; no shared layout).
> **Status: ✅ SHIPPED to prod 2026-06-08** — [PR #50](https://github.com/danybgoode/miyagisanchezcommerce/pull/50) squash-merged (`90986a7`). Gate green (tsc + build + api 244✅); anonymous browser smoke **2/2 vs preview** (the code merged verbatim); **live prod render confirmed** (`/l` serves the type chip rail + a "Servicio" badge).
> Goal: a buyer can filter listings by type, and cards show which type each listing is. The data was
> already normalized (`lib/listings.ts:119`); this sprint added the filter plumbing + UI.
>
> **Re-scope from research (frontend-only):** the backend **already** filters `listing_type`
> (`apps/backend/.../store/listings/route.ts:93`), `toListingShape` already normalizes it, and
> `/api/ucp/catalog` already forwards it. So S1.1 needed **no backend change / no Cloud Run deploy** —
> the epic README's "merge backend first" note does not apply. (Tidied the catalog doc-comment
> `physical`→`product`.)

## Stories

### S1.1 — Forward `listing_type` through search ✅ (`8d05c0a`)
**As** a buyer, **I want** the search to accept a `listing_type` filter, **so that** I can narrow to
products, services, rentals, digital goods, or subscriptions.
- Extracted `buildQuery` into a next-free `lib/listing-query.ts` (so the Playwright `api` runner can
  unit-test it — `lib/listings.ts` imports `next/cache`) and added `listing_type` to its allow-list.
  Added the listing-type taxonomy (`LISTING_TYPE_FILTERS` + `listingTypeBadge`) there as the single
  source the chip rail, card badge, and spec share. `listing_type` added to `SearchParams`.
- Backend already filters it (`/store/listings`) and `/api/ucp/catalog` already forwards it — **no
  backend change**.
- **Acceptance:** `GET /store/listings?listing_type=service` returns only service listings; the same
  param round-trips from a URL (`/l?listing_type=service`). ✅
- **QA:** pure-logic spec on `buildQuery` (forwards `listing_type`) + `listingTypeBadge`; an api spec
  asserting the filter round-trips via `/api/ucp/catalog` (verified live against prod). **Risk: LOW.**

### S1.2 — Type selector in the search UI ✅ (`fe37be2`)
**As** a buyer, **I want** a visible type filter, **so that** I can pick "servicios" without editing
the URL.
- Added `app/components/ListingTypeChips.tsx` — an **instant chip rail above `SearchBar`** (Daniel's
  call), mirroring `CategoryChips`' look. es-MX labels (Todos / Productos / Servicios / Rentas /
  Digitales / Suscripciones). **Unlike `CategoryChips`, it preserves the current search params** and
  only sets/clears `listing_type` (resetting `page`) — so a type tap never wipes q/category/state/sort.
- **Acceptance:** selecting a type filters the results and reflects in the URL; "Todos" restores all. ✅
- **QA:** anonymous browser smoke (`discovery-filter.browser.spec.ts`) — chip targeted by href
  (`listing_type=service`), since "Servicios" also exists as a category chip. **Risk: LOW.**

### S1.3 — Cards show listing type ✅ (`fe37be2`)
**As** a buyer, **I want** each listing card to show its type, **so that** a service doesn't look like
a product at a glance.
- Result cards lead with an es-MX type badge via `listingTypeBadge()` (Servicio / Renta / Digital /
  Suscripción); `product` (the default/majority) gets **no** badge to avoid noise.
- **Acceptance:** a service listing card visibly reads "Servicio" (etc.); products show no badge. ✅
- **QA:** folded into the anonymous browser smoke (a service card shows "Servicio"). **Risk: LOW.**

## Sprint QA — done
- **Deterministic gate (green):** frontend `tsc --noEmit` ✅ · `next build` ✅ · Playwright `api`
  (`npm run test:e2e`) ✅ **244 passed / 1 skipped**. (Backend untouched — no backend tsc needed.)
- **New specs:** `e2e/discovery-filter.spec.ts` (api gate) — pure-logic on `buildQuery` + `listingTypeBadge`,
  plus a data-resilient round-trip proving `?listing_type=` reaches the backend filter (asserted live
  against prod). `e2e/discovery-filter.browser.spec.ts` (anonymous browser, **not** the gate).
- **Deploy order:** frontend-only — no backend coordination.
- **Observation (out of scope):** `/store/listings` is **~90s cold** (a pre-existing O(sellers) per-seller
  graph fan-out) — fine on warm prod/CDN but it makes the *local-dev* browser smoke impractical; run the
  browser smoke against a warm preview/prod. Logged as a discovery-perf idea, not fixed here.

## Sprint 1 — Smoke walkthrough
```
Env: PR #50 Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Anonymous (no login) — every step is buyer-side discovery; no money/auth path this sprint.

1. Go to https://miyagisanchez.com/l
   → Below the category chips, a type chip rail shows:
     Todos · Productos · Servicios · Rentas · Digitales · Suscripciones.
2. Tap "Servicios".
   → The URL becomes …/l?listing_type=service and the grid shows only service listings;
     the "Servicios" chip is highlighted (selected).
3. Look at any result card in that filtered grid.
   → It leads with a small "Servicio" badge (accent-colored). Products show no type badge.
4. Add a category/search first (e.g. tap a category, then tap a type chip).
   → Both filters apply together — the type tap does NOT clear your category/search/state.
5. Tap "Todos" on the type rail.
   → listing_type drops from the URL and all listing types return.

If any step fails, note the step number + what you saw.
```
*(No money/auth path — all steps anonymous-testable; `discovery-filter.browser.spec.ts` covers steps 2–3
+ 5 headlessly against a warm preview/prod.)*
