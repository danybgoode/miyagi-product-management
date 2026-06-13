# 08 · Growth & Promotions

**For everyone — the loops that bring people in and bring them back.** Referrals, platform-wide
promo codes, and (later) games and sweepstakes. This is how the marketplace grows itself.

The throughline: rewards and platform promos are funded by the things **the platform actually
bills** — print-edition ad placements (the `miyagiprints` shop) and, later, seller subscriptions —
never by silently charging a seller for a discount on their own sale.

## Current features
- ✅ **[Referral Program](referral-program/)** — invite friends, earn print-ad credit when they make
  their first purchase. Includes admin/platform-wide coupons (the reward delivery mechanism).
  Sprint 1 shipped & live-QA'd 2026-06-03.
- ✅ **[Marketplace positioning metadata](marketplace-positioning-meta/)** — public title,
  description, OpenGraph/Twitter tags, and the generated social card now say Miyagi is a marketplace
  to buy, sell, and open a shop in Mexico, with the segundamano recognition preserved in the card and
  keywords. Shipped 2026-06-11.
- ✅ **[Seasonal Theme Engine](seasonal-theme-engine/)** — rotating platform-level brand collaborations
  with a safe manifest, persisted visitor toggle, contrast guardrails, and strict exclusion of seller
  storefronts, dashboards, checkout, and embeds. Shipped 2026-06-05 (all 3 sprints; live as `platform-theme`).
- ✅ **[Sweepstakes](sweepstakes/)** — tenant-run giveaway loop: compliant campaign + public entry page
  (`/g/[slug]`) + email-code verified entries + purchase-bonus tickets + automated backend draw + winner/
  consolation notifications. Shipped 2026-06-04 (all 3 sprints, both repos; live giveaway smoke owed to Daniel).
- ✅ **[Seller-Acquisition Landing Pages](seller-acquisition-landing-pages/)** (BUILD-ORDER #6) —
  greenfield supply-side funnel: an anchor page (`/vende`) + persona pages (World-Cup experiences,
  local creators) driving into `/sell`. Trust spine: "No nos creas, pregúntale a Claude." Shipped
  2026-06-07 (all 4 sprints, PRs #42/#44/#45). First slice of the broader **agent-native GTM** north-star.

## Backlog / ideas
- 📋 Two-sided referrals (a welcome credit for the invited friend too)
- 📋 Games / sweepstakes that hand out promo codes (marketplace-wide or seller-specific)
- 📋 Marketplace-wide coupons that apply to any seller's products (needs a platform→seller
  settlement mechanism, since payments go straight to sellers)

## Related
- Seller-owned coupons live in [03 · Selling & Shops → Promotions](../03-selling-and-shops/promotions/).
- The reward is redeemed on [06 · Print Edition](../06-print-edition/) placements.
