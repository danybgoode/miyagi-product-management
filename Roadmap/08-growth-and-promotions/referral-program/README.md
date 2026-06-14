---
status: shipped
slug: referral-program
---

# Epic · Referral Program

> ✅ **Sprint 1 shipped & live (2026-06-03), full live QA passed.** See
> [sprint-1.md](sprint-1.md) and [RETROSPECTIVE.md](RETROSPECTIVE.md).

**For existing users who want to bring friends.** Share a link; when a friend signs up and makes
their first purchase, you earn credit toward your next print-edition ad.

This epic also delivers **platform / admin coupons** — the same machinery, since a referral reward
is just a platform-issued coupon. An admin can create marketplace promo codes redeemable on print-ad
checkout, and the referral system mints those automatically.

## Why credit-for-print-ads
In a no-commission marketplace, a buyer's money flows straight to the seller — so a discount on a
regular listing would be paid by *that seller*, not the platform. Print-ad placements are the
exception: they run through the platform-owned **`miyagiprints`** shop, which the platform actually
bills. That makes print-ad credit the clean, funding-safe reward (and the foundation for future
platform promos and games).

## What a user gets
- A unique referral code + shareable link, in **Mi cuenta → Invita y gana**.
- Live stats: invited, with-purchase, rewards earned, and the credit codes they've won.
- A reward (default **$100 MXN**, admin-configurable) when an invited friend makes a first purchase.

## What an admin gets
- A secret-gated console (`/admin/coupons`) to create platform promo codes and set the referral
  reward amount, vigencia, and on/off — no deploy needed.

## Out of scope (noted for later)
- Two-sided rewards (welcome credit for the invited friend).
- Coupons that apply to any seller's products (needs platform→seller settlement).
- Coupon stacking; coupons on multi-seller bundle checkout.

## Sprints
- [sprint-1.md](sprint-1.md) — platform coupons, referral codes & page, attribution, reward
  issuance, redemption.
