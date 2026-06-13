# Homepage Polish — Dirección B — Sprint 1: Icon language migration

**Status:** ✅ COMPLETE — merged to `main` 2026-06-12, PR [#84](https://github.com/danybgoode/miyagisanchezcommerce/pull/84) squash `14fd880` · **Risk:** LOW *(touched shared `lib/types.ts` + renderers — announced in the PR per LEARNINGS)*

> **QA:** deterministic gate green (tsc + build + Playwright `api` **vs preview**, incl. `e2e/home-icons.spec.ts` SSR). Cross-agent review (codex) clean — no blocking/should-fix, one nit applied (Iconoir-name guard now allows digits, commit `830f661`). No Daniel smoke owed (anonymous/presentational).

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
Env: pre-merge → the PR's Vercel **preview** URL (see PR #84 checks); post-merge → production · https://miyagisanchez.com

1. Open the homepage (`/`).
   → The category chip row shows line icons (grid for "Todo", car, home, smartphone…), **no emoji** anywhere.
2. Open the listings page (`/l`).
   → The category **chip rail** shows the same Iconoir glyphs (no 🚗/🏠/📱 remain). Open the **"Filtrar y ordenar"** sheet → the *Categoría* `<select>` lists plain category labels with **no emoji prefix** (a native dropdown can't render an icon font — by design, the emoji is dropped, not replaced with a glyph).
3. Find any listing from a **verified** shop on the home grid (and open that shop's page `/s/[slug]`).
   → The verified mark is the `iconoir-badge-check` icon next to the shop name, not a "✓" text glyph — on the grid card, the shop page header ("✓ Verificado" pill → badge-check + "Verificado"), and the PDP seller card.
4. Toggle dark mode and calm mode (header).
   → Icons render correctly in both; no missing-glyph boxes (e.g. `mascotas` shows the provisional `fish`), no hardcoded colors.

If any step fails, note the step number + what you saw — that's the bug report.

**Owed to Daniel:** none — anonymous/presentational, no money/auth path. The `e2e/home-icons.spec.ts` api spec (CI vs preview) covers the homepage SSR.
