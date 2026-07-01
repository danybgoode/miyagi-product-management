# Mercado Libre sync — Sprint 6 (fast-follow): make ML sync obtainable + discoverable

**Status:** ✅ **MERGED + DEPLOYED (LIVE) 2026-07-01.** The S5 ML-sync entitlement gate is now usable: a seller
can **buy** ML sync (self-serve), a **promoter** can set it up, an **admin** can comp it, and it's **linked**
from the seller panel. Backend #53 `8ae2583` (Cloud Run) + hotfix #54 `7fd88ba` (revision `medusa-web-00129-t5x`)
· frontend #154 `9e264eb` (Vercel prod). **Prod Stripe seeded** — plan `subplan_01KWFYVH0R1CW6XCA9QNTYMA7J`
resolves $299/yr (`price_…585nomXf`) + $30/mo (`price_…3cLPdEY4`). Codex cross-review clean. Scoped 2026-07-01
with Daniel from his live smoke on `champions-not`.

| Story | Status | Commit |
|---|---|---|
| US-16 — Discoverability: seller-nav entry + fix the confusing upsell CTA | ✅ MERGED | fe #154 `9e264eb` |
| US-17 — Self-serve purchase (yearly $299 one-time + monthly $30 subscription) | ✅ MERGED | be #53 `8ae2583` (+#54 `7fd88ba`) · fe #154 `9e264eb` |
| US-18 — Promoter sets it up (route/mechanism; UI picker deferred) | ✅ MERGED | fe #154 `9e264eb` |
| US-19 — Admin comp-grant for any SKU (custom_domain / subdomain / ml_sync) | ✅ MERGED | fe #154 `9e264eb` |
| api spec (`e2e/ml-sync-monetization.spec.ts`) | ✅ | fe #154 `9e264eb` |

> **Hotfix #54 (`7fd88ba`):** the first prod seed 500'd on the update path —
> `updateSubscriptionPlans({id,…})` returns a SINGLE object, but the route array-destructured it (`const [plan]
> = …`) → "object is not iterable". The create path (single object, used directly) worked, so build/tsc (result
> is `subs as any`) never caught it. Fixed with an `Array.isArray` guard at both update sites; re-seed succeeded.
> **The subdomain route has the same latent shape** (`setup-subdomain-plan`) — flagged for a separate look.
> LEARNING: an `(x as any)` service-method return that's array-destructured is invisible to the gate — verify
> the update/re-seed path live, not just the first-time create.

> **Decisions (Daniel):** pricing = **yearly $299 (one-time 12-mo grant) + monthly $30 (subscription)**, a
> faithful clone of the subdomain money path; shipped as **one bundled fast-follow**.

## What shipped
- **US-16.** Seller-nav gains a **Mercado Libre** entry (Crecer group). The `/shop/manage/mercadolibre` upsell
  CTA now opens a real **"Activar — $299/año / $30/mes"** Stripe checkout (was a link to `/vende/promotor`, the
  become-a-promoter page) + a secondary "tu promotor puede activártela" line.
- **US-17.** Clone of the subdomain SKU onto `ml_sync`: backend `setup-ml-sync-plan` + `ml-sync-subscription`
  routes; FE `lib/ml-sync-{pricing,billing,subscription,subscription-checkout}.ts`; the Stripe webhook's
  `ML_SYNC` dispatch + 2 completion handlers + 4 lifecycle branches (one-time writes `ml_sync_grant`, recurring
  activates a Medusa subscription); `hasActiveMlSyncSubscription` wired into `resolveMlSyncEntitlement` so a
  monthly subscriber is entitled; `/api/sell/ml/subscribe` buy route; `scripts/seed-ml-sync-plan.mjs`.
- **US-18.** `/api/promoter/close/ml-sync` (clone of `close/domain`) — a promoter pays the one-time SKU for a
  target shop (`paid_by_promoter`) → grant + `markAttributionPaid({sku:'ml_sync'})` (SKU registered in S5).
  **Deferred (small follow-up):** the promoter-close **UI** SKU-picker — the domain-only `PromoterCloseClient`
  needs a multi-SKU selector; the *route/mechanism* ships now, and the seller self-serve path is fully live.
