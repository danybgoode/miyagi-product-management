---
title: "Promoter Program — in-person seller acquisition force (commission-paid)"
slug: promoter-program
status: shipped
area: "08"
type: feature
risk: high
relates_to: "08-growth-and-promotions/referral-program · 03-selling-and-shops/promotions · 03-selling-and-shops/gem-claim-loop · 07-agentic-and-federated-commerce/custom-domain-paywall · 06-print-edition/printed-edition-builder"
spawns: "subdomain-pricing (fast-follow epic) · ml-sync-port (fast-follow SPIKE→feature) · billing-cadence-monthly-recurring (fast-follow)"
updated: 2026-06-30
---

# Promoter Program — in-person seller acquisition force (commission-paid)

**Status: awaiting Daniel approval — no code yet.** Class: **Feature** (core), which **spawns** one
separable Feature (subdomain-as-paid-SKU) and one **Spike→Feature** (ML sync port). Risk **HIGH** — the
core introduces a new payment cadence (one-time) and a commission ledger, both money-adjacent. Most of
the program is **assembly over already-shipped primitives**; the genuinely new build is narrow.

## Mirror-back
> You want a commission-paid **promoter** force that walks into physical shops, sets the business up on
> Miyagi *for* the owner (proving how easy it is), and closes a sale **in person** — selling a **printed
> ad**, a **custom domain for a year**, or a **subdomain for a year** — using their **own personalized
> code** that unlocks a **seller discount**. The close happens in person: the seller checks out
> themselves, or the promoter checks out for them (often collecting **cash**, then paying online with
> their own card). The promoter leaves having **fully onboarded a tenant** and sold an item or bundle,
> handing off with a simple **WhatsApp claim link**. Promoters work on **commission (% per item, first
> payment only)**. You also want **monthly + yearly** and **one-time** payment options (many MX merchants
> pay one-time every time), the **subdomain priced cheaper than the custom domain**, a **promoter
> resources mini-site** + in-person training, and **Mercado Libre inventory sync** ported from
> despachobonsai as a flagship paid add-on — *pending an estimate*. Right?

## Decisions (Daniel, 2026-06-29)
1. **Scope split:** *Promoter core first; the rest fast-follow.* Subdomain-pricing and ML sync become
   their own scoped epics immediately after.
2. **Commission model:** **percentage-based per item** (a per-SKU %). On a **recurring** subscription the
   promoter earns on the **first payment / first year only**; on a **one-time** sale it's simply % of the
   sale.
3. **Billing cadence (newly surfaced as a core dependency):** everything is yearly today; we need
   **monthly + yearly**, **recurring-with-discount** *and* **one-time**. **One-time billing IS core v1**
   (cash, in-person closes need "pay a year up front, no recurring mandate"). Monthly + recurring-with-
   discount cadence is **fast-follow**.
4. **Subdomain price:** **cheaper than the custom domain**, with **monthly and yearly** options. (Built in
   the fast-follow `subdomain-pricing` epic, which depends on the cadence work landed here.)
5. **ML sync:** **Spike to estimate the port first** (despachobonsai → Medusa), resolving the publish-vs-
   true-stock-sync gap, before committing to build/pricing.

---

## Stage 2.5 — orientation: this is mostly assembly, not new build
The promoter program is an **attribution + commission + one-time-cadence layer** over primitives that are
already shipped and live. Naming the buckets:

- **Already possible today (reuse + positioning):** personalized codes, code→discount, the printed ad, the
  custom domain SKU, and the WhatsApp claim handoff all exist. A promoter could *manually* run the motion
  today with an admin coupon + the existing yearly custom-domain checkout + the gem-claim flow.
- **Light enhancement:** the promoter "resources mini-site" + sell-sheet is content on the existing
  seller-acquisition landing infra. The seller discount is the existing platform-coupon machinery, scoped
  to a promoter namespace.
- **Genuinely new (the real work):** (a) a **promoter entity + commission ledger** — *no commission
  concept exists anywhere in the repo yet*; (b) a **one-time payment cadence** alongside today's recurring-
  only SKUs; (c) the **cash-collection / paid-by-promoter** attribution path.

