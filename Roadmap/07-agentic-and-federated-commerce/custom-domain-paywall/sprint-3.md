# Custom-domain paywall + campaign coupon — Sprint 3: Campaign coupon + agent surface

**Status:** 🏗️ BUILT — [PR #82](https://github.com/danybgoode/miyagisanchezcommerce/pull/82) (draft, **HIGH
risk → Daniel merges**). Deterministic gate green locally (`tsc` ✅ · `next build` ✅ · Playwright `api`
pure cap-of-100 suite ✅). **Frontend-only — no backend/Cloud Run deploy.** Owed: the coupon-redemption
browser smoke (money path, **Daniel**) + minting the coupon post-merge.

| Story | Status | Commit |
|---|---|---|
| 3.1 — Coupon `miyagisan` comps year 1 (cap 100) + admin mint/track | ✅ built | `f1573da` |
| 3.2 — No-card year-end lapse (reuse S2.2 via `if_required`) | ✅ built | `f1573da` |
| 3.3 — Agent (UCP/MCP) entitlement + checkout/coupon tools | ✅ built | `7a8967a` |
| Carryover nit — webhook `tg.alert` on paid-but-ungated | ✅ built | `34795f7` |
| api spec (cap-of-100 boundary + MCP/manifest/admin) | ✅ built | `2e8d9f4` |

> Goal: the World-Cup giveaway layer — coupon `miyagisan` comps the first year (capped at 100) and
> auto-renews at standard after — plus full agent (UCP/MCP) access to the domain subscription. Additive
> on top of Sprints 1–2.

## What shipped (implementation notes)
- **Coupon = Stripe-native.** A Stripe **Coupon** (`percent_off:100, duration:once` ⇒ first year free then
  standard `$499/yr`; `max_redemptions:100`) + **Promotion Code `MIYAGISAN`** on the platform account.
  Stripe enforces the cap server-side — the 101st redemption is refused. Frontend-only (the webhook +
  Medusa subscription-activation routes from S2 already flip entitlement; a $0-first-invoice subscription
  still fires `checkout.session.completed` with `kind=custom_domain`).
- **Pure/server split** (mirrors the entitlement seam): `lib/domain-coupon.ts` (PURE — matching,
  `couponRedeemable`/`couponRefusalReason`, `formatRedemptionCount` `n/100`) is the unit-testable cap logic;
  `lib/domain-coupon-server.ts` (`'server-only'`, Stripe) does idempotent `ensureCampaignCoupon` /
  `getCampaignCouponStatus` / `resolveCampaignPromotionCode`.
- **Shared checkout builder** `lib/domain-subscription-checkout.ts` (`startCustomDomainCheckout`) is the ONE
  path for the plan-price lookup + already-active short-circuit + coupon resolution; used by the buy route
  AND the MCP tool so they can't drift. Applies the promo via `discounts:[{promotion_code}]` +
  `payment_method_collection:'if_required'` (S3.2 — $0 first invoice collects no card → existing S2.2 lapse
  handles year-end with no new code). `canonicalOrigin()` replaces the spoofable Host (S1/S2 review nit).
- **Admin** (secret-gated `/api/admin/domain-coupon`, GET status / POST mint) + a "Cupón de campaña" card on
  `/admin/coupons` with the live `n/100` counter + a mint button (runs with prod Stripe creds — the safe
  mint path). Canal upsell gains a coupon input.
- **Agent (UCP/MCP):** `get_domain_entitlement` + `start_domain_subscription` (shop-scoped seller tools,
  `Bearer ms_agent_…`) on `/api/ucp/mcp`; added to `MCP_SELLER_TOOLS` + a `seller_domain_subscription`
  manifest capability/endpoint so the manifest stays accurate.
