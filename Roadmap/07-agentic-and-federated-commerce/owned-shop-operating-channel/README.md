---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: owned-shop-operating-channel
---

# Epic: Owned-shop operating channel — make a shop sellable without marketplace admission

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high · **Class:** Feature · **Scope seed:**
> [`00-ideas/seeds/owned-shop-operating-channel.md`](../../00-ideas/seeds/owned-shop-operating-channel.md)

## Why

`market-architecture-foundation` promised that **a shop does not need marketplace admission**. That is
true today for **reads** — an owned-shop product renders on its shop page, subdomain, custom domain and
embed with no marketplace membership at all. It is **not** true for **money**: a product in no Medusa
Sales Channel 404s on the channel-scoped `/store/products` endpoint and fails checkout with "Product not
found".

So a merchant cannot currently say *"sell this on my own shop, don't list it in the Mexico
marketplace."* The parent epic **removed** that capability rather than ship a listing you can render and
cannot sell. This epic builds the thing that makes it honest: a second channel per market that carries
**buyability**, leaving the marketplace channel to mean **publication** and nothing else.

## Medusa-first note

No new commerce model — this is Medusa's own Sales Channel primitive used twice instead of once:

- **Operating channel** (new, one per market) — every product belonging to a shop whose
  `operating_market` is that market joins it. Membership here is what makes a product **buyable**: cart,
  checkout and the storefront publishable key resolve against it.
- **Marketplace channel** (`sc_01KSK1J0V81P4EPY9G0JAPX353` for MX) — only products the seller published
  into the country marketplace. Stays publication truth, **unchanged**.

"Operating" and "published" become genuinely independent facts, which is what the parent epic's contract
asked for. Medusa Region still owns checkout country/currency/payment/fulfillment. The Seller's metadata
still carries `operating_market`. No new table, and — pending the S1 re-derivation — no DDL.

## What already exists (reuse, don't rebuild)

- `apps/backend/src/lib/market-medusa.ts` — the env-resolved seam. `MARKET_MEDUSA_ENV_KEYS` already maps
  each market to `region` + `marketplace_channel`; an `operating_channel` key belongs here, **not** in
  `markets.ts` (parent D2: an id in the pure registry is a lie in every environment but one).
- `apps/backend/src/lib/market-medusa.ts#protectedSalesChannelIds` — the registry-derived allow-list that
  `cleanup-default-data.ts` and `setup-mexico` obey. It is currently
  `registryMarketplaceChannelIds + store.default_sales_channel_id`.
- `apps/backend/src/api/store/_utils/product-publication.ts` — the publication-intent seam, whose header
  documents this exact gap and says "if you are here to re-add it, build the operating channel first".
- `apps/backend/src/api/store/_utils/seller-product-create.ts` (~line 342) — the single place that
  attaches `sales_channels: [{ id: salesChannelId }]` at create.
- `apps/backend/src/api/internal/market-backfill/` — a working, reviewed **dry-run-then-apply** backfill
  with validate → claim → apply ordering and capped-scan honesty. The operating-channel backfill is the
  same shape; reuse it rather than inventing a second pattern.
- `apps/backend/src/api/internal/backfill-sales-channel/` — an existing channel-link backfill route.
- `linkProductsToSalesChannelWorkflow` (`@medusajs/medusa/core-flows`) — already used by the market
  backfill.
- Owned-shop read path (`/store/sellers/[slug]/products`) — ownership-scoped, **must stay** channel-free.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | Re-derive the live channel + publishable-key graph and lock the plan | high |
| 1 | Operating-channel seam in the market registry env layer | med |
| 1 | Provision the MX operating channel and protect it from the destructive scripts | high |
| 1 | Idempotent operating-channel backfill, dry-run reported first | high |
| 2 | Publishable-key membership and the buyability proof | high |
| 2 | Product create/update joins the operating channel alongside publication | high |
| 3 | Re-enable owned-shop-only publication (`publish_to_market: null`) end to end | high |
| 3 | Publish / unpublish an existing product to the marketplace | med |
| 3 | Seller, admin and agent surfaces for the operating-vs-published distinction | med |

## Architecture decisions — to be locked BEFORE any builder starts

This epic is **scaffolded, not locked.** The parent epic's leverage came from numbered decisions derived
from live code *and the live database* before dispatch; the same pass is owed here and Sprint 1 Story 1.1
is that pass. What follows is what the scaffolding already established (verified against current `main`),
and the open questions the locking pass must answer.

### E0 — Established by reading the shipped code (2026-07-31)

| Fact | Where | Consequence |
|---|---|---|
| A channel-less product is unbuyable | `product-publication.ts` header; `seller-product-create.ts:243` | The gap is real and documented in-repo — this epic does not need to re-prove it. |
| `publish_to_market: null` is **refused**, explicitly, not merely absent | `product-publication.ts` | A client written against the earlier draft gets a loud error. Re-enabling it is a contract change with a known call-site. |
| Channel ids are env-resolved per repo, never in `markets.ts` | `market-medusa.ts` (parent D2) | The operating channel gets a **new env var**, e.g. `MEDUSA_MX_OPERATING_CHANNEL_ID`, plus a `MARKET_MEDUSA_ENV_KEYS.operating_channel` entry. |
| `protectedSalesChannelIds` = marketplace channels + store default | `market-medusa.ts` | **The new channel is UNPROTECTED until it is added there.** `cleanup-default-data.ts` would delete it. This is a hard ordering dependency, not a nicety. |
| One create site attaches the channel | `seller-product-create.ts:342` | The "join both channels" change is a one-line array today — keep it that way. |
| Three-states discipline is already in the seam | `market-medusa.ts` | `no_resource` vs `unconfigured` must be preserved for the operating channel: "MX has no operating channel" is an outage, never permission to fall back to the marketplace channel. |

