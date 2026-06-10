# Custom-domain paywall + campaign coupon — Sprint 3: Campaign coupon + agent surface

**Status:** ⬜ not started

> Goal: the World-Cup giveaway layer — coupon `miyagisan` comps the first year (capped at 100) and
> auto-renews at standard after — plus full agent (UCP/MCP) access to the domain subscription. Additive
> on top of Sprints 1–2.

## Stories

### Story 3.1 — Coupon `miyagisan` comps year 1 (cap 100), then standard
**As a** seller, **I want** to apply `miyagisan` at domain checkout, **so that** my first year is free —
then it auto-renews at $499/yr (D5).
Implement the campaign coupon as a Stripe coupon/promotion on the subscription (**100% off the first
interval**, then standard). Enforce a **redemption cap of 100** (the 101st is refused). Admins can mint
the code and see a live redemption count (extend `app/admin/coupons/*` + the platform-coupon pattern).
**Acceptance:** applying `miyagisan` creates a **$0 first-year** active subscription + entitlement on;
the 101st redemption is refused with a clear message; admin sees the redemption count (n/100).
**Risk:** high

### Story 3.2 — Coupon redeemer with no payment method lapses gracefully
**As a** coupon redeemer who never added a card, **I want** my domain to lapse to free addressing at
year-end (not a surprise charge or a broken shop), **so that** the free year was a real gift (D7).
Reuse Sprint 2.2's lapse path for the end-of-comp case where no payment method is on file.
**Acceptance:** simulating the free-year end with no card on file → graceful lapse to subdomain + slug,
no charge attempted, re-add-payment prompt shown.
**Risk:** high

### Story 3.3 — Agent (UCP/MCP) access to the domain subscription + coupon
**As a** seller's AI agent, **I want** to check domain entitlement, start the subscription, and apply a
coupon over MCP, **so that** the premium SKU is agent-native (AGENTS rule #3).
Expose entitlement status + a checkout/coupon action via the MCP server (`/api/ucp/mcp`), scoped to the
agent's shop token; keep the UCP manifest accurate.
**Acceptance:** an MCP call returns the shop's entitlement; an agent can initiate the domain checkout and
apply `miyagisan`; the action is scoped to that shop only; the manifest lists the new capability.
**Risk:** high

## Sprint QA
- **api spec(s):** Story 3.1/3.2 → extend `e2e/custom-domain-paywall.spec.ts`: coupon validation, 100% off first interval, the **cap-of-100** boundary (100 ok, 101 refused), and the no-card year-end lapse. Story 3.3 → assert the MCP `about/manifest` lists the capability and the entitlement/checkout tool exists and is shop-scoped.
- **browser smoke owed:** **yes, to Daniel** — redeem `miyagisan` end-to-end (coupon → $0 first-year subscription → connect domain), and confirm the admin redemption counter moves. (Money-adjacent — owed to Daniel.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the Vercel preview URL while testing pre-merge)

1. As a non-entitled seller, start the domain checkout and enter coupon **`miyagisan`**.
   → The price shows $0 for year 1 (then $499/yr after); checkout completes without payment.
2. Back in https://miyagisanchez.com/shop/manage/settings, connect a domain.
   → The connect form is unlocked (entitlement on via the comped subscription).
3. Open https://miyagisanchez.com/admin/coupons (admin) and find `miyagisan`.
   → The redemption counter increased by 1 (e.g. shows n/100).
4. **(cap)** Simulate / verify the 101st redemption (admin tooling or a seeded count).
   → The 101st application is refused with a clear "se agotó el cupón" message.
5. **(agent)** Point a seller agent at the MCP endpoint and ask it to check domain entitlement / start the subscription.
   → The agent returns the shop's entitlement and can initiate checkout, scoped to that shop only.

If any step fails, note the step number + what you saw — that's the bug report.
