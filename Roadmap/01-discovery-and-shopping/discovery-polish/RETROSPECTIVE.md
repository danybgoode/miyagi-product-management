# Retrospective — Discovery Polish (01 · #3c)

**Shipped:** 2026-06-08 — all 3 sprints to prod.
**PRs:** S1 [#50](https://github.com/danybgoode/miyagisanchezcommerce/pull/50) (`90986a7`) · S2 [#51](https://github.com/danybgoode/miyagisanchezcommerce/pull/51) (`7fad2cd`) · S3 [#53](https://github.com/danybgoode/miyagisanchezcommerce/pull/53) (`7d84462`).
**Risk:** LOW–MED throughout (presentational / read-only discovery — no commerce, money, auth, or DB).

## What shipped
- **S1 — Listing-type taxonomy (filterable).** Buyers can filter the marketplace by listing
  type (product / service / rental / digital / subscription) via a chip rail in `SearchBar`, and
  result cards carry a type badge. The taxonomy lives in one next-free module, `lib/listing-query.ts`
  (`LISTING_TYPE_FILTERS`, `listingTypeBadge`, `buildQuery`), shared by the query builder, the chip
  rail, and the card badge.
- **S2 — Mobile filter rebuild.** The dense inline `<select>` stack became a real apply-gated
  bottom-sheet behind a sticky "Filtrar y ordenar" trigger, with a live "Ver X resultados" count
  (`resultCountLabel` + a `/api/listings/count` round-trip).
- **S3 — PDP hierarchy.** The PDP now leads with a type-appropriate decision frame
  (`listingTypeFrame` → a compact banner; `product` → none, its buy box leads), and on mobile the
  seller trust card (extracted to `app/components/SellerTrustCard.tsx`) sits above the
  payment/fulfillment methods box via the `md:hidden` / `hidden md:block` dual-render idiom.

## What went well
- **The data was already done — research re-scoped the epic smaller.** `listing_type` was already
  normalized onto every listing (`lib/listings.ts`) AND the backend `/store/listings` already
  filtered it AND `/api/ucp/catalog` already forwarded it. So S1.1's "merge backend first" plan
  evaporated: the whole epic was **frontend-only, no Cloud Run deploy**. Reading the backend
  route + normalizer before planning is what caught this.
- **One next-free taxonomy module paid off three times.** `lib/listing-query.ts` started as S1's
  chip/badge source and S2 (`resultCountLabel`) and S3 (`listingTypeFrame`) each added one pure
  function to it — every addition unit-testable in the `api` gate with no network, no auth.
- **Per-story low-risk auto-merge kept the loop tight.** Each sprint went build → green gate →
  fresh reviewer agent → auto-merge, with the "unless it touches shared layout" guard explicitly
  checked every time (none did). No Daniel merge needed; no money-path gate to wait on.
- **The duplicate-render idiom for responsive reorder.** S3.2 needed the seller card above the
  methods box on mobile but below on desktop. Rather than fight flex `order`, it reused the PDP's
  own established pattern (`ctaButtons` already renders twice via `md:hidden`/`hidden md:block`),
  so exactly one instance is visible per viewport — minimal, idiomatic, no layout risk.

## What we learned / gaps
- **Extract-then-reuse beats extract-for-its-own-sake — name the next consumer.** `SellerTrustCard`
  was extracted with Epic D (per-channel parity in `ChannelLayout`) and Epic C (trust capsules) named
  in its header as the reuse seam, so the extraction has a concrete downstream payoff, not just
  "cleaner code."
- **A stale `.next/dev/types/validator.ts` can fail local `tsc` on a route that no longer exists.**
  It's gitignored dev cruft (here: a removed `style-sandbox` page), absent in CI's clean checkout —
  `rm -rf .next/dev` clears it. Don't chase it as a real regression.
- **Smoke gap (stated, not glossed):** S2/S3 are covered by anonymous browser specs vs the preview
  (non-gate layer) + the pure `api` specs in the gate; there is **no money/auth path**, so nothing
  is owed to Daniel beyond an optional phone-width eyeball on prod.

## Durable learnings promoted to `LEARNINGS.md`
- Read the backend route + normalizer before planning a "data → query → UI" epic — it can delete a
  whole backend sprint (here: `listing_type` was already filtered server-side end to end).
- Responsive block-reorder via the duplicate-render `md:hidden`/`hidden md:block` idiom (one instance
  visible per viewport) is the low-risk way to move a block between mobile and desktop positions.
