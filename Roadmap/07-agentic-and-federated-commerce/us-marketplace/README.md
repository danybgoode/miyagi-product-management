---
status: in-progress  # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
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

## Epic-mode architecture lock — 2026-08-10

This is the builders' contract. It was locked against backend `origin/main` `af92156`, frontend
`origin/main` `5d4df0c`, the deployed Cloud Run service configuration, authenticated production Medusa
diagnostics, the production Store API and the project's Stripe test/live accounts. Staging's private
database graph is **unavailable** from the workstation; S1 therefore deploys its read-only survey first
and may not apply staging or production writes until that environment reports its own graph.

**D1 — Market vocabulary moves as one unit.** `markets.ts` is byte-identical across the two app repos.
The `invitation` → `active` change is exactly frontend `lib/markets.ts` +
`e2e/markets-registry.spec.ts` and backend `src/lib/markets.ts` +
`src/lib/__tests__/markets.unit.spec.ts`, in the coordinated S3 release. S1 does not relax the invitation
guard and no market status is inferred from locale, currency or resource presence.

**D2 — US has two channels, not the one described by the scaffold.** The operating channel is the
buyability superset; the marketplace channel is its publication subset. Product publication already
enforces this topology in `backend/src/api/store/_utils/product-publication.ts`. The US resource pack is
USD store support, one US Region/country/tax region, both channels, one stock location linked to both,
one publishable key, the manual provider/location link, one fulfillment set and a `us` service zone.

**D3 — One publishable key per market, linked once.** Each key links only to its market's operating
channel. A key linked to multiple channels makes Store cart creation ambiguous and returns 400. The
server-owned resolver selects the key from authoritative market context; no request may supply or choose
a key. The frontend's 99 production Store-API callers are a population to migrate and guard, not evidence
that a singleton already exists.

