---
status: shipped
slug: promotions
---

# Epic · Seller Coupon Codes

**For sellers who want to run promotions.** Let a seller create discount codes for their shop, so
they can run sales, reward loyal buyers, and drive conversions. Buyers enter a code at checkout and
see the discount before they pay.

This epic directly supports the **World Cup "Sube tus promos a Miyagi" acquisition campaign**: shops
are onboarded by uploading their existing promos (discounted products), and need a self-serve way to
turn those into real, redeemable codes. It's also the foundation for later seller "games"
(sweepstakes that hand out promo codes — marketplace-wide or seller-specific).

## What a seller gets
- Create a coupon: a **code** (typed or auto-generated), a **discount** (% or fixed MXN), an
  optional **expiry date**, and an optional **usage limit**.
- Manage codes: activate / deactivate, delete, and see **usage** (uses vs. limit).
- Codes are **scoped to that seller's shop only** — never marketplace-wide.

## What a buyer gets
- Enter a code in checkout and see the discount applied **in real time** before paying.
- Clear messages when a code is expired, used up, or doesn't apply to that shop.

## How it fits
- Built on Medusa's **Promotion** capability (the system of record for codes, discounts, expiry, and
  usage limits). The discount is applied at the existing checkout step, alongside the bundle
  discount. Buyer redemption is a **Checkout & Payments** surface — see `../../02-checkout-and-payments/`.

## Out of scope (for now)
- Marketplace-wide / admin-created coupons.
- Coupons on multi-seller (bundle) checkout.
- Stacking multiple coupons, or stacking a coupon on top of an accepted offer.

## Sprints
- [sprint-1.md](sprint-1.md) — create & manage codes, redeem at checkout, usage stats.
