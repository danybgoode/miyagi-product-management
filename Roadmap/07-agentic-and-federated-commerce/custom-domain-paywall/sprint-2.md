# Custom-domain paywall + campaign coupon — Sprint 2: Paid checkout + lapse (Stripe)

**Status:** ⬜ not started

> Goal: a non-entitled seller can actually **buy** the custom-domain subscription (Stripe, annual
> auto-renew at $499 MXN/yr), entitlement flips on via webhook, and lapse reverts cleanly to free
> addressing. Backend-first. MercadoPago recurring is a deferred fast-follow.

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
On `customer.subscription.deleted` / `invoice.payment_failed` (and the no-payment-method year-end case),
entitlement flips **off** → the custom domain disconnects (released from Vercel) and the shop reverts to
free subdomain + slug, with a prompt to re-add payment to restore it.
**Acceptance:** canceling the subscription in test → the custom domain disconnects, the shop is still
reachable at `shop.miyagisanchez.com` + `/s/[slug]`, no error state, and a "re-add payment" prompt shows.
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
- **api spec(s):** Story 2.1/2.2 → extend `e2e/custom-domain-paywall.spec.ts`: Stripe checkout-session creation for the platform plan; webhook handler flips entitlement on (paid) and off (cancel/past_due); lapse releases the domain + reverts addressing. Story 2.3 → assert `/acerca` (es + en) and the manifest carry the real price and the stub flag is cleared.
- **browser smoke owed:** **yes, to Daniel — money path.** A live Stripe card purchase → entitlement on → connect a domain; then cancel → confirm graceful lapse. (Live money + Vercel domain release — owed to Daniel by name.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the Vercel preview URL while testing pre-merge)

1. As a non-entitled seller, go to https://miyagisanchez.com/shop/manage/settings and click the domain upsell's "Activar dominio propio".
   → You reach a Stripe checkout for $499 MXN/yr (annual).
2. **(money path)** Pay with a Stripe test card `4242 4242 4242 4242`.
   → You're returned to settings; within ~a few seconds the connect form is unlocked (entitlement on).
3. Connect a real test domain and confirm it goes live white-label (reuses the existing domain flow).
   → The shop renders on the custom domain.
4. **(money path)** In Stripe (or the manage-subscription action), **cancel** the subscription.
   → The custom domain disconnects; the shop is still reachable at `https://<shop>.miyagisanchez.com` and `https://miyagisanchez.com/s/<slug>`, with a "re-add payment to restore your domain" prompt — no error.
5. Open https://miyagisanchez.com/acerca and switch es/en (`?lang=en`).
   → Pricing shows "Dominio propio: $499 MXN/año (~$42/mes)" / the en equivalent; no "próximamente".

If any step fails, note the step number + what you saw — that's the bug report.
