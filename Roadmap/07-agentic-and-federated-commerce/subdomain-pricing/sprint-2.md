# Subdomain pricing — Sprint 2: Paid yearly checkout + lapse + pricing/SKU/UCP surface

**Status:** 🏗️ BUILT — green gate, draft PRs open. **Risk: HIGH (payments) → Daniel merges.**
Backend-first deploy. Live money-path browser smoke **owed to Daniel**.

| Story | Status | Commit |
|---|---|---|
| US-4 — Paid yearly checkout (one-time + recurring) + graceful lapse → /s/slug | ✅ built | be `e6fa255` · fe `ea6ce78` |
| US-5 — Pricing copy (es/en) + promoter-SKU registration + UCP surface | ✅ built | fe `ea6ce78` |
| api spec (`e2e/subdomain-checkout.spec.ts`) | ✅ built | fe `ea6ce78` |

> **Build note.** Faithful clone of `custom-domain-paywall` S2. **No schema migration** — the subdomain
> plan is a data row on the shared `subscription_plan` table (`seller_id:'platform'` +
> `metadata.kind:'subdomain_plan'`, distinct from `custom_domain_plan`). Recurring + one-time both ship
> (the promoter one-time seam is merged). The middleware gate now resolves the recurring subscription via
> `lib/subdomain-entitlement-server.ts`, short-circuiting the Medusa read for grandfathered shops (zero
> extra round-trip). Agent surface: MCP tools `get_subdomain_entitlement` + `start_subdomain_subscription`,
> manifest block `seller_subdomain_subscription`. `/acerca` reframed: free `/s/slug` stays, subdomain is a
> $199/yr upgrade (no public grandfather mention). **Deploy order:** BE merge → Cloud Run deploy →
> `node scripts/seed-subdomain-plan.mjs` with **prod** creds → FE merge. `subdomain.paywall_enabled` is
> already ON (S1 cutover); seeding the plan is what makes the paid path purchasable.
> Gate green: fe `tsc` + `next build` + 10 pure api specs; be `medusa build` + `tsc` + 66 unit tests. The
> route-guard + manifest specs run in CI vs the preview.

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

0. (Prerequisite — once, after the BE deploy) Run `node scripts/seed-subdomain-plan.mjs` with **prod**
   creds (Cloud Run `MEDUSA_STORE_URL` + `sk_live` + the prod `MEDUSA_INTERNAL_SECRET`).
   → Prints `Medusa plan created/updated … (stripe_price_id=price_…)`. Re-running reuses the same Stripe
     price + plan (idempotent). Until this runs, the recurring buy returns "el plan aún no está disponible".
1. As a non-grandfathered test seller (subdomain currently 301s to /s/slug), open the subdomain upsell and
   choose **"Pagar un año"**.
   → A checkout opens at **$199 MXN/año**; on success Stripe returns to
     `/shop/manage/settings/canal?subdomain=activated`.
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
7. (agent path) With a shop agent token, call MCP `get_subdomain_entitlement`, then
   `start_subdomain_subscription` (`{ "cadence": "recurring" }`).
   → The first returns `{ entitled, reason, price_label: "$199 MXN/año (~$17/mes)" }`; the second returns
     a Stripe `checkout_url`. The manifest's `seller_subdomain_subscription` block lists both tools.

If any step fails, note the step number + what you saw — that's the bug report.
**Money path:** steps 2–4 + 6 are live-money → **owed to Daniel**.
