# Custom-domain paywall + campaign coupon — Sprint 1: Gate + entitlement (grandfather + flag)

**Status:** ⬜ not started

> Goal: the paywall works end-to-end with entitlement granted by hand / grandfather — **before any
> checkout exists**. Ships behind a fail-open flag so it can't trap an existing seller.

## Stories

### Story 1.1 — Derive entitlement + gate every domain mutation
**As a** seller without entitlement, **I want** to be told a custom domain is a paid feature (and see an
upsell), **so that** the connect flow is honest — and as Daniel, the feature is actually gated.
Add `lib/domain-entitlement.ts` — a next-free seam returning `{ entitled, reason }` for a shop, derived
from Medusa subscription state (active sub to the custom-domain plan **or** a comp/grandfather grant).
Gate **every** mutation that connects/changes a domain: `POST /api/sell/shop/domain`, the
`cloudflare/*` connect sub-routes, and any PATCH/replace path — each returns **402** when the paywall is
on and the shop is not entitled. The connect UI renders a paywall/upsell state instead of the form.
**Acceptance:** with the flag on, a test seller with no subscription sees the upsell and gets a 402 from
each domain write; an entitled (or grandfathered) seller connects exactly as today.
**Risk:** high

### Story 1.2 — Grandfather existing custom-domain shops (indefinitely)
**As an** existing seller who already connected a domain, **I want** to keep it free forever, **so that**
nothing is taken away.
At cutover, any shop with a live `custom_domain` is treated as entitled via a durable comp/grandfather
grant (indefinite — no later conversion). The entitlement seam recognizes it without a subscription.
**Acceptance:** a shop that already has a connected domain is unaffected post-deploy (no 402, domain
stays live), even with the paywall flag on.
**Risk:** high

### Story 1.3 — Fail-open rollout flag
**As** Daniel, **I want** to switch the paywall on/off safely, **so that** a Flagsmith outage or a bad
rollout can never trap sellers.
Add `domain.paywall_enabled` to `lib/flags.ts` (default/fail-open = **off ⇒ ungated**, today's free
behavior). The gate in 1.1 consults it.
**Acceptance:** flag off (or Flagsmith unreachable) ⇒ domain connect works for everyone as it does today;
flag on ⇒ 1.1/1.2 behavior applies.
**Risk:** low

## Sprint QA
- **api spec(s):** Story 1.1/1.2/1.3 → `e2e/custom-domain-paywall.spec.ts` (api project): entitlement seam returns entitled / not-entitled / grandfathered / flag-off; each domain mutation returns 402 only when (flag on AND not entitled); flag-off path is ungated.
- **browser smoke owed:** **yes, to Daniel** — a real seller session: confirm the upsell renders for a non-entitled shop and that a grandfathered shop's domain still loads. (Auth path — automated browser smoke can't fully cover a live Clerk seller session.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the Vercel preview URL while testing pre-merge)

1. With `domain.paywall_enabled` **off**, go to https://miyagisanchez.com/shop/manage/settings (custom-domain section) as a seller with **no** domain.
   → The domain connect form shows exactly as today (ungated).
2. Flip `domain.paywall_enabled` **on** in Flagsmith, reload the same page.
   → The connect form is replaced by a paywall/upsell state ("dominio propio — función premium").
3. **(auth path)** As that same non-entitled seller, attempt to connect a domain anyway (submit the form / hit the API).
   → The request is refused with a 402; no domain is provisioned on Vercel.
4. Open https://<an-existing-custom-domain-shop>.tld (a shop that already had a domain before this deploy), with the flag **on**.
   → The shop still loads white-label on its custom domain (grandfathered — untouched).

If any step fails, note the step number + what you saw — that's the bug report.
