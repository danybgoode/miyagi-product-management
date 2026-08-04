---
title: "US operator commerce pilot — three original-product shops"
slug: us-operator-commerce-pilot
status: scaffolded
area: "07"
type: feature
priority: wave-1
appetite: M
underwritten_by: null
risk: high
epic: "07-agentic-and-federated-commerce/us-operator-commerce-pilot"
build_order: "#US-3"
updated: 2026-08-03
---

# Pitch — US operator commerce pilot: three original-product shops

## The ask

Give one founding US operator a safe, scoped way to activate and operate three consenting
original-product shops — including one Shopify import and one native setup — through a parallel
proof that ends with one delivered USD order and a currency-safe economic view, without opening a
US marketplace or pretending the retained systems have been replaced.

## Appetite, class, and lane

- **Appetite:** **M** — one contract-lock sprint plus three tightly bounded build sprints. The budget
  buys one operator, exactly three shops, one retained incumbent channel, one payment rail, one US
  shipping provider, and one live proof order. If the named cohort cannot fit those constraints, cut
  or pause; do not grow this into a general US launch.
- **Class:** **Feature** · archetype **Grower** — this turns the shipped owned-shop, partner, import,
  fulfillment, and ledger primitives into an operator-led US proof.
- **Lane:** **Shaped bet** — the outcome is fixed; Sprint 1 converts the candidate-dependent rails
  into literal implementation inputs before any live-commerce work begins.
- **Risk:** **HIGH** — market routing, authorization, catalog mutation, card payments, tax,
  label purchase, and a real order all cross high-consequence boundaries. Product-owner merge and
  owner smoke are mandatory for every mutating or money-moving slice.

## Problem

The US needfinding outcome says to proceed with one owner-led operator and three consenting shops,
in parallel with their incumbent systems, because that is the shortest honest test of the operator
thesis. Miyagi cannot run that proof today. The market registry knows `us` and USD, but there is no
US Medusa Region, operating Sales Channel, market-scoped publishable key, payment setup, stock/
fulfillment resource, or shipping provider. Checkout options still resolve the MXN Region and
Mexico-only delivery rails, and Stripe onboarding creates MX connected accounts.

The gap is not a new multi-tenant commerce platform. It is the smallest safe US activation path
over primitives that already work, with candidate-specific decisions locked before the build is
allowed to cross money or fulfillment boundaries.

## Product decision

### One operating model

- **Cohort:** one named founding operator; exactly three named, consenting US merchants that make,
  design, or meaningfully curate distinctive products; at least one Shopify import and one native
  Miyagi setup. Commodity resale, counterfeit/unauthorized goods, absent owner consent, missing US
  readiness, or an operator who cannot name three candidates disqualifies the cohort. Buyer/operator
  copy uses this plain definition, not the internal phrase “original commerce.”
- **Surface:** three owned-shop URLs. Products are buyable only through the US operating channel.
  This epic creates **no US marketplace channel, browse surface, or cross-seller cart**.
- **Identity:** the operator uses the partner identity and existing per-shop `partner_grants` from
  Miyagi Partners. Merchant consent creates/revokes each grant; operator status never grants a shop
  implicitly. `#US-2` must be live before the cohort is activated.
- **Parallel proof:** incumbent stores stay live for 90 days or until the merchant chooses cutover.
  Miyagi owns Miyagi orders; the incumbent owns incumbent orders. A daily exception/reconciliation
  checklist keeps sellable quantity and order disposition coherent for the three-shop proof. v1 does
  not promise automated two-way synchronization.
- **Pilot price:** Miyagi charges no platform or migration fee during the bounded proof. Merchants
  still own unavoidable payment processing, tax, shipping/label, retained-system, and incumbent costs;
  Sprint 1 names each payer before activation.
- **Money:** the merchant, not Miyagi, must be the merchant of record and tax-liable seller for this
  bounded owned-shop proof, confirmed by qualified counsel. The US rail uses Stripe **direct charges**
  on the connected merchant account, not the existing destination-charge flow. If the current
  platform account cannot lawfully/technically onboard US accounts, the pilot stops for a separate
  entity/account decision; it does not fall back to a manual payment or a misleading platform charge.
- **Tax:** Sprint 1 names the retained tax calculation/filing rail and its checkout contract for all
  three merchants. No generic US tax engine or guessed static rate is built in this epic. A merchant
  whose obligations cannot be represented by the named rail is outside this cohort.
- **Dispatch:** select one US aggregator only after live test-mode quotes from the three origin ZIPs
  and representative parcels. **EasyPost is the primary candidate; Shippo is the fallback.** The
  selected provider is implemented through Medusa's fulfillment-provider seam. Rate read is safe;
  label purchase, void/refund, and other spend require explicit confirmation and audit.
