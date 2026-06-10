# Epic: Custom-domain paywall + campaign coupon

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high · **Scope seed:** [`00-ideas/seeds/custom-domain-paywall.md`](../../00-ideas/seeds/custom-domain-paywall.md)

## Why
Today any authenticated seller can connect a custom domain for free — there is no paid SKU on a
0%-commission marketplace. This epic turns the custom domain into the platform's first real **premium
SKU**: a seller pays a clear annual price ($499 MXN/yr, ~$42/mo) to connect their own domain, or
applies the campaign coupon `miyagisan` to get the first year free. The feature stands on its own
(non-coupon sellers pay); the World-Cup acquisition giveaway simply rides on top as a coupon. Subdomain
stays free for everyone (on-brand, ~$0 marginal cost). Existing custom-domain holders are grandfathered
indefinitely — no takeaway.

## Medusa-first note
Yes — Medusa already models recurring billing. Platform→seller billing maps onto the **platform-side
subscription** pattern: the platform owns a "Custom Domain" subscription **plan**, and the **seller is
the subscriber**. We reuse `apps/backend/src/modules/subscriptions/` (`SubscriptionPlan` + `Subscription`
models/service — already carry Stripe fields and `trialing`/`past_due`/`canceled` statuses) and the
existing platform-side Stripe helper, rather than building billing from scratch (AGENTS rule #1).
**Entitlement is derived** ("active subscription or comp grant to the custom-domain plan?"), not a new
parallel flag — domain *connection* data stays in Supabase `marketplace_shops`; only the **right** to
connect is gated.

## What already exists (reuse, don't rebuild)
- `apps/backend/src/modules/subscriptions/` — `SubscriptionPlan` + `Subscription` models + service (platform-side, Stripe + status lifecycle already present). Add a platform-owned plan; subscriber = seller.
- `apps/miyagisanchez/lib/stripe-subscriptions.ts` — `createSubscriptionPrice` + `createSubscriptionCheckout` (platform-side subscription mode), used as-is minus the 97% seller transfer (platform is the payee here).
- `apps/miyagisanchez/app/api/sell/shop/domain/route.ts` (+ `cloudflare/*` sub-routes) — the surface to gate. Gate **every** domain mutation, not just POST (LEARNINGS: a server gate must cover every mutation).
- `apps/miyagisanchez/lib/vercel-domains.ts` + `lib/domain-utils.ts` — provisioning unchanged; we only gate it.
- `app/admin/coupons/*` + `app/api/checkout/validate-coupon` + `lib/referrals.ts` (platform-coupon minting pattern) — extend for the domain-subscription coupon (100% off year 1, capped at 100).
- `apps/miyagisanchez/lib/flags.ts` — Flagsmith, fail-open. Add `domain.paywall_enabled` kill-switch (off ⇒ ungated) for staged rollout.
- `apps/miyagisanchez/lib/about-content.ts` — the `pricing` section is a live stub already naming "el dominio propio y el subdominio"; fill with real numbers (es + en — bilingual allow-list, rule #5).
- UCP manifest + MCP server (`/api/ucp/*`) — the domain subscription + coupon must be agent-accessible (rule #3).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Gate + entitlement (grandfather + flag) | high |
| 2 | Paid checkout + lapse (Stripe) | high |
| 3 | Campaign coupon + agent surface | high |

## Deploy order
**Sprint 1 frontend-first**, shipped behind the fail-open `domain.paywall_enabled` flag (off by default)
so the gate + grandfathering can land and be verified before any seller is charged. **Sprint 2 backend-first**
(Medusa platform plan + migration provisioned before the merge that needs it; Stripe webhook). **Sprint 3**
additive on top. HIGH stories → **Daniel merges**. Each frontend PR gets a Vercel preview.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated (note: subdomain stays free; custom domain now paid SKU)
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; seed frontmatter `status: shipped`
