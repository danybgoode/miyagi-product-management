# Sprint 2 — Mobile filter rebuild

> Epic: [Discovery Polish](README.md) · **Risk: LOW–MED** (frontend-only; presentational). Watch for
> any shared-layout touch.
> **Status: ✅ BUILT 2026-06-08 — [PR #51](https://github.com/danybgoode/miyagisanchezcommerce/pull/51)
> (awaiting green CI + reviewer auto-merge; LOW–MED, no shared-layout touch).** Gate green locally
> (tsc ✅ · next build ✅, `/api/listings/count` registered · `resultCountLabel` api specs 3/3 ✅); the
> count round-trip + anonymous browser smoke run in CI against the PR preview.
> Goal: the mobile filter stops being a dense inline `<select>` stack and becomes a real, apply-gated
> layer with a live result count (Baymard 2026 guidance, re-confirmed in the 01 refresh).
>
> **Design decisions (Daniel):** mobile layer = **bottom-sheet** (mirrors the `CartDrawer` idiom); the
> S1 **instant type chip rail stays above the grid on all viewports** — type is NOT folded into the
> sheet. The sheet stages category / estado / municipio / sort / price + the category-specific fields;
> the live count merges the staged values over the applied `listing_type`. Breakpoint = **`sm`** (the
> form already became its inline row at `sm`, so desktop/tablet stay byte-identical; only phones <640
> get the sheet).

## Stories

### S2.1 — Bottom-sheet filter layer behind a sticky trigger ✅ (`1ae22db`)
**As** a buyer on mobile, **I want** filters in a dedicated layer behind a sticky trigger, **so that**
browsing isn't buried under a wall of form controls.
- Rebuilt `app/l/SearchBar.tsx`'s mobile (`<sm`) presentation as a bottom-sheet opened by a sticky
  "Filtrar y ordenar" trigger; `sm+` keeps the inline card unchanged. **One `<form>`, one field set**
  (no duplicate inputs → no double-submit) — only the outer wrapper flips between `sm:static` inline and
  a `<sm` `fixed bottom-0` sheet via responsive classes + an `open` state. Esc + backdrop close,
  body-scroll lock, bottom apply bar. Mirrors the `CartDrawer` overlay idiom.
- **Acceptance:** on a phone viewport the filters live in a sheet opened by the sticky trigger; the
  result grid is unobstructed until opened. ✅
- **QA:** anonymous browser smoke at a mobile viewport (trigger visible + grid unobstructed → tap opens
  the sheet). **Risk: LOW–MED.**

### S2.2 — Deliberate apply + live "Ver X resultados" + Limpiar ✅ (`b119eab`)
**As** a buyer, **I want** to set several filters then apply once and see how many results I'll get,
**so that** I'm not reloading on every change and I know the filter isn't a dead end.
- Stage changes inside the sheet; the primary **"Ver X resultados"** button applies them (native GET
  submit → one navigation) and shows a live count, seeded from the SSR `total` (zero fetch on open),
  re-derived debounced (300ms) on any field change via new `GET /api/listings/count` →
  `countListings()` (reuses the same `buildQuery` pipeline, `limit=1`, total only; the applied
  `listing_type` from the instant rail is merged in). `resultCountLabel()` (next-free, in
  `lib/listing-query.ts`) is the single-source es-MX singular/plural label. **"Limpiar"** clears the
  staged fields + re-counts.
- **Acceptance:** changing filters updates the "Ver X resultados" count before applying; tapping it
  applies all at once and closes the sheet; Limpiar resets. ✅
- **QA:** api round-trip on the count route + pure-logic `resultCountLabel` spec; anonymous browser
  smoke (count re-derives pre-apply; apply commits + closes; Limpiar resets). **Risk: LOW–MED.**

## Sprint QA — done
- **Deterministic gate (green):** `tsc --noEmit` ✅ · `next build` ✅ (route `/api/listings/count`
  registered) · Playwright `api` — `resultCountLabel` pure-logic 3/3 ✅ locally; the count round-trip
  runs in **CI against the PR preview** (the route isn't on prod until merge).
- **New specs:** `e2e/mobile-filter.spec.ts` (`api` gate) — `resultCountLabel` edge cases + a
  data-resilient `/api/listings/count` round-trip (filter ⊆ unfiltered; impossible filter ⇒ 0).
  `e2e/mobile-filter.browser.spec.ts` (anonymous browser, **not** the gate) — sticky trigger opens the
  sheet; staging a category re-derives the count; apply commits + closes; Limpiar resets.
- **Caveat (from S1):** `/store/listings` (shared by the count route) is ~90s cold → run the browser
  smoke against a **warm** preview/prod, not cold local dev.
- **Deploy:** frontend-only; standard Vercel preview → prod. No shared-layout file touched.

## Sprint 2 — Smoke walkthrough
```
Env: PR #51 Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Use a phone or a narrow browser window (<640px wide). Anonymous — no login, no money/auth path.

1. Go to https://miyagisanchez.com/l on a phone-width (<640px) screen.
   → A sticky "Filtrar y ordenar" button is visible; the filters are NOT a dense inline stack,
     and the result grid sits directly below (unobstructed).
2. Above the grid, note the instant type chip rail (Todos · Productos · Servicios · …) — S1.
   → It stays OUTSIDE the sheet; tapping a type still navigates instantly (unchanged).
3. Tap "Filtrar y ordenar".
   → A bottom-sheet slides up from the bottom over a dimmed backdrop, with a "Filtros"
     header + close (✕). The grid is behind it.
4. Inside the sheet, pick a category (e.g. "Autos") and/or set a price — without leaving the sheet.
   → The primary button updates to "Ver N resultados" with a live count (it re-derives as
     you change fields). 0 matches reads "Sin resultados".
5. Tap "Ver N resultados".
   → The sheet closes and the page reloads to /l?category=autos… showing exactly those results;
     the result count at the top matches.
6. Reopen the sheet and tap "Limpiar".
   → The staged fields reset to empty (the count re-derives); you still tap "Ver …" to apply.
7. Resize the window wide (≥640px) or load /l on desktop.
   → The filter is the original inline card (no sticky trigger, no sheet) — unchanged from before.

If any step fails, note the step number + what you saw.
```
*(No money/auth path — every step is anonymous-testable; `mobile-filter.browser.spec.ts` covers
steps 1 + 3–6 headlessly against a warm preview/prod.)*