- **US-19.** `/api/admin/tenants/[id]` generalized to a `sku` param (custom_domain | subdomain | ml_sync),
  writing the matching grant key via `buildCompGrant`, re-resolved by each SKU's server composer;
  `AdminTenantsClient` gains a SKU selector. Closes the "cortesía only granted the domain" gap Daniel hit.

## Sprint QA — what ran
- **api spec `e2e/ml-sync-monetization.spec.ts`:** billing-interval coercion + price selection, the pricing
  constants (the yearly one-time charge is a code constant), entitlement precedence **with a subscription** +
  **SKU-key isolation** + fail-safe, `ml_sync` promoter SKU, and the buy/promoter-close/admin-grant route auth
  shapes (auth-before-flag, both flag states). Pure specs **28/28 green** locally; the `/api/sell/ml/subscribe`
  anon-401 assertion validates on the **branch preview** (404 vs prod pre-deploy — CI-vs-preview signal).
- Updated the seller-mode nav spec (route allowlist + label list) and confirmed the promoter-commission
  exhaustive map already carries `ml_sync` (S5).
- **Deterministic gate:** BE `medusa build` + `tsc` · FE `tsc` + `npm run build` + Playwright `api` — green.

## Deploy order (CRITICAL — money path)
**Backend-first.** `ml.sync_paywall_enabled` is **already ON in prod**, so the moment the FE deploys the upsell
CTA is live. Run order (LEARNINGS money-path): **BE merge + Cloud Run deploy → prod Stripe seed
(`seed-ml-sync-plan.mjs`, REAL creds from Secret Manager, yearly then monthly) → FE merge/deploy.** If the FE
lands before the Stripe plan is seeded, the checkout builder returns "el plan aún no está disponible" (graceful)
for recurring, and the one-time path would charge with no plan — so **seed before/with the FE deploy.**

## Owed input / owed to Daniel
- **Prod Stripe seed** (`node --env-file=<prod> scripts/seed-ml-sync-plan.mjs`) — creates the $299/yr + $30/mo
  Stripe prices + upserts the Medusa `ml_sync_plan`. Owed to Daniel (real `sk_live` + prod `MEDUSA_INTERNAL_SECRET`).
- **Live money smokes** (all owed to Daniel): buy yearly (one-time grant → sync unlocks), buy monthly
  (subscription → unlocks), cancel monthly (lapses), a promoter closes ML sync for a seller (grant + commission
  attributes), admin comp-grant ML sync from `/admin/tenants`.

## Sprint 6 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (or the branch Vercel preview pre-merge). Prereq: the prod Stripe
seed has run; `ml.sync_enabled` + `ml.sync_paywall_enabled` are ON (both already ON).

1. As a connected, **non-entitled** seller, open **`/shop/manage/mercadolibre`** (also reachable now from the
   seller panel → Crecer → **Mercado Libre**).
   → The sync section shows **"Activar — $299/año"** + **"o $30/mes"** buttons (no `/vende/promotor` link as the
     primary CTA).
2. Click **Activar — $299/año** → complete Stripe checkout. **[owed to Daniel — money]**
   → Returns to `/shop/manage/mercadolibre?ml_sync=activated`; the sync toggle is now available (entitled via
     the one-time grant).
3. As a different seller, click **o $30/mes** → complete checkout, then cancel the subscription in Stripe.
   → Entitled while active; after `customer.subscription.deleted` the toggle re-locks. **[owed to Daniel]**
4. As a bound **promoter**, POST `/api/promoter/close/ml-sync` (or via the close flow) for a target shop.
   → Stripe checkout on the promoter's card; on payment the shop gets the grant + the sale attributes to the
     promoter (`ml_sync` commission). **[owed to Daniel — money + auth]**
5. As an **admin**, open `/admin/tenants` → a shop → set the SKU selector to **Sincronización ML** → **Otorgar
   cortesía**.
   → The shop's `ml_sync_grant` is written; that seller can enable sync without paying. **[owed to Daniel — auth]**

If any step fails, note the step number + what you saw — that's the bug report.

## Out of scope (this sprint)
The promoter-close **UI** SKU-picker (route ships; small follow-up); cadence *switch* (monthly↔yearly, subdomain
has it to clone); the S5 US-15 durable-idempotency table (own PR); epic close-out (RETROSPECTIVE / poster /
LEARNINGS).
