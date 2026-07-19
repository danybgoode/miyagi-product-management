# pdp-lightbox-close-button-occluded — Retrospective

_Closed: 2026-07-19_

## What shipped

- Frontend [PR #285](https://github.com/danybgoode/miyagisanchezcommerce/pull/285), squash
  `ca702d3`: the PDP lightbox, Make Offer modal, and mobile catalog filter now escape
  `.platform-main-shell` through body portals on one named root overlay layer.
- The gallery regression now proves the close control is hit-testable with a real pointer click.
- A reviewer-found 390→800 breakpoint regression is covered: widening an open mobile filter closes
  it, restores the inline desktop form, and restores the previous body-overflow value.

## What went well

- Source audit corrected the groomed scope before code: the PDP tab bar was not present, four
  candidate overlays were seller-shell-only, and only two buyer siblings shared the real trap.
- Red evidence was concrete. The close click failed on production because the glass header
  intercepted it, then passed on preview and production after the portal.
- The fresh reviewer did more than confirm the headline fix: it rotated the viewport and found a
  real portal/breakpoint lifecycle bug that the original acceptance did not name.

## What we learned

- A stacking-context fix must test pointer hit-testing, not DOM visibility; an occluded control can
  still satisfy `toBeVisible()`.
- A responsive element moved through a portal has two lifecycles to test: opening/closing and
  crossing the breakpoint. CSS can change `fixed` to `static` while React still believes the sheet
  is open and body-locked.
- A static “unportalled overlay” source guard was not worth shipping here. Runtime shell selection
  and responsive classes made a clean, empty-allow-list rule noisy; the source comment plus targeted
  browser regressions are the honest guardrail.

## Gaps / follow-ups

- Owed to Daniel: physical installed-PWA safe-area judgment, light/dark real-device pass, and the
  authenticated Make Offer visual flow. Preview Clerk-origin CORS makes the last one unavailable to
  the automated rail.
- Non-blocking edge: moving an already-open filter back inline remounts the form, so a resize can
  reset staged uncontrolled values. The reviewed behavior closes the sheet at that transition;
  preserving staged values across rotation would be separate UX scope.