- **Economics:** reuse the order ledger. Add the actual processor fee and purchased-label cost, keep
  USD isolated from MXN, and show the operator a read-only three-shop proof view. This is contribution
  evidence, not accounting or tax truth.

### Fixed definition of proof

The pilot passes only when all of the following are true:

1. one partner identity can operate exactly the three consented shops and is denied every fourth shop;
2. one Shopify catalog is staged, reviewed, and imported through the shipped migration batch;
3. one shop is set up through the native Miyagi catalog path;
4. all three owned shops have real catalog, USD prices, inventory, US checkout, card payment, and
   the selected US shipping rail ready without exposure to the MX or marketplace channels;
5. one real USD order is paid, explicitly label-purchased, tracked to delivered, and represented
   with revenue, discount, processor fee, shipping revenue/cost, and entered COGS in the USD view;
6. the incumbent channel remains operable and the daily reconciliation evidence has no unresolved
   oversell or orphan-order exception at proof review.

Self-service shops do not count. A test-mode order does not count as the final proof. A manually
marked payment or manually pasted tracking number does not satisfy the integrated rail.

## Stage-2.5 bucket

**Genuinely new, reuse-heavy.** The operator, owned-shop, migration-batch, ledger, cart, and Medusa
commerce primitives already exist. The irreducibly new parts are US resource activation,
market-scoped storefront-key routing, a US-compatible Stripe/tax contract, and one US fulfillment
adapter. The proof cannot be delivered as an operational configuration alone because current code
returns `no_resource` for US Medusa resources and hard-codes MX payment/shipping assumptions.

## Bill of materials (What / Why)

| What | Why |
|---|---|
| Cohort-and-rails contract lock | Converts the named external unknowns into fixed inputs before code can move money or labels |
| US Medusa resource pack | Gives `us` a USD Region, owned-shop operating channel, stock location, service zone, and payment/fulfillment links |
| One publishable key per operating market | Lets Medusa scope catalog, inventory, carts, and orders to the correct channel without a caller-supplied channel footgun |
| Market-aware storefront/checkout resolver | Ensures a US shop never falls back to MXN, MX inventory, MX payment methods, or MX delivery |
| Existing partner grants + audit | Lets one operator work three consented shops without inventing a second authorization model |
| Existing Shopify batch + native setup | Proves both required onboarding paths with human review before catalog writes |
| Parallel-operation checklist | Keeps the retained incumbent channel honest without buying a two-way synchronization platform |
| Direct-charge Stripe + named tax rail | Keeps the merchant as seller of record and makes checkout/tax responsibility explicit |
| One Medusa US fulfillment provider | Supplies quotes, confirmed label purchase, print/reprint, void/refund, tracking, and failure states |
| Currency-safe ledger + operator proof view | Shows whether the delivered order made economic sense without claiming accounting truth |
| Runtime gate + rollback runbook | Lets the owner halt US checkout and label spend without disturbing MX commerce |

## What already exists — reuse, do not rebuild

| Primitive | Reuse in this pilot |
|---|---|
| `apps/backend/src/lib/markets.ts` | Keep `us` as the invitation-stage market; extend the existing registry-to-Medusa resource contract |
| `apps/backend/src/lib/market-medusa.ts` | Add US resource resolution and preserve explicit `no_resource`; never fall back to MX |
| `market-architecture-foundation` | Reuse operating-market metadata, locale/currency separation, and market-aware product-price validation |
| `owned-shop-operating-channel` | Repeat the shipped owned-shop-only buyability pattern for US; do not create marketplace publication |
| Medusa Region / Sales Channel / API Key / Inventory / Fulfillment modules | Provision native resources rather than shadow Region, channel, stock, or fulfillment tables |
| `miyagi-partners-mcp` + `#US-2` | Reuse partner identity, `partner_grants`, audit, portfolio, and the approved founding-operator activation track |
| `platform-migrations` | Reuse `start_shopify_migration`, staged supply batches, parity report, human review, and import |
| Native seller product builder | Create the required native catalog and the third shop if that is its locked intake path |
| Cart and owned-shop checkout | Parameterize by operating market; do not build a second checkout |
| `payment-stripe-connect` | Reuse provider/webhook/refund seams, but add a distinct US direct-charge contract rather than reusing destination charges |
| Envía fulfillment module pattern | Reuse the thin client, injected I/O, quote/label/tracking tests, and explicit failure-state shape for the selected US provider |
| Profit ledger | Reuse currency-tagged order, discount, shipping, and COGS events; add processor fee and selected-provider label cost |
| Partner portfolio | Add read-only readiness/economic proof across granted shops; no new operator database |
| Golden feature flags | Use the current runtime-control rail; flags are operational controls, never authorization boundaries |

