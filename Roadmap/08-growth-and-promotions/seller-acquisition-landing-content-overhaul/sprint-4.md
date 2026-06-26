# Sprint 4 — Mobile-responsive sweep  ·  status: ✅ shipped 2026-06-26 (PR #129 squash `1e95f4e`)

> Fix the overflow Daniel flagged across all `/vende*` pages. Mostly the shared renderer
> (`SellerAcquisitionSections.tsx`) + the bespoke `mundial/page.tsx`. **Independent of copy** — may run
> first if a quick correctness win is wanted before content lands.

## Goal
Every `/vende*` page fits a phone screen with no horizontal overflow and no clipped content.

## Stories
### US-5 — No mobile overflow across all `/vende*` pages ✅ (PR #129 squash `1e95f4e`)
**As** a visitor on a phone, **I want** every `/vende*` page to fit my screen with no horizontal
overflow, **so that** the page feels trustworthy.
**Acceptance:** at **360 / 390 / 414px** there is no horizontal scroll or clipped content on `/vende`,
`/vende/creadores`, `/vende/negocios`, `/vende/servicios`, `/vende/mundial`. Specifically check: hero
stat grids (`repeat(3,1fr)` can crush at 360), long headings (`var(--t-4xl)` h1), the S3 benchmark
table, persona router cards, and any min-width inline grids. Fixes stay inside `vende/**` where
possible. Risk: low. **If a fix reaches `globals.css` or `app/(shell)/layout.tsx`, announce it
(LEARNINGS) and treat as higher-care.**

## What shipped (built off `origin/main` `8119527`; the local checkout was stale at `740f967`)
Fixes are **inline styles inside `vende/**`** — no `globals.css` / `(shell)/layout.tsx` touch (stays
LOW, no announce). Two surfaces:
- `app/(shell)/vende/_components/SellerAcquisitionSections.tsx` (shared renderer → `/vende`,
  `/vende/creadores`, `/vende/negocios`, `/vende/servicios`).
- `app/(shell)/vende/mundial/page.tsx` (bespoke, off the shared system → fixed by hand).

Root causes + fixes:
1. **Hero `<h1>` was a fixed `var(--t-4xl)` (48px).** A long es-MX word overflowed at 360px (verified:
   `/vende/servicios` "complicaciones." pushed the page 31px wide on prod). → `fontSize:
   'clamp(var(--t-2xl), 7vw, var(--t-4xl))'` + `overflowWrap: 'break-word'` on both heroes.
2. **3-up hero stat grid `repeat(3, 1fr)` (grid min-content blowout).** → `minWidth: 0` on each tile +
   `overflowWrap: 'break-word'` on the value, both heroes (defensive; current values are short).
3. **`SocialProofSection` social stats `minmax(130px, 1fr)`** (the one grid off the safe idiom) →
   `minmax(min(100%, 130px), 1fr)`.
The S3 benchmark table already scrolls inside its own card (`overflowX:'auto'` + `minWidth:680`) — left
as-is, only asserted.

## Sprint QA — gate owned (done)
- **Deterministic gate:** `tsc --noEmit` ✓ · `next build` ✓ (worktree-local binaries).
- **New spec `e2e/seller-acquisition-mobile.browser.spec.ts`** — **browser** project (opt-in, nightly
  via `browser-smoke.yml`; NOT the blocking gate, because horizontal overflow is a rendered-layout fact
  the no-browser `api` gate can't measure). Loops **5 pages × {360, 390, 414}px**, asserts
  `document.documentElement.scrollWidth - clientWidth <= 1` and the hero `<h1>` is visible.
  - Against the **local production build (with the fixes): 15/15 pass.**
  - Against **current prod (without the fixes): 1 fails** — `/vende/servicios` @360px overflows 31px —
    proving the spec is meaningful and the fix resolves it.
- **No regression:** the existing `seller-acquisition-*` api specs (26) + the design-token guard pass
  against the local build with the edits.
- **Daniel-owned mobile smoke on a real device** — font scaling, real-keyboard viewport, and safe-area
  insets evade headless viewport checks; owed to Daniel by name (walkthrough below).

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
