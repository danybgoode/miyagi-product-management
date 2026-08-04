# US operator commerce pilot — Sprint 2: Establish an isolated US owned-shop commerce lane

**Status:** ⬜ not started

## Outcome

The three approved cohort shops resolve to an inert, explicitly configured USD/US owned-shop commerce graph,
and one partner identity can access only its merchant-granted shops. Missing resources or a disabled flag
fail closed; MX commerce and a fourth shop remain unchanged.

## Build contract — architect must lock before delegation

Before a builder starts, cite the epic's `D1…Dn` decisions and Sprint 1 `GO` here. Name the literal live Medusa
resource populations/IDs per environment, setup/verify workflow and rollback, publishable-key resolver and all
Store API consumers, current seller-market writer, cohort representation, #US-2/partner-grant authorization
helpers, Golden flag catalog/default and the exact fourth-shop denial fixture. Replace every smoke placeholder
with a literal disposable cohort URL before implementation begins.

## Stories

### Story 2.1 — Provision and verify the US resource pack

**As the platform owner, I want** an idempotent US resource setup and verification workflow **so that** each
environment has the same explicit USD commerce graph and a rehearsed rollback.

**Acceptance:**

- The workflow creates or verifies one USD/US Region, US owned-shop operating Sales Channel, linked
  publishable key, stock location, fulfillment set/service zone and the locked payment/fulfillment providers.
- Repeated runs create no duplicates. A read-only verify/dry-run names known-present, known-absent and
  unavailable separately; mismatches fail the go-live check and never resolve to MX.
- No US marketplace channel is created and no US product is linked to an MX or marketplace channel.
- IDs are configured per environment through the existing market-resource resolver and a tested disable/
  rollback runbook ships with setup.

**Risk:** high — production commerce resources. **QA:** pure setup-plan and injected-I/O tests, idempotency/
drift/unavailable matrix, dry-run evidence and staging resource inspection. Builder never applies production
setup; Daniel separately authorizes any live resource mutation.

### Story 2.2 — Route storefront and checkout by operating market

**As a US owned-shop buyer, I want** every catalog/cart/checkout request scoped to the US channel and Region
**so that** I cannot see or buy through Mexico resources by accident.

**Acceptance:**

- The resolved shop market selects the US publishable key, Region, operating channel, currency, stock location,
  payment, tax and fulfillment context across server/client calls. Callers cannot override it with market/
  channel input.
- US catalog/cart use USD; requested MXN price or MX channel is rejected. MX continues to use its existing key
  and resources.
- Missing US dependency or OFF/unavailable runtime gate blocks publication/mutation, cart, checkout, payment
  and label actions with an actionable unavailable state; there is no MX/manual fallback.
- The key/channel/resource population guard reddens when a new Store API source root or caller bypasses the
  resolver.

**Risk:** high — shared commerce/routing seam. **QA:** backend/frontend market-resource matrix, Store API
population/meta-guard, USD/MXN rejection, flag OFF/provider-unavailable cases, typecheck/lint/build and staging
browser smoke proving US isolation plus MX non-regression.

### Story 2.3 — Activate exactly three shops under scoped partner grants

**As the founding operator, I want** one identity to switch among my three consented shops **so that** I can
run the cohort without inheriting access to any other merchant.

**Acceptance:**

- `#US-2` activation is live; each merchant's accepted consent creates an explicit manager/viewer grant through
  the existing authorized rail. Operator track/status and nominated URLs create no access.
- Mutating routes resolve the target from authenticated ownership/grant; caller-supplied IDs/slugs/market and
  program status never authorize. Every contract cites the shipped auth helper rather than paraphrasing it.
- Grant/role/mutation/revocation events are auditable; revoke applies on the next server request.
- A four-shop matrix proves manager/viewer/revoked/ungranted reads and writes with no catalog, order, customer,
  economics or credential leak.

**Risk:** high — authorization/tenant boundary. **QA:** per-object auth and population matrix, tenant-leak
regressions, audit assertions, concurrent revoke/use test and Daniel grant/revoke/switch-shop browser smoke.

## Sprint QA

- **Backend specs:** resource-plan/verify idempotency; market resolver; key/channel/Region/stock/payment/
  fulfillment matrix; OFF/unavailable behavior; partner-grant object authorization and audit.
- **Frontend specs:** market-key selection, unavailable state, shop switcher and fourth-shop denial; existing MX
  catalog/cart/checkout regression.
- **Mutation proof:** every new spec is observed red once, including the negation of the US/MX and three/four
  shop boundary.
- **Owner smoke owed:** Daniel authorizes any live Medusa resource/Golden change, then walks grant/revoke in a
  disposable partner session. Flag remains OFF for public checkout.
- **Review:** stacked HIGH PR(s), backend before frontend; mandatory cross-family and fresh reviewer on fixed tip,
  Daniel merge.

## Sprint 2 — Smoke walkthrough

Env: preview/staging until Daniel authorizes live resources · https://miyagisanchez.com

1. With `markets.us_operator_pilot_enabled` OFF, go to https://miyagisanchez.com/us.
   → The current US invitation remains; no public US catalog or checkout appears.
2. Run the reviewed US resource verifier in read-only mode for the target environment.
   → It names one USD Region, one US operating channel/key and the locked stock/payment/fulfillment graph, or
   reports the exact absent/unavailable item; it never prints an MX fallback as US-ready.
3. Open the literal disposable US owned-shop URL locked above.
   → Its catalog/cart context is USD and US-scoped; with the flag OFF, mutating/checkout actions are unavailable.
4. Open the locked MX regression shop and add its existing product to cart.
   → MXN, MX channel/Region and existing checkout behavior are unchanged.
5. **Auth step — owed to Daniel:** sign in as the disposable operator at https://miyagisanchez.com/partner and
   switch among the three granted cohort shops.
   → Each granted shop appears with the assigned role; viewer mutations are denied.
6. Attempt the same read/mutation against the locked fourth shop, then revoke one cohort grant and retry.
   → Both are denied immediately and no data from either shop appears in the response or audit payload.

If any step fails, record the URL, market, flag, actor/grant and resource-verifier state.
