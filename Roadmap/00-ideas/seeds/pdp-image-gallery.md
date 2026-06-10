---
title: "PDP interactive image gallery"
slug: pdp-image-gallery
status: shipped                       # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "01"                           # Discovery & Shopping (the PDP)
type: bug                            # broken/missing interactivity + a light zoom enhancement → small 1-sprint epic
priority: null
risk: low                            # frontend-only PDP UI; no commerce/auth/money/DB
epic: "01-discovery-and-shopping/pdp-image-gallery"   # scaffolded 2026-06-10
build_order: null
updated: 2026-06-10                   # shipped 2026-06-10 — PR #70 squash 597b66e (single sprint)
---

# PDP interactive image gallery

**Status: awaiting Daniel approval — no code yet. Planning only (Cowork); Claude Code builds.**

> **Mirror-back:** *"On the listing page, a buyer can't click through multiple photos, and tapping the
> main image does nothing. Add light, performant gallery navigation + a tap-to-open view, per UX
> heuristics."* Right?

## Stage 2.5 bucket
**Light enhancement on an existing surface** — not an epic's worth of new capability. The PDP already
renders the images; it's missing the client interactivity to navigate/zoom them. One small client island,
no backend, no new data.

## Findings — root cause (verified against code, 2026-06-10)
`app/l/[id]/page.tsx:385-414` renders the gallery as **fully static, server-rendered markup with zero
interactivity** (the PDP is a Server Component, so nothing in the gallery hydrates):
- **1 image:** a single `<img>`.
- **2+ images:** `images[0]` shown large, then `images.slice(1)` rendered as a row of 64×64 `<img>`
  thumbnails (line 397-399) that have **no `onClick`, no link, no state** — they're decorative. So you
  cannot click through, and there's no active-image concept.
- **The main image is a bare `<img>`** with no handler → tapping it does nothing.

There is **no existing gallery/lightbox/carousel component** anywhere (the PDP is the only image surface)
and **no carousel library installed** — so this is net-new, but small and dependency-free.

## What already exists (reuse, don't rebuild)
- **A CSS scroll-snap convention already ships** in `app/globals.css` (`.chip-rail`
  `scroll-snap-type: x mandatory` + `.hide-scrollbar`, lines 1161-1169) — the gallery already uses
  `hide-scrollbar`. A scroll-snap track gives **native mobile swipe for free**, no JS, no library.
- The PDP already wraps the image in an aspect-ratio box (`aspectRatio: '4/3'`) — keep it to avoid
  layout shift (CLS).
- The PDP renders through `ChannelLayout` across marketplace / custom-domain / subdomain / embed /
  white-label — the island must be **channel-agnostic** (pure client component, no platform-chrome
  assumptions).
- Playwright `browser` project + the anonymous-smoke pattern (gallery interactions need **no login**).

## Decisions (Daniel, 2026-06-10)
- **Tap main image → fullscreen lightbox** (immersive overlay; swipe/arrows between photos; close on
  tap-outside or Esc). Overlay **mounts only when opened** → zero cost until used.
- **Mobile navigation → swipe + dots** (CSS scroll-snap track + a small position indicator).
- **Scope → both in one sprint** (click-through carousel + lightbox; one cohesive component).

## Approach — lightest viable (performance-first)
One small client island, e.g. `app/l/[id]/Gallery.tsx` (`'use client'`), receiving `images` + `title` as
props from the Server Component (the rest of the PDP stays server-rendered — only the gallery hydrates):
- **Mobile:** full-width CSS scroll-snap track (native swipe) + a dots indicator synced to scroll
  (IntersectionObserver or a light scroll handler).
- **Desktop:** active image + clickable thumbnails (active highlighted) + prev/next arrows + keyboard
  ←/→.
- **Tap main → lightbox:** a `fixed` overlay rendered only while open; same swipe/arrows; Esc / tap-out
  to close; restores scroll position.
- **Perf guardrails:** **no new dependency**; first image stays eager + `fetchpriority="high"` (it's the
  LCP element), the rest `loading="lazy"` + `decoding="async"`; lightbox lazy-mounts; aspect-ratio box
  preserved (no CLS); raw `<img>` to match the codebase (R2-hosted, no `next/image` in use).

