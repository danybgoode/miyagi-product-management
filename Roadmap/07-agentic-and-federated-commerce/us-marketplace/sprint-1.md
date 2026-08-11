# US marketplace — Sprint 1: US commerce rails

**Status:** ⬜ not started

## Outcome

The United States becomes a real place in Medusa: a USD Region, separate operating and marketplace Sales
Channels, a publishable key, a stock location and a fulfillment set. The backend can create a fresh shop
whose operating market is `us` and proves its USD currency policy, but normal US marketplace product
creation remains deliberately refused while the market is `invitation`; S3 owns the first real USD
product. Nothing is visible to a buyer and `/us` is unchanged. This sprint is backend only.

## Build contract

Implement D2–D8 from the epic lock. Target backend `origin/main` `af92156`. The production baseline is
one MXN Region, three channels (default + MX marketplace + MX operating), one key/link, two stock
locations, one MX fulfillment set, 27 explicit-MX sellers and 77 correctly published MX products. US is
absent. Staging is unavailable until the new survey route is deployed, so implementation may land but no
apply may run there or in production until that route records the target environment's own graph.

The provisioner is authenticated internal `GET` dry-run + `POST` apply, not a production laptop script.
It covers USD store support, Region/country/tax region, operating + marketplace channels, an operating-only
key, stock location and both channel links, manual provider, fulfillment set and US service zone. Deploy
prune/key blockers before creating rows; after apply, set D4's public resource IDs on Cloud Run, redeploy
and verify all keep sets. Inventory selection is market-scoped. S1 tests the explicit seller-market writer
and USD policy but retains the invitation publication refusal; the first actual USD product moves to S3.

## Stories

### Story 1.1 — Provision and verify the US commerce resource pack

**As the** platform owner, **I want** one idempotent script that creates and verifies every Medusa
resource the US market needs **so that** US commerce rests on native primitives rather than shadow
tables.

**Acceptance:** Running it with `--dry-run` prints exactly what it would create and changes nothing.
Running it for real creates a USD Region for the United States, US operating and marketplace Sales
Channels, a publishable key linked only to the operating channel, a stock location and a fulfillment set
with a service zone. Running it a
second time creates nothing and reports the existing resources. It surveys before it writes, refuses to
touch any Mexico resource, and reports an unreachable Medusa as **unavailable** rather than as "nothing
found". It first installs blockers that protect the full configured channel/key population even while US
is invitation-only, and verifies both directions of every link after creation.

**Risk:** low *(native Medusa rows do not buy a new cloud tier; stop only if the survey reveals an actual
paid provider/cloud action)*

### Story 1.2 — Resolve US Region and channel through the existing seam

**As a** developer, **I want** `market-medusa.ts` to answer with real US identifiers **so that** every
existing caller becomes US-capable without a single new branch.

**Acceptance:** The backend's total resource table and the frontend's literal browser-visible env table
name D4's US variables. The structured resolver returns `resolved | no_resource | unconfigured` — never
Mexico's resource and never an empty string that reads as success. Thin `*IdForMarket` helpers may remain
`string | null`; callers that must distinguish absence consume the structured result. MX names and
behavior are unchanged. Both repos' specs cover US/MX/unknown and the two contracts are intentionally
equivalent, not falsely asserted byte-identical.

**Risk:** low

### Story 1.3 — Let a merchant open a shop that operates in the US

**As a** merchant, **I want** my shop to operate in the United States **so that** my prices, cart and
checkout use USD.

**Acceptance:** Backend shop creation accepts an explicit operating market and stores it through
`seller-market.ts` — no second country field, no migration. Omission keeps the documented MX
`legacy_default`; invalid stored values fail closed; a conflicting request for an existing shop is
rejected. Pure and route specs prove a US shop derives USD and rejects a caller-selected foreign
currency. Normal US marketplace product creation remains blocked by invitation status; S3 requires a
positive USD price when that guard is lifted.

**Risk:** low

## Sprint QA

- **api spec(s):** market resolution matrix (`us` + `mx` + unknown) in both repos; seller
  operating-market write/read/idempotency matrix; a US price-currency policy spec; invitation-stage
  product refusal; market-scoped stock-location matrix.
- **browser smoke owed:** no — there is no user-visible surface in this sprint.
- **deterministic gate:** `tsc --noEmit` + lint + `npm run build` + Playwright `api` green before merge.
- **regression:** both `markets.ts` golden specs; the market-catalog population guard; MX cart and
  checkout specs unchanged.
- **review:** LOW — no cross-family pass. Gate green ⇒ merge.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Call the authenticated provisioning `GET` dry-run against staging, then production.
   → It lists the US Region, both Sales Channels, publishable key, stock location and fulfillment set it would
     create, and states plainly that it will touch no Mexico resource.
2. Call the explicit apply, then call it a second time.
   → The first run creates the resources and prints their ids; the second creates nothing and reports
     them as already present.
3. Open the Medusa admin and look at the Regions list.
   → Exactly two Regions: the existing Mexico/MXN one, unchanged, and the new United States/USD one.
4. Go to https://miyagisanchez.com/mx and open any product page.
   → Everything renders exactly as before, in pesos. This sprint must be invisible to Mexico.
5. Go to https://miyagisanchez.com/us
   → Still the existing page. The market is not open yet; that is Sprint 3.

If any step fails, note the step number + what you saw — that's the bug report.
