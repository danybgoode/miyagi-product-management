---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: us-marketplace
build_order: 1
---

# Epic: US marketplace — open `/us` as the finished product

> **Area:** 07 · Agentic & Federated Commerce · **Risk:** high · **Class:** Feature · **Archetype:** Builder · **Appetite:** L · **Scope seed:** [`00-ideas/seeds/us-marketplace.md`](../../00-ideas/seeds/us-marketplace.md)

## Why

`/mx` is a working multi-seller marketplace: anyone opens a shop, lists products, services, rentals,
digital goods or events, and sells with no commission across the marketplace, their own domain, an
embeddable widget and to AI agents. `/us` is a landing page that says a private pilot is being prepared.

This epic closes that gap in one build. When it is done, a US merchant signs up, opens a shop, lists a
product priced in USD and takes a card payment into their own Stripe account; a US buyer browses `/us`
in English, opens a product page, adds to cart and checks out; and an AI agent asking for `market=us`
gets the US catalog. Same product, different country.

**There is no pilot, cohort, proof phase or readiness threshold in this epic**, and no feature flag.
See `Roadmap/WAYS-OF-WORKING.md` → *Operating posture* and *Feature flags*. It replaces four archived
documents that together described a validation ladder to this same destination.

## Platform-first note

Nearly all of this is **configuration and parameterization of shipped seams, not new systems.** The
market registry already models `us`. The Medusa resolution seam already has a US branch that returns a
correct, fail-closed `null`. The seller operating-market reader/writer already exists and needs no
migration — it rides the existing `metadata` JSON column. The MX route tree, catalog reads, price-grid
selection, checkout and agent contracts are all already market-aware by construction, because
`market-architecture-foundation` built them that way.

Three things are genuinely new: **USD direct charges** through Stripe Connect, **en-US copy coverage**
across a shell that is currently hardcoded Spanish in 264 files, and **a US carrier provider**. Everything
else is filling in tables that were deliberately left empty.

Medusa stays authoritative for Regions, Sales Channels, catalog, prices, inventory, carts, orders,
payments, fulfillment and ledger. Supabase keeps non-commerce data. Clerk stays the identity provider.
This epic adds no parallel commerce system and, as scoped, **no database migration**.

## What already exists — reuse, do not rebuild

| Capability | Existing seam | Reuse |
|---|---|---|
| Market vocabulary | `lib/markets.ts` — byte-identical in both repos, two golden specs | Flip `us.marketplace_status` to `active`. Change all four files in one commit or the golden specs go red, which is the design working |
| Medusa resolution | `lib/market-medusa.ts` — `REGION_ENV_VARS.us` and `CHANNEL_ENV_VARS.us` are empty tables | Fill them. The total-table-over-`MarketCode` shape means the compiler already demanded this decision |
| Shop operating market | `backend/src/lib/seller-market.ts` | The one reader/writer of `metadata.operating_market`, with its three states (`metadata` / `legacy_default` / `invalid`). No DDL |
| Resource provisioning | `src/scripts/provision-mx-operating-channel.ts`, `api/internal/setup-mexico`, `market-backfill` | Survey-before-write, ownership proof, pagination guard, idempotent re-run. Mirror the shape for US |
| Buyer route tree | `app/(shell)/mx/l`, `app/(shell)/mx/l/[id]`, `app/(shell)/mx/s/[slug]/*` | Parameterize the segment; one tree serves both markets. MX URLs must not change |
| Catalog reads | `lib/market-catalog.ts`, `lib/listings.ts`, `lib/owned-market.ts`, `lib/market-publication.ts` | Fail-closed reads and strict currency price selection. Extend the seam, never special-case a UI |
| SEO / sitemap | `lib/market-seo.ts`, `lib/market-sitemap.ts`, `lib/market-url.ts` | Already market-shaped; add the US surfaces |
| Payments | `backend/src/modules/payment-stripe-connect` | Add a USD **direct-charge** strategy beside the destination-charge flow. Do not reuse destination charges by changing the currency |
| Fulfillment (day one) | arranged delivery + manual carrier, and the Correos manual-provider class | The zero-account, zero-funding US path. Sellers enter their own tracking |
| Fulfillment (S6) | `modules/fulfillment-envia` + Medusa's fulfillment-provider interface | The proven provider shape — quote, confirm-buy, label, tracking, void. Implement one US provider against the same interface |
| Copy | `locales/{es,en}.json` (8 top-level keys) + the bilingual allow-list CI guard | The mechanism is right and already gated. Grow it to full coverage; keep es-MX completeness green throughout |
| Operators | `partner_grants`, `partner-auth`, `/partner`, shipped `#US-2` | Multi-shop operators already work. Grants remain the sole shop authorization; program track stays descriptive |
| Agents | UCP catalog/checkout, MCP tools, the manifest | `market=us` flows through the same contracts, echoing `market_code` on every result |

