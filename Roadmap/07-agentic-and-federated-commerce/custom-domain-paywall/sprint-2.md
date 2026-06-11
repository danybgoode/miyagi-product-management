# Custom-domain paywall + campaign coupon — Sprint 2: Paid checkout + lapse (Stripe)

**Status:** ✅ SHIPPED 2026-06-11 — FE in [PR #79](https://github.com/danybgoode/miyagisanchezcommerce/pull/79) (`f0b524a`); BE [PR #20](https://github.com/danybgoode/medusa-bonsai-backend/pull/20) squash-merged (`0f68fbe` → Cloud Run `medusa-web-00099-vv7`). **Cutover ran:** `seed-custom-domain-plan.mjs` against prod (live Stripe) created product `prod_UgMibWnIXFSHwE` + annual price `price_1TgzzPL2vn3I7zOLn2SvBbIx` ($499 MXN/yr) → Medusa plan `subplan_01KTTE4MXNSSC9THBNZ1R079FY`; then `domain.paywall_enabled` flipped ON. The paid path is LIVE. Fresh-agent review: APPROVE-WITH-NITS (carryovers recorded in sprint-3).

| Story | Status | Commit |
|---|---|---|
| 2.1 — Buy the custom-domain subscription (Stripe) | ✅ built | BE `97614d5` · FE `d1ff961` |
| 2.2 — Graceful lapse → revert to free addressing | ✅ built | BE `a4c7d9c` · FE `1160982` |
| 2.3 — Publish pricing ($499/yr + monthly equivalent) | ✅ built | `12809e1` |
| api spec + Stripe plan seed script | ✅ built | `14eeb90` |

> Goal: a non-entitled seller can actually **buy** the custom-domain subscription (Stripe, annual
> auto-renew at $499 MXN/yr), entitlement flips on via webhook, and lapse reverts cleanly to free
> addressing. Backend-first. MercadoPago recurring is a deferred fast-follow.

## What shipped (implementation notes)
- **Entitlement source of truth = Medusa subscriptions module** (AGENTS rule #1). Two internal
  routes (backend, `x-internal-secret`): `POST /internal/setup-custom-domain-plan` upserts the ONE
  platform-owned `SubscriptionPlan` (`seller_id:'platform'`, $499 MXN/yr, `metadata.kind=custom_domain_plan`;
  **no migration** — schema exists); `GET|PATCH /internal/custom-domain-subscription` reads `{active}`
  (`active`/`trialing`/`past_due` = live — `past_due` is a grace window) + the plan's Stripe price, and
  flips status by Stripe id on lapse.
- **Frontend seam** `lib/domain-subscription.ts` (server-only, fails **closed**) bridges to those
  routes; `resolveDomainEntitlement(metadata, { sellerClerkId })` resolves the live subscription only
  when the paywall is on + no grant (saves a round-trip). All 5 S1 call sites pass the seller's clerk id.
- **Buy:** `POST /api/sell/shop/domain/subscribe` builds a platform Stripe subscription checkout
  (reuses `createSubscriptionCheckout`, **no 97% transfer** — platform is payee), `metadata.kind=custom_domain`.
- **Webhook:** the `kind=custom_domain` subscription `checkout.session.completed` activates a Medusa
  `Subscription` (entitlement on); `customer.subscription.deleted` flips it `canceled` **and releases the
  domain** (`removeDomainFromProject` + null `custom_domain` + `metadata.custom_domain_lapsed`,
  best-effort); `invoice.payment_failed` → `past_due` (stays live, grace); renewal → `active`.
- **Canal upsell** shows the price + a real **"Activar dominio propio"** button (was a mailto), and a
  "reactivar" prompt when lapsed. **`/acerca` pricing** stub filled (es+en, $499/yr ~$42/mo), `stub` cleared.
- **Shared price** in `lib/domain-pricing.ts` so Canal + `/acerca` can't drift.

## Cutover run order (Daniel — HIGH risk, do in this order)
1. **Merge the backend PR first** (Cloud Build us-east4 → Cloud Run, ~12 min; ships the 2 internal routes).
   The frontend degrades gracefully meanwhile (`hasActiveSubscription` → false ⇒ paywall just stays gated).
2. **Merge the frontend PR #79** (S1 + S2 together).
3. **Run the grandfather backfill** (S1 cutover) if not already: `node --env-file=.env.local
   scripts/backfill-domain-grandfather.mjs`.
4. **Seed the plan:** `node --env-file=.env.local scripts/seed-custom-domain-plan.mjs` — creates the
   platform Stripe Product + annual $499 Price and upserts the Medusa plan. Idempotent.
5. **Register the Stripe webhook** events if not already subscribed: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`,
   `invoice.payment_failed` (the handler already exists; these are the events it now branches on).
6. **Flip `domain.paywall_enabled` ON** in Flagsmith.

## Stories

### Story 2.1 — Buy the custom-domain subscription with a card (Stripe)
**As a** seller, **I want** to pay $499 MXN/yr by card to unlock my own domain, **so that** I can connect it.
Seed a **platform-owned** `SubscriptionPlan` (custom-domain SKU, $499 MXN/yr, annual interval) in the
Medusa subscriptions module. Reuse `lib/stripe-subscriptions.ts` (`createSubscriptionPrice` +
`createSubscriptionCheckout`, subscription mode) — **drop the 97% seller transfer** (the platform is the
payee). On the `invoice.payment_succeeded` / `checkout.session.completed` webhook, create/activate a
`Subscription` row (subscriber = seller) → entitlement (Sprint 1 seam) flips **on**.
**Acceptance:** a Stripe **test-card** purchase creates an active subscription, entitlement turns on, and
the seller can then connect a custom domain (no 402).
**Risk:** high

### Story 2.2 — Graceful lapse → revert to free addressing
**As a** seller whose subscription ends (cancel / past_due / free-year-end with no payment method), **I
want** my shop to keep working on its free subdomain + slug, **so that** nothing breaks and there's no
surprise charge.
On `customer.subscription.deleted` (definitive cancel / free-year-end with no payment method),
entitlement flips **off** → the custom domain disconnects (released from Vercel) and the shop reverts to
free subdomain + slug, with a prompt to re-activate. **`invoice.payment_failed` is a GRACE state**
(`past_due` stays entitled — the domain stays live while Stripe retries), so a transient card failure
never darkens the seller's site; only a true cancel disconnects.
**Acceptance:** canceling the subscription in test → the custom domain disconnects, the shop is still
reachable at `shop.miyagisanchez.com` + `/s/[slug]`, no error state, and a "reactivar" prompt shows.
**Risk:** high

### Story 2.3 — Publish pricing ($499/yr + monthly equivalent)
**As a** prospective seller, **I want** to see what the domain costs, **so that** I can decide.
Fill the `pricing` stub in `lib/about-content.ts` (es **and** en — bilingual allow-list): subdomain
**free** · custom domain **$499 MXN/año (~$42 MXN/mes)**. Clear the `stub: true` flag for that section.
Surface the same number on the seller-portal paywall/upsell (es-MX).
**Acceptance:** `/acerca` shows the real annual price + monthly equivalent in both locales; the pricing
section no longer renders "próximamente"; the paywall upsell shows the price.
**Risk:** low

## Sprint QA
- **api spec(s) — DONE (`14eeb90`):** `e2e/custom-domain-paywall.spec.ts` — subscribe route rejects
  anonymous (401); pure deriver proves paid+active ⇒ entitled, lapsed (no active sub, flag on) ⇒ not
  entitled, grandfather survives a lapse. `e2e/about-content.spec.ts` — pricing is now grounded (not a
  stub) and both locales carry "$499" + "$42" with no "próximamente/coming soon". (The live 402/webhook
  flip can't run in CI — no `FLAGSMITH_ENVIRONMENT_KEY`, no Stripe events, no Clerk seller session.)
- **browser smoke owed:** **yes, to Daniel — money path** (steps below). A live Stripe card purchase →
  entitlement on → connect a domain; then cancel → confirm graceful lapse. Live money + a real Stripe
  webhook + Vercel domain release — **owed to Daniel by name**; an automated browser smoke can't cover it.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` — **green** (run by the
  builder; CI re-runs `api` vs the branch preview).

## Sprint 2 — Smoke walkthrough (do these in order) — **OWED TO DANIEL (money path)**
Env: production · https://miyagisanchez.com (after the full cutover run order above — backend deployed,
plan seeded, webhook events registered, `domain.paywall_enabled` **ON**). Use a disposable seller shop +
a test domain; Stripe in **test mode** for the card.

1. As a **non-entitled** seller (no grant, no subscription, flag ON), open
   https://miyagisanchez.com/shop/manage/settings/canal.
   → The connect steps are replaced by the upsell card showing **"$499 MXN/año (~$42/mes)"** and an
     **"Activar dominio propio"** button. Your **free URL** + **subdomain** blocks above stay visible.
2. Click **"Activar dominio propio"**.
   → You're redirected to a Stripe Checkout for **$499 MXN/year** (annual, subscription).
3. **(money path)** Pay with the Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC).
   → You're returned to `…/settings/canal?domain=activated`; within a few seconds (webhook) the upsell is
     replaced by the **STEP 1–3 connect form** (entitlement on).
4. Connect a real test domain (enter it → follow the DNS steps) and confirm it goes live white-label.
   → The shop renders on the custom domain (reuses the existing connect flow, unchanged).
5. **(money path)** In the Stripe dashboard (test mode), **cancel** that subscription (immediately, to
   fire `customer.subscription.deleted`).
   → The custom domain disconnects (released from Vercel); reloading `…/settings/canal` shows the upsell
     again with a **"reactivar"** prompt. The shop is **still reachable** at
     `https://<shop>.miyagisanchez.com` and `https://miyagisanchez.com/s/<slug>` — no error state.
6. **(grace check, optional)** With an active sub, simulate a failed renewal in Stripe (or trust the
   handler): a `past_due` does **not** disconnect — the domain stays live during the retry window.
7. Open https://miyagisanchez.com/acerca, then https://miyagisanchez.com/acerca?lang=en.
   → Pricing shows "Dominio propio: $499 MXN/año (~$42/mes)" (es) / "Custom domain: $499 MXN/year
     (~$42/mo)" (en); no "próximamente / coming soon".

If any step fails, note the step number + what you saw — that's the bug report.
