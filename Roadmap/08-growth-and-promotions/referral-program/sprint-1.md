# Sprint 1 — Referral Program

Goal: a complete referral loop — share, sign up, qualify, reward, redeem — funded by print-ad credit.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **Sprint complete — all 5 stories shipped & live
(2026-06-03), live QA passed.** See [RETROSPECTIVE.md](RETROSPECTIVE.md).

---

## US-1 — Platform / admin coupons ✅
**As an** admin, **I want** to create marketplace promo codes, **so that** I can run platform promos
and issue referral rewards.
- [x] Create / list / delete codes redeemable on print-ad checkout (platform `miyagiprints` shop).
- [x] Secret-gated console at `/admin/coupons`.

*Reuses the seller-coupon engine; the same backend route mints referral rewards.*

## US-2 — Referral code, link & "Mis referidos" ✅
**As a** user, **I want** my own referral link and a place to track it.
- [x] Unique code + shareable link (`/?ref=CODE`), copy/share.
- [x] "Invita y gana" page with invited / with-purchase / rewards stats and earned credit codes.
- [x] Linked from the account hub.

## US-3 — Attribution ✅
**As the** system, **I want** to credit the right referrer when a friend signs up.
- [x] `?ref=CODE` captured on landing (30-day cookie).
- [x] Recorded at signup for genuinely new accounts only; never self-referral; once per user.

## US-4 — Reward on first transaction + admin config ✅
**As a** referrer, **I want** to earn credit when my friend's first purchase completes.
- [x] On the invited user's first paid order, mint a one-use print-ad credit for the referrer.
- [x] Works for card, MercadoPago, and manual; counted once; never on abandoned carts.
- [x] Referrer notified by email; credit shows in "Mis referidos".
- [x] Admin sets reward amount / vigencia / on-off without a deploy.

## US-5 — Redeem at print-ad checkout ✅
**As a** referrer, **I want** to spend my credit on a print ad.
- [x] Coupon field at print-ad checkout; validates and shows the discount before paying.
- [x] Discount applied; usage counted once on completion.

---

### Out of scope (this sprint)
Two-sided rewards · any-seller coupons (needs settlement) · coupon stacking · bundle-checkout coupons.
