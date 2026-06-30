---
title: "Subdomain pricing — turn the free subdomain into a competitively-priced paid SKU"
slug: subdomain-pricing
status: awaiting-approval
area: "07"
type: feature
risk: high
relates_to: "07-agentic-and-federated-commerce/custom-domain-paywall · 07-agentic-and-federated-commerce/subdomains · 08-growth-and-promotions/promoter-program"
depends_on: "promoter-program Sprint 2 (one-time yearly cadence seam)"
spawns: "billing-cadence-monthly-recurring (the monthly recurring cadence is built here, Sprint 3)"
updated: 2026-06-29
---

# Subdomain pricing — turn the free subdomain into a competitively-priced paid SKU

**Status: awaiting Daniel approval — no code yet.** Fast-follow to the Promoter Program (the subdomain is
the promoter's competitive entry anchor). Class: **Feature**. Risk **HIGH** — the gate lives in
`middleware.ts` (runs on every request) and flips a **live, universal** surface (every shop has a free
subdomain today). It is otherwise a faithful **clone of `custom-domain-paywall`** onto the subdomain.

## Mirror-back
> You want to turn `slug.miyagisanchez.com` — free and automatic for every shop today — into a **paid SKU
> cheaper than the custom domain** (**$199/yr or $25/mo**), so promoters have an affordable anchor to sell.
> A **new** shop that hasn't paid has its subdomain **301-redirect to the free `/s/slug`**; **existing**
> shops are **grandfathered free forever**. **Yearly ships first**; **monthly** (recurring) follows the
> next sprint. Right?

## Decisions (Daniel, 2026-06-29)
1. **Free fallback:** an unpaid (new) subdomain **301-redirects to the free `/s/slug`** marketplace path.
   The white-label `slug.miyagisanchez.com` is what you buy.
2. **Grandfather:** every shop existing at cutover keeps its white-label subdomain **free forever** (same
   humane cutover as the custom-domain paywall — no takeaway).
3. **Price:** **$199 MXN/yr** (≈$17/mo billed yearly) **or $25 MXN/mo** — clearly below the $499 custom
   domain.
4. **Cadence:** **yearly first** (reuses the existing recurring + the promoter one-time yearly cadence);
   **monthly recurring** is the following sprint (this epic builds the monthly cadence).

## Stage 2.5 — orientation: this is a clone, not a new system
The custom-domain paywall already shipped the *entire* pattern — entitlement seam, grandfather backfill,
fail-open flag, Stripe plan, lapse logic, campaign coupon, `/acerca` pricing copy, UCP surface. This epic
**mirrors it onto the subdomain**. The only genuinely new pieces: (a) gating a **passive middleware**
surface (the custom domain gated an explicit opt-in mutation; the subdomain is served automatically), and
(b) a **monthly recurring** cadence (Sprint 3).

## What already exists (reuse, don't rebuild)
| Need | Reuse | Where |
|---|---|---|
| Subdomain → slug resolution (the surface to gate) | `shopSlugFromHost`, `isReservedSubdomain` | `lib/subdomain.ts`, `middleware.ts` subdomain branch |
| Entitlement seam (grandfather/comp/subscription, derived not flagged) | The whole pattern | `lib/domain-entitlement.ts` + `lib/domain-entitlement-server.ts` → clone to `lib/subdomain-entitlement*.ts` (or generalize) |
| Grandfather backfill at cutover | The custom-domain backfill script | `scripts/backfill-domain-grandfather.mjs` (mirror for subdomain) |
| Price single-source | `lib/domain-pricing.ts` | add `lib/subdomain-pricing.ts` (`SUBDOMAIN_PRICE_YEARLY_MXN=199`, `SUBDOMAIN_PRICE_MONTHLY_MXN=25`) |
| Stripe plan + checkout (recurring) + lapse | `lib/stripe-subscriptions.ts`, `lib/domain-subscription-checkout.ts` | add a subdomain plan; reuse lapse |
| One-time yearly cadence | **promoter-program Sprint 2** | `app/api/stripe/checkout/*` one-time path (dependency) |
| Fail-open kill-switch | `lib/flags.ts` | add `subdomain.paywall_enabled` (off ⇒ today's free-for-all) |
| Pricing copy (bilingual) | `lib/about-content.ts` pricing section (already names "el subdominio") | fill real numbers, es + en (rule #5) |
| Agent surface | UCP/MCP checkout + manifest | `app/api/ucp/*` |
| Promoter SKU wiring (code discount + commission %) | promoter-program | register subdomain as a promoter SKU |

**Medusa-first note (rule #1):** subdomain billing is a commerce concern → a platform-side subscription
**plan** (subscriber = seller), reusing the subscriptions module. Entitlement is **derived** ("grandfather
∨ comp ∨ active subdomain subscription"), not a new flag. The "currently serves white-label" decision in
middleware reads the derived entitlement. The wildcard `*.miyagisanchez.com` cert + routing already exist —
**no DNS/infra work** (unlike the custom domain).

## v1 scope — IN
1. Gate the middleware subdomain branch on a derived entitlement; non-entitled (new) shop → **301 to
   `/s/slug`**; entitled → white-label as today. Behind `subdomain.paywall_enabled` (fail-open off).
2. Grandfather every existing shop free at cutover (backfill).
3. Paid **yearly** checkout (one-time + recurring), entitlement grant, **graceful lapse → redirect to
   `/s/slug`** (no silent re-charge).
4. **Monthly** recurring cadence (Sprint 3).
5. Pricing copy on `/acerca` (es + en); subdomain registered as a promoter SKU (code discount + commission
   %); subdomain SKU + cadences agent-accessible over UCP/MCP.

## v1 scope — OUT
- Custom-domain changes (untouched; it stays $499/yr).
- ML add-on, print ad (separate).
- Self-serve subdomain *renaming* economics, vanity-subdomain premium tiers — later.
- In-app promoter payout — offline settlement (owned by promoter-program).
- A free→paid forced conversion for grandfathered shops — never.

## Slices — skateboard → car

### Sprint 1 — Gate + entitlement + grandfather (behind flag, no checkout yet)
- **US-1** *As a new shop without entitlement, my `slug.miyagisanchez.com` redirects to the free
  `/s/slug`; as Daniel, the subdomain is actually gated.* Add the subdomain entitlement seam + gate the
  `middleware.ts` subdomain branch (301 when flag on AND not entitled). **Risk: HIGH** (`middleware.ts`,
  every request). QA: api spec on the seam + redirect decision; **browser smoke to Daniel**.
- **US-2** *As an existing shop, my subdomain stays free forever.* Cutover grandfather backfill (idempotent
  grant on every current shop). **Risk: HIGH.** QA: api spec; backfill dry-run.
- **US-3** *As Daniel, I can flip the paywall safely.* `subdomain.paywall_enabled` (fail-open off ⇒
  ungated, today's behavior). **Risk: LOW.** QA: api spec (flag-off path ungated).

### Sprint 2 — Paid yearly checkout + lapse + pricing/SKU surface
- **US-4** *As a seller (or promoter on their behalf), I buy the subdomain for a year and it goes
  white-label; at year-end it lapses gracefully back to `/s/slug`.* Subdomain plan + yearly checkout
  (one-time via promoter S2 + recurring), entitlement grant, lapse. **Risk: HIGH** (payments). QA: api
  spec; **live money-path smoke to Daniel**.
- **US-5** *As anyone, the price shows on `/acerca` (es + en) and the subdomain is a sellable promoter
  SKU + agent-accessible.* `lib/subdomain-pricing.ts` + about-content + promoter-SKU registration + UCP.
  **Risk: MED.** QA: api spec (pricing single-source + UCP lists the SKU); bilingual check.

### Sprint 3 — Monthly recurring cadence
- **US-6** *As a seller, I can pay $25/mo instead of yearly.* Monthly recurring plan/price + checkout +
  lapse; yearly stays the discounted option. **Risk: HIGH** (payments — new recurring cadence). QA: api
  spec; **live money-path smoke to Daniel**. (This is the `billing-cadence-monthly-recurring` work,
  delivered here.)

## Deploy order
**S1 frontend-first** behind `subdomain.paywall_enabled` (off) — gate + grandfather land and are verified
before anyone is charged or any subdomain changes behavior. Run the grandfather backfill, *then* flip the
flag (custom-domain cutover runbook). **S2 backend-first** (subdomain plan + migration before the merge).
**S3** additive. **All HIGH stories → Daniel merges.** Announce the `middleware.ts` change (shared surface).

## Open risks / to validate
- **Margin** on $199/yr (and $25/mo) after promoter commission % + Stripe fees — the cheapest SKU is the
  thinnest. Resolve the % against this price before promoter Sprint 3 sets it.
- **`middleware.ts` blast radius** — the gate runs on every request; a bug 301s live subdomains. Keep the
  entitlement read cheap (it's already pure) and the flag fail-open.
- **SEO / link continuity** — the 301 to `/s/slug` must be a clean redirect (canonical already emits
  `/s/slug` for non-custom-domain shops, so this is consistent).
- **Cross-epic dependency** — S2's one-time yearly path needs promoter-program Sprint 2 merged (recurring
  yearly already exists, so S2 can ship recurring-only if the one-time seam isn't ready).
- **Grandfather completeness** — define "existing shop" precisely (any shop row at cutover) so no active
  subdomain breaks.

## Definition of Ready — checklist
- [x] "As a / I want / so that" per story; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (clone + two genuinely-new edges).
- [x] v1 in/out boundary written.
- [x] Reuse list produced (Medusa-first reframe done).
- [x] Each story risk-tiered; QA stage named; money-path smokes flagged to Daniel by name.
- [x] Cross-epic dependency on promoter-program Sprint 2 stated.
- [ ] **Daniel approves this scope doc** → scaffold epic + 3 sprint docs (commit path-scoped) + emit
      per-sprint Claude Code kickoffs.
