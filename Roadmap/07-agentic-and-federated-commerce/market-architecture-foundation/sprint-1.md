# Market architecture foundation — owned shops, country marketplaces, and locale — Sprint 1: Market contract and Medusa region/channel foundation

**Status:** ✅ shipped — backend [#124](https://github.com/danybgoode/medusa-bonsai-backend/pull/124) merged 2026-07-30, frontend [#324](https://github.com/danybgoode/miyagisanchezcommerce/pull/324) merged. Live in production (backend image `99ac78b`).

## D1 gate — CLOSED, verified against production 2026-07-31

D1 made this non-negotiable: the marketplace Sales Channel filter is **new enforcement**, so
switching it on could **hide** a product that was visible before, and the no-link count had to be
reviewed before the filter shipped. Recording the answer here, because a gate whose result is not
written down is a gate nobody can audit later.

| Check | D0 prediction (2026-07-28) | Live measurement (2026-07-31) | Verdict |
|---|---|---|---|
| Catalog size after the listings route's print-placement/support filters | 72 | **72** (`GET /api/ucp/catalog` → `total`) | **exact match — the filter hid nothing** |
| Market echo on the public catalog | `market_code` on every result | `market_code: "mx"` | contract holds |
| Live marketplace channel | `sc_01KSK1J0V81P4EPY9G0JAPX353` | same, in `medusa-web` env | unchanged |

The cutover was therefore a **no-op on catalog visibility**, exactly as D0 predicted, and the MX
backfill was at or near a no-op. No product was hidden by the boundary going live.

Fail-closed behaviour, verified live on the same endpoint:

| Request | Response |
|---|---|
| `?market=us` | `{"unavailable":true,"market_code":"us","marketplace_status":"invitation","reason":"marketplace_not_open"}` |
| `?market=es-MX` (a LOCALE, D3) | `{"unavailable":true,"market_code":null,"marketplace_status":null,"reason":"unknown_market"}` |
| `?market=zz` (unknown) | `{"unavailable":true,...,"reason":"unknown_market"}` |

Never an empty success, never another market's rows.

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

**As a** shop owner, **I want** marketplace discovery to use explicit Sales Channel membership
without changing my owned-shop read boundary, **so that** operating a shop and joining Miyagi
Markets remain separate concepts while every product this epic creates stays buyable.

> **Scope correction — D12b:** owned-shop-only *reads* are proven here, but creating a buyable
> owned-shop-only product is deferred to the operating-channel follow-up. A channel-less product
> renders and then fails Store API lookup/checkout, so this epic refuses that half-capability rather
> than shipping an unsellable listing.

**Acceptance:**

- The existing storefront Sales Channel is explicitly treated/renamed as the MX marketplace
  channel without changing its stable identifier.
- Marketplace list/search/category/PDP authorization filters product membership by resolved market
  Sales Channel.
- Owned shop/subdomain/custom-domain/embed reads use seller ownership + product publish state and do
  not require marketplace channel membership.
- Product create derives publication from the owning seller's validated market, refuses
  cross-market/unsupported writes, and refuses the retired `publish_to_market: null` shape until an
  operating Sales Channel exists.
- A deterministic spec proves: owned-visible + no channel membership ⇒ visible on owned shop,
  absent from `/mx`; this is a read-boundary fixture, not a claim that the current create seam can
  produce a sellable channel-less product.

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

## Build contract (locked by the architect before the builder started)

Cite `README.md` decisions **D0–D6, D12, D14**; do not re-derive them. Live production state was
re-derived on 2026-07-28 and is in **D0** — read it before writing a backfill.

**Already placed in your worktree, do not rewrite:** `src/lib/markets.ts` (backend) /
`lib/markets.ts` (frontend). It is byte-identical across both repos by design (**D2**). If you
believe it is wrong, say so in the PR — do not silently edit one copy.

**Backend PR — `apps/backend`, branch `feat/market-architecture-foundation` (HIGH):**

1. `src/lib/market-medusa.ts` — `resolveRegionIdForMarket(code, env)` and
   `resolveMarketplaceChannelId(code, env)`. `mx` → `MEDUSA_MXN_REGION_ID` /
   `MEDUSA_SALES_CHANNEL_ID`; `us` → `null` (there is no US Region or channel — **D0**). Unknown ⇒
   throw `UnknownMarketError`. Pure over an injected env object so it unit-tests with no process env.
2. `src/lib/seller-market.ts` — the **one** reader/writer of
   `seller.metadata.operating_market`. No caller parses that JSON ad hoc. A legacy read with no value
   resolves to `DEFAULT_MARKET` and says so in a comment naming the pre-launch window (**D2**); a
   *write* requires an explicit supported market. An unsupported market must not inherit Mexico
   Stripe/shipping settings — assert that in a spec.
3. Marketplace read boundary (**D1** — this is NEW enforcement): `/store/listings`,
   `/store/listings/[id]`, search and category filter product membership by the resolved market
   channel. Owned-shop / seller-scoped reads do **not** (**D4**).
4. `seller-product-create.ts` — derive publication from the owning seller's validated market instead
   of blindly attaching `MEDUSA_SALES_CHANNEL_ID`; refuse cross-market/unsupported writes and the
   retired channel-less `publish_to_market: null` shape (**D12b**). Preserve the existing
   draft-then-link-then-publish ordering; it exists because an interrupted create stranded a live
   orphan listing in production.
5. `setup-mexico` step 6 and `cleanup-default-data.ts` step 3 gain the registry allow-list (**D6**).
   Neither has ever run against production for the channel path — do not claim a live effect.
6. `GET /internal/market-backfill` — a **fully read-only** dry-run report: per-seller current vs
   proposed `operating_market`, per-product marketplace-channel link state, and an explicit count of
   published products with **no** MX channel link. Aborts on an unknown-market population rather than
   guessing. `POST` applies, idempotently. The builder **never runs the POST**.

**Frontend PR — `apps/miyagisanchez`, branch `feat/market-architecture-foundation` (HIGH):**

7. `lib/market-medusa.ts` mirroring (1), and `lib/listings.ts` read helpers take/derive a `market`.
8. **Degrade closed** (**D14**): if the backend market filter is absent or the market is unknown or
   `invitation`, return the structured unavailable state — never the unfiltered Mexico catalog.
9. `lib/cart.ts` cart-create goes through `resolveRegionIdForMarket` with `DEFAULT_MARKET` for
   unspecified callers (**D5**). MX cart behaviour is byte-unchanged; prove it with the existing
   checkout contract specs.
10. A **population guard** spec that enumerates public marketplace list/detail entry points
    mechanically (glob the route tree, don't hand-list) and asserts each one applies the market filter.
    Guard the population, not the door you found.

**Mutation proof (Definition of Done):** remove the market Sales Channel filter and the exposure spec
must go red. A spec never observed red is not known to test anything.

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
