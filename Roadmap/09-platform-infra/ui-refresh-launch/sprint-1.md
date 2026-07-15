# UI refresh before launch — Sprint 1: Token spec + site-wide token layer

**Status:** ⬜ not started

## Stories

### Story 1.1 — Research + token spec (written decision, no code)
**As** Daniel, **I want** a one-page token spec derived from *current* Material heuristics (web-search
the present-day guidance — don't plan on training memory) mapped onto our existing token taxonomy,
**so that** the re-skin has a named target before any value changes.
Covers: type scale, color roles (incl. dark/theme-engine interplay with `seasonal-theme-engine`),
shape/radius, elevation strategy, motion primitives (calm on reading surfaces — inspiration: Kindle
stillness), density. **Ends in a written decision appended to this doc; Daniel approves it before 1.2.**
**Acceptance:** spec approved in-session; citations included.
**Risk:** low

### Story 1.2 — Site-wide token layer update
**As** every visitor, **I want** the approved token values live across all tokenized surfaces,
**so that** the whole site inherits the new feel in one move.
**Acceptance:** token values updated in the `design-token-foundation` SSOT; raw-color CI guards green;
perf-budget guard green (no new fonts/assets past budget); visual spot-set (home, PDP, /vende, seller
dashboard, embed widget) reviewed by Daniel on the preview; all four channels render correctly.
**Risk:** low (cross-cutting `globals.css`/tokens — **announce**, merge in a quiet window)

## Sprint QA
- **api spec(s):** existing design-token guard suite (values change, enforcement stays); perf-budget spec green
- **browser smoke owed:** yes, to Daniel — preview walkthrough of the spot-set before merge
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: branch preview first, then production · https://miyagisanchez.com

1. Open the preview home, /l, and a PDP side by side with production.
   → New type scale/color roles/radii visible; nothing broken, no raw-color guard failures in CI.
2. Open https://miyagisanchez.com/s/<test-shop> on the preview and the embed widget demo.
   → Channels inherit the new tokens; white-label shells keep their branding logic.
3. Toggle the seasonal theme (admin).
   → Theme engine still composes with the new token values.

If any step fails, note the step number + what you saw — that's the bug report.