## Scope

### In v1

- One named operator and exactly three qualified, consented shops.
- One Shopify import, one native setup, and one locked intake path for the third shop.
- One US Medusa Region in USD, one US owned-shop operating Sales Channel, one US stock/
  fulfillment configuration, and one US-scoped publishable API key per environment.
- Market-aware catalog, inventory, cart, checkout, payment, fulfillment, and order routing with an
  explicit `no_resource` result when a US dependency is unavailable.
- Partner manager/viewer grants, revocation, audit, and four-shop negative authorization tests.
- One retained incumbent channel and a named daily reconciliation workflow during the proof.
- One verified US Stripe connected-account/direct-charge path and one named retained tax rail.
- One selected US fulfillment provider: rates, explicit label buy, print/reprint, void/refund,
  tracking webhook, delivery/failure states, and purchased-cost capture.
- One real USD order and a three-shop operator proof view over the existing ledger.
- Runtime disable, rollback rehearsal, audit evidence, and owner smoke.

### Out of v1 — no-gos

- US marketplace browsing, marketplace Sales Channel, multi-seller cart, discovery, or curation.
- Self-service US shop activation; it is a separate proof and does not count here.
- More than one operator, three shops, one payment rail, one tax contract, one retained channel, or
  one shipping provider.
- Automated two-way Shopify inventory/order synchronization, broad Channels parity, or migration
  cutover automation. The pilot uses a daily exception contract and safe stock buffers.
- Amazon, Etsy, TikTok Shop, eBay, Walmart, Faire, POS, or wholesale integrations.
- QuickBooks replacement, bookkeeping, returns accounting, tax filing, 1099 reporting, or a claim
  that contribution equals statutory profit.
- A generic US tax engine, guessed tax rates, platform-as-merchant fallback, manual-payment fallback,
  or any live order before the liability and collection contract is signed off.
- Automatic label purchase, autonomous refunds, autonomous customer messages, or bulk catalog/
  inventory writes. Read/audit/draft may be agent-assisted; publish, price, stock, money, label,
  refund, message, and access changes require preview plus explicit confirmation.
- New identity, grant, catalog, order, payment, fulfillment, or ledger systems beside the shipped
  owners.
- Native mobile apps, broad bilingual expansion, or a redesign of the owned-shop experience.

## Pre-build launch-contract gate

The pitch can be approved now; **no application build may start until Sprint 1's contract is accepted
by the product owner.** When scaffolding is requested in a later turn, the epic may be created with
only Sprint 1 executable; Sprints 2–4 remain blocked. Sprint 1 is one bounded, evidence-producing
session that turns recruitment and provider facts into the literal build contract.

The signed contract must name:

1. the operator and three merchant legal/shop identities, owner consent, original-product fit,
   domains, origin ZIPs, representative parcels, catalog ownership, and the Shopify/native intake map;
2. the incumbent channel, inventory authority, safety stock, reconciliation owner/cadence, retained
   domain/DNS, email/CRM, analytics/pixels, accounting, tax, reviews/SEO, and cutover rule;
3. the Stripe platform account country/configuration, three eligible US connected-account paths, a
   successful test-mode **direct charge**, merchant-of-record responsibility, refund/dispute owner,
   and the counsel-approved tax-liable party plus named checkout tax rail;
4. EasyPost-versus-Shippo test quotes from all three origin ZIPs, the selected provider/account,
   carrier coverage, funding/recharge owner, label refund behavior, webhook plan, and the exact
   confirmation screen before purchase;
5. the proof reviewer, evidence locations, 90-day checkpoint, stop conditions, and rollback owner.

**Stop condition:** if US Connect eligibility, the merchant/tax posture, or one-provider origin
coverage cannot be proved, return this seed to `queued` with the failed premise. Do not implement a
replacement payment, tax, or shipping platform inside this appetite.

## Rabbit holes — decisions made here

- **Do not share one multi-channel publishable key and ask every caller to pass a channel ID.** A
  Medusa publishable key scopes Store API data to its linked Sales Channels. Use a US key linked only
  to the US operating channel and select it from the resolved shop market. Keep the current MX key
  MX-scoped. This makes the safe path the default and gives tests a single channel invariant.
- **Do not interpret a configured US market as available commerce.** Availability is the conjunction
  of registry state, resolved Region/channel/key/stock/payment/fulfillment resources, the runtime
  flag, and shop cohort membership. Missing means explicit unavailable, never MX fallback.
- **Do not reuse the current US-incompatible onboarding literal.** Stripe account creation currently
  fixes `country: 'MX'`; the US path must resolve the merchant country from the locked operating
  market and pass the eligibility preflight.