## Epic-mode architecture lock — required before any builder starts

One architect reads live code and queries live state before delegation, then replaces this section with
numbered decisions `D1…Dn` and writes a cited **Build contract** into each sprint file. Builders import
those decisions; they never re-derive them. This is the one piece of ceremony that has repeatedly paid
for itself and it stays.

At minimum the lock must prove or correct:

- Current frontend/backend heads, and the exact deployed `markets.ts` / `market-medusa.ts` /
  `seller-market.ts` contracts — including whether `MEDUSA_US_REGION_ID` (already referenced in the
  codebase) is set anywhere, and to what.
- Live Medusa Region, Sales Channel, publishable-key, stock-location, inventory, fulfillment-set and
  service-zone populations in every environment. Row counts decide what is safe.
- Whether one publishable key per market is sufficient across every Store API caller, and the single
  resolver that selects it without a caller-supplied override.
- Live Stripe platform account country and configuration, the supported US connected-account path,
  direct-charge/refund/fee-lookup semantics, and webhook account context.
- The real size of the copy problem: which of the 264 Spanish-hardcoding files are on the buyer path,
  which are seller portal, which are admin-only and out of scope, and what the es-MX completeness guard
  actually enforces today.
- Every other writer of market, channel, inventory, price and publish state.

If a live source is unavailable, the lock records **unavailable** and stops the affected sprint. Migration
files, config names and scope prose are not deployed truth.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Provision and verify the US commerce resource pack | low |
| 1 | 1.2 Resolve US Region and channel through the existing seam | low |
| 1 | 1.3 Let a merchant open a shop that operates in the US | low |
| 2 | 2.1 Make the shell read its copy from a dictionary, not the source | low |
| 2 | 2.2 Translate the buyer path to en-US | low |
| 2 | 2.3 Resolve locale from market at every entry point | low |
| 3 | 3.1 Open the US market and serve its catalog | low |
| 3 | 3.2 Parameterize the listing, product and shop routes by market | low |
| 3 | 3.3 Turn `/us` into the US marketplace home | low |
| 3 | 3.4 Give agents full `market=us` parity | low |
| 4 | 4.1 Charge USD through Stripe Connect direct charges | high |
| 4 | 4.2 Fulfill a US order on arranged and manual-carrier delivery | high |
| 4 | 4.3 Make US orders, receipts, emails and refunds correct in USD | high |
| 5 | 5.1 Translate the seller portal to en-US | low |
| 5 | 5.2 Open US seller signup and onboarding | low |
| 6 | 6.1 Integrate one US carrier for live rates and labels | high |

## Sequencing — why this order

Split by **capability boundary**, never by confidence level. Each sprint ships a real piece of the final
product and none of them is a throwaway version of a later one.

1. **Rails before surfaces.** Nothing can render a US catalog until US Medusa resources exist. Backend
   first, always.
2. **Copy plumbing before the surface that uses it.** S2 is deliberately ahead of S3: building `/us`
   routes out of hardcoded-Spanish components and then rewriting them is the one avoidable rework in
   this plan. S2 makes the shell locale-driven and translates the buyer path; S3 then renders it in
   English for free.
3. **Browse before buy.** S3 opens discovery on the rails S1 built. S4 adds money.
4. **Money is its own boundary.** S4 is the only HIGH-review sprint in the buyer path and the only place
   real spend happens.
5. **The seller portal follows the buyer surface.** A US merchant can already open a shop after S1 and
   sell after S4; S5 makes their own workspace English and opens signup properly at `/us`.
6. **The carrier is last because it is the only piece with an external dependency** — an account, a
   funding decision, a provider choice. Nothing else waits on it, and `/us` is complete without it.

## Deploy order

