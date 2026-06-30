# Subdomain pricing — Sprint 3: Monthly recurring cadence

**Status:** 🟦 READY — not started. **Risk: HIGH (payments — new recurring cadence).** Daniel merges.

| Story | Status | Commit |
|---|---|---|
| US-6 — Monthly recurring cadence ($25/mo) + lapse | ⬜ | |
| api spec (`e2e/subdomain-monthly.spec.ts`) | ⬜ | |

> Goal: a seller can pay **$25/mo** instead of yearly; yearly stays the discounted option. This is the
> `billing-cadence-monthly-recurring` work, delivered here for the subdomain SKU. (A later epic can
> generalize the monthly cadence to the custom domain if desired.)

## Stories

### US-6 — Monthly recurring cadence + lapse
**As a** seller, **I want** to pay $25/mo for the subdomain, **so that** I can start without an annual
commitment. Add a **monthly** recurring price to the subdomain plan; the checkout offers monthly vs
yearly (yearly framed as the discount — $199/yr ≈ $17/mo). Reuse the subscription lapse logic: a failed/
cancelled monthly subscription lapses the subdomain **back to `/s/slug`** (mirror the yearly lapse from
Sprint 2). Entitlement seam already honors "active subscription" — monthly is just another price on the
same plan.
**Acceptance:** a test seller subscribes monthly → subdomain white-label; a simulated renewal keeps it
live; a cancellation/failed payment lapses it → 301 to `/s/slug`; switching monthly↔yearly works without
a double charge or a gap in entitlement.
**Risk:** high (payments)

## Sprint QA
- **api spec(s):** `e2e/subdomain-monthly.spec.ts` (api) — monthly price resolves from the single source;
  active monthly sub → entitled; cancel/fail → lapsed → 301; monthly↔yearly switch preserves entitlement
  with no double charge.
- **browser smoke owed:** **YES, to Daniel — live money path.** A real monthly subscribe + a
  cancel-and-lapse cycle.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

1. As a test seller, open the subdomain checkout and choose **"$25/mes"**.
   → A monthly subscription checkout opens; yearly is shown alongside as the cheaper-per-month option.
2. Pay with Stripe test card `4242 4242 4242 4242`.
   → `https://<shop>.miyagisanchez.com` serves white-label; Stripe shows an **active monthly subscription**.
3. In Stripe, simulate the next monthly invoice (renewal).
   → The subdomain stays live; entitlement unchanged.
4. Cancel the subscription (or simulate a failed payment) and let it lapse.
   → The subdomain **301s back to `/s/slug`**; no orphaned charge.
5. (switch) From an active monthly sub, switch to yearly.
   → Entitlement stays continuous; no double charge; cadence reflects yearly.

If any step fails, note the step number + what you saw — that's the bug report.
**Money path:** every step here is live-money/recurring → **owed to Daniel** (an automated browser smoke
can't cover real Stripe subscription lifecycle events).