### E1 — Open questions the locking pass MUST answer

1. **Does every product join both channels, or does the cart pick a channel from request context?**
   The seed names this as the central design call. Joining both is simpler and probably right pre-launch;
   context-picking is what a real multi-market system eventually needs. **Decide it explicitly and record
   why** — this determines whether S2 touches the cart at all.
2. **The live publishable-key graph.** After the 2026-07-28 cleanup the storefront key should hold
   exactly **one** channel link. Re-derive it — that graph has been wrong before (70 of 72 `api_key` link
   rows were seed residue). The count of link rows before and after is an S1 deliverable.
3. **Exact product population.** How many published products, how many sellers, how many would join the
   operating channel, and how many are already in *no* channel. The parent epic's D1 discipline applies:
   publish the number, review it, then act.
4. **Does the marketplace read path need any change at all?** Expectation: **no** — it filters on the
   marketplace channel and that channel's membership is untouched. Prove it with the existing population
   guard rather than assuming it.
5. **Un-publishing.** Removing a product from the marketplace channel while keeping it in the operating
   channel is the S3.2 capability. Confirm Medusa's link-removal semantics and whether anything caches
   channel membership.

### E2 — Sequencing is backfill-first, and that is not negotiable

The precedent is the 2026-07-27 duplicate-sales-channel prune: **backfill first, verify, then make
anything depend on membership** — zero errors. Applied here:

1. Create the channel. Nothing reads it.
2. Protect it in the allow-list. Still nothing reads it.
3. Backfill every product into it. Dry-run reported and reviewed first.
4. **Only then** add it to the publishable key and let create/checkout depend on it.

Reversing 3 and 4 takes the storefront dark: a key scoped to a channel with no products serves an empty
catalog that looks healthy. That is the failure mode this order exists to prevent.

### E3 — What this epic must NOT change

- Marketplace publication semantics. That contract shipped in the parent epic and is not reopened.
- Owned-shop **reads** (`/store/sellers/[slug]/products`, tenant channels). They resolve by ownership +
  publish state and must never gain a channel filter (parent D4).
- The US market. It stays `invitation` and structurally fail-closed; no US channel, Region or commerce.
- `store.default_sales_channel_id` ≠ env `MEDUSA_SALES_CHANNEL_ID`. Known, harmless, out of scope
  (parent D0) — do not "fix" it here either.

## Deploy order

Backend-only for Sprints 1–2; the frontend is untouched until Sprint 3's surfaces.

1. **S1** deploys inert: the seam, the allow-list entry and the dry-run report ship before the channel
   exists, and the report is read before anything is created.
2. **Provisioning + backfill are production mutations and are Daniel's**, not a builder's — the builder
   writes and dry-runs them and hands over the exact reviewed command.
3. **S2** is the first deploy where membership becomes load-bearing. It must land *after* the backfill is
   verified complete, and it is the rollback-sensitive one.
4. **S3** adds seller/admin/agent surfaces and can deploy normally.

Existing Mexico checkout must pass unchanged at every step — a product in both channels behaves exactly
as it does today.

## Kill-switch decision

**To be decided at the locking pass, not assumed here.** The parent epic chose no flag because a route
cutover is rolled back by deploy. This epic is different: S2 changes what makes a product *buyable*, and
a wrong publishable-key membership is a silent empty catalog rather than a visible 404. A flag guarding
"owned-shop-only is offered to sellers" (S3) is cheap and probably right; a flag guarding channel
membership itself is likely worse than useless, because the damage is in the data, not the code path.
Record the reasoning either way.

## Explicit non-goals

- Any US commerce capability — currency, payment, shipping, tax, or a US channel of any kind.
- Changing what marketplace publication means, or the marketplace read filter.
- Per-product multi-market publication (a product published to two country marketplaces at once).
- Migrating existing products out of the marketplace channel. Every product that is published today stays
  published; this epic only adds the second membership.
- Seller-facing pricing or packaging of "owned shop only" as a paid capability.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] The architecture decisions above are **locked with numbers** from the live database before any
      builder starts, and E1's five questions are answered in writing
- [ ] A product in the operating channel but **not** the marketplace channel: renders on its owned shop,
      is **absent** from `/mx`, and **can be bought end to end**
- [ ] A product in both channels behaves exactly as it does today (existing Mexico checkout unchanged)
- [ ] The operating channel is in `protectedSalesChannelIds` **before** it exists in production
- [ ] Backfill dry-run reviewed, applied by Daniel only, and verified complete before S2 depends on it
- [ ] Publishable-key link rows counted before and after; no orphan links left behind
- [ ] Owned-shop and tenant-channel reads still carry **no** channel filter (parent D4 guard green)
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** the decision recorded above is implemented as decided, or its absence justified
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** and
      `node scripts/build-order.mjs` run
