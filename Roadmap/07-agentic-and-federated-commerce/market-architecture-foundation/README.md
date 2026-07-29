---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: market-architecture-foundation
---

# Epic: Market architecture foundation — owned shops, country marketplaces, and locale

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high · **Class:** Feature · **Scope seed:**
> [`00-ideas/seeds/market-architecture-foundation.md`](../../00-ideas/seeds/market-architecture-foundation.md)

## Why

Miyagi must let a merchant operate an owned shop without pretending every shop belongs to one
Mexico marketplace. This epic makes market, locale, checkout region, and marketplace publication
four explicit concepts, moves the Mexico marketplace to `/mx`, turns `/` into the master-brand
selector, and keeps `/us` fail-closed as a private-pilot/invitation surface.

## Approved product contract

- Owned shops are borderless in product architecture but become operable only in explicitly
  supported markets.
- A shop does not need marketplace admission.
- Marketplace publication is country-specific.
- `/` is the market selector; `/mx` is the active Mexico marketplace; `/us` is invitation/private
  pilot until a later approval.
- Custom domains, subdomains, and embeds are tenant channels and remain outside country paths.
- Locale is presentation, never a proxy for currency, payment, shipping, tax, or marketplace.
- No cross-country mixed cart in v1.

## Medusa-first note

No new commerce model:

- Medusa **Region** remains the checkout country/currency/payment/fulfillment source.
- Medusa **Sales Channel** membership becomes marketplace-publication truth.
- The Medusa Seller's metadata carries its validated operating-market code.
- Owned shop reads use seller ownership plus product publish state and do not require marketplace
  Sales Channel membership.
- Frontend market/locale routing is a pure registry/resolver.
- Golden Beans receives stable market lifecycle fields but owns no market state.

Current code has the primitives but hard-codes one Mexico region/channel: `lib/medusa.ts` exports
`MXN_REGION_ID`, cart/listing paths prefer MXN, every create attaches the default sales channel,
`cleanup-default-data.ts` deletes every other channel, and `setup-mexico` deletes non-Mexico
regions. Those assumptions must be replaced before a US pilot can be safe.

## What already exists (reuse, don't rebuild)

- Medusa Region, Sales Channel, price, inventory, fulfillment, stock-location, and publishable-key
  modules.
- Seller module + metadata (`apps/backend/src/modules/seller/models/seller.ts`).
- Product↔Sales Channel links already created by seller product workflows.
- Existing platform/white-label channel resolver (`apps/miyagisanchez/lib/channel.ts`) and
  middleware that protects custom-domain/subdomain/embed behavior.
- Static ISR Mexico homepage at `app/(site)/page.tsx`.
- Existing canonical/robots/sitemap and locale dictionary infrastructure.
- Existing UCP/MCP marketplace search tools and Golden Beans event sender.
- Current Mexico region/setup routes and deterministic pricing/checkout specs.

## Stage-2.5 bucket

**Genuinely new architecture, mostly reusing native primitives.** The task is not to add another
country flag to copy. It is to remove the false one-market equivalence across routes, seller
identity, Sales Channels, Regions, prices, and agent reads.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | Pure market registry and invariant guard | high |
| 1 | Seller operating-market contract and MX backfill | high |
| 1 | Sales Channel marketplace-publication boundary | high |
| 1 | Region/currency resolver and removal of destructive single-market assumptions | high |
| 2 | `/` selector + canonical `/mx` marketplace cutover | high |
| 2 | Market-aware listing, shop, category, search, sitemap, and UCP reads | high |
| 2 | Locale/SEO contract and tenant-channel isolation | med |
| 3 | `/us` private-pilot/invitation surface | low |
| 3 | Fail-closed US catalog/publication and admin/agent visibility | high |
| 3 | Privacy-safe market lifecycle event contract | med |

## Architecture decisions — locked by the architect before any builder started (2026-07-28)

Every decision below was derived from the **live code and the live production database**, not from
this document. Builders **cite** these; they do not re-derive them. Where a decision corrects the
scope above, it says so out loud.

### D0 — Live state, re-derived 2026-07-28 against production