- **Do not reuse destination charges by changing the currency.** The current checkout sends
  `transfer_data.destination` with zero application fee. For this owned-shop proof, use direct
  charges so the connected merchant is merchant of record, subject to Stripe/counsel approval.
- **Do not let Stripe Checkout and Medusa disagree on tax or totals.** The named tax rail must
  produce one checkout total that Medusa, Stripe, receipt, order, and ledger all preserve. If the
  retained provider cannot meet that contract, disqualify the merchant or pause.
- **Do not generalize the shipping adapter before the cohort test.** Implement the selected provider
  behind Medusa's native fulfillment interface and only the six proof jobs. EasyPost and Shippo both
  expose more surface; v1 does not.
- **Do not buy a label while quoting it.** Quote/rate selection is read-only. Purchase is a separate,
  idempotent, audited command with an amount/carrier/service preview and explicit human confirmation.
- **Do not claim channel sync.** Incumbent preservation is an operating contract with stock buffer,
  daily comparison, and exception resolution. Automated two-way synchronization is a separate bet.
- **Do not mix USD and MXN in totals.** Every economic row is currency-tagged; aggregation groups by
  currency and refuses a cross-currency total.
- **Do not use the runtime flag as authorization.** Partner grants and shop ownership remain the
  server-side access boundary; the flag only controls exposure and rollback.

## Sprint and story map

### Build routing — one epic-mode run

Build this as one long-running epic, not four independent sprint sessions. The epic architect first
locks `D1…Dn` against live code, live Medusa/database state and provider configuration, then writes a
cited Build contract into every sprint file. Sprint 1 is the external cohort/funds-tax/dispatch gate;
Sprints 2–4 stay blocked until Daniel accepts it. After that, app branches stack by integration
boundary (`feat/us-operator-commerce-pilot` → `-s3` → `-s4`) and merge in order. The authoritative
strategy and single builder kickoff live in the scaffolded epic README; no per-sprint kickoff prompts
should be used.

### Sprint 1 — lock the cohort and rails before code

#### 1.1 Cohort and parallel-operation contract — risk: LOW (document-only)

**As the founding operator, I want** the three shops, permissions, retained systems, catalog paths,
and reconciliation routine named **so that** every later story builds against real work.

Acceptance:

- The three merchants pass the original-product/disqualifier rubric from the needfinding outcome,
  consent to operator access and the parallel proof, and name the revocation contact.
- The matrix includes one Shopify import, one native setup, the third intake path, origin ZIPs,
  parcels, domains, catalog ownership, COGS owner, incumbent channel, retained systems, stock buffer,
  daily reconciliation owner, exception SLA, and cutover/exit rule.
- A fourth non-cohort shop is named as the authorization negative-control fixture.
- No secret, API token, bank datum, or customer PII is copied into roadmap or relationship notes.

QA: product-owner review of the signed cohort matrix and one merchant-consent sample.

#### 1.2 Funds and tax contract — risk: HIGH

**As a participating merchant, I want** the funds, fee, dispute, refund, and tax responsibilities
proved before checkout work **so that** a test of growth does not make a false legal promise.

Acceptance:

- The Stripe platform account country/configuration and US connected-account eligibility are
  verified against the live account configuration without exposing credentials.
- Test mode completes account onboarding and one direct charge/refund on a US connected account;
  the evidence identifies fee payer, negative-balance owner, dispute/refund owner, and payout path.
- Qualified counsel names the merchant-of-record and tax-liable party. The retained tax rail,
  registrations/nexus inputs, calculation owner, filing owner, receipt representation, and ledger
  boundary are written as one implementation contract.
- Failure of any line stops the pilot; no destination-charge, manual-payment, or zero-tax fallback is
  silently substituted.

QA: Stripe test evidence, counsel-approved decision record, and product-owner go/no-go.

#### 1.3 Dispatch and proof contract — risk: HIGH

**As the operator, I want** one provider and one observable acceptance workflow selected from real
shop inputs **so that** Dispatch is built for the proof rather than for a hypothetical platform.

Acceptance:

- EasyPost and Shippo produce test quotes for representative parcels from all three origin ZIPs to
  sample US destinations; gaps and carrier-account requirements are recorded.
- One provider is selected and its account/funding owner, carrier scope, quote timeout, purchase
  confirmation, print/reprint, void/refund, tracking webhook, failure handling, and cost evidence are
  fixed. The other is deleted from build scope.
- The proof reviewer, live-order shop/SKU, maximum authorized order and label spend, evidence bundle,
  stop conditions, rollback owner, and 90-day checkpoint are named.

QA: provider sandbox evidence and product-owner approval of the literal provider contract.

