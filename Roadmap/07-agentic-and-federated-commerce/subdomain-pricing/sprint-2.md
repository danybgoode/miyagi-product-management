# Subdomain pricing — Sprint 2: Paid yearly checkout + lapse + pricing/SKU/UCP surface

**Status:** 🟦 READY — not started. **Risk: HIGH (payments).** Backend-first. Daniel merges HIGH.

| Story | Status | Commit |
|---|---|---|
| US-4 — Paid yearly checkout (one-time + recurring) + graceful lapse → /s/slug | ⬜ | |
| US-5 — Pricing copy (es/en) + promoter-SKU registration + UCP surface | ⬜ | |
| api spec (`e2e/subdomain-checkout.spec.ts`) | ⬜ | |

> Goal: a seller (or a promoter on their behalf) buys the subdomain for a year → it goes white-label;
> at year-end it lapses gracefully **back to `/s/slug`** with no silent re-charge. Reuses the
> custom-domain plan/checkout/lapse patterns + the promoter Sprint 2 one-time cadence.

## Stories

### US-4 — Paid yearly checkout + graceful lapse
**As a** seller (or a promoter on their behalf), **I want** to buy the subdomain for a year and have it go
white-label, **so that** my shop feels independent without buying a domain. Add a platform-side **subdomain
plan** (subscriber = seller) in the subscriptions module; yearly checkout supporting **recurring** (reuse
`lib/domain-subscription-checkout.ts`) **and one-time** (reuse promoter-program Sprint 2's one-time path —
ship recurring-only if that seam isn't merged yet). On payment, grant entitlement (the seam from Sprint 1
gains the `subscription` source); at year-end it **lapses gracefully → 301 to `/s/slug`**, no auto-charge
for one-time, normal renewal for recurring.
**Acceptance:** a test seller buys yearly → subdomain serves white-label within minutes; one-time grants
12 months with no recurring object; lapse flips the subdomain back to a 301→/s/slug with no silent
re-charge; recurring renews as expected.
**Risk:** high (payments)

### US-5 — Pricing copy + promoter SKU + agent surface
**As** anyone comparing tiers, **I want** the subdomain price on `/acerca` (es + en), **so that** it's
clear; **as a** promoter, the subdomain is a sellable SKU (code discount + commission %); **as an** agent,
the subdomain SKU + cadence are reachable over UCP/MCP. Add `lib/subdomain-pricing.ts`
(`SUBDOMAIN_PRICE_YEARLY_MXN=199`, `…_MONTHLY_MXN=25`) as the single source; fill the `about-content`
pricing section (es + en, rule #5); register the subdomain as a promoter SKU (promoter-program); expose it
on `POST /api/ucp/checkout-session` + keep the manifest accurate.
**Acceptance:** `/acerca` shows the subdomain price in both locales from the single source (no drift); a
promoter code applies its discount to the subdomain SKU; the UCP checkout-session lists the subdomain SKU.
**Risk:** med

## Sprint QA
- **api spec(s):** `e2e/subdomain-checkout.spec.ts` (api) — one-time grant dates + no subscription object;
  lapse flips entitlement → 301 with no charge; recurring renews; pricing single-source resolves in es+en;
  UCP lists the SKU + honors a promoter code.
- **browser smoke owed:** **YES, to Daniel — live money path.** A real yearly subdomain purchase (Stripe
  test card) → white-label serves; confirm no unexpected recurring object for the one-time path.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

1. As a non-grandfathered test seller (subdomain currently 301s to /s/slug), open the subdomain upsell and
   choose **"Pagar un año"**.
   → A checkout opens at **$199 MXN/año**.
2. Pay with Stripe test card `4242 4242 4242 4242` (one-time option).
   → Within ~minutes `https://<shop>.miyagisanchez.com` serves **white-label** (no longer 301s).
3. Open the Stripe dashboard.
   → For the one-time option: a single payment, **no subscription / no upcoming invoice**.
4. (lapse, simulated) Force the grant's expiry to the past and reload.
   → The subdomain **301s back to `/s/slug`**; **no new charge** was attempted.
5. Open `/acerca` in es and `?lang=en`.
   → The subdomain price ($199/yr) shows in both locales.
6. (promoter) Apply a promoter code at the subdomain checkout.
   → The discount applies before pay; the sale attributes to the promoter (promoter-program).

If any step fails, note the step number + what you saw — that's the bug report.
**Money path:** steps 2–4 + 6 are live-money → **owed to Daniel**.