| Fact | Live value | Consequence |
|---|---|---|
| Medusa Regions | **exactly 1** — `reg_01KSK1HZAWN5ZCSPZ74ER97HD9` · Mexico · `mxn` · `[mx]` | There is **no US Region**. US checkout is fail-closed *by construction*, not by a guard. |
| Sales Channels | **exactly 2** — `sc_01KRVSGTDJ50SW7TF83M192ZNQ` "Default Sales Channel" (= `store.default_sales_channel_id`) and `sc_01KSK1J0V81P4EPY9G0JAPX353` "Miyagi Sánchez Storefront" (= env `MEDUSA_SALES_CHANNEL_ID`) | The MX marketplace channel is **`sc_01KSK1J0V81P4EPY9G0JAPX353`**. |
| Publishable keys | **1** — `apk_01KRVSGHN5KMCJSAMMYHRBD42W`, linked to the storefront channel only | The storefront already reads through the marketplace channel. |
| Published products | 77 channel-scoped (`/store/products` via the publishable key); 72 after the listings route's print-placement/support filters | The product-side MX backfill is at or near a **no-op**. Exact no-link count is owed by the S1 dry-run before the filter ships. |
| Sellers with published products | 18 | Small, hand-verifiable backfill population. |
| Sellers carrying `operating_market` | **0** — the key does not exist anywhere in either repo (grep-verified) | Story 1.2 is greenfield. |

`store.default_sales_channel_id` ≠ env `MEDUSA_SALES_CHANNEL_ID`. That divergence is **known,
harmless, and out of scope**: `seller-product-create.ts` prefers the env value, so real seller
products land on the marketplace channel. Do not "fix" it here.

### D1 — Scope correction: the Sales Channel filter is NEW enforcement, not a repair

The epic says marketplace reads must "filter product membership by resolved market Sales Channel".
**Today there is no sales-channel filter anywhere in the read path.** `GET /store/listings`,
`/store/listings/[id]`, search and category all run `remoteQuery.graph({ entity: 'product',
filters: { status: 'published' } })` with no channel constraint. So this story *adds* a boundary that
has never existed — which means switching it on can **hide** a product that is visible today.

Mandatory sequencing, non-negotiable: the S1 dry-run report must publish the count of published
products with **no** MX-marketplace-channel link, and that count must be reviewed **before** the
filter ships. A zero count makes this a no-op cutover; a non-zero count is a backfill, not a surprise.

### D2 — The market registry is one file, duplicated byte-for-byte in both repos

Written by the architect and placed in both worktrees before dispatch, precisely because a
*paraphrased* contract drifts permissive (`LEARNINGS.md`, bit five times):

- `apps/miyagisanchez/lib/markets.ts`
- `apps/backend/src/lib/markets.ts`

Zero imports. It owns `code · country_code · currency_code · default_locale · timezone ·
marketplace_status`, plus `isMarketCode` / `getMarket` / `requireMarket` / `isMarketplaceOpen` /
`marketBasePath` / `UnknownMarketError`. MX is `active`; US is `invitation`.

**Medusa Region ids and Sales Channel ids are NOT in the registry.** They are environment-resolved
and belong in each repo's own `market-medusa` seam (`resolveRegionIdForMarket`,
`resolveMarketplaceChannelId`), reading the existing `MEDUSA_MXN_REGION_ID` /
`MEDUSA_SALES_CHANNEL_ID` env vars for `mx` and returning `null` for `us`. An id in the registry
would be a lie in every environment but one.

Each repo owns a **golden spec** asserting every field of every record. Drift reddens one side's own
gate. Neither builder may edit `markets.ts` without saying so in its PR body.

### D3 — `requireMarket` rejects a locale, loudly

`requireMarket('es-MX')` throws with a message naming the actual mistake ("that looks like a LOCALE").
This is the registry's most important *negative* guarantee and the whole reason locale is modelled as
a field on the market rather than a parallel concept.

### D4 — Owned-shop reads never gain the channel filter