### Sprint 2 — establish an isolated US owned-shop commerce lane

#### 2.1 Provision and verify the US resource pack — risk: HIGH

**As the platform owner, I want** an idempotent US resource setup and verification workflow **so
that** each environment has the same explicit USD commerce graph and a rehearsed rollback.

Acceptance:

- The workflow creates or verifies one USD/US Region, one US owned-shop operating Sales Channel,
  one linked publishable key, one stock location, fulfillment set/service zone, the locked payment
  provider, and selected fulfillment provider; repeated runs create no duplicate resources.
- IDs are configured per environment through the existing market-resource resolver. Missing or
  mismatched resources report `unavailable` and fail the go-live check; they never resolve to MX.
- No US marketplace channel is created and no US product is added to an MX or marketplace channel.
- A read-only verify mode and a tested disable/rollback runbook ship with the setup.

QA: pure setup-plan tests, injected-I/O tests, dry-run/verify output, deliberate drift detection,
and staging resource inspection. Owner approves any production resource mutation.

#### 2.2 Route storefront and checkout by operating market — risk: HIGH

**As a US owned-shop buyer, I want** every catalog/cart/checkout request scoped to the US channel and
Region **so that** I cannot see or buy through Mexico resources by accident.

Acceptance:

- The shop's resolved operating market selects the US publishable key, Region, operating channel,
  currency, stock location, payment, tax, and fulfillment options across server and client calls.
- US owned-shop catalog and cart operations use USD; a requested MXN price or MX channel is rejected.
- When any required US resource or the runtime gate is unavailable, product writes, cart creation,
  checkout, payment, and label actions fail closed with an actionable unavailable state.
- Tests prove the negation: MX continues to use MX resources, and a non-cohort/fourth shop cannot
  enter the US path.

QA: backend unit/integration tests, frontend tests, `tsc`, lint, build, and one staging browser smoke
covering US isolation plus MX non-regression.

#### 2.3 Activate exactly three shops under scoped partner grants — risk: HIGH

**As the founding operator, I want** one identity to switch among my three consented shops **so that**
I can run the cohort without inheriting access to any other merchant.

Acceptance:

- `#US-2` activation is live and the operator receives explicit per-shop manager/viewer grants only
  after the merchant's consent record is accepted.
- All mutating routes resolve the target shop from the authenticated grant; caller-supplied shop IDs,
  slugs, market values, or partner status never grant access.
- Grant, role change, mutation, and revocation events are auditable; revocation takes effect on the
  next server request.
- A four-shop matrix proves allowed/denied reads and writes for manager, viewer, revoked, and
  ungranted states with no catalog, order, customer, economics, or credential leak.

QA: per-object authorization matrix, tenant-leak regression tests, audit assertions, and owner smoke
for grant/revoke/switch-shop.

### Sprint 3 — activate three catalogs and the parallel proof cockpit

#### 3.1 Import one Shopify catalog through the shipped batch — risk: HIGH

**As the operator, I want** one incumbent catalog staged and reviewed **so that** import speed is
proved without overwriting a merchant's live work.

Acceptance:

- `start_shopify_migration` resolves the granted target shop, stages the source into the existing
  supply batch, and creates no product before explicit human review/import.
- The parity report covers identity/ownership, title, description, media, variants, SKU, USD price,
  inventory, weight/dimensions, and any original-product complexity selected in Sprint 1.
- Unsupported fields remain visible gaps; secrets are not stored; retry is idempotent.
- Imported products are available only in the US operating channel and remain unpublished until the
  operator confirms the reviewed batch.

QA: connector fixtures, parity and idempotency tests, denied-shop test, and owner review of the live
staged batch before import.

#### 3.2 Create the native shop and complete all three readiness records — risk: HIGH

**As the operator, I want** one native catalog and the third locked intake path completed **so that**
the proof covers creation as well as migration.

Acceptance:

- One merchant uses the native Miyagi product path; the third uses the Sprint-1-selected path.
- Every sellable variant across all three shops has USD price, SKU, inventory authority/buffer,
  package weight/dimensions, origin, entered COGS, tax code/input required by the named rail, and
  shipping eligibility.
- Publishing remains an explicit per-shop confirmation and cannot expose a product outside its US
  owned-shop operating channel.
- Market-aware copy says USD/dollars for the US cohort; MX Spanish/peso behavior is unchanged.

QA: required-field and currency tests, native-creation smoke, channel-leak test, and merchant catalog
sign-off.

#### 3.3 Give the operator one three-shop readiness/reconciliation cockpit — risk: LOW

**As the operator, I want** one read-only cohort view with clear next actions **so that** parallel
operation is observable without replacing accounting or the incumbent platform.

Acceptance:

- The existing partner portfolio shows each granted shop's catalog, payment, tax, shipping,
  inventory-buffer, and live-order readiness plus the named next action/owner.
- The daily checklist records comparison time, incumbent/Miyagi sellable quantity, unresolved order
  disposition, exception owner, and resolution; it stores no customer PII or external credentials.
- The view never claims real-time sync. Stale/unavailable external evidence is distinct from zero
  exceptions and names the last successful check.
- Viewer can read; manager can record the explicit checklist action; ungranted/revoked identities
  receive no cohort data.

QA: pure readiness-state tests, three-state unavailable tests, role matrix, and owner browser smoke.

### Sprint 4 — transact, dispatch, account for, and close the proof

#### 4.1 Ship the locked direct-charge and tax checkout contract — risk: HIGH

**As a US buyer, I want** one accurate USD total paid to the participating merchant **so that** my
order, receipt, tax, payment, and refund story agree.

Acceptance:

- Checkout creates the payment in the connected US merchant account as a direct charge and preserves
  the connected-account context through authorization, webhook, capture/status, refund, and fee lookup.
- The named tax rail calculates one total from the buyer address and product inputs; Medusa summary,
  Stripe checkout, CTA, receipt, order, and ledger agree to the cent.
- The merchant-of-record identity, tax, shipping, refund, and support responsibility are shown before
  purchase. No platform-marketplace or protected-payment claim is implied unless separately true.
- Duplicate webhooks/retries create one order and one financial event set; async completion has a
  recoverable pending state rather than false success.

QA: Stripe/tax sandbox matrix, total-parity and webhook-idempotency tests, refund test, denied-market
test, owner test-mode browser smoke, then product-owner approval before live enablement.

#### 4.2 Quote, confirm-buy, print, and track through one US provider — risk: HIGH

**As the operator, I want** the selected shipping rail to cover the real fulfillment loop **so that**
one order can move without a silent off-platform label step.

Acceptance:

- Buyer checkout gets selected-provider rates for the merchant origin, parcel, and US destination,
  with bounded timeout, partial-carrier failure, no-rate, and retry states.
- Seller/operator sees carrier, service, price, delivery estimate, package, and funding source before
  an explicit confirmation purchases exactly one idempotent label.
- Print/reprint does not rebuy. Void/refund is explicit and shows submitted/refunded/rejected state.
  Tracking webhooks are authenticated/idempotent and write pre-transit through delivered/failure to
  the Medusa order.
- Label cost and currency are recorded from the provider response. A rate estimate is never booked as
  purchased cost.

QA: provider fixtures and sandbox, failure/idempotency/webhook tests, Medusa fulfillment integration,
owner test-label smoke, and product-owner approval before a live purchase.

#### 4.3 Make the delivered order visible as USD operating economics — risk: HIGH

**As the operator, I want** a currency-safe economic account of the proof order **so that** I can
judge contribution without mistaking it for tax or accounting truth.

Acceptance:

- Existing ledger events represent product revenue, discount, shipping revenue, purchased-label
  cost, actual Stripe processor fee, entered COGS, refund if any, and contribution — all tagged USD.
- Stripe fee comes from the actual balance transaction in the connected-account context; shipping
  cost comes from the purchased provider label. Missing data is named, never coerced to zero.
- The partner proof view aggregates only granted shops, groups by currency, refuses cross-currency
  totals, links back to source orders/events, and labels the result `operating estimate`.
- Existing MXN profit views and event ingestion remain unchanged.

QA: ledger pure-function tests, duplicate-event tests, missing-data and USD/MXN separation tests,
grant matrix, and owner comparison to Stripe/provider evidence.

#### 4.4 Run one bounded real order and close the 90-day proof record — risk: HIGH

**As the product owner, I want** one observed end-to-end order and an explicit continue/stop decision
**so that** the next US bet is based on behavior rather than readiness screenshots.

Acceptance:

- After all launch gates are signed, the owner enables the runtime gate for only the three cohort
  shops and runs one order below the Sprint-1 spend cap through paid, label-purchased, shipped,
  tracked, delivered, and economic-view states.
- Evidence covers buyer, merchant, operator, Stripe, tax, carrier, Medusa order, ledger, incumbent
  reconciliation, notification, and audit perspectives without copying secrets or unnecessary PII.
- The rollback drill disables new US carts/checkout/label purchase while preserving order read,
  fulfillment/tracking, refunds, and evidence for the in-flight order.
- At the named checkpoint, the owner records continue, reshape, or stop; revokes unnecessary grants,
  resolves exceptions, and routes learning into #US-4 rather than silently expanding this epic.

QA: owner-led live smoke, evidence review, rollback rehearsal, cross-shop denial check, and explicit
product-owner close decision.