**D4 — The backend's structured Medusa resolver is canonical.** Resource resolution is `resolved |
no_resource | unconfigured`, never `''` and never an MX fallback. Add
`MEDUSA_US_REGION_ID`, `MEDUSA_US_MARKETPLACE_CHANNEL_ID`,
`MEDUSA_US_OPERATING_CHANNEL_ID`, `MEDUSA_US_PUBLISHABLE_KEY` and
`MEDUSA_US_STOCK_LOCATION_ID`; preserve the existing MX variable names. The frontend implements the same
named-state contract while retaining literal browser-visible env reads required by Next build inlining.

**D5 — Survey and blockers precede creation.** Production provisioning is an authenticated internal
`GET` dry-run and explicit `POST` apply inside the Cloud SQL VPC; a laptop `medusa exec` cannot reach the
private `10.7.0.3` database. Destructive channel/key cleanup must protect configured resources as a
population even while US is invitation-only, before any US row is created. Apply is idempotent,
ownership-proving and verifies all forward and reverse links. Region/channel/key creation does not buy a
new cloud tier; any operation that actually would incur a new paid resource still stops for Daniel.

**D6 — Inventory location is market-scoped and fails closed.** The current oldest-location fallback in
`backend/src/api/store/_utils/inventory.ts` would put US stock in Mexico. Every inventory writer resolves
the seller's operating market first and requires that market's configured stock location. No global or
oldest-location fallback is valid for US.

**D7 — Shop market is immutable and explicit.** `seller-market.ts` remains the only reader/writer of
`metadata.operating_market`. Fresh seller creation may pass `us`; omitted input retains the documented
MX `legacy_default`; invalid stored values fail closed; generic metadata PATCH cannot change it. A request
for a conflicting market on an existing shop is rejected rather than silently re-marketizing it.

**D8 — Normal US product creation moves to S3.** While US is invitation-only,
`product-publication.ts` correctly refuses a normal US marketplace product before price writes. S1 proves
the seller-market and USD currency policy in pure/route specs but does not claim a live merchant can
publish. S3, after D1's coordinated activation and live resource verification, proves that a positive USD
price row is required and created; missing/zero USD prices are an explicit refusal.

**D9 — Presentation is one market-derived context.** A pure resolver maps `mx → es-MX/es/MXN` and
`us → en-US/en/USD` (plus timezone), rejects unknown markets and is the only locale decision. Components
receive presentation context; locale never selects channel, payment, fulfillment or membership. The
current `normalizeLocale('en-US') → es` behavior is a defect.

**D10 — Copy scope is a generated population, not “264 files.”** At the locked frontend head there are
371 TSX files: direct route populations are buyer 67 (68 including the old `/us` page), seller 113 and
admin 42; static-import closures are buyer 119, seller 146 and admin 69, with explicit overlaps. The
dictionaries have nine top-level namespaces and currently differ by two English FAQ leaves. Add recursive
object-key, array-length and non-empty bilingual guards plus generated buyer/seller manifests. UI chrome
is localized; seller-authored content remains as authored. `app/(shell)/admin/**` is deliberately out of
scope except shared components used by an in-scope surface.

**D11 — Correct SSR language requires market root layouts.** The global root currently fixes
`<html lang="es">`, Clerk `esMX` and `/mx`; calling `headers()` there would make the static site dynamic
and client mutation would fail SSR acceptance. S2 therefore introduces URL-neutral route groups/root
layouts for the MX and US market trees, each rendering the correct BCP-47 `lang`, Clerk localization and
fallback server-side. Preserve static generation and bounded revalidation.

**D12 — Keep shared pages and literal route adapters.** The MX catalog routes are already thin adapters
to shared implementations. S3 adds equivalent literal US adapters for list, PDP, shop, about, FAQ,
policies and collection rather than forcing a high-churn `[market]` rewrite. The shared page receives
market/presentation context and preserves named unavailable state; only a cross-market PDP miss becomes
404. `/us` reuses the MX home components, while `/partner` and its recruiting system remain intact.

**D13 — Browse capability is honest before money lands.** S3 and S4 remain separate deploys. A permanent
commerce-readiness result derived from real market resources/payment readiness suppresses web/UCP/MCP
`buy_now` for US until direct checkout is available and returns a named reason. This is not a feature flag.
Every agent result echoes `market_code`; manifest, formatting and shipping vocabulary derive from D9.

**D14 — US Connect onboarding uses Accounts v2; MX is preserved.** The live platform is Mexico/MXN with
charges and payouts enabled; its four existing connected accounts are all MX. A test-mode proof on this
same platform created a US `merchant` account with USD/en-US defaults, Stripe-collected fees/losses, full
Dashboard and a hosted onboarding link, then closed it. New US accounts use that Accounts v2/controller
shape through authenticated backend routes; existing MX v1 Express accounts are not migrated. Readiness
checks country, merchant configuration, capabilities and blocking requirements, not only
`charges_enabled`.

**D15 — Direct-charge context is durable end to end.** One pure strategy plan selects MX destination
charge in platform context or US direct charge in the connected-account context from seller market, then
cross-checks Region and currency. All web, UCP and MCP checkout enters the Medusa `start-checkout` rail.
Persist the strategy, connected account, session/intent/charge IDs and currency in PaymentSession data;
create, retrieve, capture, cancel, expire, refund, reconcile and webhook validation all rebuild request
context from it. US omits `transfer_data` and application fees; direct refunds omit `reverse_transfer`.
Connected-account webhooks must match `event.account`. No partial failure returns a green warning body.

**D16 — Money and delivery inputs are server-authoritative.** Validate seller readiness, strategy,
currency and fulfillment before the first authoritative checkout write. Cart, quote, PaymentSession,
Stripe and ledger currencies must match. S4 adds a distinct US `manual_carrier` option with an address,
online payment, seller-funded $0 shipping and honest no-rate/no-label copy; arranged delivery stays
manual-pay. Manual-carrier fulfillment requires carrier and tracking. Processor fees and refunds are
idempotent ledger events, and every profit aggregation key includes currency—USD and MXN are displayed
separately and never summed.

**D17 — Seller locale comes from Medusa, not the browser mirror.** Extend the canonical seller projection
with market, locale and currency. Seller shell, nav, onboarding, formatting and seller emails consume D9.
The `/us` signup handoff carries a server-controlled intended market into the first seller create; the
current frontend omission and “first Supabase shop” Connect lookup are removed. `/mx` remains only the
legacy fallback, never the US post-auth destination.

**D18 — S6 is stopped at its external evidence gate.** Neither EasyPost nor Shippo exists in the code or
the `projects.dev` provider catalog, and no carrier sandbox account, US origin ZIP, representative parcel
or funding model is available. Envía is not a proven template: it has no calculated pricing, idempotent
confirm, void or refund. S6 may start only after Daniel names the provider/account and supplies the origin
and parcel evidence. The selected implementation must use an injected client, read-only quote,
preview-without-spend, durable idempotent confirm/audit before provider I/O, reconciliation, void/refund,
tracking webhook and structured fallback to S4. A small carrier-operation model/migration is allowed if
native Medusa primitives cannot prove durable uniqueness; metadata read-then-write is not sufficient.

**D19 — Visual direction extends Miyagi; it does not Americanize the design system.** Purpose: let a US
buyer discover and trust independent shops, then let a US seller operate the same marketplace in English.
Aesthetic: the existing warm, editorial, craft-forward Miyagi surface—no flag motif, patriotic palette,
generic SaaS dashboard or gradient-heavy “AI” treatment. Keep the current design tokens, restrained accent
palette, typography, card language, radii and spacing; `/mx` must be pixel-stable. Reuse the MX hierarchy
(market story → categories/search → featured/listing cards → shop story) and seller information density,
changing only market-derived copy/content/formatting. Preserve current breakpoints, readable measure,
keyboard/focus behavior and thumb-reachable mobile actions. The distinctive element is one bilingual
marketplace identity whose local shops/content provide the character, not country-specific chrome. S2,
S3 and S5 each capture desktop and mobile screenshots of representative MX/US pages and compare MX to its
pre-change baseline before merge.

### Locked live populations

- Production Medusa: one Mexico/MXN Region; three Sales Channels (default, MX marketplace, MX operating);
  one live publishable key with one channel link; 27 sellers all explicitly `mx`; 77 published products,
  all in the MX marketplace channel; no US commerce resource.
- Production fulfillment: one default shipping profile; MX fulfillment set; one MX stock location linked
  to both MX channels/manual provider; one extra unlinked stock location; legacy Europe fulfillment rows
  remain and are not ownership evidence for US.
- Production service env: `MEDUSA_SALES_CHANNEL_ID` and `MEDUSA_MX_OPERATING_CHANNEL_ID`; no
  `MEDUSA_US_*`. Frontend has MX Region/key/channel values and no US values. Cloud Build preserves service
  config, so new public resource IDs are a separate post-provision deployment step.
- Stripe: live and local test keys identify platform `acct_1Qsqf7L2vn3I7zOL` (MX/MXN). Live has four MX
  connected accounts and no US account. Direct-charge/refund/fee behavior still requires S4 test-mode
  evidence before production; the first live charge remains Daniel's action.
- Staging Medusa graph: **unavailable** until the new authenticated in-VPC survey is deployed. It must be
  recorded before staging apply; an unavailable response is never treated as an empty environment.

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
