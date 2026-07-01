# Subdomain pricing — Sprint 3: Monthly recurring cadence

**Status:** ✅ MERGED 2026-07-01 — be #48 (squash `5353c00`, deployed rev `medusa-web-00121-fq8`) · fe #147
(squash `d03f93f`). **Risk: HIGH (payments — new recurring cadence).** Owed to Daniel: **monthly prod seed**
(`scripts/seed-subdomain-plan.mjs`, money-path) + **live money-path smoke** (steps below).

| Story | Status | Commit |
|---|---|---|
| US-6 — Monthly recurring cadence ($25/mo) + monthly↔yearly switch + lapse | ✅ merged | be `5353c00` (#48) · fe `d03f93f` (#147) |
| api spec (`e2e/subdomain-monthly.spec.ts`) | ✅ merged | fe `d03f93f` (#147) |

> Goal: a seller can pay **$25/mo** instead of yearly; yearly stays the discounted option. This is the
> `billing-cadence-monthly-recurring` work, delivered here for the subdomain SKU. (A later epic can
> generalize the monthly cadence to the custom domain if desired.)

> **Build note.** Most of US-6 was *already free*: the S2 Stripe webhook and the entitlement seam are both
> **interval-agnostic** (they branch on `kind === 'subdomain'` / consume a boolean `hasActiveSubscription`,
> never on interval), so a cancelled/failed **monthly** sub already lapses back to `/s/slug` with zero new
> code. S3 reduced to: a **second Stripe price** (monthly, $25) on the **single** subdomain plan (held in
> the plan's `metadata`, yearly stays the column), letting checkout pick the interval, and a
> **proration-based switch** — `stripe.subscriptions.update` price-swap on the **same** subscription (same
> id ⇒ no entitlement gap; Stripe proration ⇒ no double charge). Single plan / two prices keeps the HIGH
> entitlement read + the shared `by-stripe-price` route untouched (the webhook resolves the subdomain plan
> **by kind**). **Route + MCP only** — the Canal UI cadence/switch button stays a deliberate FE follow-up
> (S2 precedent). New MCP tool `switch_subdomain_cadence`; `start_subdomain_subscription` gains `interval`.
> **Deploy order:** BE merge (#48) → Cloud Run deploy → `node scripts/seed-subdomain-plan.mjs` with prod
> creds (now seeds BOTH the yearly + monthly Stripe price, idempotent) → FE merge (#147). Pre-seed the
> monthly buy degrades to "el plan aún no está disponible" (graceful; new shops already 301 from S1).
> Gate green: fe `tsc` + `next build` + 11 pure api specs; be `medusa build` + `tsc` + 66 unit tests. The
> route-guard + manifest specs run in CI vs the preview.

## Stories

### US-6 — Monthly recurring cadence + lapse
**As a** seller, **I want** to pay $25/mo for the subdomain, **so that** I can start without an annual
commitment. Add a **monthly** recurring price to the subdomain plan; the checkout offers monthly vs
yearly (yearly framed as the discount — $199/yr ≈ $17/mo). Reuse the subscription lapse logic: a failed/
cancelled monthly subscription lapses the subdomain **back to `/s/slug`** (mirror the yearly lapse from
Sprint 2). Entitlement seam already honors "active subscription" — monthly is just another price on the
same plan.
**Acceptance:** a test seller subscribes monthly → subdomain white-label; a simulated renewal keeps it
live; a cancellation/failed payment lapses it → 301 to `/s/slug`; switching monthly↔yearly works without
a double charge or a gap in entitlement.
**Risk:** high (payments)

## Sprint QA
- **api spec(s):** `e2e/subdomain-monthly.spec.ts` (api) — monthly price resolves from the single source;
  active monthly sub → entitled; cancel/fail → lapsed → 301; monthly↔yearly switch preserves entitlement
  with no double charge.
- **browser smoke owed:** **YES, to Daniel — live money path.** A real monthly subscribe + a
  cancel-and-lapse cycle.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

> **No Canal UI this sprint** — the buy + switch ENGINE ships route/MCP-only (S2 precedent). Initiate the
> buy via the **agent path** (shop agent token → MCP `start_subdomain_subscription` with `{ "interval":
> "month" }`) or `POST /api/sell/shop/subdomain/subscribe` `{ "cadence": "recurring", "interval": "month" }`
> with a seller session; initiate the switch via MCP `switch_subdomain_cadence` `{ "interval": "year" }` or
> `POST /api/sell/shop/subdomain/switch` `{ "interval": "year" }`.

0. (Prerequisite — once, after the BE deploy of #48) Run `node scripts/seed-subdomain-plan.mjs` with **prod**
   creds (Cloud Run `MEDUSA_STORE_URL` + `sk_live` + prod `MEDUSA_INTERNAL_SECRET`).
   → Prints the yearly plan **and** `Medusa plan updated with monthly price … (monthly stripe_price_id=price_…)`.
     Idempotent (reuses the same Stripe prices). Until this runs, the monthly buy returns "el plan aún no
     está disponible" (graceful).
1. As a non-grandfathered test seller (subdomain currently 301s to /s/slug), start the monthly buy —
   MCP `start_subdomain_subscription` `{ "interval": "month" }` (or the subscribe route with `interval:
   "month"`).
   → A checkout opens at **$25 MXN/mes** (a recurring subscription). Starting it with `interval: "year"`
     opens $199/año instead — yearly is the discounted option.
2. Pay with Stripe test card `4242 4242 4242 4242`.
   → Within ~minutes `https://<shop>.miyagisanchez.com` serves **white-label**; Stripe shows an **active
     monthly subscription** ($25/mo).
3. In Stripe, advance the clock / simulate the next monthly invoice (renewal).
   → `invoice.payment_succeeded` keeps the sub active; the subdomain stays live; entitlement unchanged.
4. Cancel the subscription (or simulate a failed payment through to `customer.subscription.deleted`).
   → The subdomain **301s back to `/s/slug`**; **no orphaned charge**. (A transient `payment_failed` alone
     stays `past_due` = still live — only a definitive cancel lapses it.)
5. (switch — the HIGH heart) Buy monthly again, then switch to yearly via MCP `switch_subdomain_cadence`
   `{ "interval": "year" }` (or the switch route).
   → Entitlement stays **continuous** (the subdomain never 301s during the switch); Stripe shows the **same
     subscription** now on the yearly price with a **proration credit** for the unused month (**no double
     charge**). Switching to the cadence you're already on returns a no-op with no charge; switching with no
     active subscription is refused cleanly.

If any step fails, note the step number + what you saw — that's the bug report.
**Money path:** every step here is live-money/recurring → **owed to Daniel** (an automated browser smoke
can't cover real Stripe subscription lifecycle events). The pure seams (interval coercion, price selection,
the switch decision, interval-agnostic entitlement) + the buy/switch route auth guards + the manifest are
covered by `e2e/subdomain-monthly.spec.ts`.
