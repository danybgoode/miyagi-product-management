---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
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
