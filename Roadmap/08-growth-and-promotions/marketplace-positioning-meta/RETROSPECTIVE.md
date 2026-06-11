# Marketplace positioning — title, OG & social card — Retrospective

_Closed: 2026-06-11 · Frontend PR [#83](https://github.com/danybgoode/miyagisanchezcommerce/pull/83) · squash `cf0fa8a`_

## What shipped
- Replaced the root page metadata in `app/layout.tsx`: title, description, keywords, OpenGraph and
  Twitter now position Miyagi as a marketplace to buy, sell, and open a shop in Mexico.
- Replaced the generated social card copy in `app/opengraph-image.tsx`: new alt text, marketplace
  tagline, and pills (`Marketplace · Segundamano · Tu propia tienda · 0% comisión`).
- Added `e2e/marketplace-positioning.spec.ts` to pin the head copy and OG route/source copy in the
  API gate.
- Swept the suite for stale "Infraestructura de comercio" assertions and updated the seasonal-theme
  fallback tagline that still carried the old brand line.

## What went well
- The audit was accurate: this stayed a low-risk, frontend-only copy/SEO chore with no commerce,
  payment, auth behavior, DB, or infrastructure changes.
- Editing the existing metadata and OG-image files in place kept the diff easy to review and made
  the PR safe to squash.
- CI's HTTPS Vercel preview was the right smoke surface for root metadata because it exercised the
  exact SSR head that shared links and search engines read.

## What we learned
- Local `next start` on `127.0.0.1` is not a reliable HTTP gate for Clerk-wrapped root pages: the
  request fixture can follow Clerk's dev-browser handshake loop and time out. Use the HTTPS Vercel
  preview API gate as the authoritative pre-merge signal for these surfaces.

## Gaps / follow-ups
- No browser, money, auth, or seller-session smoke is owed to Daniel.
- Future option, deliberately out of scope here: revisit the logged-out homepage hero/body copy if
  the new metadata positioning wants an on-page match.