`/store/sellers/[slug]/products` and every tenant-channel read resolve by **seller ownership + product
publish state**. Adding a channel filter there is the failure this epic exists to prevent. The
deterministic proof is the S1 spec: *owned-visible + no channel membership ⇒ present on the owned
shop, absent from `/mx`.*

### D5 — Region resolution keeps its env var and gains one seam

`lib/cart.ts` passes `region_id: MXN_REGION_ID` at cart create. It becomes
`resolveRegionIdForMarket(market)` with the **same env var behind it** and `DEFAULT_MARKET` for
unspecified callers — a seam, not a behaviour change. `MXN_REGION_ID` stops being exported as a
public constant; call sites go through the resolver.

### D6 — The destructive setup scripts get an allow-list, not a rewrite

- `POST /internal/setup-mexico` step 6 deletes every region that is not the Mexico one. It becomes:
  never delete a region that a registry market resolves to; keep the existing price-safety re-check.
- `src/scripts/cleanup-default-data.ts` does `delete from sales_channel where id <> KEEP`. It becomes:
  protect **every** registry-declared channel id **and** `store.default_sales_channel_id`.
- This script has **never been run in production** (session journal, 2026-07-28). Both are latent
  landmine fixes, not live behaviour changes — say so in the PR rather than claiming a live effect.

### D7 — Route cutover shape: literal `mx/` and `us/` segments; middleware issues the 308s

**No root-level `[market]` dynamic segment.** It would shadow-compete with ~20 existing top-level
routes (`/vende`, `/account`, `/admin`, `/sell`, `/shop`, `/agent`, `/faq`, …) and turn every 404 into
a market-resolution question. Literal segments are statically analyzable, keep ISR/`generateStaticParams`
trivially working, and make "`/us` has no catalog child routes" a **structural** fact — the folder simply
does not contain them — which is exactly what Story 3.2 asks for.

**In scope for the prefix (and nothing else):** `/` → `/mx`, `/l`, `/l/[id]`, `/c/[collection]`,
`/s/[slug]`. Deliberately **out of scope**, staying un-prefixed: `/g/[slug]`, `/v/[slug]`,
`/e/[slug]`, `/vecindario`, `/comparador`, `/agent`, `/acerca`, `/vende/*`, `/sell`, `/shop`,
`/account`, `/admin`. This is a scope call, named here so the retrospective records it rather than a
reviewer discovering it: those surfaces are either non-catalog, seller-side, or single-market editorial,
and prefixing them triples the diff for no isolation gain.

- `app/(site)/page.tsx` → the master-brand selector (static, zero catalog).
- `app/(site)/mx/page.tsx` → today's marketplace homepage, moved verbatim, `revalidate = 60` preserved.
- `app/(shell)/mx/{l,l/[id],c/[collection],s/[slug]}` → thin route files over the **shared** page
  components. The un-prefixed paths remain in the tree because they are the **tenant rewrite target**;
  middleware 308s them on the platform host only.

### D7b — One prop carries the market base path; no host-sniffing inside components

The shop/PDP components are shared between the tenant rewrite (`/s/[slug]`, no prefix) and the
marketplace route (`/mx/s/[slug]`). They take a **`marketBasePath` prop** — `''` from tenant routes,
`marketBasePath('mx')` from marketplace routes — and build every internal link from it. Components
never read `headers()` to guess which they are; that is how a parallel scope list drifts
(`LEARNINGS.md`, platform-theme).

### D8 — The middleware redirect rule runs LAST, after every tenant branch returns

`middleware.ts` (459 lines) resolves subdomain → custom domain → embed → platform, and the tenant
branches **rewrite** to `/s/[slug]`. The new platform-host 308 (`/l`, `/l/*`, `/c/*`, `/s/*` →
`/mx/…`) must be added **below** all of them, so a tenant host never sees it. One hop, no chains; a
spec asserts the full redirect matrix and that a tenant host produces **no** `/mx` anywhere.

This is the single highest-risk edit in the epic.

### D9 — `/us` is one static page with zero children

