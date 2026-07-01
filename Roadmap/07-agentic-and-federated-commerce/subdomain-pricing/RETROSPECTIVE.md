# Subdomain pricing — Retrospective

_✅ EPIC COMPLETE — all 3 sprints shipped. S1 ✅ MERGED + cutover LIVE (#145 `3892006`, flag ON, 179 shops
grandfathered); S2 ✅ MERGED 2026-06-30 (be #47 `9f2d3ea` rev `medusa-web-00120-vrk` · fe #146 `ea21572`);
S3 ✅ MERGED 2026-07-01 (be #48 `5353c00` rev `medusa-web-00121-fq8` · fe #147 `d03f93f`)._

Turns the free-for-all `<slug>.miyagisanchez.com` subdomain into the platform's **cheaper** paid SKU
($199/yr or $25/mo) — the promoter's affordable entry anchor. A **faithful clone of `custom-domain-paywall`**
onto the subdomain, with S3 adding the monthly cadence the custom domain never had. The free `/s/slug` shop
URL stays free forever; existing shops are grandfathered free (no takeaway).

## What shipped
- **S1 — Gate + entitlement + grandfather (FE #145 `3892006`, behind the flag).** The `middleware.ts`
  subdomain branch now serves white-label only when the shop is **entitled**, else **301 → `/s/slug`**.
  Reuses the custom-domain pure seam via a subdomain clone (`lib/subdomain-entitlement.ts` +
  `…-server.ts`) reading the SKU's **own** grant key (`metadata.subdomain_grant`, never
  `custom_domain_grant`). Fail-open `subdomain.paywall_enabled` (id 220951). Cutover: merge inert →
  `scripts/backfill-subdomain-grandfather.mjs` stamped a grandfather grant on **all 179 shops** → flag ON.
- **S2 — Paid yearly checkout + lapse + pricing/SKU/UCP (be #47 `9f2d3ea` · fe #146 `ea21572`).** A
  **platform-side** subdomain SubscriptionPlan (one row on the shared `subscription_plan` table,
  `seller_id:'platform'` + `metadata.kind:'subdomain_plan'` — no migration). Yearly checkout in **recurring**
  and **one-time** cadences over a shared `startSubdomainCheckout` builder (the buy route + the MCP tool
  share it). Webhook activates the Medusa sub / writes a dated one-time grant; lapse reverts entitlement
  without destroying the grant (`past_due` = grace). No campaign coupon (that's the custom-domain SKU).
  Pricing single-sourced (`lib/subdomain-pricing.ts`) + bilingual `/acerca`; MCP `get_subdomain_entitlement`
  + `start_subdomain_subscription` + a `seller_subdomain_subscription` manifest block.
- **S3 — Monthly cadence ($25/mo) + monthly↔yearly switch (be #48 `5353c00` · fe #147 `d03f93f`).** A seller
  can pay **$25/mo** instead of $199/yr (yearly stays the discount) and **switch between them with no double
  charge and no entitlement gap**. Monthly is a **second recurring price on the same plan** (held in plan
  `metadata`; yearly stays the `stripe_price_id` column — no migration, no second plan). Checkout picks the
  interval; the switch is a `stripe.subscriptions.update` proration price-swap on the **same** subscription.
  Route + MCP only (`switch_subdomain_cadence` new; `start_subdomain_subscription` gains `interval`) — the
  Canal UI stays a deferred FE follow-up. Seed extended to seed both Stripe prices.

## What went well
- **Reading the S2 code first re-sized S3 to almost nothing.** The S2 Stripe webhook and the entitlement
  seam are both **interval-agnostic** (they branch on `kind === 'subdomain'` / consume a boolean
  `hasActiveSubscription`, never on interval), so a cancelled/failed **monthly** sub already lapses back to
  `/s/slug` with **zero new code**. "Reuse the lapse logic" was already true — S3 reduced to a second price +
  the switch.
- **Single plan / two prices** kept the two hardest things trivially correct: the **HIGH entitlement read**
  (still lists subs by one `plan_id`) and the **switch** (same `stripe_subscription_id` ⇒ continuous
  entitlement; Stripe proration ⇒ no double charge; no Medusa row rewrite). The only knock-on — the webhook's
  `by-stripe-price` lookup would miss a monthly price — was avoided by resolving the subdomain plan **by
  kind** in the webhook, leaving the shared route (also used by seller-listing + custom-domain subs)
  untouched.
- **The pure-seam + thin-composer split** again gave full `api`-gate coverage of the new logic with no
  auth/network: `lib/subdomain-billing.ts` (`coerceSubdomainInterval`, `subdomainPriceIdForInterval`, the
  pure `decideCadenceSwitch`) is unit-tested; the Stripe/Medusa wiring is a thin wrapper.
- **The codex cross-review earned its keep on a green gate.** It flagged the right money-path bug: a billing
  **mutation** (the switch) must **reject** a missing/invalid interval, not default to yearly like the safe
  buy path — fixed before merge. Its two "blocking" calls were correctly declined (the backend was a separate
  backend-first PR; the "bypasses Medusa" is the established platform-subscription seam), with the rationale
  recorded on the PR.
- **Backend-first deploy order held.** Merged BE → confirmed the live revision actually rolled
  (`medusa-web-00120-vrk` → `00121-fq8`, not just a SUCCESS build) → then merged FE, so the switch/monthly
  reads never hit a stale backend. Frontend degrades gracefully pre-seed (monthly buy → "aún no disponible").

## What we learned
_(Promoted to `Roadmap/LEARNINGS.md` — see there for the durable one-liners.)_
- **A new price/interval on an existing subscription SKU is a second price on the SAME plan, not a new plan** —
  it keeps the entitlement read and (crucially) a cadence *switch* trivially correct: swap the price on the
  same Stripe subscription (proration ⇒ no double charge; same id ⇒ no entitlement gap). Store the alt price
  where the plan-by-kind reader already looks (plan metadata), and resolve the plan **by kind** in the webhook
  so you never touch the shared `by-stripe-price` route.
- **Split "coerce vs reject" by whether the action is a purchase or a mutation.** A buy can back-compat
  default a blank interval to the safe/discounted option; a *switch* (money mutation) must reject an invalid
  interval so a malformed body/agent call can't move a seller's cadence + prorate behind their back.
- **Grepping the S2 webhook/entitlement seam for `interval` before scoping proved the lapse was already free**
  — the "reuse the lapse logic" AC needed no code. Read the seam you're told to reuse before assuming it needs
  extending.

## Gaps / follow-ups (owed to Daniel)
- **Prod monthly seed (money-path, auto-mode blocks it):** run `node scripts/seed-subdomain-plan.mjs` once
  with **prod** creds (Cloud Run `MEDUSA_STORE_URL` + `sk_live` + prod `MEDUSA_INTERNAL_SECRET`) — it now
  creates/reuses BOTH the yearly + monthly Stripe price and merges the monthly one into the plan metadata
  (idempotent). Until it runs, the monthly buy degrades gracefully to "el plan aún no está disponible" (new
  shops already 301 from S1 — nothing broken). The **S2 yearly seed** may also still be owed.
- **Live money-path smoke (can't automate Stripe subscription lifecycle):** the `sprint-3.md` walkthrough —
  buy $25/mo → white-label; simulated renewal stays live; cancel/fail → 301 lapse, no orphan charge;
  monthly→yearly switch → continuous entitlement + proration credit, no double charge. Plus the S2 yearly
  money smoke.
- **Canal UI (deferred by decision):** the human-facing buy/cadence-selector + "switch cadence" control in
  `_sections/Canal.tsx` (mirroring the custom-domain block). Buy + switch are route/MCP-only today.
- **Deferred:** generalizing the monthly cadence to the **custom domain** SKU (a later epic, if desired).
