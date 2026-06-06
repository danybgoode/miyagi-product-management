# Retrospective — Seller Coupon Codes (Sprint 1)

**Shipped:** 2026-06-03 · all stories live · live QA passed · zero defects found.

First half of the `referrals and coupon codes` idea card. Unblocked the World Cup *"Sube tus promos a
Miyagi"* acquisition campaign: sellers can now turn their existing promos into real, redeemable codes.

## What shipped
Sellers create discount codes (% or fixed MXN, optional expiry & usage limit) in their dashboard;
buyers enter them at checkout and see the discount in real time before paying. Codes are scoped to a
single seller's products, with usage counted once per completed order.

## What went well
- **Built on Medusa's Promotion module** rather than a bespoke discount engine — it gave codes,
  expiry, usage limits, and depletion for free. The catch: our checkout bills providers directly with
  a computed `priceCents`, so we used the module for storage + lifecycle and applied the discount at
  the existing bundle-discount seam. That same engine then powered the entire Referral Program.
- **Per-seller scoping via `seller.metadata.coupon_ids`** mirrored how bundles/offers already live in
  seller metadata — consistent, no new tables.

## What we learned
- **Validate at one seam.** Putting the resolve/validate logic in a single `resolveCouponForCheckout`
  helper meant the real-time preview endpoint, the start-checkout charge, and (later) the referral
  rewards all shared one source of truth. Verified live across valid / foreign-seller / expired /
  not-found / empty cases.

## Live QA confirmed
Create → list → redeem → delete through a real seller session; cross-seller scoping rejects a foreign
code; the backoffice shows "uses / limit"; correct % and fixed-amount math.

## Deferred (out of scope, carried forward)
- Coupons on multi-seller bundle checkout.
- Coupon stacking (multiple coupons; coupon-on-offer beyond the enforced "not stackable" rule).
- Marketplace-wide / admin-created coupons → delivered separately in
  [08 · Growth & Promotions](../../08-growth-and-promotions/referral-program/).
