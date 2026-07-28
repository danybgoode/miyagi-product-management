---
title: "Market architecture foundation — owned shops, country marketplaces, and locale"
slug: market-architecture-foundation
status: scaffolded
area: "07"
type: feature
priority: wave-0
risk: high
epic: "07-agentic-and-federated-commerce/market-architecture-foundation"
build_order: "#US-0"
updated: 2026-07-28
---

# Scope — Market architecture foundation

## Outcome and approved decisions

Miyagi can represent a merchant's owned shop independently from a country marketplace, and every
public marketplace read resolves an explicit market without confusing country, currency, sales
channel, or locale.

Founder decisions approved 2026-07-28:

- `/` becomes a master-brand market selector.
- `/mx` becomes the canonical Mexico marketplace.
- `/us` is a controlled US private-pilot/invitation surface until a US marketplace is approved.
- A US merchant may operate an owned shop before a US marketplace exists.
- Merchant subdomains/custom domains remain independent of marketplace country paths.
- Mexico and US marketplace publication are separate; no cross-country mixed cart in v1.
- This is pre-launch: cut over cleanly and keep only useful permanent redirects, not a parallel
  legacy lifecycle for nonexistent traffic.

## Stage-2.5 bucket

**Genuinely new architecture using existing primitives.**

Medusa already has the correct building blocks—Region, Sales Channel, product↔sales-channel links,
seller metadata, price sets, stock locations, fulfillment providers, and publishable keys—but
Miyagi currently operates them as one Mexico-only environment:

- only the Mexico/MXN region is intentionally live;
- `MXN_REGION_ID` and MXN assumptions are embedded in cart, display, and write paths;
- a cleanup script deliberately collapses all products onto one sales channel and deletes the rest;
- every product-create path attaches the default sales channel;
- `/` is the Mexico marketplace homepage;
- seller/agent copy defines Miyagi itself as a Mexico marketplace;
- locale, market, and marketplace channel are not separate contracts.

This epic does not build US payments, tax, shipping, or an open US marketplace. It creates the
contract those later epics must obey.

## Medusa-first reframe

| Concern | Source of truth |
|---|---|
| Merchant/shop operating market | Seller metadata, validated through one market contract |
| Checkout country/currency/payment/fulfillment context | Medusa Region |
| Marketplace publication | Medusa Sales Channel membership |
| Owned shop visibility | Seller ownership plus product publish state; never requires marketplace membership |
| Marketplace route | Frontend market resolver |
| Locale/language | Presentation contract selected separately from market |
| Marketplace eligibility workflow | Later marketplace epic; channel assignment remains fail-closed meanwhile |

Do not create a Supabase market or listing mirror. Golden Beans receives stable lifecycle events
after Miyagi owns the truth; it does not decide market eligibility.

## Scope

### In

- One pure, versioned market registry for `mx` and `us`.
- Explicit separation of market, locale, region, and sales channel.
- Seller operating-market write/read contract, with existing sellers defaulted/backfilled to `mx`.
- Product marketplace-publication semantics through Medusa Sales Channels.
- Refactor the single-channel cleanup/setup assumptions so a future US channel cannot be deleted.
- Market-aware listing/search/UCP reads; current unspecified requests retain Mexico behavior.
- `/` market selector, canonical `/mx` marketplace, controlled `/us` invitation/private-pilot page.
- Market-prefixed Mexico discovery/PDP/shop paths and permanent redirects from the old indexable
  marketplace paths.
- Canonical/hreflang/x-default behavior with locale separate from market.
- Explicit failure for any US marketplace catalog read while that marketplace is not active.
- Privacy-safe market lifecycle event fields for Golden Beans.

### Out

- USD checkout, US tax/KYC/payouts, US payment provider setup, US carrier integrations, or returns.
- US marketplace seller onboarding, marketplace review tooling, or buyer launch.
- Cross-border fulfillment or mixed-country carts.
- Multiple language variants inside one country (the contract permits them; v1 ships defaults).
- A separate frontend/backend deployment per country.
- App-by-app omnichannel, portfolio finance, or Veeqo shipping parity.

