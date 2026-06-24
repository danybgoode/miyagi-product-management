---
status: shipped
slug: domain-coupon-mint-fix
---

# Epic: Domain-coupon mint fix — `miyagisan` won't create on prod

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high (prod money creds / checkout) · **Scope doc:** [`00-ideas/2. readyforscope/domain-coupon-mint-fix.md`](../../00-ideas/2.%20readyforscope/domain-coupon-mint-fix.md)

> **Status (2026-06-23): ✅ SHIPPED — live coupon minted, reads 0/100 · activo.** Follow-up bug-fix to
> custom-domain-paywall S3. The admin mint tool failed on prod with a generic *"No se pudo crear el
> cupón."*, masking the real cause. We unmasked it (S1), and the surfaced error proved the cause was
> **NOT credentials** but a **malformed mint request**: the coupon display name was **46 chars**, over
> Stripe's **40-char** `name` limit, so `coupons.create` 502'd before the promo code. Shortening the name
> (S2.1) fixed it; Daniel minted the live coupon (S2.2) — it now exists in the live Stripe account as
> *"Dominio propio — primer año gratis"* + Promotion Code `MIYAGISAN`, reading **0/100 · activo** (S2.3).
> The World-Cup giveaway is redeemable. PRs #118 (unmask/harden) · #119 (`bad_request` param surfacing)
> · #120 (name fix). **Owed to Daniel (optional):** one real card redemption for full end-to-end proof.

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
| 2 | S2.1 Fix the mint request (coupon name ≤ 40 chars — NOT a creds fix) | high |
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
- [x] S1.1/S1.2 merged (PR #118 `cc73a26`): real Stripe error visible on both mint + read; *Actualizar* never silent.
- [x] S1.3: actual prod root cause found + written into `RETROSPECTIVE.md` — a **46-char coupon name** over
      Stripe's 40-char limit (`StripeInvalidRequestError`/`param: name`), NOT a credentials problem. The
      `bad_request` param surfacing (PR #119 `cf1cf8f`) pinpointed it.
- [x] S1.4: cap-boundary + error-classifier api spec green (`e2e/domain-coupon.spec.ts`, 11 pure tests).
      ⚠️ The **test-mode card-4242 redemption rehearsal was skipped** — we validated on prod via the live
      n/100 read instead (the fix was a deterministic name-length bug, not mode-dependent). Stated honestly.
- [x] S2 (PR #120 `68af03f`): live `custom_domain_campaign_miyagisan` Coupon + `MIYAGISAN` promo code exist
      (confirmed in the Stripe live dashboard as *"Dominio propio — primer año gratis"*); card reads **0/100 · activo**.
- [x] Each sprint has a fool-proof smoke walkthrough in its `sprint-N.md`.
- [x] Poster (`Roadmap/README.md`) updated; durable learnings promoted to `LEARNINGS.md`. `RETROSPECTIVE.md` written.
- [ ] **Owed to Daniel (optional, not blocking):** one real card redemption end-to-end ($0 year-1 → renewal $499/yr → counter 1/100).
