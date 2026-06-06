# Retrospective — Referral Program (Sprint 1)

**Shipped:** 2026-06-03 · all 5 stories live · full live QA passed · zero defects found.

This epic was the second half of the `referrals and coupon codes` idea card (the first half,
[Seller Coupon Codes](../../03-selling-and-shops/promotions/), shipped just before it). Both were
QA'd together against production.

## What shipped
The complete loop: a user shares `miyagisanchez.com/?ref=CODE` → a friend lands (code stashed) →
signs up (attributed) → their first purchase mints the referrer a one-use **print-ad credit** →
redeemed at print-ad checkout. Admins issue platform-wide promo codes and tune the reward (amount /
vigencia / on-off) from `/admin/coupons`, no deploy needed.

## What went well
- **One engine, three surfaces.** The seller-coupon machinery built in the previous epic became the
  delivery mechanism for both admin/platform coupons *and* referral rewards. No new discount engine.
- **The funding model held up.** Rewards are funded by the platform-owned print shop (`miyagiprints`),
  the one surface the platform actually bills — so no seller ever pays for someone else's referral.
  This single decision unblocked the whole design in a no-commission marketplace.
- **Ship-per-story kept it honest.** Each story was verified against its own deploy; the one story
  that touched live payment webhooks (reward issuance) was held for explicit sign-off before going out.

## What we learned
- **Most shops aren't sellers (yet).** Many marketplace shops exist only as Supabase mirrors of
  scraped listings, with no Medusa `seller` record — so they can't hold coupons. Coupons/rewards
  reach genuinely onboarded sellers and the platform shop. Worth remembering for growth math.
- **Migration history had drifted.** Recent migrations were applied via the SQL editor, not the CLI,
  so a blind `db push` would have replayed live migrations. The fix was to repair history first, then
  push only the new file. Future schema changes on this shared DB should check `migration list` first.

## Validated but money/account-gated (deployed, not exercised end-to-end)
- The discounted charge actually hitting Stripe/MP, and reward issuance on a *real* first purchase —
  both need a live transaction. The discount math, validation, minting, and webhook wiring are all
  proven; only the money round-trip is untested.
- A brand-new signup writing a real attribution row — needs a fresh account; capture + guards proven.

## Deferred (in scope for this domain, not this sprint)
- **Two-sided rewards** — a welcome credit for the invited friend too (the obvious next iteration).
- **Any-seller coupons** — platform promo codes redeemable on regular listings; needs a platform→seller
  settlement mechanism since payments go straight to sellers.
- **Games / sweepstakes** — the card's original north star; the platform-coupon foundation is now laid.
- **Coupon stacking / bundle-checkout coupons** — carried over from the coupon epic.

## Engineering debt noted
Pre-existing lint issues (`no-explicit-any`, `<a>`-vs-`Link`) in the payment-webhook and root-layout
files — unrelated to this work, flagged for a dedicated cleanup pass.
