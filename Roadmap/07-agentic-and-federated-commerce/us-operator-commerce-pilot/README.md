---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: us-operator-commerce-pilot
---

# Epic: US operator commerce pilot — three original-product shops

> **Area:** 07 · Agentic & Federated Commerce · **Risk:** high · **Class:** Feature ·
> **Archetype:** Grower · **Appetite:** M · **Scope seed:**
> [`00-ideas/seeds/us-operator-commerce-pilot.md`](../../00-ideas/seeds/us-operator-commerce-pilot.md)

## Why

Miyagi needs one honest US commerce proof: a founding operator activates exactly three consenting,
distinctive-product shops through one partner identity, including one Shopify import and one native setup,
then completes one real USD order through payment, label purchase, tracking, delivery and a currency-safe
economic view. The proof runs beside each merchant's incumbent system. It does not open a US marketplace,
claim automated channel parity or turn Miyagi into the merchant's accounting/tax system.

## Decisions locked at scope approval

1. The cohort is one named operator and exactly three named, consenting US merchants that make, design or
   meaningfully curate distinctive products. At least one shop uses Shopify import and one uses native setup.
2. The surface is three owned shops on a US operating Sales Channel. This epic creates no US marketplace
   channel, marketplace browse, discovery or cross-seller cart.
3. One partner identity operates the cohort only through explicit per-shop `partner_grants`. Program status,
   submitted URLs and merchant nomination never authorize a shop. `#US-2` must be live first.
4. The proof runs in parallel for 90 days or until an explicit merchant cutover. Miyagi owns Miyagi orders;
   the incumbent owns incumbent orders. Daily reconciliation and safety stock replace automated two-way sync.
5. Miyagi charges no platform or migration fee for the bounded proof. Merchants retain unavoidable payment,
   tax, label/shipping, incumbent and retained-system costs; Sprint 1 names each payer.
6. The connected merchant must be merchant of record and the counsel-confirmed tax-liable seller. US checkout
   uses Stripe direct charges, not the existing destination-charge flow. Failure of Connect eligibility or
   the tax contract stops the pilot; there is no manual-payment or platform-charge fallback.
7. One retained tax rail must produce one total shared by Medusa, Stripe, receipt, order and ledger. This epic
   does not invent a generic US tax engine or guess static rates.
8. One US shipping aggregator is selected from real origin/parcel sandbox evidence. EasyPost is primary and
   Shippo fallback; Sprint 1 deletes the unselected provider from build scope.
9. Quote is read-only. Label purchase, void/refund and every spend/mutation require preview, explicit confirm,
   idempotency and audit. Agent surfaces use the same authorization and confirmation rules as the UI.
10. Economics reuse the currency-tagged order ledger: actual processor fee, purchased-label cost, discount,
    shipping revenue, entered COGS and contribution. USD and MXN are never summed.
11. The runtime gate is Golden enablement flag `markets.us_operator_pilot_enabled`, default false and created
    disabled in every environment. It is an operational control, never an authorization boundary.
12. The optional cross-agent planning panel was offered and declined by the product owner on 2026-08-03.

## Platform-first note

Medusa remains authoritative for market resources, sellers, catalog, prices, inventory, carts, orders,
payments, fulfillment and ledger events. Supabase continues to own non-commerce partner identity,
relationship/consent evidence and the operational readiness checklist. Clerk remains the human identity
provider. Existing tables and modules are extended through their shipped seams; this epic adds no parallel
commerce, grant, migration-batch, order or ledger system.

## What already exists — reuse, do not rebuild

