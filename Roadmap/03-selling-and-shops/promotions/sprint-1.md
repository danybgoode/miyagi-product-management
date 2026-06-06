# Sprint 1 — Seller Coupon Codes

Goal: a seller can create and manage discount codes, and buyers can redeem them at checkout.

Each story is an independently shippable slice. Status: ✅ done · 🚧 in progress · 📋 planned.
**Sprint complete — all stories shipped & live (2026-06-03), live QA passed.** See
[RETROSPECTIVE.md](RETROSPECTIVE.md).

---

## US-1 — Create & manage coupon codes (foundation) ✅
**As a** seller, **I want** to create and manage discount codes, **so that** I can run promotions.

Acceptance:
- [x] I can create a coupon with: code (typed or auto-generated), discount type (% or fixed MXN),
      amount, optional expiry, optional usage limit.
- [x] I can list my coupons, deactivate/reactivate them, and delete them.
- [x] A coupon belongs only to my shop.
- [x] Two coupons can't share the same code.

*Built on the Medusa Promotion capability; ownership tracked per shop.*

## US-2 — Manage coupons from my dashboard ✅
**As a** seller, **I want** a "Cupones" section in my shop dashboard, **so that** I can manage codes
without help.

Acceptance:
- [x] A "Cupones" entry in the seller dashboard.
- [x] A form to create a coupon and a list of existing ones (with status and usage).
- [x] Activate/deactivate and delete from the list.

## US-3 — Redeem a coupon at checkout ✅
**As a** buyer, **I want** to enter a coupon code at checkout, **so that** I get the discount.

Acceptance:
- [x] I can enter a code in checkout and see the discount applied **in real time**.
- [x] The amount I pay reflects: item subtotal − (bundle, if any) − coupon (+ shipping).
- [x] Expired, used-up, or wrong-shop codes show a clear message and apply no discount.
- [x] A coupon doesn't stack on top of an accepted offer.
- [x] A code's usage only counts after the order is actually completed.

## US-4 — See how my codes are performing ✅
**As a** seller, **I want** to see usage per code, **so that** I know which promos work.

Acceptance:
- [x] Each coupon shows uses vs. limit ("x / y usos" in the dashboard list).
- [x] Counts increment only on completed orders (via the order.placed handler).

---

### Out of scope (this sprint)
Marketplace-wide/admin coupons · coupons on multi-seller bundle checkout · stacking multiple coupons.
