---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. S1+S2 merged 2026-06-30; S3 (monthly cadence) open.
slug: subdomain-pricing
---

# Epic · Subdomain pricing — turn the free subdomain into a competitively-priced paid SKU

> Scoped 2026-06-29 from [`00-ideas/2. readyforscope/subdomain-pricing.md`](../../00-ideas/2.%20readyforscope/subdomain-pricing.md).
> **Status: IN-PROGRESS — S1 ✅ MERGED + cutover LIVE (flag ON, 179 grandfathered); S2 ✅ MERGED
> 2026-06-30 (be #47 · fe #146) — paid yearly checkout engine + agent surface; S3 (monthly cadence)
> open.** Risk **HIGH** (the gate is in `middleware.ts`, every request, on a live universal surface).
> Daniel merges HIGH stories. Behind `subdomain.paywall_enabled` (ON). **Faithful clone of
> `custom-domain-paywall`** onto the subdomain. **Owed to Daniel:** the prod plan seed
> (`scripts/seed-subdomain-plan.mjs`, money-path) + live money-path smoke + the Canal UI buy button
> (deliberate FE follow-up — buy is route/MCP-only today). See [sprint-2.md](sprint-2.md).

**Tagline:** *El subdominio deja de ser gratis-para-todos y se vuelve el SKU de entrada del promotor.*

## Why
`slug.miyagisanchez.com` is free and automatic for every shop today (the subdomain *is* the slug, served
by the wildcard). This epic turns it into a **paid SKU cheaper than the custom domain** ($199/yr or
$25/mo) — the promoter's affordable entry anchor. A **new** unpaid shop's subdomain **301-redirects to the
free `/s/slug`**; **existing** shops are **grandfathered free forever** (no takeaway). Yearly ships first;
monthly recurring follows.

## Context
| | |
|---|---|
| **Role** | Seller (buyer of the SKU), promoter (seller), admin (config + cutover) |
| **Macro-section** | 07 · Agentic & federated commerce |
| **Risk** | HIGH — `middleware.ts` gate on a live universal surface + payments |
| **Flag** | `subdomain.paywall_enabled` (fail-open: off ⇒ today's free-for-all) |
| **Price** | $199 MXN/yr (≈$17/mo billed yearly) · $25 MXN/mo |
| **Depends on** | promoter-program Sprint 2 (one-time yearly cadence seam) — S2 can ship recurring-only without it |
| **Delivers** | the `billing-cadence-monthly-recurring` fast-follow (Sprint 3) |

## Medusa-first note (AGENTS rule #1)
Subdomain billing → a platform-side subscription **plan** (subscriber = seller), reusing the subscriptions
module. Entitlement is **derived** ("grandfather ∨ comp ∨ active subdomain subscription"), not a new flag.
The middleware "serve white-label vs 301 to `/s/slug`" decision reads that derived entitlement. The
wildcard `*.miyagisanchez.com` cert + routing already exist → **no DNS/infra work** (unlike the custom
domain). SKU + cadences stay agent-accessible over UCP/MCP (rule #3); pricing copy is es + en (rule #5).

## What already exists (reuse, don't rebuild)
- **Subdomain resolution (the surface to gate)** — `shopSlugFromHost`/`isReservedSubdomain`
  (`lib/subdomain.ts`) + the `middleware.ts` subdomain branch.
- **Entitlement pattern** — `lib/domain-entitlement.ts` + `…-server.ts` (grandfather/comp/subscription,
  derived) → clone to `lib/subdomain-entitlement*.ts` (or generalize the seam).
- **Grandfather backfill** — `scripts/backfill-domain-grandfather.mjs` (mirror for subdomain).
- **Price single-source** — `lib/domain-pricing.ts` → add `lib/subdomain-pricing.ts`
  (`SUBDOMAIN_PRICE_YEARLY_MXN=199`, `SUBDOMAIN_PRICE_MONTHLY_MXN=25`).
- **Plan + checkout + lapse** — `lib/stripe-subscriptions.ts`, `lib/domain-subscription-checkout.ts`;
  one-time yearly via promoter-program Sprint 2's `app/api/stripe/checkout/*` path.
- **Kill-switch** — `lib/flags.ts` (`subdomain.paywall_enabled`, fail-open off).
- **Pricing copy** — `lib/about-content.ts` (already names "el subdominio").
- **Agent surface** — `app/api/ucp/*`. **Promoter SKU wiring** — promoter-program.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1 Gate the middleware subdomain branch on derived entitlement (301→/s/slug when unpaid) | high |
| 1 | US-2 Grandfather existing shops free at cutover (backfill) | high |
| 1 | US-3 Fail-open `subdomain.paywall_enabled` flag | low |
| 2 | US-4 Paid yearly checkout (one-time + recurring) + graceful lapse → /s/slug | high |
| 2 | US-5 Pricing copy (es/en) + promoter-SKU registration + UCP surface | med |
| 3 | US-6 Monthly recurring cadence ($25/mo) + lapse | high |

## Deploy order
**S1 frontend-first** behind the flag (off) — gate + grandfather verified before any charge or behavior
change. **Cutover runbook (mirror custom-domain):** merge inert → run grandfather backfill → *then* flip
`subdomain.paywall_enabled` ON. **S2 backend-first** (subdomain plan + migration before the merge). **S3**
additive. **HIGH stories → Daniel merges.** Announce the `middleware.ts` change (shared surface).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (money-path smokes owed to Daniel, declared per sprint).
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs).
- [ ] This README marked ✅; every sprint status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`) updated (subdomain now a paid SKU; grandfather note).
- [ ] Team memory + `MEMORY.md` updated.
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append).
- [ ] Feature branch deleted; scope-doc frontmatter `status: shipped`.

## Sprints
- [sprint-1.md](sprint-1.md) — ✅ MERGED (#145, cutover live) — Gate + entitlement + grandfather (behind flag).
- [sprint-2.md](sprint-2.md) — ✅ MERGED (be #47 · fe #146) — Paid yearly checkout + lapse + pricing/SKU/UCP surface. Owed: prod seed + Canal UI button + money smoke.
- [sprint-3.md](sprint-3.md) — 🏗️ BUILT (draft PRs be #48 · fe #147) — Monthly cadence ($25/mo) + monthly↔yearly switch. Owed: prod monthly seed + money smoke.