| Capability | Existing seam | Reuse |
|---|---|---|
| Market vocabulary | backend `src/lib/markets.ts` | Keep `us` invitation/USD semantics and resolve concrete resources separately |
| Medusa resource resolution | backend `src/lib/market-medusa.ts` | Add US Region/channel/key/stock/payment/fulfillment resolution; preserve explicit `no_resource` |
| Operating-market isolation | `market-architecture-foundation` | Reuse seller market, locale/currency separation and market-aware price validation |
| Owned-shop buyability | `owned-shop-operating-channel` | Repeat the owned-shop-only operating-channel pattern; no marketplace publication |
| Commerce resources | Medusa Region, Sales Channel, API Key, Inventory, Stock Location and Fulfillment modules | Provision native resources rather than shadow tables |
| Operator identity and auth | `miyagi-partners-mcp`, `#US-2`, `partner_grants`, `ms_partner_` and audit | One identity, explicit manager/viewer grants, seller revoke and per-object authorization |
| Shopify intake | platform-migrations `start_shopify_migration`, staged supply batch and parity report | Review before import; no second connector framework |
| Native intake | shipped seller product builder | Create the required native catalog and selected third-shop path |
| Catalog ownership | backend `src/api/store/_utils/seller-catalog-query.ts` + team memory `catalog-relations-and-overlays.md` | Reuse the typed sparse-relation resolver; historical order auth stays deleted-inclusive and unresolved/mixed ownership fails closed |
| Payment | backend `payment-stripe-connect` provider and checkout/webhook/refund seams | Add a locked US direct-charge contract; do not reuse destination charges by changing currency |
| Shipping pattern | existing Envía provider/client, quote, label and tracking tests | Implement one selected US provider through Medusa's fulfillment-provider seam |
| Economics | shipped profit ledger and seller profit view | Add actual processor/label costs and a granted-operator USD proof projection |
| Partner cockpit | `/partner` portfolio and relationship/consent rails | Add three-shop readiness/reconciliation evidence without a new operator store |
| Runtime control | Golden feature-flag catalog | One fail-closed US enablement seam across public, agent and money/label paths |
| UI language | semantic design tokens/components and market-aware copy helpers | Parameterize USD/provider language; no US visual-system fork or broad locale expansion |

## Epic-mode architecture lock — required before any builder starts

This epic is built in **one repository-local epic-mode run**, not four independent sprint sessions. One
architect must read the live frontend/backend code, query the live database/resource graph and inspect live
provider/account configuration before delegation. The architect then replaces this section with numbered
decisions `D1…Dn` and writes a cited **Build contract** into every sprint file. Builders import those
decisions; they do not paraphrase or re-derive them.

At minimum, the locking pass must prove or correct:

- current frontend/backend heads and the exact deployed market, seller-market and `no_resource` contracts;
- live Medusa Region, Sales Channel, publishable-key, stock-location, inventory, fulfillment-set/service-zone,
  payment-provider and fulfillment-provider populations in every environment;
- whether one publishable key per operating market is sufficient across every Store API caller, and the one
  resolver that selects it without a caller-supplied market/channel override;
- live partner/grant/consent schemas and row populations, current #US-2 deployment/flag state and the exact
  authorization helpers every cohort route imports;
- live Stripe platform account country/configuration, supported US connected-account path, direct-charge/
  refund/fee lookup semantics, webhook account context and tax-liability decision;
- real candidate origin ZIPs/parcels, EasyPost/Shippo evidence, selected provider account/funding model and
  the one Medusa fulfillment-provider interface it implements;
- current Shopify migration-batch and native-catalog contracts, including every other writer of market,
  channel, inventory, price and publish state;
- the shared seller-catalog resolver and its sparse/null-slot, deleted-inclusive historical-authorization and
  unresolved/mixed-ownership contracts; cite it rather than restating its predicates;
- current profit-ledger event vocabulary, idempotency keys, currency grouping and connected-account fee source;
- every irreversible or person-contacting side effect, the Golden flag catalog/default in each repo/environment,
  and the exact OFF-state carve-through needed for refunds, fulfillment and tracking on an already-paid order;
- literal cohort domains/URLs, negative-control fourth shop, test accounts, evidence locations and smoke owners.

