---
title: "Referrals & coupon codes"
slug: referrals-and-coupon-codes
status: shipped
area: "08"
type: feature
priority: null
risk: low
epic: "08-growth-and-promotions/referral-program"
build_order: null
updated: 2026-06-08
---

# referrals and coupon codes

AGENT: Claude
Area: promotions
Created time: May 27, 2026 9:23 PM
Priority: P0
Status: Daily Funk

> ⚠️ **Split recommendation:** This card covers two separate features. Consider splitting into **"Referral program"** (Growth/Marketing) and **"Seller coupon codes"** (Dev) when you pick this up, as they have different owners and timelines.
> 

---

## Feature A: Referral Program

### 👤 User Story

**As an** existing user,

**I want** to share a referral link with friends,

**So that** I earn a reward (store credit or fee discount) when they sign up and complete their first transaction.

### ✅ Acceptance Criteria

- [ ]  Each user has a unique referral code, accessible from their profile
- [ ]  Shareable link short format
- [ ]  Referral code is store on landing and attributed on Clerk sign-up
- [ ]  A "Mis referidos / My referrals" section in the profile shows count and pending credits
- [ ]  Admin can configure reward amounts without a deploy

---

## Feature B: Seller Coupon Codes

Context: in terms of marketing i will promote:
sube tus promos a miyagi as acquisition campaign
they upload promos (essentially they create shops and products, this means they start a regular signup flow, but its just a way to catch tenants attention now during the worldcup, they all have promos to promote, essentially discounted products), their products are created and promotions can be applied at checkout to them. thats why we have to enable a feature for tenants to create and manage promotions from their backoffice.

This feature will serve as foundation for later implement games (sweepstakes for starters) for tenants to play and get promotional codes in return, marketplace wide or seller specific.

### 👤 User Story

**As a** seller,

**I want** to create discount codes for my shop,

**So that** I can run promotions, reward loyal buyers, and drive conversions.

### ✅ Acceptance Criteria

- [ ]  Seller can create a coupon code
- [ ]  Fields: code (custom or auto-generated), discount type (% or MXN fixed), amount, expiry date (optional), usage limit (optional)
- [ ]  Coupon codes are applied at checkout via Medusa's Discount module
- [ ]  A code can be scoped to a single seller's products only (not platform-wide)
- [ ]  Buyer can enter the code in the cart/checkout and see the discount applied in real time
- [ ]  Seller can view usage stats per code (uses / limit)
- [ ]  Expired or depleted codes return an error message

---

## 📎 References

- Medusa Discount module: [https://docs.medusajs.com/modules/discounts](https://docs.medusajs.com/modules/discounts)
- Vinted referral: [https://www.vinted.es/member/referral](https://www.vinted.es/member/referral) (reference UX)
- Etsy coupons: [https://help.etsy.com/hc/en-us/articles/115015628287](https://help.etsy.com/hc/en-us/articles/115015628287) (reference seller UX)