`app/(site)/us/page.tsx`. There is no `app/(site)/us/l/`, no `us/search`, no `us/c`, no `us/s` — so
`/us/l/<real-mx-product-id>` is the app's ordinary 404 with no MX render. Copy is grounded in
`~/dobby/madmen/clients/miyagi-sanchez/us-operator-gtm-discovery-plan.md`, which **exists and is
approved-direction** (scope premise verified, not assumed) — but is explicitly *"hypotheses pending
interviews"*. The page therefore states a pilot invitation, never a validated claim, and honours that
brief's own "what not to build before interviews" list: no Amazon/eBay/Walmart parity claim, no
accounting replacement, no Veeqo/ShipStation parity, no open US marketplace.

### D10 — MCP/UCP: `market` in, `market_code` out, structured unavailable

`search_listings` and the marketplace catalog tools accept an optional `market`, default `'mx'`
(temporary, and labelled temporary in the tool description), and return `market_code` on every
result. `market: 'us'` returns a structured
`{ unavailable: true, market_code: 'us', marketplace_status: 'invitation', reason }` — **never** an
empty success and never another market's rows. Seller-operation tools stay shop-scoped and
market-neutral.

### D11 — `market_code` is a lifecycle-event TAG, and unknown means omitted

`buildLifecycleTrackPayload` in `lib/merchant-lifecycle.ts` already emits
`tags: { shop_id, product_count? }`. `market_code` joins it as a dimension. **When the market is
unknown, omit the tag** — the producer already omits absent fields, and defaulting a new event to
`mx` would write a permanent, unwithdrawable wrong fact (`LEARNINGS.md`, write-once/fail-closed).
Golden Beans owns no market state; verify the contract fixture by **matching bytes**, not by editing
the sibling repo.

### D12 — No database migration in this epic

`operating_market` lives in the Medusa `seller` model's existing `metadata` json column. There is no
DDL, so there is no `apply_migration` step and no `schema_migrations` realignment. The only
production mutation is **one idempotent MX backfill**, dry-run-reported first.

### D13 — Model routing (stated so the choice is auditable)

| Wave | Work | Model | Why |
|---|---|---|---|
| 1 | Backend Sprint 1 — registry seam, seller market, channel boundary, Region resolver, setup-script scoping, backfill dry-run | **Opus** | Defines the contract every later sprint imports; commerce authorization + catalog exposure. |
| 1 | Frontend Sprint 1 half — market-aware reads, degrade-closed, population guard | **Opus** | Shared `lib/` seam other epics import; the fail-closed rule lives here. |
| 2 | Frontend Sprint 2 — `/` selector, `/mx` cutover, middleware 308s, canonical/hreflang, sitemap, MCP market | **Opus** | Highest-risk edit in the epic (D8) and the public route surface. |
| 3 | Frontend Sprint 3 — `/us` page, fail-closed specs, admin/partner labels, event tag | **Sonnet** | Mechanical over a fully locked contract; no money path, no shared seam. |

Review is **inverted**: cross-agent review on every PR (`review-route.mjs` picks the family), and the
fresh `pr-reviewer` pass on every HIGH PR runs on the stronger model. The orchestrator never merges a
PR whose last-mile it wrote itself without a fresh independent pass.

### D14 — Branch and PR topology

Backend is one repo, frontend is another; they do not share a branch.

- `apps/backend` → `feat/market-architecture-foundation` → **one PR** (Sprint 1). Merges and deploys
  **first** (~12 min Cloud Build, no preview).
- `apps/miyagisanchez` → `feat/market-architecture-foundation` (S1) → `-s2` → `-s3`, **stacked**,
  one PR each, merged in order. Stacked because all three touch `lib/markets.ts` consumers, the
  middleware and the route tree — siblings off one base would pay a per-merge conflict tax.
- The frontend must **degrade closed** while the backend market filter is absent: an unavailable or
  unknown market returns the structured unavailable state, never the unfiltered Mexico catalog.

## Pre-launch execution model

Build as one epic-mode session. Sprint files are integration/review/rollback boundaries and may be
stacked; they are not instructions to run three isolated production lifecycles.