If live DB/provider state is unavailable, the lock records **unavailable** and stops the affected sprint. It
must not treat migration files, config names, empty reads or scope prose as deployed truth. Sprint 1's signed
contract is a second gate: Sprints 2–4 remain blocked until Daniel accepts it.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Cohort and parallel-operation contract | low, document-only |
| 1 | 1.2 Funds and tax contract | high |
| 1 | 1.3 Dispatch and proof contract | high |
| 2 | 2.1 Provision and verify the US resource pack | high |
| 2 | 2.2 Route storefront and checkout by operating market | high |
| 2 | 2.3 Activate exactly three shops under scoped partner grants | high |
| 3 | 3.1 Import one Shopify catalog through the shipped batch | high |
| 3 | 3.2 Create the native shop and complete all three readiness records | high |
| 3 | 3.3 Give the operator one three-shop readiness/reconciliation cockpit | low |
| 4 | 4.1 Ship the locked direct-charge and tax checkout contract | high |
| 4 | 4.2 Quote, confirm-buy, print and track through one US provider | high |
| 4 | 4.3 Make the delivered order visible as USD operating economics | high |
| 4 | 4.4 Run one bounded real order and close the 90-day proof record | high |

## Kill-switch

`markets.us_operator_pilot_enabled` is a Golden-managed enablement flag, default **false** and created
**disabled** in every environment. One server-side market-availability resolver gates US publication/
mutation, cart creation, checkout/payment initialization, rate lookup, label purchase/refund and operator
mutations. The seller must also resolve to `us`, belong to the literal three-shop cohort and pass ownership/
partner-grant authorization. Flag absence/provider outage or missing US resource fails closed and never falls
back to MX or a manual rail.

Disabling stops new mutations, carts, payments and label spend while preserving the minimum read, refund,
fulfillment and tracking actions needed to make an already-paid order safe. The architecture lock must list
those recovery routes exhaustively before the flag is implemented.

## Explicit exclusions

- US marketplace browse/publication, multi-seller cart, discovery, curation or a marketplace Sales Channel;
- self-service US activation or any operator/shop beyond the named one/three cohort;
- automated two-way Shopify sync, broad Channels parity, cutover automation or marketplace connectors;
- more than one payment rail, retained tax contract, incumbent channel or shipping provider;
- platform-as-merchant, manual-payment or guessed-zero-tax fallback;
- QuickBooks replacement, bookkeeping, tax filing, statutory-profit claims or cross-currency totals;
- automatic label purchase, refunds, customer messages, catalog/price/stock publishing or access grants;
- native apps, a US design-system fork, broad bilingual expansion or a redesign of owned-shop checkout.

## Build and review strategy

Run one epic-mode orchestrator through all four integration boundaries. Sprint 1 lands the literal pilot
contract in the root planning repo. After Daniel accepts it, app work proceeds as a stacked assembly line in
each repo actually touched:

`feat/us-operator-commerce-pilot` (Sprint 2) → `feat/us-operator-commerce-pilot-s3` →
`feat/us-operator-commerce-pilot-s4`

Cut every later branch from the previous sprint branch, not independently from `main`; merge PRs in order.
Do not manufacture an empty frontend/backend PR when a boundary touches only the other repo. Backend contracts
and deployed resources land before frontend consumers; frontend always renders unavailable/fails closed until
the backend contract exists. Compact at sprint/PR boundaries and resume the same epic from the README decisions,
sprint build contracts and team memory rather than starting a fresh planning exercise.

Every app PR is HIGH overall except a demonstrably isolated read-only cockpit PR. Run the full deterministic
gate, mandatory cross-family review and mandatory fresh reviewer on HIGH, route findings back to the original
builder, re-run review on the fixed tip and require Daniel's merge authorization. Builders never apply
migrations, mutate production Medusa resources, create provider secrets, flip the flag or move real money/
labels. The orchestrator presents each named production action separately, applies approved migrations before
dependent code merges, verifies live state and confirms Cloud Build after merge.

## Deploy order

