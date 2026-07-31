---
title: "Owned-shop operating channel — make a shop sellable without marketplace admission"
slug: owned-shop-operating-channel
status: scaffolded
area: "07"
type: feature
priority: wave-1
risk: high
epic: "07-agentic-and-federated-commerce/owned-shop-operating-channel"
build_order: null
updated: 2026-07-31
---

# Seed — Owned-shop operating channel

## Where this came from

Found during `market-architecture-foundation` Sprint 1 by a cross-family review, and confirmed by
the builder's own code comment. It is an **architect's gap in that epic**, recorded here rather than
half-built there.

## The gap, precisely

That epic's approved product contract says **"a shop does not need marketplace admission"** and
Story 1.3 makes Medusa Sales Channel membership mean *marketplace publication truth*. Both are now
true for **reads**: an owned-shop product renders on the shop's own storefront, subdomain, custom
domain and embed without belonging to the marketplace channel.

They are **not** true for **money**. Medusa's channel-scoped surfaces mean a product in **no** Sales
Channel:

- 404s on the channel-scoped `/store/products` endpoint, and
- fails checkout with "Product not found".

So an owned-shop-only product today is a listing you can render and cannot sell. The epic shipped
without the capability rather than shipping it broken: `publish_to_market: null` was removed from the
product-create contract, so the unsellable state is unreachable. Nothing regressed — every existing
product joins the MX marketplace channel exactly as before — but the contract's promise is only
half-delivered until this lands.

## The shape of the answer

Two channels per market, not one:

- **Operating channel** (`Miyagi MX — owned shops`, or per market): every product belonging to a
  shop whose `operating_market` is that market joins it. This is what makes a product **buyable** —
  cart, checkout and the publishable key resolve against it.
- **Marketplace channel** (`sc_01KSK1J0V81P4EPY9G0JAPX353` for MX today): only products the seller
  has published into the country marketplace join it. This stays publication truth, unchanged.

"Operating" and "published" then become genuinely independent, which is what the market-architecture
contract asked for in the first place.

## Why it was not done inside the parent epic

- None of that epic's ten stories asks for an owned-shop-only **purchase** path; its acceptance
  criteria are all about reads and visibility.
- It requires production mutations of a **different category** than the one authorized there: a new
  Sales Channel, a publishable-key membership change, and a full product backfill onto the new
  channel. A mistake there takes the storefront dark.
- Shipping a capability the platform cannot honour is the failure mode this project keeps recording.

## What must be true before building

- Re-derive the live channel and publishable-key graph — that graph has been wrong before
  (70 of 72 api-key link rows were seed residue, cleaned up 2026-07-28).
- Decide whether the **cart** picks its channel from the request's channel context (marketplace vs
  tenant) or whether every product simply joins both. The second is simpler and probably right
  pre-launch; the first is what a real multi-market system eventually needs.
- Sequence it as backfill-first: add every product to the operating channel and verify, **then**
  make anything depend on membership. The duplicate-sales-channel prune (2026-07-27) is the
  precedent — backfill first, zero errors.

## Explicit non-goals

- Any US commerce capability. The US marketplace stays `invitation` and structurally fail-closed.
- Changing what marketplace publication means. That contract shipped and is not reopened here.
