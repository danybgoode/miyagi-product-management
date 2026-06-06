# Promotions & Referrals — engineering delivery log

From the `referrals and coupon codes` idea card (now in `Roadmap/00-ideas/3. done/`). Split into two
features, shipped & live-QA'd 2026-06-03. Product docs:
`Roadmap/03-selling-and-shops/promotions/` and `Roadmap/08-growth-and-promotions/referral-program/`.

## Core design

**One discount engine, three surfaces.** Checkout bills Stripe/MP with a manually-computed
`priceCents` in `apps/backend/src/api/store/carts/[id]/start-checkout/route.ts` — carts do **not**
run through Medusa's promotion engine. So we use the Promotion module (`Modules.PROMOTION`, default
in v2) for storage + lifecycle + usage accounting, and compute/apply the discount ourselves at the
existing bundle-discount seam.

- Shared helper: `apps/backend/src/api/store/_utils/coupons.ts`
  (`createSellerCoupon` / `resolveCouponForCheckout` / `computeCouponDiscountCents` / `couponErrorMessage`).
- A coupon = 1 Promotion + 1 per-coupon Campaign (usage budget + `ends_at`). Ownership via
  `seller.metadata.coupon_ids[]`.
- **Funding model:** a referral reward / platform promo is a coupon scoped to the platform-owned
  `miyagiprints` seller — the only surface the platform bills (print-ad placements already flow
  through `lib/cart.ts startCheckout` → start-checkout). No regular seller ever funds a platform promo.

## Feature B — Seller Coupon Codes
- Backend: `_utils/coupons.ts`, `store/sellers/me/coupons/{route,[id]}.ts`,
  `store/sellers/[slug]/validate-coupon/route.ts`, `subscribers/coupon-usage.ts` (usage on
  `order.placed`; cart.metadata→order.metadata is copied by Medusa's complete-cart, so it covers
  card/MP/manual once, never abandoned carts).
- Storefront: `app/api/sell/coupons/*`, `app/api/checkout/validate-coupon`,
  `app/shop/manage/promotions/*`, coupon input in `CheckoutExperience.tsx` →
  `CheckoutPayButton.tsx` → `lib/cart.ts`.

## Feature A — Referral Program (+ platform/admin coupons)
- Backend: `store/.../internal/platform-coupons/route.ts` (mint platform coupons; gated by
  `MEDUSA_INTERNAL_SECRET`).
- Storefront: `lib/referrals.ts` (codes, attribution, `maybeRewardReferralOnOrder`, settings),
  `middleware.ts` (`?ref=` → 30-day cookie), `app/components/ReferralAttribution.tsx`,
  `app/api/referrals/{me,attribute}/*`, `app/account/referrals/*`,
  `app/admin/coupons/*` + `app/api/admin/{coupons,referrals/config}/*`,
  `lib/email.sendReferralReward`. Reward fires from the Stripe + MP webhooks after the
  `marketplace_orders` insert (fire-and-forget + `.catch`, never blocks payment).
- Supabase: `supabase/migrations/20260603100000_referrals.sql` —
  `marketplace_referral_codes` / `marketplace_referrals` / `marketplace_referral_settings`.

## Runbook / gotchas
- **Supabase migration history had drifted** (recent migrations applied via SQL editor, not CLI). A
  blind `supabase db push` would replay live migrations. Fix:
  `supabase migration repair --status applied <drifted versions>` then `db push` (applies only the
  new file). Always `supabase migration list --linked` first.
- Admin surfaces gated by `?secret=ADMIN_SECRET`; backend internal route by `x-internal-secret`
  (`MEDUSA_INTERNAL_SECRET`). Both present in frontend env + GCP.
- **Most `marketplace_shops` are Supabase mirrors of scraped listings with no Medusa `seller`** — they
  can't hold coupons. Only onboarded sellers + `miyagiprints` resolve in the validate/checkout paths.

## Live QA (2026-06-03) — passed, zero defects
Verified in prod: seller coupon create→list→redeem→delete (real session), cross-seller scoping
(`foreign_seller`), valid/expired/not_found/empty branches, admin platform-coupon lifecycle, admin
reward-config write, referral code generation + persistence, `?ref` capture + attribution guards,
print-ad redemption ($100→$50). **Not money-tested (deployed, need a real txn / fresh account):** the
discounted charge hitting Stripe/MP, reward issuance on a real first purchase, a brand-new signup
writing an attribution row.

## Deferred
Two-sided rewards · any-seller coupons (needs platform→seller settlement) · games/sweepstakes ·
coupon stacking · bundle-checkout coupons · lint debt in webhook/layout files.