## Product invariants

1. An owned shop does not require marketplace admission.
2. A published product may appear on the owned shop while appearing in zero marketplaces.
3. Marketplace listing reads always resolve one explicit market and filter by that market's Sales
   Channel.
4. A market always resolves one checkout Region; a locale never selects currency or payment rails.
5. The US marketplace fails closed until explicitly activated.
6. `/mx` never contains US-only supply, and `/us` never leaks Mexico catalog items.
7. Merchant subdomains, custom domains, and embeds remain stable and do not inherit a marketplace
   country prefix.
8. Existing seller and agent calls that omit market continue to resolve `mx` during the transition.
9. No code path creates a non-MX shop by silently defaulting to Mexico-specific payment or shipping
   configuration.
10. Golden Beans observes the market code but never becomes market truth.

## Pre-launch delivery posture

Build the whole epic in epic mode. The three sprint files are integration and review boundaries,
not separate release cycles. A builder may use one stacked branch/PR sequence under
`WAYS-OF-WORKING.md`.

There is no real traffic, tenant population, or transaction history to protect. Therefore:

- use a single route cutover;
- keep only 308 redirects that prevent duplicate/index-broken marketplace URLs;
- do not run dual homepages or dual write paths;
- backfill the current small/pre-launch seller population once;
- do not fabricate production-operations smokes that require a US merchant or USD order.

Security, market isolation, commerce-region, redirect, and canonical invariants remain deterministic
gates.

## Kill-switch decision

**No runtime flag for the `/` → selector and `/mx` route cutover.**

Reason: this is a pre-launch URL/data-contract replacement with no meaningful live cohort. A flag
would require keeping two canonical route systems and create more risk than it removes. Rollback is
the prior deploy.

The US marketplace is fail-closed through the market registry
(`marketplace_status: invitation`) and absence of US marketplace publication; `/us` renders an
invitation/private-pilot surface only. The later US commerce pilot must make its own runtime-gate
decision for money, payment, and shipping behavior.

## Slicing

1. **Market contract and Medusa foundation:** registry, seller operating market, Region resolver,
   Sales Channel publication, current-data backfill, and single-channel assumption removal.
2. **Country routes and Mexico continuity:** root selector, `/mx`, redirects, market-aware reads,
   locale/SEO, custom-domain/subdomain isolation.
3. **US invitation and fail-closed boundary:** `/us` private-pilot page, no US catalog leakage,
   admin/agent visibility, and event contract.

## Acceptance

- Existing Mexico shop/catalog/checkout behavior remains functionally unchanged under `/mx`.
- `/` renders only the master-brand selector and never a mixed catalog.
- `/us` says private pilot/invitation and returns no Mexico marketplace catalog.
- A product not assigned to the MX marketplace Sales Channel remains visible on its owned shop but
  absent from `/mx` discovery.
- Market selection never changes merchant custom-domain/subdomain URLs.
- Every market-aware cart resolves its Region/currency from the market contract; no locale string
  selects commerce behavior.
- Source and population guards catch marketplace reads that omit channel filtering.
- Canonical, alternates, and permanent redirect checks pass.
- Golden Beans receives `market_code` only on the approved lifecycle events; no commerce state is
  written there.

## Dependencies

- Agency decision record:
  `madmen/clients/miyagi-sanchez/portfolio-review-and-expansion-grooming.md`.
- US GTM discovery:
  `madmen/clients/miyagi-sanchez/us-operator-gtm-discovery-plan.md`.
- Existing static marketplace shell, channel routing, Medusa seller, Region, Sales Channel, and UCP
  contracts.

## Approval

- [x] Daniel approved `/`, `/mx`, `/us`, owned-shop-before-marketplace, agency/operator wedge, and
  pre-launch scaffolding on 2026-07-28.
- [x] Epic scaffolded with three epic-mode integration boundaries.
