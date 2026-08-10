# US marketplace — Sprint 5: The seller side, in English

**Status:** ⬜ not started

## Outcome

A US merchant can run their whole business in English. The seller portal — onboarding, catalog, orders,
offers, coupons, analytics, profit, settings — reads en-US for a US shop, and signup is open at `/us` the
way it is at `/mx`. This is the second half of the copy work started in Sprint 2, over a much larger
surface, and it is mechanical over a locked contract.

## Build contract

Filled by the architect. It must list the seller-portal files in scope from the live tree, confirm the
dictionary and locale resolver from Sprint 2 are the mechanism (no second approach), and name which
admin-only surfaces stay es-MX and are deliberately out of scope.

## Stories

### Story 5.1 — Translate the seller portal to en-US

**As a** US merchant, **I want** my dashboard in English **so that** I can operate my shop without
translating it in my head.

**Acceptance:** The seller shell and every section on `lib/seller-nav.ts` — Resumen/Overview, orders,
offers, catalog, collections, channels, imports, coupons, subscriptions, content, events, analytics,
profit, settings — read from the dictionary and have en-US values. The setup guide, onboarding doors,
success cards and the seller-facing emails are covered. Formatting follows the resolved locale. A Mexico
shop's portal is unchanged, character for character, proven by the es-MX completeness guard and a render
diff. No component is duplicated for a second language.

**Risk:** low

### Story 5.2 — Open US seller signup and onboarding

**As a** US merchant, **I want** to open a shop from `/us` **so that** I can start selling without an
invitation.

**Acceptance:** `/us` carries a visible, working "open your shop" path, equivalent to Mexico's. Signup
creates a shop with operating market `us` through the Sprint 1 seam — no admission review, no
application, no approval queue, no waitlist. Onboarding runs in English, including the guided payments
step, and the Stripe connection it prompts for is the one Sprint 4's checkout requires. A US merchant
reaching the end of onboarding has a shop that can genuinely take an order. The Mexico signup and
onboarding paths are untouched.

**Risk:** low

## Sprint QA

- **api spec(s):** seller-portal dictionary completeness for both halves; shop creation with operating
  market `us`; an onboarding completion spec asserting the finished shop is sellable.
- **browser smoke owed:** the authenticated seller walkthrough is **owed to Daniel** — an automated
  smoke cannot hold a real seller session through onboarding and the Stripe connect round-trip.
- **deterministic gate:** `tsc --noEmit` + lint + `npm run build` + Playwright `api` green before merge.
- **regression:** the whole MX seller-portal population — setup guide, three-doors onboarding, catalog,
  ML sync, profit — plus the es-MX copy guard.
- **review:** LOW — no cross-family pass. Gate green ⇒ merge.

## Sprint 5 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Signed out, go to https://miyagisanchez.com/us
   → An obvious path to open a shop, in English. No application form, no waitlist, no invitation copy.
2. (authenticated — owed to Daniel by name) Sign up and open a US shop.
   → Onboarding runs in English end to end and the shop is created with US as its operating market.
3. Complete the guided payments step.
   → The Stripe connect round-trip completes and the shop can take card payments.
4. Create a listing priced in USD and publish it.
   → It appears at https://miyagisanchez.com/us/l in USD.
5. Walk the seller nav — orders, catalog, coupons, analytics, profit, settings.
   → Every section is English. No Spanish leaks through.
6. Open a Mexico shop's dashboard.
   → Entirely Spanish, exactly as before.

If any step fails, note the step number + what you saw — that's the bug report.
