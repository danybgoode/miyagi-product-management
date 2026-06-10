# PDP interactive image gallery — Sprint 1: Working, light PDP gallery

**Status:** ✅ SHIPPED 2026-06-10 — PR #70 squash `597b66e` (Daniel-authorized merge) · **Risk:** LOW · **Repos:** frontend only
**Commits:** S1.1 `daaf789` · S1.2 `00e3921` · tests `10d437b` · token fix `d32970c`

> Root cause (verified 2026-06-10): the gallery (`app/l/[id]/page.tsx:385-414`) is static server markup —
> `images.slice(1)` are decorative 64×64 `<img>` thumbnails with no handler/state, and the main image is a
> bare `<img>`. The PDP is a Server Component → nothing hydrates. Fix = one small client island; reuse the
> existing CSS scroll-snap convention (globals.css `.chip-rail`/`.hide-scrollbar`) for free mobile swipe;
> no carousel library.

## Stories

### Story 1.1 — Click / swipe through the photos ✅
**As a** buyer on a listing with multiple photos, **I want** to move between them — swipe on mobile,
click thumbnails / arrows / use ←→ on desktop — **so that** I can actually see every photo, not just the
first.
**Build:** extract the gallery into a `Gallery.tsx` client island (props: `images`, `title`); the rest of
the PDP stays server-rendered. Active-image state; full-width CSS scroll-snap track + a dots indicator
(mobile); clickable thumbnails (active highlighted) + prev/next arrows + ←/→ keyboard (desktop). First
image stays eager + `fetchpriority="high"` (LCP); the rest `loading="lazy"` + `decoding="async"`. Keep the
`4/3` aspect-ratio box (no CLS).
**Acceptance:** on a 2+-photo listing, swiping (mobile) or clicking a thumbnail/arrow (desktop) changes
the main image and indicates the active photo; a 0- or 1-image listing looks exactly as before.
**Risk:** LOW.

### Story 1.2 — Tap main image → fullscreen lightbox ✅
**As a** buyer, **I want** to tap the main image to view it fullscreen and move through the photos there,
**so that** I can inspect the item closely.
**Build:** a `fixed` lightbox overlay, **lazy-mounted only when opened** (zero cost until used); shows the
current photo; swipe/arrows between photos; Esc or tap-outside closes and restores scroll position; lock
background scroll while open; es-MX `aria-label`s ("Imagen 2 de 5", "Cerrar", "Imagen anterior/siguiente").
**Acceptance:** tapping the main image opens a fullscreen overlay on the current photo; you can move
between photos; Esc or tap-outside closes it; the page doesn't scroll behind the overlay.
**Risk:** LOW.

## Sprint QA — what ran
- **api spec ✅ (green):** `e2e/gallery.spec.ts` — the index/clamp/wrap logic was extracted to a next-free
  `lib/gallery.ts` (`wrapIndex` + `indexFromScroll`), so 6 pure-logic assertions cover wrap-past-ends,
  clamp, and degenerate zero-width/empty inputs for free. (6 passed locally.)
- **browser smoke (anonymous — no auth):** `e2e/pdp-gallery.browser.spec.ts` — thumbnail/arrow/←→ swaps
  the main image; tap main opens the lightbox; Esc closes. Reads `MS_TEST_GALLERY_LISTING_ID` and **skips
  gracefully** when unset *or* when the listing carries <2 photos (mirrors
  `MS_TEST_PERSONALIZED_LISTING_ID`). Confirmed skip-clean locally; lights up in CI's nightly
  `browser-smoke` once Daniel sets the secret to a 2+-photo listing.
- **ChannelLayout note (scope correction):** there is **no `/embed/l/[id]` route** — `/embed/*` only serves
  the shop page (`/embed/s/[slug]`), and the PDP's white-label shell is selected by middleware-set,
  un-spoofable `x-miyagi-*` headers (per `LEARNINGS.md`). But the `Gallery` island reads **no channel** —
  it takes only `images`/`title`/`overlay` props — so it renders byte-identically in every channel; the
  marketplace `/l/[id]` browser smoke fully exercises it. The live custom-domain/subdomain look stays
  **owed to Daniel**.
- **perf check:** first image stays the LCP element (eager + `fetchPriority="high"`; the rest lazy +
  `decoding="async"`); **no new dependency** (no carousel library); **no CLS** (every surface keeps the
  `4/3` box); the lightbox **mounts only on open** (`{lightbox && <Lightbox/>}` — zero DOM/effects until
  used). `npm run build` clean.
- **deterministic gate ✅:** `tsc --noEmit` clean · `npm run build` clean · Playwright `api` green
  (CI re-runs the full `api` suite against the branch preview — the authoritative pre-merge signal).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL pre-merge)

1. On a phone, open a listing that has several photos (e.g. browse https://miyagisanchez.com/l and open
   one with multiple images).
   → You can **swipe** left/right through every photo; a dots indicator shows which photo you're on.
2. Tap the main image.
   → A **fullscreen** view opens on that photo; you can swipe between photos; the page behind doesn't
     scroll.
3. Close it (tap outside the image, or the close button; on desktop, press Esc).
   → The overlay closes and you're back where you were on the listing.
4. On desktop, open the same listing and click a thumbnail, then use the ← / → arrow keys.
   → The main image swaps to the clicked photo and steps with the arrow keys; the active thumbnail is
     highlighted.
5. Open a listing with **one** photo, and one with **no** photo.
   → Both look exactly as before — no broken controls, no empty dots.

If any step fails, note the step number + what you saw — that's the bug report.
