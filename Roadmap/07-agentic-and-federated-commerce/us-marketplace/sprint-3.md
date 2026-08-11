# US marketplace — Sprint 3: `/us` becomes a marketplace

**Status:** ⬜ not started

## Outcome

The United States opens. The registry flips from `invitation` to `active`, `/us` becomes the marketplace
home instead of a pilot page, and the listing, product and shop routes serve US shops in English on the
rails Sprint 1 provisioned. AI agents asking for `market=us` get the same catalog. Buying is Sprint 4 —
a buyer can browse and reach a product page, and the buy action tells them checkout is coming rather
than pretending to work.

## Build contract

Implement D1, D8 and D12–D13. The status flip is exactly frontend `lib/markets.ts` +
`e2e/markets-registry.spec.ts` and backend `src/lib/markets.ts` +
`src/lib/__tests__/markets.unit.spec.ts`, coordinated so neither deploy observes a mixed registry. Before
merge, authenticated diagnostics must prove the S1 Region, both channels, operating-only key, stock
location and fulfillment graph resolve in staging and production; otherwise the flip stops.

Keep the existing shared catalog/page implementations and add literal `/us` adapters matching the MX
population; do not rewrite working adapters into a dynamic tree. Extract a shared market home and retire
only `/us`'s recruiting ownership, preserving `/partner`. Carry named unavailable state to UI/agents,
require a positive USD product price, add `/us/l` to sitemap, and fix UCP/MCP locale/manifest vocabulary.
Until S4 is live, the permanent commerce-readiness result suppresses `buy_now` with an honest reason.

## Stories

### Story 3.1 — Open the US market and serve its catalog

**As a** US buyer, **I want** `/us` to be a real market **so that** US shops and listings are
discoverable.

**Acceptance:** `us.marketplace_status` is `active` in both repos' `markets.ts`, byte-identically, and
both golden specs are updated in the same commit. `isMarketplaceOpen('us')` is true and US catalog reads
return only products in the US marketplace Sales Channel. A US read never returns a Mexico row and a
Mexico read never returns a US row — proven in both directions. A missing or unresolvable US resource
returns a named unavailable state, never an MX fallback and never a silent empty list.

**Risk:** low

### Story 3.2 — Parameterize the listing, product and shop routes by market

**As a** buyer in either country, **I want** `/us/l`, `/us/l/<id>` and `/us/s/<slug>` to work exactly as
their Mexico equivalents do **so that** there is one marketplace, not two codebases.

**Acceptance:** Literal MX and US adapters call the same shared listing, product and shop
implementations with explicit market context. Every existing Mexico URL resolves unchanged — same paths,
rendering and metadata — proven by regression specs. A Mexico product id under `/us/l/<mx-id>` is a 404
or named unavailable, never the Mexico product. Shop sub-routes (`/acerca`, `/faq`, `/politicas`, `/c`)
come along. No second design system and no duplicated page implementation.

**Risk:** low

### Story 3.3 — Turn `/us` into the US marketplace home

**As a** US buyer, **I want** a marketplace home page **so that** I can start browsing.

**Acceptance:** `/us` renders the marketplace home — categories with listings, search entry, featured
selection — in en-US, using the same components as `/mx`. The private-pilot invitation copy is gone.
Metadata, canonical URL, OG image, `robots` and the sitemap cover the US surface and are consistent with
the resolved locale. Server-rendered and readable without JavaScript. The CDN TTL is bounded, matching
the fix already applied to `/` and the old `/us` page.

**Risk:** low

### Story 3.4 — Give agents full `market=us` parity

**As an** AI agent, **I want** the US catalog through the same contracts I already use **so that** the
web and agent channels cannot disagree.

**Acceptance:** UCP catalog and detail endpoints and the MCP tools accept `market=us`, return only US
marketplace members, and echo `market_code: us` on every result. An unknown market stays fail-closed.
The manifest documents US availability. Mexico agent behaviour is unchanged, proven by spec.

**Risk:** low

## Sprint QA

- **api spec(s):** market isolation in both directions; route parameterization regression across every
  MX URL; sitemap/SEO/metadata specs for both markets; UCP/MCP `market=us` contract specs plus an
  unknown-market negative; a population meta-test so a green-by-skip catalog check cannot pass.
- **browser smoke owed:** no — anonymous `live-smoke` on `/us`, one US listing page and one US shop page,
  plus an MX non-regression pass.
- **deterministic gate:** `tsc --noEmit` + lint + `npm run build` + Playwright `api` green before merge.
- **review:** LOW — no cross-family pass. Gate green ⇒ merge.

## Sprint 3 — Smoke walkthrough (do these in order)

Env: preview first, then production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/us
   → The US marketplace home, in English. No "private pilot" or "working hypothesis" copy anywhere.
2. Browse to https://miyagisanchez.com/us/l
   → A listing grid of US shops' products, priced in USD, with filters that work.
3. Open any US listing, then its shop page.
   → Product page renders in English with a USD price; the shop page and its sub-pages load.
4. Take a Mexico product id and try https://miyagisanchez.com/us/l/&lt;that-mx-id&gt;
   → 404 or a clear unavailable message. It must never render the Mexico product.
5. Go to https://miyagisanchez.com/mx and repeat step 2 and 3 there.
   → Identical to before this epic started. Same URLs, same Spanish, same pesos.
6. Fetch the UCP catalog with `market=us`, then with `market=mx`, then with `market=fr`.
   → US rows with `market_code: us`; MX rows with `market_code: mx`; a clean fail-closed error for `fr`.

If any step fails, note the step number + what you saw — that's the bug report.