## What already exists (reuse, don't rebuild)
Concrete surfaces confirmed in code this session:

| Need | Reuse | Where |
|---|---|---|
| Promoter personalized code + attribution-on-signup | Referral spine — `getOrCreateReferralCode`, `getReferrerByCode`, `attributeReferral`, admin settings | `lib/referrals.ts`, `marketplace_referrals` (Supabase) |
| Seller discount through the code | Platform-coupon mint + checkout validation | `mintPlatformCoupon` (`lib/referrals.ts`), `app/admin/coupons/*`, `app/api/checkout/validate-coupon` |
| Custom-domain paid SKU ($499 MXN/yr) + entitlement + campaign coupon | The entire custom-domain-paywall epic | `lib/domain-*.ts`, `lib/domain-entitlement*.ts`, `lib/domain-pricing.ts`, `app/api/sell/shop/domain/route.ts` |
| Recurring billing primitives | Platform-side subscription module + Stripe helpers | `apps/backend/src/modules/subscriptions/` (models/service/migrations), `lib/stripe-subscriptions.ts`, `lib/domain-subscription-checkout.ts` |
| **One-time** checkout pattern (vs recurring) | Generic one-time Stripe checkout + the **manual/cash "payment-reported"** path | `app/api/stripe/checkout/*`, `app/api/print/submissions/[id]/checkout/route.ts`, **`.../payment-reported/route.ts`** |
| Printed ad sale + billing through platform shop | Printed-Edition Builder + `miyagiprints` shop | `06-print-edition/*`, `app/api/print/*`, `PrintAdBlock.tsx` |
| WhatsApp claim handoff (set up → send link → claim transfers) | Gem-Claim Loop | `03-selling-and-shops/gem-claim-loop`, `POST /api/claim/complete`, nullable `seller.clerk_user_id` |
| Promoter resources mini-site / sell sheet | Seller-acquisition landing infra | `08-growth-and-promotions/seller-acquisition-landing-*`, `app/(shell)/vende/**`, `locales/es.json` |
| Agent surface for the SKUs (rule #3) | UCP/MCP checkout + manifest | `app/api/ucp/*` |
| Kill-switch for staged rollout | Flagsmith, fail-open | `lib/flags.ts` (add `promoter.enabled`) |

**Medusa-first note (AGENTS rule #1):** commission and one-time billing are commerce concerns → backend.
The one-time cadence extends the **existing subscription/checkout machinery** (don't build a parallel
payment path). The commission ledger records against orders/SKUs; **settlement is offline (cash/transfer)
in v1**, so there is **no in-app money mutation to the promoter** — keeping the ledger low-risk while the
*sale* checkout (where money moves) is the high-risk surface. Promoter/commission attribution data that
Medusa has no concept of lives in **Supabase** (rule #2), keyed to the Medusa order/seller.

## What the promoter sells — glossary (also the sell-sheet content for US-12)
- **Printed ad** — a paid placement in the physical Miyagi magazine (the "Maqueta"/Printed-Edition). The
  merchant's product/shop becomes a retro classified block with an auto-generated **QR → their shop**.
  Billed through the platform-owned `miyagiprints` shop. Naturally a **one-time** buy per issue.
- **Custom domain (1 yr)** — the merchant connects their **own** domain (`theirshop.mx`) — full white-
  label, their brand, direct traffic. Today **$499 MXN/yr**. The premium addressing tier.
- **Subdomain (1 yr)** — `theirshop.miyagisanchez.com` — feels like an independent business **without
  buying a domain**. Free today; this program turns it into the **competitively-priced entry SKU**
  (cheaper than the custom domain — set in the fast-follow epic). The promoter's affordable anchor.
- **(Add-on, pending spike) Mercado Libre sync** — sync the merchant's inventory with their existing ML
  presence so they don't double-key listings. Strong pitch since many MX merchants are already on ML.

---

## v1 scope — IN
1. Promoter identity + personalized enroll code/link; enrollments + sales attribute to the promoter.
2. Promoter code unlocks a **seller discount** on the paid SKUs at checkout.
3. **One-time payment cadence** ("pay a year up front, no recurring mandate") for the custom domain +
   printed ad, alongside today's recurring option — the cash-sale enabler.
4. **Commission ledger**: per-SKU % (admin-configurable), accrues on a **paid + attributed** sale,
   **first-payment/first-year only**; promoter dashboard (earned / pending / paid); admin marks paid
   (offline settlement).
5. **Cash-collection close**: "paid-by-promoter" checkout (promoter pays with own card after collecting
   cash) — sale attributed to the code + flagged paid-by-promoter; reuses the print-ad manual
   `payment-reported` pattern.
6. **WhatsApp claim handoff**: promoter sets the shop up as unclaimed, sends a claim link, seller claims
   (gem-claim-loop reuse).
7. **Promoter resources mini-site + sell-sheet** (the glossary above, pricing, the discount pitch) + the
   per-SKU UCP/MCP cadence exposure (rule #3) + es-MX copy (rule #5).

## v1 scope — OUT (explicitly, to prevent creep)
- **Subdomain pricing/gating** → fast-follow epic `subdomain-pricing` (depends on the cadence here).
- **Monthly + recurring-with-discount cadence** → fast-follow (one-time is the only new cadence in core).
- **ML sync** → fast-follow **SPIKE** `ml-sync-port` first (estimate before build).
- **Lifetime / multi-year commission** — first-payment only in v1.
- **In-app payout to promoters** (Stripe Connect transfers, tax/RFC handling) — settlement is offline v1.
- **Promoter self-serve signup / KYC** — promoters are admin-provisioned in v1.
- **Multi-promoter splits, territories, leaderboards, anti-fraud scoring** — later.

## Commission economics — worked model (for validation, not yet sign-off)
Per-SKU %, first payment only. Illustrative (Daniel to set the real %s in admin):

| SKU | Example price | Example commission % | Promoter earns (one-time) |
|---|---|---|---|
| Subdomain (1 yr, entry) | TBD (cheaper than $499) | e.g. 20% | TBD |
| Custom domain (1 yr) | $499 MXN | e.g. 15% | ~$75 MXN |
| Printed ad (per issue) | TBD per block size | e.g. 15% | TBD |
| ML sync add-on | TBD (pending spike) | TBD | TBD |

**Open economic risk to resolve before Sprint 3:** the platform margin on each SKU after commission +
Stripe fees (~3.6% + $3 MXN in MX) — especially the discounted, cheaper subdomain. The one-time cash
path avoids recurring card fees but still incurs the promoter's card fee when they pay online.

---

## Slices — skateboard → car (each story independently shippable + testable)

### Sprint 1 — Promoter spine: code + discount + attribution *(thin end-to-end)*
- **US-1** *As a promoter, I want a unique code/link so every shop I enroll attributes to me.* Reuse the
  referral-code mint in a promoter namespace. **Risk: LOW.** QA: api spec on mint + lookup.
- **US-2** *As an enrolling seller, I want the promoter's code to apply a discount on the paid SKU at
  checkout.* Reuse platform-coupon validation, scoped to promoter codes. **Risk: MED** (touches checkout
  discount). QA: api spec `validate-coupon` w/ promoter code; browser smoke (no money) to Daniel.
- **US-3** *As admin, I want each enrollment + sale recorded against the promoter (who, which shop, which
  SKU).* Supabase attribution table keyed to Medusa order/seller. **Risk: LOW.** QA: api spec.
- **Sprint-1 ships:** a promoter code enrolls a seller and applies a discount — a working thin loop.

### Sprint 2 — One-time payment cadence *(the core money change)*
- **US-4** *As a cash-paying merchant, I want to pay a year up front with no recurring mandate.* One-time
  cadence for the custom domain alongside recurring; entitlement granted for 12 months, **graceful lapse
  at year-end without auto-charge**. **Risk: HIGH** (payments). QA: api spec on cadence selection; **money-
  path smoke owed to Daniel**.
- **US-5** *As a merchant, I can pay one-time for the printed ad through the same cadence UX.* Align print-
  ad checkout. **Risk: HIGH.** QA: api spec; money-path smoke to Daniel.
- **US-6** *As an agent, I can see + select the one-time cadence over UCP/MCP* (rule #3). **Risk: MED.** QA:
  api spec on `/api/ucp/checkout-session`.

### Sprint 3 — Commission ledger *(% per item, first-payment only)*
- **US-7** *As admin, I set a commission % per SKU.* Config surface. **Risk: LOW.** QA: api spec.
- **US-8** *As a promoter, I see commission earned/pending on my paid, attributed sales* (first payment
  only). Accrual on order-paid + attributed; promoter dashboard. **Risk: MED** (ledger; no money mutation).
  QA: api spec on accrual rule (incl. recurring→first-payment-only edge).
- **US-9** *As admin, I mark commissions paid (offline settlement).* Settlement view. **Risk: LOW.** QA:
  api spec.

### Sprint 4 — In-person close: cash collection + claim handoff + resources
- **US-10** *As a promoter, I check out for the seller with my own card after taking cash, and the sale is
  attributed to me + flagged paid-by-promoter.* Reuse print-ad `payment-reported` manual pattern for a
  cash-reported variant. **Risk: HIGH** (money + attribution). QA: api spec; **money-path smoke to Daniel**.
- **US-11** *As a promoter, I set the shop up as unclaimed and hand off a WhatsApp claim link the seller
  taps to claim.* Reuse gem-claim-loop. **Risk: MED** (claim path). QA: api spec; claim browser smoke to
  Daniel.
- **US-12** *As a promoter, I have a resources mini-site + sell-sheet (glossary, pricing, the discount
  pitch) to use in shops.* Content on seller-acquisition infra; es-MX (rule #5). **Risk: LOW.** QA: build +
  visual check.

**Deploy order:** S1 frontend-first behind `promoter.enabled` (fail-open off) so attribution + discount
land before any charge. **S2 backend-first** (cadence on the Medusa subscription/checkout machinery +
migration before the merge that needs it). S3 additive. S4 reuses S2's money path. **HIGH stories →
Daniel merges.** Each frontend PR gets a Vercel preview.

## Fast-follow epics (separate scope docs — NOT scoped here)
- **`subdomain-pricing`** — subdomain as a paid SKU **cheaper than the custom domain**, monthly + yearly.
  Clones `custom-domain-paywall` onto `lib/subdomain.ts` + `domain-pricing.ts`; depends on Sprint 2 cadence.
- **`ml-sync-port`** — **SPIKE first**: estimate porting despachobonsai's ML integration
  (`lib/mercadolibre.ts` + 4 routes + webhook + 2 Supabase migrations) into Medusa, and resolve the gap
  that the existing code does **publish + order-pull, not bidirectional stock sync** — which your "sync
  your inventory" pitch implies. Decision + estimate → then a feature epic + pricing.
- **`billing-cadence-monthly-recurring`** — monthly + recurring-with-discount on top of the one-time
  foundation from Sprint 2.

## Open risks / to validate
- **Margin after commission + Stripe/MercadoPago fees**, especially on the discounted subdomain (resolve
  before S3 sets the %s).
- **One-time entitlement lapse** must not silently auto-charge (reuse S2 lapse logic from custom-domain).
- **Cash-collection compliance**: promoter pays with own card on the merchant's behalf — confirm this is
  acceptable under Stripe/MercadoPago terms (it's the promoter's real purchase; the merchant is the
  beneficiary). Flag for the money-path review.
- **Attribution integrity**: prevent self-referral / promoter buying their own discounted SKUs for
  commission — needs a guard in S3 accrual.
- **ML "sync" expectation gap** — the ported code is publish/order-pull; true two-way stock sync is more
  work. The spike must price the real ask.
- **Bilingual scope** — promoter/seller portal is es-MX by default; only extend the bilingual allow-list
  deliberately (rule #5).

## Definition of Ready — checklist
- [x] "As a / I want / so that" per story; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (assembly + narrow genuine-new).
- [x] v1 in/out boundary written.
- [x] Reuse list produced (Medusa-first reframe done).
- [x] Each story risk-tiered; QA stage named; money-path smokes flagged to Daniel by name.
- [ ] **Daniel approves this scope doc** → then scaffold epic + sprint docs (commit path-scoped) and emit
      the per-sprint Claude Code kickoffs.