1. Sprint 1 root-repo contract accepted; no app deploy.
2. Sprint 2 backend resource resolver/setup/guards, then frontend market-key routing and cohort surfaces;
   resources remain inert and the Golden flag remains OFF.
3. Sprint 3 backend import/readiness contracts before frontend operator cockpit/catalog consumers.
4. Sprint 4 backend payment/tax/fulfillment/ledger contracts and provider setup before frontend checkout/
   operator controls. Test mode first; flag still OFF.
5. Daniel reviews all deterministic/live test evidence, explicitly authorizes the three-shop enablement and
   separately performs the bounded real-order/label smoke. No other US shop becomes eligible.

## Epic-mode builder kickoff

Paste this into **one long-running build task**; do not emit or use separate per-sprint kickoff prompts:

> Read `AGENTS.md`, `Roadmap/WAYS-OF-WORKING.md`, `Roadmap/LEARNINGS.md`, and skim team memory. Then read
> this epic README plus `sprint-1.md` through `sprint-4.md` in full.
>
> Build the entire `us-operator-commerce-pilot` epic in **epic mode**. Before any delegation, perform the
> architecture locking pass against live code, live database/resource state and provider configuration;
> write `D1…Dn` here and cite them in each sprint's Build contract. Disprove the scaffold where current
> reality contradicts it. Stop rather than guess when a live source is unavailable or a scope premise fails.
>
> Sprint 1 is the cohort/payment-tax/dispatch contract gate. Do not begin application work until Daniel
> accepts its literal contract. Then preserve the integration order: (2) isolated US owned-shop resources,
> routing and grants; (3) three catalogs plus parallel cockpit; (4) direct-charge checkout, one fulfillment
> provider, USD economics and the bounded proof. These are stacked PR/review boundaries inside one epic run,
> not new planning sessions.
>
> Use isolated app worktrees and stacked branches, backend before frontend, path-scoped story commits and
> the current review stack on every PR. Builders write migrations/setup/provider code but never apply shared/
> prod migrations, mutate prod resources/secrets, flip flags or spend money. Ask Daniel separately for each
> production action not already explicitly authorized. Keep the flag OFF until all test evidence is accepted.
>
> Update sprint docs and smoke walkthroughs as each boundary lands. At epic close, write one retrospective,
> update the poster/team memory/LEARNINGS only with verified durable facts, flip this README's status to
> `shipped`, regenerate `BUILD-ORDER.md` and delete the stacked branches.

## Definition of Done

- [ ] Epic-mode architect documented live-verified `D1…Dn` and per-sprint build contracts before delegation.
- [ ] Sprint 1 literal cohort/funds-tax/dispatch contract accepted by Daniel; failed premises stop the epic.
- [ ] Four sprint boundaries merged in order, deployed and smoke-tested; gaps and unavailable sources named.
- [ ] Every new spec was observed red at least once through a deliberate implementation mutation.
- [ ] Exactly three cohort shops are USD/US owned-shop ready; MX and a fourth shop remain isolated/denied.
- [ ] One Shopify import and one native setup complete through review/confirmation rails.
- [ ] One partner identity operates only its explicit grants; manager/viewer/revoked/ungranted matrix passes.
- [ ] One real USD order is paid, tax-consistent, label-purchased, tracked, delivered and represented with
      actual fee/label/COGS evidence; USD and MXN never aggregate.
- [ ] Parallel-channel reconciliation has no unresolved oversell or orphan-order exception at proof review.
- [ ] `markets.us_operator_pilot_enabled` exists disabled in every environment, then is enabled only for the
      literal cohort after Daniel's approval; rollback carve-through is rehearsed.
- [ ] Each sprint doc carries final commit refs and a literal-URL smoke walkthrough.
- [ ] `RETROSPECTIVE.md`, product poster, team memory and any genuinely durable learning are updated once.
- [ ] Stacked branches deleted; this README frontmatter is `shipped`; `node scripts/build-order.mjs` regenerated.
