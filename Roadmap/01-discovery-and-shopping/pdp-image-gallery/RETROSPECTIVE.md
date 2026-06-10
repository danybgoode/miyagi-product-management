# PDP interactive image gallery — Retrospective

_Closed: 2026-06-10 (single sprint, PR #70, squash `597b66e`)_

## What shipped
A previously-dead PDP gallery now works. Both stories landed in one sprint, one PR:
- **S1.1 — click/swipe through the photos** (`daaf789`). The static gallery
  (`app/l/[id]/page.tsx`) was extracted into one `'use client'` island,
  `app/l/[id]/Gallery.tsx`; the rest of the PDP stays a Server Component. `0`/`1` image →
  byte-for-byte the old look; `2+` → interactive over one shared `active` index via the
  `md:hidden`/`hidden md:block` duplicate-render idiom: **mobile** = native CSS scroll-snap
  track (reused `globals.css` `hide-scrollbar` + scroll-snap) + tappable dots; **desktop** =
  single active image + clickable thumbnails (active highlighted) + prev/next arrows + ←/→
  keyboard. The page's FavoriteButton + views badge ride along as an `overlay` slot.
- **S1.2 — tap main image → fullscreen lightbox** (`00e3921`). Lazy-mounted overlay
  (`{lightbox && <Lightbox/>}` → zero DOM/effects/scroll-lock cost until opened); swipe + ←/→
  arrows; Esc or tap-outside closes; background scroll locked (position preserved); es-MX
  `aria-label`s.
- **Tests** (`10d437b`): pure `lib/gallery.ts` (`wrapIndex`/`indexFromScroll`) with
  `e2e/gallery.spec.ts` (6 assertions) + anonymous `e2e/pdp-gallery.browser.spec.ts`
  (skip-graceful on `MS_TEST_GALLERY_LISTING_ID`).
- **Token fix** (`d32970c`): the design-token raw-hex guard caught two new `#fff` in the
  lightbox → swapped to `var(--fg-inverse)`.

## What went well
- **Reuse-first kept it a true one-island change.** Every interactive affordance leaned on
  something already in the repo — the `globals.css` scroll-snap convention (native mobile swipe,
  no JS), the `md:hidden`/`hidden md:block` duplicate-render idiom the PDP already used for
  `ctaButtons`/`SellerTrustCard`, and the `overlay` slot pattern from `<TrustSignals>`. **No
  carousel library** was added.
- **Perf invariants stayed intact by construction.** First image eager + `fetchPriority="high"`
  (LCP), rest lazy; every surface kept the `4/3` box (no CLS); the lightbox mounts only on open.
- **The pure-helper seam paid off.** Pulling the wrap/clamp + scroll→index math into a next-free
  `lib/gallery.ts` gave 6 deterministic api-gate assertions for free and guarantees the gallery
  and lightbox can't drift.
- **Channel-agnostic island.** It reads no channel header (pure `images`/`title`/`overlay`
  props), so it renders identically in every channel without any channel wiring.

## What we learned
- **The design-token raw-hex guard bites client islands too.** A brand-new `#fff` in the
  lightbox went green locally (tsc/build/own spec) but failed CI's `design-token-foundation`
  guard. For white-on-dark chrome, use `var(--fg-inverse)` (resolves to `#ffffff`) — the token
  the gallery's own arrows/views-badge already use. *(Reinforces the existing "raw-color guard"
  LEARNINGS line — sharpened there, not duplicated.)*
- **`/embed/*` only serves the shop page, not the PDP**, and the PDP's white-label shell is
  selected by un-spoofable middleware headers — so there's no anonymous way to render the PDP
  gallery through `ChannelLayout`. Because the island is channel-agnostic, the marketplace
  `/l/[id]` smoke covers it; don't plan an `/embed/l` smoke that the route doesn't support.

## Gaps / follow-ups
- **Owed to Daniel:** the real phone-swipe / fullscreen / desktop-keyboard browser smoke (steps
  in `sprint-1.md`), and setting the `MS_TEST_GALLERY_LISTING_ID` repo secret to a 2+-photo
  listing so `pdp-gallery.browser.spec.ts` lights up in nightly `browser-smoke` (it skips until
  then). The live custom-domain/subdomain white-label look is also owed (can't header-sim).
- **Tooling note:** the root monorepo repo had a trail of stale `.git/*.lock` files from a
  process that crashed ~10:20 (no live git holder) — cleared them and committed path-limited; a
  sibling's `00-ideas` funnel reorg had this epic's docs staged-for-deletion in the index, left
  untouched.
