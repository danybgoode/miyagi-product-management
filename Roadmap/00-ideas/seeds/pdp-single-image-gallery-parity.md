---
title: "PDP: single-image listings get lightbox + back/share chrome"
slug: pdp-single-image-gallery-parity
status: ready
area: "01"
type: bug
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-12
---

# Scope — PDP single-image gallery parity

## Outcome & signal
A listing with exactly one photo behaves like any other PDP: tapping the photo opens the
standard lightbox (zoom/inspect), and the glass back + share buttons overlay the image.
Daniel tests it by opening any 1-photo listing on mobile and tapping the image.

## Reproduction
Open a PDP whose listing has one image → the photo is inert (no `cursor: zoom-in`, no tap
handler), and the top-left back/share glass buttons are missing. Compare with any 2+ image
listing where all of it works.

## Root cause
`app/(shell)/l/[id]/Gallery.tsx:126-139` — an early return for `count === 1` renders a bare
`<img>` with no `onClick`, no lightbox mount, and none of the S2.3 corner chrome. The comment
says it's intentional ("byte-for-byte the old static look") — a decision that predates the
back/share/lightbox redesign and was never revisited. Not a regression; a half-updated promise.
(The `count === 0` placeholder branch, lines 114-123, has the same gap for back/share.)

## Stage-2.5 bucket
**Light enhancement / single fix story** — the lightbox, `cornerBtn` chrome, and share logic all
exist in the same file; the fix is extending them into the 1-image (and 0-image) branches.

## Scope
**In v1:**
- 1 image: `cursor: zoom-in`, tap → `Lightbox` (which already renders arrow-less and
  counter-less when `count === 1` — see the `count > 1` gate at line 401), back + share buttons.
- 0 images: back + share buttons over the placeholder (there's still a PDP to leave/share).
- Regression spec in `e2e/pdp-gallery.browser.spec.ts` (or unit-level if no 1-image fixture).

**Out of v1:**
- Pinch-to-zoom inside the lightbox, dots/thumbnails/counter for a single image (nothing to
  navigate), any change to the 2+ image path.

## What already exists (reuse, don't rebuild)
- `Lightbox` component, `cornerBtn` style const, `share()`/`copyLink()` callbacks — all in
  `Gallery.tsx`. Likely refactor: fold the 1-image case into the main render path (a 1-length
  `images` array already degrades correctly: no arrows, no dots, no thumbs) rather than
  duplicating chrome into the early-return branch.
- `overlay` slot (favorite + views) already works in all branches — untouched.

## UX heuristics & rails check
- **CI guards covering this surface:** design-token guard (chrome already token-compliant);
  Iconoir guard (icons already in use).
- **Audits-lens findings that apply:** 01 audit "PDP hierarchy" P1 — adjacent, not blocking.
- **Design-language debt (if any):** none — this REMOVES an inconsistency.

## Acceptance criteria
- 1-photo listing, mobile + desktop: tap/click opens the lightbox; Esc/tap-out closes; back
  navigates back; share opens the OS sheet (or copies with "Enlace copiado").
- 1-photo lightbox shows no arrows and no counter.
- 0-photo listing: back + share render over the placeholder.
- 2+ photo listings byte-identical in behavior (existing specs stay green).

## Open risks / research
- `gallery-counter` ("N / total") — spec assumption is it stays hidden for `count === 1`; confirm
  with Daniel at kickoff (screenshot spec shows no counter on singles).
