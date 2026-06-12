# Homepage Polish — Dirección B — Sprint 1: Icon language migration

**Status:** ⬜ not started · **Risk:** LOW *(touches shared `lib/types.ts` + renderers — announce per LEARNINGS)*

> Ship first, independently. Establishes the single Iconoir language the rest of the epic assumes.

## Stories

### Story 1.1 — Emoji → Iconoir across categories + buyer surfaces
**As a** buyer, **I want** one consistent icon language on the homepage and category surfaces, **so that**
the marketplace feels coherent and modern instead of an emoji grab-bag.
**Acceptance:**
- Every `CATEGORIES[].icon` in `lib/types.ts` is an Iconoir class name (mapping in `handoff/HANDOFF.md` §3,
  all names verified to exist in the loaded build); `mascotas` stays provisional `fish`.
- Renderers updated to `<i className={\`iconoir-${cat.icon}\`} />` — `CategoryChips.tsx`, listing filters,
  anywhere `cat.icon` renders.
- Verified "✓" text glyphs → `iconoir-badge-check`.
- A repo grep for emoji ranges in `app/` + `lib/` (buyer surfaces) returns nothing new; remaining emoji
  replaced or removed.
**Risk:** LOW (presentational) — but `lib/types.ts` is shared site-wide; announce + merge latest `main` first.

## Sprint QA
- **api spec(s):** `e2e/home-icons.spec.ts` (or extend an existing discovery spec) — assert no emoji codepoints
  in the homepage SSR HTML and that `CATEGORIES` icons are Iconoir names (pure-logic check on the array).
- **browser smoke owed:** no — anonymous; the category rail renders Iconoir glyphs with no login.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while pre-merge)

1. Open https://miyagisanchez.com
   → The category row shows line icons (car, home, smartphone…), **no emoji** anywhere.
2. Open https://miyagisanchez.com/l
   → Category filters show the same Iconoir glyphs; no 🚗/🏠/📱 remain.
3. Find any listing from a verified shop on the home grid.
   → The verified mark is the `iconoir-badge-check` icon, not a "✓" text glyph.
4. Toggle dark mode and calm mode (header).
   → Icons render correctly in both; no missing-glyph boxes, no hardcoded colors.

If any step fails, note the step number + what you saw — that's the bug report.
