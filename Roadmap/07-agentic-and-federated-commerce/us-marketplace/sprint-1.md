# US marketplace — Sprint 1: US commerce rails

**Status:** ⬜ not started

## Outcome

The United States becomes a real place in Medusa: a USD Region, a marketplace Sales Channel, a
publishable key, a stock location and a fulfillment set, all resolvable through the seam that already
has a US branch waiting for them. A merchant can create a shop whose operating market is `us` and price
a product in USD. Nothing is visible to a buyer yet — the market registry still reads `invitation` and
`/us` is unchanged. This sprint is backend only.

## Build contract

Filled by the architect before the builder starts. It must cite the locked `D` decisions and record the
live resource populations the provisioning script surveyed.

## Stories

### Story 1.1 — Provision and verify the US commerce resource pack

**As the** platform owner, **I want** one idempotent script that creates and verifies every Medusa
resource the US market needs **so that** US commerce rests on native primitives rather than shadow
tables.

**Acceptance:** Running it with `--dry-run` prints exactly what it would create and changes nothing.
Running it for real creates a USD Region for the United States, a US marketplace Sales Channel, a
publishable key scoped to it, a stock location and a fulfillment set with a service zone. Running it a
second time creates nothing and reports the existing resources. It surveys before it writes, refuses to
touch any Mexico resource, and reports an unreachable Medusa as **unavailable** rather than as "nothing
found". Mirrors the shape of `provision-mx-operating-channel.ts`.

**Risk:** low *(creates paid-tier resources on the live Medusa — the run against production is the
product owner's go-ahead, named as one action)*

### Story 1.2 — Resolve US Region and channel through the existing seam

**As a** developer, **I want** `market-medusa.ts` to answer with real US identifiers **so that** every
existing caller becomes US-capable without a single new branch.

**Acceptance:** `REGION_ENV_VARS.us` and `CHANNEL_ENV_VARS.us` name the US environment variables in both
repos, byte-identically. `resolveRegionIdForMarket('us', env)` returns the configured id, and returns a
named unavailable state — never Mexico's, never an empty string that reads as success — when the
variable is unset. The Mexico resolution path, including its deliberate `?? ''` legacy behaviour, is
unchanged. Both repos' unit specs cover the new branch and the MX branch still passes untouched.

**Risk:** low

### Story 1.3 — Let a merchant open a shop that operates in the US

**As a** merchant, **I want** my shop to operate in the United States **so that** my prices, cart and
checkout use USD.

**Acceptance:** Shop creation accepts an operating market and stores it through
`seller-market.ts` — no second country field, no migration. A US shop's prices validate against USD and
a USD-less product is rejected with a clear reason rather than silently priced in pesos. Existing shops
continue to resolve to `mx` through the documented `legacy_default` state. An invalid stored market
still fails closed and never becomes Mexico.

**Risk:** low

## Sprint QA

- **api spec(s):** market resolution matrix (`us` + `mx` + unknown) in both repos; seller
  operating-market write/read matrix; a US price-currency validation spec.
- **browser smoke owed:** no — there is no user-visible surface in this sprint.
- **deterministic gate:** `tsc --noEmit` + lint + `npm run build` + Playwright `api` green before merge.
- **regression:** both `markets.ts` golden specs; the market-catalog population guard; MX cart and
  checkout specs unchanged.
- **review:** LOW — no cross-family pass. Gate green ⇒ merge.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Run the provisioning script with `--dry-run` against production.
   → It lists the US Region, Sales Channel, publishable key, stock location and fulfillment set it would
     create, and states plainly that it will touch no Mexico resource.
2. (paid resources — owed to Daniel by name) Run it for real, then run it a second time.
   → The first run creates the resources and prints their ids; the second creates nothing and reports
     them as already present.
3. Open the Medusa admin and look at the Regions list.
   → Exactly two Regions: the existing Mexico/MXN one, unchanged, and the new United States/USD one.
4. Go to https://miyagisanchez.com/mx and open any product page.
   → Everything renders exactly as before, in pesos. This sprint must be invisible to Mexico.
5. Go to https://miyagisanchez.com/us
   → Still the existing page. The market is not open yet; that is Sprint 3.

If any step fails, note the step number + what you saw — that's the bug report.
