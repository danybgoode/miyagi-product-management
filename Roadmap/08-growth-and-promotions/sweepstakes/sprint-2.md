---
epic: sweepstakes
sprint: 2
title: Public Verified Entry & Purchase Bonus
risk: low
phase: Shipped
stories_total: 3
stories:
  - id: S2.1
    title: Public email-verified entry
    as_a: a supporter
    i_want: to enter with my name and verified email
    so_that: I can join without creating a marketplace account
    risk: low
    status: done
  - id: S2.2
    title: Purchase incentive display
    as_a: a supporter
    i_want: to see how purchases improve my chances
    so_that: I understand the value exchange
    risk: low
    status: done
  - id: S2.3
    title: Purchase bonus tickets
    as_a: the system
    i_want: completed purchases to award bonus tickets exactly once
    so_that: purchase incentives are fair and do not double-count
    risk: low
    status: done
---
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
