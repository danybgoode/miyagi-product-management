# Market architecture foundation — owned shops, country marketplaces, and locale — Sprint 1: Market contract and Medusa region/channel foundation

**Status:** ⬜ not started

## Epic-mode boundary

This is the data/commerce contract boundary. Build it first in the same long-running epic session;
do not activate a US checkout or create a US marketplace here.

## Stories

### Story 1.1 — Pure market registry and invariants

**As the** platform, **I want** one versioned registry for supported markets, **so that** country,
locale, Region, Sales Channel, and marketplace status cannot drift across routes.

**Acceptance:**

- One zero-import pure module defines `mx` and `us` and is reusable by backend/frontend tests.
- Each record has market code, country code, currency, default locale, timezone, marketplace status,
  and environment-resolved Region/Sales Channel identifiers.
- MX is `active`; US is `invitation`.
- Invalid/unknown market fails explicitly.
- A locale cannot be passed where a market is required.
- A population guard finds public marketplace queries that bypass market Sales Channel filtering.

**Risk:** high (load-bearing commerce/routing contract)

### Story 1.2 — Seller operating-market contract and MX backfill

**As a** merchant, **I want** my shop's operating market recorded independently from marketplace
publication, **so that** my owned shop can exist before admission to a market.

**Acceptance:**

- Seller metadata carries a validated `operating_market` through one helper; callers never parse the
  JSON ad hoc.
- Existing sellers resolve/backfill to `mx`; missing values on legacy reads remain MX during this
  pre-launch migration only.
- New shop creation requires or deliberately defaults an approved market at the entry seam; no
  country inferred from browser locale.
- An unsupported market cannot silently inherit Mexico Stripe/shipping settings.
- Shop/UCP reads expose market code without exposing sensitive seller metadata.

**Risk:** high (seller/checkout boundary)

### Story 1.3 — Sales Channel is marketplace-publication truth

**As a** shop owner, **I want** an owned product to exist without marketplace publication, **so
that** operating a shop and joining Miyagi Markets are independent choices.

**Acceptance:**

- The existing storefront Sales Channel is explicitly treated/renamed as the MX marketplace
  channel without changing its stable identifier.
- Marketplace list/search/category/PDP authorization filters product membership by resolved market
  Sales Channel.
- Owned shop/subdomain/custom-domain/embed reads use seller ownership + product publish state and do
  not require marketplace channel membership.
- Product create no longer blindly publishes to every/default market channel; call sites state
  their publication intent.
- A deterministic spec proves: owned-visible + no channel membership ⇒ visible on owned shop,
  absent from `/mx`.

**Risk:** high (catalog exposure)

### Story 1.4 — Region resolver and single-market assumption removal

**As the** checkout system, **I want** market to resolve the Medusa Region and currency, **so that**
later US commerce cannot accidentally use Mexico rails.

**Acceptance:**

- Cart creation/checkout starts from a market→Region resolver; current unspecified calls resolve MX
  for backward compatibility.
- Price display/write helpers stop using locale or hard-coded MXN as market selection.
- `setup-mexico` stops deleting every non-Mexico Region and becomes scoped to MX.
- `cleanup-default-data.ts` stops deleting every non-default Sales Channel and protects all
  registry-declared channels.
- Dry-run setup/backfill reports show exactly which sellers/products/channels would change and abort
  on unknown population.
- This sprint does not create/activate a US Region or US payment/fulfillment providers.

**Risk:** high (money/data setup)

## Sprint QA

- **Backend unit:** market registry, seller-market parser, Region resolution, protected-channel
  cleanup plan, and unknown-market fail-closed cases.
- **Frontend api specs:** owned-shop vs marketplace-channel visibility; market filter population
  guard; existing MX cart contract.
- **Mutation proof:** remove the market Sales Channel filter and the exposure spec must fail.
- **browser smoke owed:** no US buyer/shop smoke; Daniel only reviews and later runs the dry-run
  setup/backfill against the shared environment.
- **deterministic gate:** backend unit/type/build + frontend `tsc --noEmit`, build, and Playwright
  `api` green before integration.

## Sprint 1 — Smoke walkthrough

Env: local/preview first; shared/prod writes owed to Daniel after dry-run review.

1. Create/pick an MX shop and a published product assigned to the MX marketplace channel.
   → Product appears in the MX market query and on the owned shop.
2. Remove only the product's MX marketplace-channel assignment in the disposable fixture.
   → Product disappears from the MX market query but remains on the owned shop.
3. Resolve an unknown market and a `us` marketplace read while status is `invitation`.
   → Both fail closed; neither returns the MX catalog.
4. Run the setup/backfill script without apply.
   → Report names current sellers/products/channel actions; nothing is written.
5. Run existing Mexico checkout contract tests.
   → MX Region/currency behavior remains unchanged.

If any step fails, note the step number + what you saw — that's the bug report.
