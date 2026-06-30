---
status: shipped
slug: promoter-program
---

# Epic · Promoter Program — in-person seller acquisition force (commission-paid)

> Scoped 2026-06-29 from [`00-ideas/2. readyforscope/promoter-program.md`](../../00-ideas/2.%20readyforscope/promoter-program.md).
> **Status: ✅ SHIPPED 2026-06-30 — all 4 sprints merged to `main`.** Risk **HIGH** (a one-time payment
> cadence + a commission ledger); Daniel merged the HIGH stories. Live behind `promoter.enabled` (ON in
> prod, Flagsmith id 220525). Money/auth smokes owed to Daniel (declared per sprint). See `RETROSPECTIVE.md`.
> S1 [#138](https://github.com/danybgoode/miyagisanchezcommerce/pull/138) `1cea2cb` · S2 [#140](https://github.com/danybgoode/miyagisanchezcommerce/pull/140) `7d47222` · S3 [#141](https://github.com/danybgoode/miyagisanchezcommerce/pull/141) `fff04ca` · S4 [#143](https://github.com/danybgoode/miyagisanchezcommerce/pull/143) `e1ba7ad`.

**Tagline:** *Un promotor entra a la tienda, la deja montada en Miyagi, y cierra la venta en persona.*

## Why
Seller acquisition today is self-serve. This epic adds a **commission-paid promoter force** that goes
shop-to-shop, sets the business up on Miyagi *for* the owner (proving how easy it is), and **closes in
person** — selling a printed ad, a custom domain, or a subdomain — using a **personalized code** that
unlocks a **seller discount**. The promoter often **collects cash** and pays online with their own card,
then hands off with a **WhatsApp claim link**. The motion needs three things the platform doesn't have
yet: promoter **attribution + commission**, a **one-time** payment cadence (cash buyers won't set up a
recurring mandate), and a **cash-collection** close. Everything else is reuse.

## Context
| | |
|---|---|
| **Role** | Promoter (new), seller (enrolling), admin (config + settlement) |
| **Macro-section** | 08 · Growth & promotions |
| **Risk** | HIGH — one-time cadence (payments) + commission ledger |
| **Flag** | `promoter.enabled` (fail-open: off ⇒ feature hidden) |
| **Spawns** | `subdomain-pricing` · `ml-sync-port` (spike) · `billing-cadence-monthly-recurring` |
| **Settlement** | Offline (cash/transfer) in v1 — **no in-app payout** |

## Medusa-first note (AGENTS rule #1)
Commission + one-time billing are commerce concerns → backend. The one-time cadence **extends the
existing subscription/checkout machinery** (no parallel payment path). The commission ledger records
against Medusa orders/SKUs; **settlement is offline in v1**, so there is no in-app money mutation to the
promoter — the ledger is low-risk, while the **sale checkout** (where money moves) is the HIGH surface.
Promoter/commission data Medusa has no concept of lives in **Supabase** (rule #2), keyed to the Medusa
order/seller. SKUs stay agent-accessible over UCP/MCP (rule #3); promoter/seller copy is es-MX (rule #5).

## What already exists (reuse, don't rebuild)
- **Referral spine** — `lib/referrals.ts` (`getOrCreateReferralCode`, `getReferrerByCode`,
  `attributeReferral`, admin settings) → promoter code + attribution.
- **Platform coupons** — `mintPlatformCoupon`, `app/admin/coupons/*`, `app/api/checkout/validate-coupon`
  → the seller discount through the code.
- **Custom-domain paid SKU** — `lib/domain-*.ts`, `lib/domain-entitlement*.ts`, `lib/domain-pricing.ts`,
  `app/api/sell/shop/domain/route.ts` (entitlement + lapse + campaign-coupon patterns to mirror).
- **Subscription/billing primitives** — `apps/backend/src/modules/subscriptions/`,
  `lib/stripe-subscriptions.ts`, `lib/domain-subscription-checkout.ts`.
- **One-time + manual/cash checkout** — `app/api/stripe/checkout/*` and the print-ad
  `app/api/print/submissions/[id]/checkout` + **`.../payment-reported`** (the cash-report pattern for US-10).
- **Printed ad** — `06-print-edition/*`, `app/api/print/*`, `miyagiprints` shop.
- **WhatsApp claim handoff** — Gem-Claim Loop (`POST /api/claim/complete`, nullable `seller.clerk_user_id`).
- **Resources mini-site** — seller-acquisition landing infra (`app/(shell)/vende/**`, `locales/es.json`).
- **Kill-switch** — `lib/flags.ts` (add `promoter.enabled`).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1 Promoter code + link (referral-namespace reuse) | low |
| 1 | US-2 Code unlocks seller discount at SKU checkout | med |
| 1 | US-3 Enrollment + sale attribution to promoter | low |
| 2 | US-4 One-time cadence for custom domain (+ graceful year-end lapse) | high |
| 2 | US-5 One-time cadence for printed ad | high |
| 2 | US-6 Cadence selectable over UCP/MCP | med |
| 3 | US-7 Per-SKU commission % config (admin) | low |
| 3 | US-8 Commission accrual (paid + attributed, first-payment only) + promoter dashboard | med |
| 3 | US-9 Admin settlement view (mark paid, offline) | low |
| 4 | US-10 Paid-by-promoter / cash-collection checkout (attributed + flagged) | high |
| 4 | US-11 WhatsApp claim handoff (gem-claim reuse) | med |
| 4 | US-12 Promoter resources mini-site + sell-sheet (es-MX) | low |

## Deploy order
**S1 frontend-first** behind `promoter.enabled` (off) — attribution + discount land before any charge.
**S2 backend-first** — cadence on the Medusa subscription/checkout machinery + migration before the merge
that needs it; Stripe webhook. **S3** additive. **S4** reuses S2's money path. **HIGH stories → Daniel
merges.** Each frontend PR gets a Vercel preview. Announce any `middleware.ts`/shared-surface touch.

## Definition of Done (epic) — ✅ complete 2026-06-30
- [x] All sprints merged to `main` + smoke-tested (money-path smokes owed to Daniel, declared per sprint).
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs).
- [x] This README marked ✅; every sprint status ticked with commit refs.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster (`Roadmap/README.md`) updated (promoter program + one-time cadence + commission).
- [x] Team memory + `MEMORY.md` updated.
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append).
- [x] Feature branch deleted; scope-doc frontmatter `status: shipped`.
- [x] Fast-follows seeded: `subdomain-pricing`, `ml-sync-port` (spike), `billing-cadence-monthly-recurring`.

## Sprints
- [sprint-1.md](sprint-1.md) — Promoter spine: code + discount + attribution (thin end-to-end).
- [sprint-2.md](sprint-2.md) — One-time payment cadence (the core money change).
- [sprint-3.md](sprint-3.md) — Commission ledger (% per item, first-payment only).
- [sprint-4.md](sprint-4.md) — In-person close: cash collection + claim handoff + resources.
