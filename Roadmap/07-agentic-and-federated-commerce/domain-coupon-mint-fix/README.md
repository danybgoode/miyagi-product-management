---
status: planned
slug: domain-coupon-mint-fix
---

# Epic: Domain-coupon mint fix — `miyagisan` won't create on prod

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high (prod money creds / checkout) · **Scope doc:** [`00-ideas/2. readyforscope/domain-coupon-mint-fix.md`](../../00-ideas/2.%20readyforscope/domain-coupon-mint-fix.md)

> **Status (2026-06-23): 📋 PLANNED — awaiting build.** Follow-up bug-fix to custom-domain-paywall S3.
> The admin tool that mints the campaign coupon `miyagisan` fails on prod with a generic *"No se pudo
> crear el cupón."*, so the coupon has never been created in the live Stripe account and the World-Cup
> giveaway (year-1 of the own-domain subscription free, capped at 100) can't be redeemed. This epic
> unmasks the real error, hardens the admin surface, then mints + verifies the live coupon.

## Why
custom-domain-paywall S3 shipped the `miyagisan` coupon machinery (Stripe Coupon + Promotion Code,
idempotent mint, n/100 admin tracker, redemption at domain checkout) but left **"mint the coupon"** owed
to Daniel post-merge. That mint now fails on prod, and the failure is **masked**: the create path returns
a generic message and the read path swallows every Stripe error so *Actualizar* shows nothing. Until the
real error is visible and the live coupon exists, the giveaway is dead on arrival.

## Medusa-first note
N/A in the usual sense — this is the **platform-side Stripe subscription coupon** surface (platform is the
payee for the custom-domain SKU; no connected account, no Medusa order). It stays on the existing
Stripe-platform-coupon seam from custom-domain-paywall. **No new tables, no Medusa module, no new Stripe
objects** — the coupon + promo code are already designed. AGENTS rule #1 is satisfied: nothing here
re-implements commerce Medusa owns.

## What already exists (reuse, don't rebuild)
- `apps/miyagisanchez/lib/domain-coupon.ts` — pure seam: `couponRedeemable` / `couponRefusalReason` /
  `formatRedemptionCount`, the cap-of-100 boundary. **Reuse for regression specs** (no Stripe, no network).
- `apps/miyagisanchez/lib/domain-coupon-server.ts` — `ensureCampaignCoupon` (idempotent find-or-create),
  `getCampaignCouponStatus`, `resolveCampaignPromotionCode`. **Fix the masking here; don't rewrite the mint.**
  `findCoupon()` is the swallow-everything seam to fix.
- `apps/miyagisanchez/app/api/admin/domain-coupon/route.ts` — GET status / POST mint, Clerk admin-gated.
  Surface the real (sanitized) Stripe error.
- `apps/miyagisanchez/app/(shell)/admin/coupons/AdminCouponsClient.tsx` + `page.tsx` — the card + two
  buttons. Add *Actualizar* feedback; render a definite state always.
- `apps/miyagisanchez/lib/domain-subscription-checkout.ts` + `app/api/sell/shop/domain/subscribe/route.ts`
  — the redemption path the test-card smoke drives (`{coupon}` → promo code).
- `apps/miyagisanchez/lib/stripe.ts` — lazy Stripe client (throws if `STRIPE_SECRET_KEY` missing).
- Coupon design is already correct: `percent_off:100`, `duration:'once'` (year-1 free on the annual plan,
  then standard $499 MXN/yr), `max_redemptions:100` (Stripe enforces the cap; the 101st refused),
  deterministic ids so a repeated press can't duplicate.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | S1.1 Surface the real Stripe error (mint + read paths) | low |
| 1 | S1.2 *Actualizar* always renders a definite state | low |
| 1 | S1.3 Confirm prod cause (logs + key presence/mode/scope) | high (ops) |
| 1 | S1.4 Test-mode redemption smoke (Chrome MCP + card 4242) + cap api spec | high (test-mode) |
| 2 | S2.1 Apply the prod creds fix | high |
| 2 | S2.2 Mint the live `miyagisan` coupon (idempotent) | high |
| 2 | S2.3 Verify live 0/100 · activo (+ optional real redemption) | high |

## Out of scope
Coupon economics (100% / once / cap 100 — signed off); a generic multi-campaign coupon admin; the print-ad
platform-coupon system (`/internal/platform-coupons`, different surface, working).

## Deploy order
**Sprint 1 frontend-first** — S1.1/S1.2 are additive admin-surface changes (low risk, reviewer may merge
on green); S1.3/S1.4 are diagnostic/validation (no prod write of money state). **Sprint 2** is the
**prod live mint** — high risk, **Daniel runs/merges**, gated on S1.3's confirmed cause. Each frontend PR
gets a Vercel preview; the test-mode smoke runs against a preview or local `sk_test…` env.

## Known boundary (honest)
A Stripe **test card cannot redeem a live coupon**. S1.4 proves the mechanics in test mode; the live
coupon (S2) is validated by the **n/100 status read** and, optionally, one real redemption owed to Daniel.

## Epic Definition of Done
- [ ] S1.1/S1.2 merged: real Stripe error visible on both mint + read; *Actualizar* never silent.
- [ ] S1.3: actual prod root cause written into `RETROSPECTIVE.md`.
- [ ] S1.4: test-mode smoke passed (year-1 free + renewal price + counter ticks); cap-boundary api spec green.
- [ ] S2: live `custom_domain_campaign_miyagisan` Coupon + `MIYAGISAN` promo code exist; card reads 0/100 · activo.
- [ ] Each sprint has a fool-proof smoke walkthrough in its `sprint-N.md`.
- [ ] Poster (`Roadmap/README.md`) + `BUILD-ORDER.md` updated; durable learnings promoted to `LEARNINGS.md`.