- **Webhook nit:** `handleCustomDomainSubscriptionComplete` now checks the activation POST status and
  `tg.alert`s on failure (seller paid but not entitled; Stripe won't retry a 200).

## Cutover run order (Daniel — frontend-only, after merge)
1. **Merge PR #82** (HIGH — Vercel prod deploy; inert until the coupon is minted).
2. **Mint the coupon:** `POST https://miyagisanchez.com/api/admin/domain-coupon?secret=<ADMIN_SECRET>` →
   creates the Stripe Coupon + Promotion Code `MIYAGISAN` on **live** Stripe. Idempotent. Confirm with
   `GET …/api/admin/domain-coupon?secret=…` → `status.redeemed = 0`, `cap = 100`, `active = true`
   (or just load `/admin/coupons?secret=…` and read the `0/100` card).

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

## Carryover fast-follows (from the S1+S2 review — PR #79, APPROVE-WITH-NITS)
Non-blocking nits the reviewer raised on the merged S1/S2 code; fold into this sprint's PR (all small):
- **Webhook alert on paid-but-ungated.** `app/api/webhooks/stripe/route.ts` `handleCustomDomainSubscriptionComplete` fires the Medusa activation POST best-effort inside a `try/catch` that only `console.error`s. If it fails, the seller paid but isn't entitled and Stripe won't retry (handler returns 200). Add a `tg.alert(...)` on that failure so it's caught operationally. **(money-path safety — do this one.)**
- **Assert canonical origin in the buy route.** `app/api/sell/shop/domain/subscribe/route.ts` builds success/cancel URLs from `NEXT_PUBLIC_SITE_URL ?? https://${req.headers.get('host')}`. Paths are hardcoded (no open redirect), but a spoofed Host on a misconfigured env could send the seller to a wrong origin post-payment. Prefer a fixed canonical origin / assert `NEXT_PUBLIC_SITE_URL` is set. (Inert in prod where it's set.)
- **(already a 3.3 story)** UCP/MCP agent-reachability of the domain subscription was deliberately deferred to this sprint — see Story 3.3.

## Sprint QA
- **api spec(s):** Story 3.1/3.2 → extend `e2e/custom-domain-paywall.spec.ts`: coupon validation, 100% off first interval, the **cap-of-100** boundary (100 ok, 101 refused), and the no-card year-end lapse. Story 3.3 → assert the MCP `about/manifest` lists the capability and the entitlement/checkout tool exists and is shop-scoped.
- **browser smoke owed:** **yes, to Daniel** — redeem `miyagisan` end-to-end (coupon → $0 first-year subscription → connect domain), and confirm the admin redemption counter moves. (Money-adjacent — owed to Daniel.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order) — **OWED TO DANIEL (money path)**
Env: production · https://miyagisanchez.com (after merge + the coupon is minted — cutover step 2). Use a
disposable seller shop + Stripe in **test mode**. Steps 1–4 are the money path; an automated browser smoke
can't fully cover them. (Pre-merge: substitute the Vercel preview URL.)

0. **(admin, no auth-session needed)** Mint, then open
   https://miyagisanchez.com/admin/coupons?secret=<ADMIN_SECRET> and read the "Cupón de campaña — Dominio
   propio" card.
   → It shows **0/100** (or the current count), "activo". (If it says "Aún no se ha creado", press
     **Crear cupón** once.)
1. As a **non-entitled** seller (no grant, no subscription, flag ON), open
   https://miyagisanchez.com/shop/manage/settings/canal and type **`miyagisan`** in **"¿Tienes un cupón?"**,
   then click **Activar dominio propio**.
   → You're sent to Stripe Checkout showing **$0 due today** for year 1 (the annual plan still reads
     $499/yr for renewals). No card is required.
2. **(money path)** Complete the $0 checkout.
   → You return to `…/settings/canal?domain=activated`; within a few seconds (webhook) the upsell is
     replaced by the **STEP 1–3 connect form** (entitlement on via the comped subscription).
3. Connect a real test domain and confirm it goes live white-label.
   → The shop renders on the custom domain (reuses the existing connect flow, unchanged).
4. Reload https://miyagisanchez.com/admin/coupons?secret=<ADMIN_SECRET>.
   → The counter moved by **+1** (e.g. **1/100**).
5. **(cap)** Verify the 101st refusal without 100 real redemptions: either trust the
   `e2e/custom-domain-paywall.spec.ts` cap-of-100 boundary (99 ok / 100 refused / 101 refused), or in the
   Stripe dashboard set the coupon's redeemed count to its max and re-try `miyagisan` at step 1.
   → The coupon is refused with **"Se agotó el cupón 'miyagisan'…"** and **no checkout is created**.
6. **(no-card lapse, optional)** For the coupon redeemer from step 2 (no card on file), in Stripe cancel the
   subscription (fires `customer.subscription.deleted`).
   → The custom domain disconnects (released from Vercel); the shop stays reachable at
     `https://<shop>.miyagisanchez.com` + `/s/<slug>`; the Canal upsell shows the **reactivar** prompt. No
     surprise charge.
7. **(agent)** Point a seller agent at `https://miyagisanchez.com/api/ucp/mcp` with that shop's
   `Authorization: Bearer ms_agent_…` token and ask it to **check domain entitlement** and **start the
   domain subscription with coupon miyagisan**.
   → `get_domain_entitlement` returns the shop's entitlement + reason; `start_domain_subscription` returns a
     Stripe checkout URL, scoped to that shop only. A call without a token is refused (Unauthorized).

If any step fails, note the step number + what you saw — that's the bug report.
