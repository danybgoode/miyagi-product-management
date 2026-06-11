# Custom-domain paywall + campaign coupon — Sprint 1: Gate + entitlement (grandfather + flag)

**Status:** ✅ SHIPPED 2026-06-11 — [PR #79](https://github.com/danybgoode/miyagisanchezcommerce/pull/79) squash-merged to `main` (`f0b524a`, bundled with S2). Grandfather backfill ran against prod (**no-op — 0 custom-domain shops**); `domain.paywall_enabled` **created in Flagsmith + flipped ON in Production** — the paywall is LIVE. Auth boundary + prod health re-confirmed post-flip (homepage 200, anon domain POST 401).

| Story | Status | Commit |
|---|---|---|
| 1.1 — Derive entitlement + gate every connect/provision mutation | ✅ built | `a02d941` |
| 1.2 — Grandfather existing custom-domain shops (cutover backfill) | ✅ built | `3dc8834` |
| 1.3 — Fail-open rollout flag | ✅ built | `ef64e11` |
| api spec (`e2e/custom-domain-paywall.spec.ts`) | ✅ built | `f388c26` |

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

## What shipped (implementation notes)
- **Entitlement seam** — pure `lib/domain-entitlement.ts` (`deriveDomainEntitlement` + `readDomainGrant`)
  consumed by every connect/provision route + the connect UI; async flag+shop composition in
  `lib/domain-entitlement-server.ts` (`resolveDomainEntitlement`). Sources: flag off ⇒ ungated · durable
  `marketplace_shops.metadata.custom_domain_grant` (`grandfather`/`comp`) · S2 hook `hasActiveSubscription`.
- **Gated mutations (402 when flag on AND not entitled), before any Vercel/Cloudflare/DB write:**
  `POST /api/sell/shop/domain` · `POST …/domain/cloudflare` · `GET …/cloudflare/oauth/start` (UX) ·
  `GET …/cloudflare/oauth/callback` (the real DNS-mutation boundary). **DELETE is intentionally NOT gated**
  — removal moves *away* from the gated state and is the escape hatch a lapsed seller needs (S2).
- **UI** — the Canal settings section renders a premium upsell instead of the connect steps when not
  entitled; the **free shop URL + subdomain stay available** (those are free for everyone).
- **Flag** — `domain.paywall_enabled` (fail-open default **false** ⇒ ungated).

## Cutover run order (Daniel — HIGH risk, do in this order)
1. **Merge** the PR (deploy is inert — flag defaults off).
2. **Run the grandfather backfill** against prod:
   `node --env-file=.env.local scripts/backfill-domain-grandfather.mjs` — idempotent; stamps a
   `{type:grandfather}` grant on every shop that already has a `custom_domain`. **Must run before step 3.**
3. **Flip `domain.paywall_enabled` ON** in Flagsmith.
   (To comp a domain-less seller: set `metadata.custom_domain_grant = {type:'comp', granted_at, note}` by SQL.)

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the Vercel preview URL while testing pre-merge)
**Owed to Daniel** — every step needs a live Clerk **seller session**, which the automated browser smoke
can't hold; CI covers only the pure seam + the 401 auth boundary (the flag fails open to off in CI).

1. With `domain.paywall_enabled` **off**, sign in as a seller with **no** domain and open
   https://miyagisanchez.com/shop/manage/settings/canal.
   → The domain connect form (STEP 1–3) shows exactly as today (ungated).
2. Run the backfill (cutover step 2), then flip `domain.paywall_enabled` **on** in Flagsmith and reload the page.
   → The connect steps are replaced by the upsell card ("Dominio propio · Función premium"); the **Tu URL gratis**
     + subdomain blocks above are still shown.
3. **(auth path)** As that same non-entitled seller, attempt to connect a domain anyway (submit the form, or
   `POST /api/sell/shop/domain`).
   → Refused with **402** (`{paywall:true}`); no domain is provisioned on Vercel.
4. Open https://<an-existing-custom-domain-shop>.tld (a shop that already had a domain before cutover), flag **on**.
   → The shop still loads white-label on its custom domain (grandfathered — untouched), and that seller's
     `/shop/manage/settings/canal` still shows the full connect/status flow (entitled).
5. **(comp)** Set `{type:'comp',…}` on a domain-less test shop, reload its `…/settings/canal` with the flag on.
   → It shows the connect form (entitled via comp), not the upsell.

If any step fails, note the step number + what you saw — that's the bug report.
