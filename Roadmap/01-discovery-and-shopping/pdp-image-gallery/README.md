# Epic: PDP interactive image gallery ✅ COMPLETE

> **Area:** 01-discovery-and-shopping · **Risk:** LOW (frontend-only PDP UI) · **Type:** bug + light enhancement
> **Scope seed:** [`00-ideas/seeds/pdp-image-gallery.md`](../../00-ideas/seeds/pdp-image-gallery.md) · **Signed off:** Daniel, 2026-06-10
> **Shipped:** 2026-06-10 — single sprint, PR #70 (squash `597b66e`), Daniel-authorized merge.

## Why
On a listing page with multiple photos, a buyer **can't move between them** — the thumbnails are
decorative and tapping the main image does nothing — so they only ever see the first photo. This epic
makes the gallery work: swipe through on mobile, click thumbnails / arrows / keyboard on desktop, and tap
the main image to open a fullscreen view. Kept deliberately light — one small client island, no new
dependency — because PDP performance matters.

## Medusa-first note
No commerce data, no Medusa/Supabase/Clerk touched. Medusa already supplies `images[]` via the catalog;
this is **pure PDP client UI**. The only change is hydrating a previously-static area into one small
client island.

## What already exists (reuse, don't rebuild)
- **The gallery is fully static today** — `app/l/[id]/page.tsx:385-414`: `images.slice(1)` are plain
  64×64 `<img>` thumbnails with no handler/state; the main image is a bare `<img>`. The PDP is a Server
  Component, so nothing hydrates. This is the seam to extract.
- **A CSS scroll-snap convention already ships** in `app/globals.css` (`.chip-rail`
  `scroll-snap-type: x mandatory` + `.hide-scrollbar`, lines 1161-1169; the gallery already uses
  `hide-scrollbar`). A scroll-snap track gives **native mobile swipe for free** — no JS, no library.
- The image already sits in an aspect-ratio box (`aspectRatio: '4/3'`) — keep it to avoid CLS.
- The PDP renders through `ChannelLayout` (marketplace / custom-domain / subdomain / embed / white-label)
  — the island must stay channel-agnostic.
- Playwright `browser` project + the anonymous-smoke pattern (gallery interactions need **no login**);
  the `MS_TEST_*` skip-gracefully env pattern.
- **No carousel library is installed** — and none is needed.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | S1.1 Click/swipe through the photos (thumbnails + arrows + keyboard desktop; swipe + dots mobile) | LOW |
| 1 | S1.2 Tap main image → fullscreen lightbox (swipe/arrows; Esc / tap-out to close) | LOW |

## Deploy order
Frontend-only; no backend dependency. Ships behind a single Vercel preview. **LOW** → reviewer may
auto-merge on green CI. It edits the shared `app/l/[id]/page.tsx` — light heads-up to anyone on
`discovery-polish` (Epic A also touches PDP hierarchy); whoever lands second merges latest `main` first.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated) — PR #70 squash `597b66e`; authed phone/desktop smoke owed to Daniel
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Feature branch deleted; seed frontmatter `status: shipped`
