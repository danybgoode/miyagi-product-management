# Raw idea — Featured Artist landing page at /artista

> For grooming. Planning only. Assume nothing — verify every anchor below against the real
> code/docs; treat them as leads, not facts.

## Surfacing copy (from print / flyers)
> **Merch en edición limitada · drop por partido** → `miyagisanchez.com/artista`

## Desired end state (observable behavior)
A public page at `miyagisanchez.com/artista` featuring the **current Featured Designer/artist**:
their story + a **curated selection of their merch**, framed as limited-edition drops — one
**drop per Mexico match** ("drop por partido").
1. The featured artist has a **real shop with us** (their products are live listings, same
   Medusa seller+listing model the gem loop now uses).
2. `/artista` features a **curated subset** of those products and links out to buy them.
3. It **rotates per Mexico match** — the featured artist / drop changes on the match schedule.
4. es-MX default; mobile-first (QR destination from print).

The hypothesis Daniel flagged: **leverage the existing embed features** to surface the
artist's products rather than rebuild a product grid — evaluate this during grooming.

## Anchors found (verify — "can we already do this?")
- **Featured-designer rotation already built:** `lib/platform-theme.ts`, `PlatformBrand`
  (per-match theme takeover). Does the drop/rotation reuse this?
- **Embed surfaces exist:** `app/embed/s/[slug]/page.tsx`, `app/api/embed/shop/route.ts`,
  embed checkout (`app/api/embed/support/checkout`). Can `/artista` reuse these to feature/sell
  the artist's listings?
- Artist-as-seller = the **same Medusa seller + listings** model as the gem→claimable-shop loop
  (`Roadmap/03-selling-and-shops/gem-claim-loop`).
- Konzz is the first featured designer (retro-punk); Oscar/Enrique next.

## Open questions for grooming
- Reuse the embed widget / shop components vs. a bespoke page?
- How is "featured" curation chosen — manual pick of N listings, a tag, or a **Medusa product
  collection**?
- Per-match **drop mechanic**: tie into the `platform-theme` rotation? Who controls the
  schedule (Mexico match dates)? Scheduled publish, or manual flip?
- One `/artista` that swaps the artist per match, vs. `/artista/[slug]` with an archive of
  past drops?
- Buy flow: deep-link to the artist's `/s/[slug]` shop, or embedded checkout on `/artista`?

## Constraints
es-MX default · mobile-first · **Medusa owns commerce** (don't rebuild cart/checkout/products) ·
attribution parity (QR/UTM) with the campaign plan.
