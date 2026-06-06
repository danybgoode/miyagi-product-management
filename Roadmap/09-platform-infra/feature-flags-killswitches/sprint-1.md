# Sprint 1 — The kill-switch foundation + first flag

**Epic:** [Feature flags & kill-switches](README.md) · **Status:** 🚧 In progress
**Risk:** HIGH (checkout-adjacent → Daniel merges).

This is the spike's recommended **thin first slice** (spikeflagsmith.md §6): one helper, one flag, one
seam — proving "flip in the dashboard → behaviour changes in prod with no deploy" — before any taxonomy
expansion.

---

## US-1 — Kill the Stripe rail from a dashboard, no deploy

> **As** the platform admin, **I want** to disable the Stripe card-payment option across checkout from
> the Flagsmith dashboard, **so that** if Stripe is broken or compromised I can hide it in seconds
> without waiting on a deploy — and if Flagsmith itself is down, Stripe stays on (fail-open).

**What it ships**
- `flagsmith-nodejs` dependency in `apps/miyagisanchez`.
- `lib/flags.ts` — a server-only Flagsmith client: initialise once with `FLAGSMITH_ENVIRONMENT_KEY`,
  **local evaluation**, a short cache, and a **`DEFAULT_FLAGS` fail-open map** (`checkout.stripe_enabled:
  true`). A single `isEnabled(flag)` helper that **never throws** and returns the default on any error.
- Wire it into `app/api/checkout/options/route.ts` (the proxy that feeds both single + bundle checkout):
  after fetching Medusa's options, if `checkout.stripe_enabled` is **off**, drop the
  `payment_methods[].id === 'stripe'` entry and clear `payment_default` if it pointed at Stripe.
- Create the `checkout.stripe_enabled` feature in Flagsmith (Production + Development), default **ON**.
- One Playwright `api` spec asserting the proxy returns well-formed options and (flag absent →
  fail-open) Stripe remains present.

**Acceptance (Daniel can run)**
1. With the flag **ON** (default), checkout shows the "Tarjeta (Stripe)" payment option as today. ✅ no change.
2. Toggle `checkout.stripe_enabled` **OFF** in the Flagsmith dashboard → reload checkout → the Stripe
   option is **gone** (other rails — MercadoPago / SPEI / cash — remain), **with no redeploy**.
3. Toggle back **ON** → the Stripe option returns.
4. **Fail-open:** if Flagsmith is unreachable (or the flag doesn't exist), checkout behaves exactly as
   today (Stripe present). Checkout never breaks because of the flag layer.

**Out of scope (noted follow-ups)**
- The UCP checkout-session path (`app/api/ucp/checkout-session/route.ts`) calls the backend directly,
  not this proxy — so agents are **not** gated by this slice. Tracked for the backend sprint.
- Backend enforcement (Medusa `start-checkout` rejecting a killed rail) — a later sprint; v1 hides the
  option in the human UI to prove the pattern.
- All other flags in the taxonomy + the `routing.*` middleware switches.

---

## Smoke walkthrough (fool-proof)

> Pre-merge uses the branch's **Vercel preview** URL; post-merge uses **production** (`miyagisanchez.com`).
> Steps 2–4 are **owed to Daniel** (dashboard toggle + a real checkout view).

1. **Open a listing's checkout** (any active product) → **Expect:** payment options list includes
   "Tarjeta" (Stripe).
2. **In Flagsmith** (`app.flagsmith.com` → project `miyagisanchezmarketplace` → the deployed
   environment) **turn `checkout.stripe_enabled` OFF** → reload the checkout page → **Expect:** the
   Stripe option is gone; MercadoPago/SPEI/cash still show; **no deploy happened**.
3. **Turn it back ON** → reload → **Expect:** Stripe option returns.
4. **(Owed to Daniel)** confirm a real card payment still completes when ON (money path).

---

## Status

- [ ] US-1 built · commit `____`
- [ ] tsc + build + Playwright green
- [ ] Flag created in Flagsmith (Prod + Dev)
- [ ] PR opened (HIGH risk) · `#__`
- [ ] Daniel merge + live smoke (steps 2–4)
