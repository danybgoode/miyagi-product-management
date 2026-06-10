---
title: "Custom-domain paywall + campaign coupon"
slug: custom-domain-paywall
status: scaffolded
area: "07"
type: feature
priority: null
risk: high
epic: "07-agentic-and-federated-commerce/custom-domain-paywall"
build_order: null
updated: 2026-06-10
---

# Scope — Custom-Domain Paywall + Campaign Coupon

> **Status: ✅ SCOPE APPROVED (Daniel, 2026-06-10) — all open risks resolved (see §7). Scaffolded
> under `07-agentic-and-federated-commerce/custom-domain-paywall/`; kickoffs emitted. Next action:
> Claude Code build, Sprint 1 first (frontend gate behind fail-open flag).**
> Groomed 2026-06-10 from Daniel's brain-dump (priced tiers / acquisition giveaway) + campaign
> brief §10 + a fresh Medusa-first code read. Class: **Feature**. Stage-2.5 bucket: **genuinely new**
> (no platform→seller billing or per-seller entitlement exists today; everything billing-related is
> seller→buyer). One paid SKU results from the decisions below: **custom domain**.

## 1. Overview — the ask, reframed

Daniel wants to run a World-Cup acquisition giveaway (first N signups get a custom domain free for a
year, redeemed via coupon code). On grooming, the giveaway turned out to be the *easy* layer; the
real work is the prerequisite: **today every authenticated seller can connect a custom domain for
free** (`/api/sell/shop/domain` gates on auth only) — there is no paid SKU to give away.

**Daniel's reframe (locked):** build the paid capability as a permanent feature that stands on its
own — any seller without a coupon pays the standard price — and let the campaign ride on top as a
coupon that comps the first year. The feature is not campaign-scoped; the campaign is one coupon.

> **As a** seller, **I want** to connect my own custom domain by paying a clear annual price (or
> applying a coupon that comps it), **so that** I get a branded white-label storefront — and **as
> Daniel**, I get a real premium SKU on a 0%-commission marketplace, plus an acquisition lever.

## 2. Decisions resolved (gates, 2026-06-10)

| # | Decision | Resolution |
|---|---|---|
| D1 | Paid mechanism | **Real paid flow stands alone**; campaign = coupon comp on top. Not "charge later." |
| D2 | Which tiers are paid | **Custom domain = paid SKU. Subdomain stays FREE** (auto for every shop, on-brand, ~$0 marginal cost). The "free subdomain" coupon is therefore moot; only the custom-domain coupon matters. |
| D3 | Coupon scheme | **One code per tier** (e.g. `MIYAGICUSTOMDOMAIN`). Only the custom-domain code is live for now; the per-tier shape is preserved for future use. |
| D4 | Standard pricing (post-free-year anchor) | **$499 MXN/yr · shown with a monthly equivalent (~$42 MXN/mo)** — subdomain free. (Tiendanube gates custom domains behind its ~$99 MXN/mo ≈ $1,188/yr plan; Shopify Basic ≈ $288 MXN/mo. We undercut massively and keep 0% commission.) **Confirmed 2026-06-10.** |
| D5 | Renewal model | **Annual auto-renew** (yearly recurring subscription). Coupon = 100% off the first year, then converts to standard automatically. |
| D6 | Payment rails | **Stripe card only** for v1 (recurring/auto-renew). **MercadoPago recurring deferred** to a fast-follow (D6 confirmed 2026-06-10). SPEI/manual not offered for this SKU. |
| D7 | Free-year end, no payment method | **Lapse gracefully to free addressing** — custom domain disconnects / reverts to free subdomain + slug; seller prompted to add payment to keep it. No surprise charges, no broken promise. |