- No dual homepage or dual write path.
- One clean route cutover, with only permanent redirects for old indexable marketplace URLs.
- One explicit MX backfill over the pre-launch population.
- No US money/shipping smoke in this epic because those capabilities are out of scope.
- All market isolation, auth, Medusa data ownership, redirect, canonical, and existing Mexico
  checkout gates remain mandatory.

## Kill-switch decision

**No runtime flag for the route/data-contract cutover.** The project is pre-launch with no
meaningful traffic or real tenant/transaction population. Keeping both canonical route systems
behind a flag would introduce more surface and ambiguity than rollback by deploy.

US marketplace publication fails closed through the market registry
(`marketplace_status: invitation`) and absence of US Sales Channel assignment. The future
US-commerce money/fulfillment epic makes a separate flag decision.

## Deploy order

Backend contract first: market registry, seller operating market, Sales Channel filter, region
resolver, and guards. Frontend market-prefixed reads must degrade closed if the backend market
filter is unavailable—never show the unfiltered Mexico catalog under `/us`.

Then cut over the frontend routes, metadata, sitemap, and agent descriptions. The `/us` invitation
surface lands last. Builders write migrations/setup scripts but do not apply shared/prod DB changes
from the build session; Daniel performs any live Medusa setup/backfill after reviewing the dry-run
report.

## Explicit non-goals

- US checkout, USD prices, payment providers, KYC, taxes, shipping, or returns.
- Open US marketplace or seller-review workflow.
- Cross-border carts or fulfillment.
- Multiple country deployments.
- Miyagi Channels/Ledger/Dispatch feature work.
- Golden Beans commerce or CRM state.

## Epic-mode builder kickoff

Paste this into one long-running build task:

> Read `AGENTS.md`, `Roadmap/WAYS-OF-WORKING.md`, `Roadmap/LEARNINGS.md`, and skim team memory.
> Then read this epic README plus `sprint-1.md`, `sprint-2.md`, and `sprint-3.md` in full.
>
> Build the entire `market-architecture-foundation` epic in **epic mode**. The scope and three
> integration boundaries are already approved; do not stop for sprint-by-sprint plan confirmation.
> Re-derive current code and live-schema assumptions before editing, and stop only for a real
> contradiction, an uncovered product decision, an unsafe production mutation, or two failed
> attempts at the same blocker.
>
> Preserve the integration order: (1) market/Medusa contract and isolation, (2) `/` + `/mx` route
> cutover and Mexico continuity, (3) `/us` invitation and fail-closed boundary. Keep per-story,
> path-scoped commits and use isolated worktrees in the frontend/backend app repositories. Backend
> changes land before frontend consumers; frontend must fail closed while the backend market filter
> is absent. Do not apply shared/prod migrations or setup/backfills—write and dry-run them, then hand
> the exact reviewed command to Daniel.
>
> This is pre-launch: do not build dual canonical systems, long-lived legacy write paths, or
> production ceremony for US users/orders that do not exist. Do keep deterministic gates for market
> isolation, owned-shop-vs-marketplace visibility, Region/currency resolution, auth, redirects,
> canonical/alternate metadata, existing Mexico checkout, and tenant-channel routing.
>
> Use the current `WAYS-OF-WORKING.md` review stack on every PR. Scope approval means you may continue
> across all three boundaries without re-asking; merge authority and production mutations still
> follow the task's explicit authorization and HIGH-risk rules. Update sprint docs as each boundary
> lands, close the retrospective/poster/memory/LEARNINGS once, and regenerate `BUILD-ORDER.md` at
> epic close.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] Existing Mexico marketplace and checkout behavior pass under `/mx`
- [ ] US catalog/publication fails closed
- [ ] Seller operating market, Region, Sales Channel, and locale are separate tested concepts
- [ ] Owned-shop visibility is tested independently from marketplace publication
- [ ] Custom-domain/subdomain/embed routing remains stable
- [ ] Canonical, hreflang/x-default, sitemap, and redirect checks pass
- [ ] Shared/prod setup/backfill is dry-run reviewed and only Daniel applies it
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** no route flag by approved pre-launch decision; US publication is structurally
      fail-closed
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** and
      `node scripts/build-order.mjs` run
