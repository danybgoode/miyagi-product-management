# Sprint 2 — Public Verified Entry & Purchase Bonus

Goal: supporters can enter with verified email, and completed purchases can
award extra tickets idempotently.

**Status:** ✅ SHIPPED 2026-06-04 — merged to `main` (`652d2bf`, `881d287`, `e07349b`). Live giveaway smoke owed (see RETROSPECTIVE).

Risk tier: **High** — purchase-bonus hooks touch live Stripe/MercadoPago webhook,
checkout reconciliation, and direct-payment confirmation paths. Daniel merge
only after careful smoke.

---

## US-1 — Public email-verified entry ✅
**As a** supporter, **I want** to enter with my name and verified email, **so that**
I can join without creating a marketplace account.
- [x] Public `/g/[slug]` page shows prize, countdown, bilingual terms, and entry form.
- [x] Email code is required before a ticket is created.
- [x] Duplicate free entry for the same campaign/contact returns the existing entry
      and total ticket count.
- [x] Entry stores selected locale for future emails.

## US-2 — Purchase incentive display ✅
**As a** supporter, **I want** to see how purchases improve my chances, **so that**
I understand the value exchange.
- [x] Purchase incentive copy appears only when the tenant enabled it.
- [x] CTA sends the supporter to the tenant shop.
- [x] Public page never requires a marketplace account to claim the base ticket.

## US-3 — Purchase bonus tickets ✅
**As the** system, **I want** completed purchases to award bonus tickets exactly
once, **so that** purchase incentives are fair and do not double-count.
- [x] Bonus tickets are awarded only for verified entry email + same shop + campaign window.
- [x] Stripe, MercadoPago, checkout reconciliation, and direct-payment confirmation
      call the same idempotent helper.
- [x] Refunded-before-draw orders are excluded from the draw pool.

## QA / smoke
- [x] API/spec path keeps ticket creation behind verification.
- [x] Secret-gated smoke confirms duplicate free entry is idempotent.
- [x] Secret-gated smoke confirms double-fired purchase bonus creates exactly one bonus-ticket set.
- [ ] Manual preview smoke: enter, verify email, purchase from test shop, confirm ticket count.
