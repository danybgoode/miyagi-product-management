# Hyper-performant website — Sprint 1: Images (the 2.6 MB whale)

**Status:** ⬜ not started

## Stories

### Story 1.1 — R2 image delivery through the zone + Cache-Control + responsive sizes
**As** a mobile buyer on 4G, **I want** listing images served resized, modern-format, and cached,
**so that** the homepage doesn't ship 913 KiB JPEGs for 321-px cards.
Opens with a **spike-lite decision (in-sprint, written into this doc):** Cloudflare Images vs custom
domain + zone cache/Polish vs `next/image` loader. Then: bucket-level `Cache-Control: public,
max-age=31536000, immutable`; `srcset`/`sizes` on listing cards.
**Acceptance:** image responses carry long-lived cache headers; a 321-px card downloads ≤ ~60 KiB;
total homepage payload drops ~2 MB+ (PageSpeed "Improve image delivery" clears).
**Risk:** low (shared edge/infra config → announce)

### Story 1.2 — LCP priority on the first row
**As** a mobile buyer, **I want** the first visible listing images fetched at high priority,
**so that** LCP stops waiting 710 ms after load.
The LCP element is a *dynamic* listing card — no hard-coded preload (it would rot). First-row images:
`fetchpriority="high"`, never `loading="lazy"`; optional server-rendered dynamic preload (the row is
known at render time).
**Acceptance:** PageSpeed "LCP request discovery" passes all three checks; resource-load-delay ≈ 0.
**Risk:** low

### Story 1.3 — Supply-import ingests hotlinked external images into R2
**As** the platform, **I want** scraper/supply imports to copy external images into R2 at import time,
**so that** third-party hosts (369 KiB from teatrounam.com.mx today) never sit in our critical path.
**Acceptance:** new imports store R2 URLs; existing hotlinked listings backfilled or flagged; no
`<img>` on home/browse resolves to a non-R2/non-platform host.
**Risk:** low

## Sprint QA
- **api spec(s):** payload assertions in `e2e/perf-budget.spec.ts` (seeded here, hardened in 2.3) —
  first-row image URLs carry sizing params + cache headers
- **browser smoke owed:** yes, to Daniel — PageSpeed mobile re-run after merge (expect LCP < 4 s already)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Run https://pagespeed.web.dev on https://miyagisanchez.com (Mobile).
   → "Improve image delivery" savings drop from ~2.6 MB to near zero; "Use efficient cache lifetimes" no longer lists r2.dev.
2. Open the homepage on your phone over cellular, hard-refresh.
   → First row of listing cards paints fast and sharp; no multi-second blank slots.
3. DevTools → Network → filter images on the homepage.
   → Card images are resized variants (not 1200px+ originals) with `cache-control: public, max-age=31536000`.

If any step fails, note the step number + what you saw — that's the bug report.