## Cross-story QA and owner smoke

- **Deterministic gates:** backend `tsc`, lint, build, unit/integration; frontend `tsc`, lint, build,
  unit/integration; root roadmap conventions. Every new test is observed red through a deliberate
  break before restoration.
- **Market matrix:** MX × US × unavailable; cohort × non-cohort; publishable key × Region × operating
  channel × stock/payment/fulfillment resource. Prove correct output and the negation of every ban.
- **Authorization matrix:** manager/viewer/revoked/ungranted across three allowed shops plus a fourth
  denied shop, for read and every mutation.
- **Money matrix:** successful/direct charge, tax calculation, async completion, duplicate webhook,
  declined payment, refund, missing fee, and runtime-disabled cases.
- **Dispatch matrix:** quote success/partial failure/timeout/no-rate, purchase confirm/cancel/retry,
  print/reprint, void/refund, duplicate/out-of-order webhook, delivered/failure.
- **Currency matrix:** USD only, MXN only, and attempted mixed aggregation.
- **Browser smoke:** operator switches three shops, stages/reviews import, creates native product,
  reads readiness, and completes test checkout/label/tracking/economics on preview/staging. Real money
  and label purchase are owner-only production smokes.
- **Live non-regression:** one MX owned-shop read/cart/checkout smoke after the US gate is introduced.

## Kill switch / runtime gate

**Recommendation:** Golden-managed enablement flag `markets.us_operator_pilot_enabled`.

- **Polarity:** enablement, default `false`; create **DISABLED** in every environment. The owner flips
  it only after Sprint 1 and each environment's launch checklist pass.
- **Cohort bound:** the flag is necessary but not sufficient. The seller must resolve to operating
  market `us`, belong to the named three-shop cohort, and the actor must still pass the existing
  ownership/partner-grant authorization.
- **Server seam:** one market-availability decision gates US product publication/mutation, cart
  creation, checkout/payment initialization, rate lookup, label purchase/refund, and operator
  mutating actions. Frontend hides/disables the same surfaces but is not the enforcement boundary.
- **Fail behavior:** absent flag or flag-provider outage means US pilot disabled. Missing US commerce
  resource means explicit unavailable. Neither condition falls back to MX or to a manual rail.
- **Rollback behavior:** disabling blocks new mutations, carts, payments, and label spend while
  preserving read access and the minimum refund/fulfillment/tracking actions needed to make an
  already-paid order safe. The runbook names those carve-through recovery routes explicitly.
- **Mechanism:** current Golden feature-flag catalog and environment propagation, with catalog/default/
  owner copy in the same PR as first flag use. No legacy `platform_flags` row.

## UX heuristics and rails check

- **Hierarchical task analysis:** operator lands in the three-shop portfolio, sees the next blocking
  action, switches shop, previews a mutation, confirms it, and returns to cohort readiness. Avoid
  three unrelated seller dashboards and hidden global state.
- **Progressive disclosure:** readiness first; catalog/payment/tax/dispatch evidence on demand;
  raw provider IDs only in diagnostics.
- **Recognition over recall:** name shop, source platform, retained channel, currency, origin,
  provider, last check, and next action at every consequential confirmation.
- **Error prevention:** no MX fallback, no implicit grant, no import before review, no publish before
  confirmation, no label buy during quote, no money path before tax/liability sign-off.
- **Recovery:** unavailable/timeout/decline/refund/tracking-failure states say what remained unchanged,
  who acts next, and whether retry is safe.
- **Agent parity:** read/audit/draft actions may use partner MCP; publish, catalog/price/stock mutation,
  payments, labels, refunds, customer messages, and grants require the same preview/confirmation/
  authorization rail as UI actions.
- **CI guards:** route authorization tests, market/resource matrix, feature-flag catalog/default guard,
  currency separation, provider webhook/idempotency, TypeScript/lint/build, and browser smoke.
- **Audit-lens findings that apply:** the June 2026 checkout/selling/shipping refresh found false
  success during async payment lag, shipping-before-payment risk, total mismatch, weak quote recovery,
  missing quote timeout, and under-guided delivery readiness. This pilot must reuse the shipped
  payment-state protections and explicitly cover total parity, async recovery, timeout/no-rate,
  payment-before-fulfillment, and readiness-before-publish.
- **Design-language debt:** current seller/import/payment copy assumes MXN/pesos and current delivery
  labels assume Mexico providers. Parameterize semantic currency/market/provider labels through
  existing components; do not fork a US visual system or broaden the bilingual allowlist.

## Current external constraints and evidence

- Stripe says the first Connect tax decision is which entity is liable; the platform-versus-connected
  account answer depends on business model and law and should be made with a tax adviser:
  <https://docs.stripe.com/tax/connect>.
