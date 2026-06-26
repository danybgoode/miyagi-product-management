# Sprint 4 — Mobile-responsive sweep  ·  status: ⬜ not started

> Fix the overflow Daniel flagged across all `/vende*` pages. Mostly the shared renderer
> (`SellerAcquisitionSections.tsx`) + the bespoke `mundial/page.tsx`. **Independent of copy** — may run
> first if a quick correctness win is wanted before content lands.

## Goal
Every `/vende*` page fits a phone screen with no horizontal overflow and no clipped content.

## Stories
### US-5 — No mobile overflow across all `/vende*` pages ⬜
**As** a visitor on a phone, **I want** every `/vende*` page to fit my screen with no horizontal
overflow, **so that** the page feels trustworthy.
**Acceptance:** at **360 / 390 / 414px** there is no horizontal scroll or clipped content on `/vende`,
`/vende/creadores`, `/vende/negocios`, `/vende/servicios`, `/vende/mundial`. Specifically check: hero
stat grids (`repeat(3,1fr)` can crush at 360), long headings (`var(--t-4xl)` h1), the S3 benchmark
table, persona router cards, and any min-width inline grids. Fixes stay inside `vende/**` where
possible. Risk: low. **If a fix reaches `globals.css` or `app/(shell)/layout.tsx`, announce it
(LEARNINGS) and treat as higher-care.**

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` green.
- **Specs:** automated viewport render check at 360/390/414 on all five pages if cheap (assert no
  `scrollWidth > clientWidth`).
- **Daniel-owned mobile smoke on a real device** — responsive bugs (font scaling, real-keyboard
  viewport, safe-area) evade headless viewport checks; owed to Daniel by name.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: PR Vercel preview pre-merge; `https://miyagisanchez.com` after deploy. **Do this on a real phone.**

1. On your phone open `{BASE_URL}/vende`.
   → No horizontal scrolling; the hero, stat tiles, router cards and benchmark table all fit the width.
2. Rotate / try a small phone (≈360px).
   → Headings wrap (don't clip); the 3-up stat grid reflows; nothing bleeds off-screen.
3. Open `/vende/creadores`, `/vende/negocios`, `/vende/servicios` in turn.
   → Each fits the screen; cards stack, CTAs are fully tappable.
4. Open `/vende/mundial`.
   → The bespoke page also fits — its hero stats, demand list and steps reflow with no overflow.
5. Tap the copy-prompt button and a primary CTA on each page.
   → Both work and are not cut off by the screen edge.

If any step fails, note the step number + page + what you saw — that's the bug report.
