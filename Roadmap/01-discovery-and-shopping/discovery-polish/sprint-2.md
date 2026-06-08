# Sprint 2 — Mobile filter rebuild

> Epic: [Discovery Polish](README.md) · **Risk: LOW–MED** (frontend-only; presentational). Watch for
> any shared-layout touch.
> **Status: 📋 PLANNED — not started.** Goal: the mobile filter stops being a dense inline `<select>`
> stack and becomes a real, apply-gated layer with a live result count (Baymard 2026 guidance,
> re-confirmed in the 01 refresh).

## Stories

### S2.1 — Full-screen / bottom-sheet filter layer
**As** a buyer on mobile, **I want** filters in a dedicated layer behind a sticky trigger, **so that**
browsing isn't buried under a wall of form controls.
- Rebuild `app/l/SearchBar.tsx`'s mobile presentation as a full-screen or bottom-sheet panel opened by
  a sticky "Filtrar y ordenar" trigger; desktop can keep the inline layout.
- **Acceptance:** on a phone viewport the filters live in a sheet/overlay opened by the sticky trigger;
  the result grid is unobstructed until opened.
- **QA:** anonymous browser smoke at a mobile viewport (sticky trigger opens the layer). **Risk: LOW–MED.**

### S2.2 — Deliberate apply + live "Ver X resultados"
**As** a buyer, **I want** to set several filters then apply once and see how many results I'll get,
**so that** I'm not reloading on every change and I know the filter isn't a dead end.
- Stage filter changes inside the layer; a primary "Ver X resultados" button applies them and shows the
  live count; provide a clear "Limpiar" reset.
- **Acceptance:** changing filters updates the "Ver X resultados" count before applying; tapping it
  applies all at once and closes the layer.
- **QA:** anonymous browser smoke (count updates pre-apply; apply commits). **Risk: LOW–MED.**

## Sprint QA — plan
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- **New specs:** anonymous `*.browser.spec.ts` for the mobile layer (trigger opens it; count updates;
  apply commits). Extract any count/derive logic to a `lib/` seam for a free pure-logic spec.
- **Deploy:** frontend-only; standard Vercel preview → prod.

## Sprint 2 — Smoke walkthrough (fill in with real URLs at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Use a phone or a narrow browser window.

1. Go to https://miyagisanchez.com/l on a phone-width screen.
   → A sticky "Filtrar y ordenar" button is visible; filters are NOT a dense inline stack.
2. Tap "Filtrar y ordenar".
   → A full-screen / bottom-sheet filter layer opens.
3. Pick a category and a type without leaving the layer.
   → The primary button updates to "Ver N resultados" with a live count.
4. Tap "Ver N resultados".
   → The layer closes and the grid shows exactly those results.
5. Reopen the layer and tap "Limpiar".
   → Filters reset.

If any step fails, note the step number + what you saw.
```
*(No money/auth path — anonymous-testable; a browser spec can cover it.)*
