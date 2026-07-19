---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: pdp-lightbox-close-button-occluded
---

# Epic: Fixed overlays trapped under the platform chrome — the PDP lightbox close button

> **Area:** 01 · Discovery & Shopping · **Risk:** low · **Class:** Bug · **Scope seed:** [`00-ideas/seeds/pdp-lightbox-close-button-occluded.md`](../../00-ideas/seeds/pdp-lightbox-close-button-occluded.md) · **Archetype:** Sweeper/Maintainer

## Why

A buyer opens the fullscreen image lightbox on a listing and **the close X is invisible** — the
sticky glass header paints on top of it, on mobile and desktop alike. Esc and tap-out still work, so
nobody is trapped, but on mobile there is no Esc key and the only discoverable way out is a gesture
we never taught. It reads as broken.

The interesting part is that this is **not a lightbox bug**. `.platform-main-shell` carries
`isolation: isolate` (for the platform-theme background pattern) and pins its children to
`z-index: 1` in the root stacking context. Any `position: fixed` overlay rendered inside `<main>` is
therefore trapped below the header (z-50), **no matter what z-index it declares**. The lightbox is
simply the first surface where a user noticed. The build-time audit found two other affected
buyer-shell overlays (Make Offer and the mobile catalog filter); four groomed candidates render
under the seller shell and were never inside this stacking context. The mobile tab bar also does
not mount on PDP routes, so the groomed bottom-overlap claim was stale.

## Medusa-first note

N/A — frontend-only render/CSS change. No model, route, table, or flag. Commerce untouched.

## What already exists (reuse, don't rebuild)

- `app/components/AIAgentButton.tsx:4,48` — **already portals an overlay to `document.body`** with a
  `mounted` guard for SSR safety. This is the proven in-repo pattern; copy its shape rather than
  inventing an overlay primitive.
- `app/(shell)/l/[id]/Gallery.tsx` — `Lightbox`, `cornerBtn`, the Esc / tap-out / scroll-lock
  handlers are all already correct. **Only the mount location is wrong.**
- `e2e/pdp-gallery.browser.spec.ts` — the regression spec from PR #247 (single-image parity).
  Extend it; do not fork a second gallery spec.
- The design-token guard + Iconoir guard already cover this surface — the chrome is token-compliant
  and must stay so.
- The enforced-sweep-list static-guard pattern (LEARNINGS — raw-color guard, emoji guard) for
  Story 1.3.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Portal the lightbox to `body` + an overlay z-layer token — **the reported bug** | low |
| 1 | 1.2 Document the constraint at `isolation: isolate` + audit the 6 sibling overlays | low |
| 1 | 1.3 Anti-recurrence guard — **dropped:** shell/breakpoint-aware source scanning was noisy; use the source comment + browser regressions | low |

## Deploy order

Frontend-only (`apps/miyagisanchez`), single LOW-tier PR
[#285](https://github.com/danybgoode/miyagisanchezcommerce/pull/285), squash `ca702d3`.
Per-branch Vercel preview available, so the deterministic gate covers this fully pre-merge. No
kill-switch — Stage 6b carve-out: no runtime seam, no commerce path, rollback is `git revert`.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** N/A — carve-out recorded at grooming (Stage 6b): frontend render location only, fail-safe, no runtime seam
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