**Research citations (present-day, 2026-06):** Tiendanube MX — free tier includes a `*.mitiendanube.com`
subdomain; custom domain requires a paid plan from ~$99 MXN/mo; a domain registration itself costs
~$220–637 MXN/yr ([Tiendanube planes](https://www.tiendanube.com/planes-y-precios),
[¿cuánto cuesta un dominio](https://www.tiendanube.com/blog/cuanto-cuesta-un-dominio-web-en-mexico/)).
Shopify Basic ≈ $14 USD/mo (~$288 MXN), domain ≈ $14 USD/yr
([GemPages Shopify pricing by country](https://gempages.net/blogs/shopify/shopify-plan-pricing-by-country)).
**Implication:** custom domain is **bring-your-own** here (seller owns the domain; we only connect +
issue the cert), so our marginal cost ≈ $0 — pricing is positioning, not cost-recovery.

## 3. Medusa-first reframe — what already exists (reuse, don't rebuild)

Per AGENTS rule #1 (Medusa owns commerce) and LEARNINGS ("read the backend model + route first — it
often re-scopes the epic smaller"). Platform→seller billing maps cleanly onto Medusa's existing
**platform-side subscription** pattern: the platform owns a "Custom Domain" plan; the **seller is the
subscriber**.

| Need | Reuse (concrete) |
|---|---|
| Recurring plan + subscriber record | `apps/backend/src/modules/subscriptions/` — `SubscriptionPlan` + `Subscription` models + service. Already supports platform-side Stripe + MP fields (`stripe_price_id`, `mp_plan_id`, `mp_preapproval_id`) and statuses incl. `trialing`/`past_due`/`canceled`. Add a **platform-owned** plan (no `product_id`); subscriber = the seller. |
| Stripe recurring checkout | `apps/miyagisanchez/lib/stripe-subscriptions.ts` — `createSubscriptionPrice` + `createSubscriptionCheckout` (platform-side subscription mode) — used **as-is** (drop the 97% seller transfer, since the platform is the payee here). |
| Domain provisioning (unchanged) | `lib/vercel-domains.ts` (`addDomainToProject`/`getDomainStatus`/`removeDomainFromProject`) + `lib/domain-utils.ts` + the Cloudflare OAuth flow. **No provisioning change** — we only **gate** it. |
| The route to gate | `app/api/sell/shop/domain/route.ts` — POST (connect) + DELETE + the Cloudflare sub-routes. **Gate every mutation that connects a domain, not just POST** (LEARNINGS: "a server gate must cover every mutation"). |
| Coupon surface | `app/admin/coupons/*` + `app/api/checkout/validate-coupon` + `lib/referrals.ts` (platform-coupon minting pattern). Extend to a **domain-subscription coupon** (100%-off first year, capped at first N). Stripe-native coupon on the subscription is the cleanest mechanism. |
| Safe rollout | `lib/flags.ts` (Flagsmith, fail-open) — add a `domain.paywall_enabled` kill-switch. **Fail-open = ungated**, so if Flagsmith is down the paywall never traps an existing seller. |
| Pricing copy | `lib/about-content.ts` — the `pricing` section is a live **stub** that already names "el dominio propio y el subdominio." Fill with real numbers (es **and** en — it's on the bilingual allow-list per rule #5). |
| Agent access (rule #3) | UCP manifest + MCP server (`/api/ucp/*`). A seller's agent must be able to check entitlement, start the domain subscription, and apply a coupon over MCP. |

**Entitlement = derived, single source of truth.** "Is this seller's custom domain unlocked?" ≡ "does
this seller have an active subscription to the platform custom-domain plan (or a comp/coupon grant)?"
— queried from Medusa subscriptions via a next-free seam (`lib/domain-entitlement.ts`), **not** a
parallel Supabase flag. (The domain *connection* data stays in Supabase `marketplace_shops` as today;
only the **right** to connect is gated.)

## 4. In / out of scope (v1)

**In:**
- A platform-owned, annual, auto-renewing **Custom Domain** subscription (Stripe + MercadoPago).
- Per-seller **entitlement** gate on every custom-domain mutation; paywall/upsell UI when not entitled.
- **Grandfathering** of shops with a live custom domain at cutover (auto-granted entitlement — no takeaway).
- Graceful **lapse** on cancel/past-due/free-year-end-without-payment → revert to free subdomain + slug.
- **Campaign coupon** `MIYAGICUSTOMDOMAIN` — 100% off year 1, capped at first N, admin-mintable + trackable.
- **Pricing copy** filled on `/acerca` (es/en) + seller-portal checkout (es-MX).
- **Agent surface** (UCP/MCP) for the domain subscription + coupon.
- Flagsmith kill-switch for staged rollout.

**Out (v1):**
- Subdomain as a paid tier (decision D2 — stays free; the per-tier coupon shape is kept for later).
- **MercadoPago recurring** (deferred fast-follow, D6) and SPEI/manual payment for this SKU.
- Any change to the existing free addressing ladder (slug → subdomain → short link) other than copy.
- A general multi-SKU seller-billing/“plans” portal (this is one SKU; don't build a pricing-page engine).
- Proration / mid-term upgrades / multi-domain per shop.
- Year-2 dunning/retry sophistication beyond past_due → lapse.

## 5. Slices (skateboard → car) — 3 sprints

### Sprint 1 — Gate + entitlement (the skateboard) · **risk: HIGH**
The paywall works end-to-end with entitlement granted by hand/grandfather — before any checkout exists.
- **S1.1** — *As a seller without entitlement, I can no longer connect a custom domain; I see an upsell.*
  Add `lib/domain-entitlement.ts` (next-free seam) reading Medusa subscription state. Gate **every**
  domain mutation (POST + Cloudflare sub-routes + DELETE-guard) → 402 when not entitled. **Accept:** a
  test seller with no subscription gets the upsell + a 402 from each write; an entitled seller connects
  as before.
- **S1.2** — *Existing custom-domain shops keep their domain (grandfathered).* At cutover, any shop with
  a live `custom_domain` is auto-granted entitlement (comp grant). **Accept:** a shop that already has a
  connected domain is unaffected post-deploy.
- **S1.3** — *Daniel can roll the paywall on/off safely.* `domain.paywall_enabled` Flagsmith flag,
  fail-open (off ⇒ ungated). **Accept:** flipping the flag off restores today's free behavior.
- **QA:** api specs on the entitlement seam (entitled / not / grandfathered / flag-off) + each mutation
  returns 402 when ungated-and-unentitled. **Browser smoke (seller session) owed to Daniel.**

### Sprint 2 — Paid checkout + lapse (Stripe) · **risk: HIGH**
A non-entitled seller can actually buy, and lapse reverts cleanly.
- **S2.1** — *As a seller, I can buy the custom-domain subscription with a card (Stripe).* Reuse
  `stripe-subscriptions.ts`; seed the platform plan at $499 MXN/yr (D4). On `invoice.payment_succeeded`
  webhook → create/activate `Subscription` → entitlement flips on. **Accept:** test-card purchase →
  entitlement on → seller connects a domain.
- **S2.2** — *When a subscription cancels / goes past_due / a free year ends with no payment method, the
  domain lapses gracefully* to free subdomain + slug, with a prompt to re-add payment (D7). **Accept:**
  canceling in test → domain disconnects, shop still reachable at subdomain + slug, no error state.
- **S2.3** — *Pricing is published.* Fill `about-content.ts` `pricing` stub (es/en): subdomain free ·
  custom domain **$499 MXN/yr (~$42 MXN/mo)**. **Accept:** `/acerca` shows the real number + monthly
  equivalent in both locales; stub flag cleared.
- **QA:** api specs for Stripe checkout-session creation + webhook→entitlement + lapse→revert.
  **Money-path browser smoke owed to Daniel** (live card). *(MercadoPago recurring is a deferred fast-follow.)*

### Sprint 3 — Campaign coupon + agent surface · **risk: MED–HIGH**
The giveaway layer + agent accessibility.
- **S3.1** — *As a seller, applying `miyagisan` at checkout comps year 1*, then auto-renews at standard
  (D5). **Capped at first 100 redemptions**; admin can mint/track. **Accept:** code → $0 first-year
  subscription created + entitlement on; the 101st redemption is refused; admin sees redemption count.
- **S3.2** — *A coupon redeemer with no payment method at year-end lapses to free addressing* (reuses
  S2.3). **Accept:** simulated year-end with no card → graceful lapse, no charge.
- **S3.3** — *A seller's AI agent can check entitlement, start the subscription, and apply a coupon over
  MCP/UCP* (rule #3); manifest stays accurate. **Accept:** MCP tool returns entitlement + can initiate
  checkout + accept a coupon; api spec asserts the tool exists and is scoped to the seller's shop.
- **QA:** api specs for coupon validation + cap + 100%-off-first-interval + the agent tool. **Smoke owed
  to Daniel** (coupon redemption end-to-end).

## 6. Deploy order
Backend first each sprint where a Medusa plan/migration is involved (S2). Frontend gate (S1) can ship
behind the fail-open flag before checkout exists, so grandfathering + the flag de-risk the cutover.
HIGH stories → **Daniel merges**.

## 7. Open risks — RESOLVED (Daniel, 2026-06-10)
- ✅ **Final price** — **$499 MXN/yr, shown with a monthly equivalent (~$42 MXN/mo)**.
- ✅ **Existing domain holders** — **grandfather indefinitely** (no takeaway, no later conversion).
- ✅ **Coupon** — cap **100** redemptions; code string **`miyagisan`**.
- ✅ **Macro-section home** — **07 · Agentic & Federated Commerce** (coupon cross-ref'd from 08).
- ✅ **Payment rail** — **Stripe only** for v1; **MercadoPago recurring deferred** to a fast-follow.

## 8. Definition of Ready check
- ✅ As-a/I-want/so-that + testable acceptance per story · ✅ Stage-2.5 bucket named (genuinely new) ·
  ✅ in/out boundary written · ✅ research cited · ✅ reuse list (Medusa-first) produced · ✅ each story
  risk-tiered + QA named + smoke owner (Daniel) identified · ⏳ **Daniel's scope approval** (this gate).