## Five-rules check
No commerce/Supabase/Medusa/Clerk touched ✅ (pure PDP UI). UCP/MCP unaffected (agents read
`images[]` from the catalog as today) ✅. es-MX ✅ — `alt`/`aria-label` copy es-MX (e.g. "Imagen 2 de
5", "Cerrar", "Imagen anterior/siguiente"); buyer-facing, copy-completeness gate, no dead `en` keys.

## Scope — in / out
**In (v1):** click/tap-through across all photos (thumbnails + arrows + keyboard on desktop; swipe + dots
on mobile); active-image state; tap main → fullscreen lightbox with swipe/arrows + Esc/tap-out close;
lazy-loading + LCP-safe first image; works white-label across channels; graceful with 0/1 image
(unchanged behavior).
**Out (v1):** pinch-to-zoom / deep-zoom magnifier inside the lightbox (just fit-to-screen for now);
video/360 media; thumbnails reordering; `next/image` migration; any change to how images are uploaded or
stored.

## Slice — 1 sprint, 2 stories (both this round)

### Sprint 1 — Working, light PDP gallery (LOW)
- **S1.1 — Click/swipe through the photos.** *As a buyer on a listing with multiple photos, I want to
  move between them (swipe on mobile; thumbnails/arrows/keyboard on desktop), so that I can actually see
  every photo.* **Build:** extract the gallery into `Gallery.tsx` client island; active-image state;
  CSS scroll-snap track + dots (mobile); clickable thumbnails + prev/next + ←/→ (desktop). **Acceptance:**
  on a 2+-photo listing, swiping (mobile) or clicking a thumbnail/arrow (desktop) changes the main image;
  the active photo is indicated; 0/1-image listings look unchanged. **Risk:** LOW.
- **S1.2 — Tap to open fullscreen.** *As a buyer, I want to tap the main image to view it fullscreen and
  swipe through there, so that I can inspect the item closely.* **Build:** lightbox overlay, lazy-mounted
  on open; swipe/arrows; Esc / tap-outside closes and restores scroll. **Acceptance:** tapping the main
  image opens a fullscreen overlay on the current photo; you can move between photos; Esc or tap-outside
  closes it; background scroll is locked while open. **Risk:** LOW.

## Sprint QA
- **api spec(s):** none meaningful (pure interaction). Optional pure helper spec if any index/clamp logic
  is extracted (`lib/gallery.ts` next-free → free coverage).
- **browser smoke (anonymous — no auth):** `e2e/pdp-gallery.browser.spec.ts` — thumbnail/arrow/keyboard
  swaps the main image; tap main opens the lightbox; Esc closes. Needs a known multi-photo listing — add
  `MS_TEST_GALLERY_LISTING_ID` (skip gracefully when unset, mirroring `MS_TEST_PERSONALIZED_LISTING_ID`).
- **perf check:** confirm the first image stays the LCP element (eager + high priority) and the bundle
  delta is small (no new dependency); spot-check no CLS on load.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Deploy order & risk
Frontend-only, **LOW** → reviewer may auto-merge on green CI. Vercel preview per branch. It hydrates a
previously-static shared customer surface (the PDP) — a light heads-up to anyone on `discovery-polish`
(Epic A, which touches PDP hierarchy) avoids a collision, but there's no shared-file risk beyond
`app/l/[id]/page.tsx`.

## Open risks / notes
- **Channel/white-label:** verify the lightbox renders through `ChannelLayout` (custom-domain / embed)
  — anonymous `/embed/...` smoke can exercise the shared shell (LEARNINGS, cross-channel-trust-parity).
- **LCP regression:** the most likely perf trap — keep the first image eager/high-priority; don't lazy
  the hero.
- **Adjacency:** `discovery-polish` (📋, Epic A) reworks PDP *hierarchy*; this is PDP *gallery* — distinct,
  but both edit `app/l/[id]/page.tsx`. Whoever lands second merges latest main first.

## Definition of Ready — check
"As a / I want / so that" + testable acceptance per story ✅ · Stage-2.5 bucket named ✅ · in/out written
✅ · reuse list produced ✅ · risk-tiered + QA/smoke owner named (anonymous browser smoke; perf/LCP check)
✅ · **awaiting Daniel's approval → scaffold + kickoff.**