1. **S1** backend only — resources provisioned and verified live, resolvers wired. No frontend change.
   Market registry still reads `invitation`; `/us` is unchanged.
2. **S2** frontend only — dictionary and locale resolution. No visible change to `/mx` (the es-MX guard
   proves it), no US surface yet.
3. **S3** flips the registry to `active` in **both repos in one commit** (both golden specs move
   together) and lands the routes. This is the moment `/us` becomes a marketplace.
4. **S4** backend payment/fulfillment contracts land before the frontend checkout consumers. Stripe test
   mode first; one real card charge is the product owner's, and it is the epic's only real-money step.
5. **S5** frontend, plus whatever backend the signup path needs.
6. **S6** backend provider before the frontend rate/label consumers.

Stack the branches: `feat/us-marketplace` → `-s2` → `-s3` → `-s4` → `-s5` → `-s6`, cut each from the
previous, one PR per sprint, merged in order. Sprints in one epic share hot files by construction
(`markets.ts`, the route tree, the dictionary) and siblings cut off one base pay a per-merge conflict
tax — *stack or pay*.

## Build and review strategy

One epic-mode orchestrator through all six boundaries. The architect locks decisions against live state,
then builders execute. Compact at each sprint/PR boundary and resume from the README decisions and the
per-sprint build contracts rather than re-planning.

**Review, per the current rules:** the deterministic gate (`tsc` + lint + `build` + Playwright `api`) is
green before every merge, no exceptions. **Sprints 4 and 6 are HIGH** — payment, refund and label-spend
paths — and each takes **one** cross-family review pass routed by
`node scripts/review-route.mjs --builder <who> --tier high <PR#>`. **Sprints 1, 2, 3 and 5 are LOW: no
review pass at all.** Builders merge their own PRs. No fresh `pr-reviewer` subagent unless the product
owner asks for one on a specific PR.

**Ask before these three, and nothing else:** provisioning paid cloud/provider resources or funding a
carrier account (S1, S6); the first real Stripe charge and any real label purchase (S4, S6); production
secrets/IAM/DNS. Name the exact action in one message. Everything else in this scope is pre-authorized.

Model routing: the architect and S4 run on the stronger model (money path, shared contract); S2 and S5
are mechanical over a locked contract and run on the faster one.

## Explicit exclusions

- Calculated sales tax, marketplace-facilitator filing, bookkeeping or any accounting claim. The seller
  is merchant of record and tax-liable.
- Curated admission, seller review/approval, appeals, revalidation, certification, badges or a public
  seller directory.
- Cross-seller or cross-country carts, combined shipping, escrow, purchase protection, universal returns
  or platform-funded refunds.
- A second design system, a US-only component language, or a native app.
- Paid acquisition, outbound automation, referral economics or US growth loops.
- Any change to `/mx` behaviour, URLs, copy or economics.
- A feature flag. This epic scopes none — see `WAYS-OF-WORKING.md` → *Feature flags*.

## Definition of Done (epic)

- [ ] Architect locked and documented `D1…Dn` against live code, live database and live provider state
      before any builder started.
- [ ] All six sprints merged to `main` in order, deployed, and smoke-tested; gaps stated.
- [ ] Every new spec was observed red at least once through a deliberate implementation mutation.
- [ ] A merchant can open a US shop, list a product in USD, and see it live at `/us`.
- [ ] A buyer can browse `/us` in English, open a product page and complete a USD checkout.
- [ ] One real USD order is paid, fulfilled, tracked and refundable end to end.
- [ ] `market=us` returns the US catalog through UCP and MCP, echoing `market_code`, and never MX rows.
- [ ] Buyer surface **and** seller portal render en-US for a US shop; the es-MX completeness guard is
      green and `/mx` copy is unchanged.
- [ ] `/mx` URLs, behaviour and economics are unchanged — proven by regression specs in every sprint.
- [ ] One US carrier returns live rates, buys a real label and reports tracking.
- [ ] Each sprint doc carries final commit refs and a real-URL smoke walkthrough.
- [ ] `RETROSPECTIVE.md` written; product poster, team memory and `Roadmap/LEARNINGS.md` updated with
      verified durable facts only.
- [ ] Stacked branches deleted; this README's frontmatter is `status: shipped`; `node
      scripts/build-order.mjs` regenerated.