- Stripe documents that direct charges make the connected account the merchant of record, while
  indirect/destination charges make the platform merchant of record by default and assign it refund/
  chargeback liability: <https://docs.stripe.com/connect/configuration-migration-guide>.
- Stripe's self-serve cross-border payout availability is limited to platforms in the US, UK, EEA,
  Canada, and Switzerland; that makes live platform-account eligibility a hard preflight rather than
  a code assumption: <https://docs.stripe.com/connect/cross-border-payouts>.
- Medusa publishable keys are scoped to Sales Channels and that scope controls Store API product,
  inventory, and order context: <https://docs.medusajs.com/resources/commerce-modules/sales-channel/publishable-api-keys>.
- Medusa's native extension point for third-party shipping is a Fulfillment Module Provider:
  <https://docs.medusajs.com/resources/commerce-modules/fulfillment/fulfillment-provider>.
- EasyPost's Shipment flow returns rates, supports explicit label purchase, exposes purchased fees,
  creates tracking, and supports label refunds; these are the required jobs to validate against the
  three origins: <https://docs.easypost.com/docs/shipments>,
  <https://docs.easypost.com/docs/trackers>, and
  <https://docs.easypost.com/docs/shipments/shipping-refund>.

## Open risks / research — bounded by Sprint 1

| Risk | Decision/evidence required | If it fails |
|---|---|---|
| Current Stripe platform cannot onboard/charge US merchants | Live account-country/config check plus US test direct charge/refund | Stop; separate entity/account bet, no payment fallback |
| Tax-liable entity or retained tax rail is not defensible | Counsel-approved responsibility and one-total checkout contract | Disqualify merchant or pause cohort |
| One provider does not cover all origins/parcels | EasyPost/Shippo sandbox matrix with carrier and funding constraints | Choose the other; if neither, stop |
| Parallel stock coherence needs real-time sync | Safety buffer and daily exception run across three real catalogs | Cut high-risk SKUs/shop or re-scope as Channels bet |
| Catalog complexity exceeds current import/native paths | Staged parity report on real products | Cut unsupported SKUs or shop; do not expand connector broadly |
| Existing `#US-2`/Partners rails are not live | Activation/grant/audit production check | Do not activate cohort until dependency ships |
| Real fees are unavailable in direct-charge context | Stripe balance-transaction sandbox proof | Economic proof remains blocked; never write zero |

## Definition of Ready checklist

- [x] One-sentence ask, Feature/Grower classification, shaped-bet lane, and **M** appetite are fixed.
- [x] Fixed proof bar, in-scope boundary, and no-gos constrain the ask to one operator/three shops.
- [x] Stage-2.5 is evidenced as genuinely new but reuse-heavy from current backend/frontend seams.
- [x] Platform-first reuse list names Medusa, partner, migration, ledger, checkout, and fulfillment owners.
- [x] Candidate-dependent ambiguity is isolated to a bounded Sprint 1 with explicit stop conditions.
- [x] Stories are sliced vertically with acceptance, QA, risk, owner-smoke, and negative controls.
- [x] HIGH runtime gate, polarity, enforcement seam, fail behavior, and rollback carve-through are fixed.
- [x] Present-day Stripe, Medusa, and provider assumptions are cited from primary documentation.
- [x] Product owner approved this pitch and the conditional Sprint-1-first sequencing on 2026-08-03.
- [x] Product owner declined the optional architecture/risk panel on 2026-08-03.

## Scope-document gate — product-owner decisions

Approval means all five recommendations are accepted together:

1. **M appetite** with one contract-lock sprint and three bounded build sprints;
2. **merchant-as-merchant-of-record**, direct Stripe charges, and a counsel-approved retained tax rail;
3. **one publishable key per operating market** and no US marketplace channel;
4. **EasyPost primary / Shippo fallback**, with the literal choice made in Sprint 1;
5. **daily parallel reconciliation, not automated Shopify two-way sync**, for this proof.

If approved, keep the pre-scaffold contract gate intact. Approval does not authorize scaffolding in
this grooming turn, production resource creation, Stripe/account changes, label purchase, or a live
order.

## Advisory cross-agent planning panel — offered, not run

This shape introduces an expensive-to-reverse market-key boundary plus payment/tax and fulfillment
provider decisions. Before scaffolding, the product owner may request one advisory architecture/risk
panel:

`node scripts/cross-panel.mjs Roadmap/00-ideas/seeds/us-operator-commerce-pilot.md --lens both --agent codex`

The panel is print-only and advisory; its findings must be reconciled into this pitch before approval
or explicitly declined. It never replaces the product-owner gate.
