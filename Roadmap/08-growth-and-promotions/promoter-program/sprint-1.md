# Promoter Program — Sprint 1: Promoter spine (code + discount + attribution)

**Status:** 🟦 READY — not started.

| Story | Status | Commit |
|---|---|---|
| US-1 — Promoter code + shareable link | ⬜ | |
| US-2 — Code unlocks seller discount at SKU checkout | ⬜ | |
| US-3 — Enrollment + sale attribution to promoter | ⬜ | |
| api spec (`e2e/promoter-program.spec.ts`) | ⬜ | |

> Goal: a promoter code enrolls a seller and applies a discount on a paid SKU — a **working thin loop**,
> end-to-end, before any new payment cadence or commission ledger exists. Behind `promoter.enabled` (off).

## Stories

### US-1 — Promoter code + shareable link
**As a** promoter, **I want** a unique code + shareable link, **so that** every shop I enroll attributes
to me. Reuse the referral-code mint (`lib/referrals.ts`) in a **promoter namespace** (distinct prefix/
table so promoter codes never collide with buyer referral codes). Promoters are **admin-provisioned** in
v1 (no self-serve signup). Code resolves to a promoter id.
**Acceptance:** an admin creates a promoter; the promoter has a stable code + link; resolving the code
returns the promoter. Unknown code → not-found, no crash.
**Risk:** low

### US-2 — Code unlocks seller discount at SKU checkout
**As an** enrolling seller, **I want** the promoter's code to apply a discount on the paid SKU at
checkout, **so that** the in-person pitch ("get this discount through me") is real. Reuse the platform-
coupon validation (`app/api/checkout/validate-coupon` + `mintPlatformCoupon`), scoped so a promoter code
maps to a discount on the paid SKUs (custom domain / printed ad). The discount amount is admin-set.
**Acceptance:** with the flag on, entering a valid promoter code at SKU checkout shows the discount
before pay; an expired/invalid code returns a clear message; the code is recorded against the order.
**Risk:** med (touches checkout discount path)

### US-3 — Enrollment + sale attribution to promoter
**As** admin, **I want** each enrollment + sale recorded against the promoter (who, which shop, which
SKU, amount), **so that** Sprint 3 can compute commission. Supabase attribution table keyed to the
Medusa order + seller (rule #2 — Medusa has no promoter concept). Capture: promoter id, seller id, SKU,
gross amount, cadence (once known), timestamp.
**Acceptance:** completing US-2 writes an attribution row; admin can list a promoter's attributed
enrollments + sales. Re-running checkout doesn't double-write.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/promoter-program.spec.ts` (api project) — promoter code mint + lookup (US-1);
  `validate-coupon` returns the discount for a valid promoter code and rejects expired/unknown (US-2);
  attribution row written exactly once per paid+attributed order, fields correct (US-3).
- **browser smoke owed:** **yes, to Daniel** — enter a promoter code at a real SKU checkout and confirm
  the discount renders (no money moves yet at this step if using a $0/comp path; otherwise see S2).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

1. Open `/admin/...` promoter console (secret-gated) → create a test promoter "PROMO-TEST".
   → You see a generated code + shareable link for that promoter.
2. Open the promoter's link in a private window.
   → It lands on the enroll/SKU flow with the code pre-attributed (cookie/landing param set).
3. Start a paid-SKU checkout (custom domain) as a test seller and apply the promoter code.
   → The discount shows **before** the pay step; the total drops by the configured amount.
4. (attribution) Back in the admin promoter console, open "PROMO-TEST".
   → The enrollment/sale appears under that promoter with the correct shop + SKU.

If any step fails, note the step number + what you saw — that's the bug report.
**Money/auth note:** step 3 only *previews* a discount in S1; the actual charge + cadence is Sprint 2,
so the live money-path smoke is owed to Daniel there.
