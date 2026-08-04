# US operator commerce pilot — Sprint 4: Transact, dispatch, account for and close the proof

**Status:** ⬜ not started

## Outcome

The locked cohort can complete one accurate USD owned-shop order through the merchant's direct Stripe charge,
the retained tax rail and one confirmed US label; tracking reaches delivered and the existing ledger shows
actual USD contribution inputs. Daniel then records continue, reshape or stop.

## Build contract — architect must lock before delegation

Before a builder starts, cite the epic's `D1…Dn`, Sprint 1 funds/tax/dispatch contract and merged Sprint 2–3
contracts here. Name the direct-charge Checkout Session/PaymentIntent account context through webhook/refund/
balance transaction, the one-total tax seam and product inputs, selected Medusa fulfillment-provider methods,
provider webhook verification/idempotency, quote/purchase boundary, ledger event types/idempotency/currency
grouping, Golden flag/recovery carve-through, literal live-order cap/SKU/shop and owner-only production steps.

## Stories

### Story 4.1 — Ship the locked direct-charge and tax checkout contract

**As a US buyer, I want** one accurate USD total paid to the participating merchant **so that** order,
receipt, tax, payment and refund agree.

**Acceptance:**

- Checkout creates the payment in the connected US merchant account as a direct charge and preserves that
  account context through authorization, webhook, capture/status, refund and fee lookup.
- The named tax rail calculates one total from buyer address/product inputs; Medusa summary, Stripe checkout,
  CTA, receipt, order and ledger agree to the cent.
- Merchant-of-record identity and tax/shipping/refund/support responsibility appear before purchase. No
  marketplace/protected-payment claim appears unless separately true.
- Duplicate/out-of-order webhooks and retries create one order/financial event set. Async completion has a
  recoverable pending state rather than false success. Fulfillment is unavailable until payment is settled.

**Risk:** high — checkout/payment/tax. **QA:** Stripe/tax sandbox matrix, total parity, account-context webhook/
idempotency, decline/pending/refund, payment-before-fulfillment and market/flag denial. Daniel approves before
live enablement.

### Story 4.2 — Quote, confirm-buy, print and track through one US provider

**As the operator, I want** the selected shipping rail to cover the fulfillment loop **so that** one order can
move without a silent off-platform label step.

**Acceptance:**

- Checkout gets selected-provider rates for the merchant origin, parcel and US destination with bounded
  timeout, partial-carrier failure, no-rate and retry states.
- Seller/operator sees carrier, service, price, estimate, package and funding source before an explicit,
  idempotent confirmation buys exactly one label.
- Print/reprint never rebuy. Void/refund is explicit and shows submitted/refunded/rejected. Authenticated,
  idempotent tracking webhooks write pre-transit through delivered/failure to the Medusa order.
- Purchased label cost/currency comes from the provider response; a quote is never booked as cost. OFF gate
  blocks new spend but preserves safe tracking/refund/fulfillment recovery for paid orders.

**Risk:** high — fulfillment/provider spend. **QA:** provider fixtures/sandbox, timeout/partial/no-rate,
confirm/cancel/retry, print/reprint, refund and duplicate/out-of-order webhook tests; Daniel owns test/live label.

### Story 4.3 — Make the delivered order visible as USD operating economics

**As the operator, I want** a currency-safe economic account of the proof order **so that** I can judge
contribution without mistaking it for tax or accounting truth.

**Acceptance:**

- Existing ledger events represent product revenue, discount, shipping revenue, purchased-label cost, actual
  Stripe processor fee, entered COGS, refund if any and contribution, all tagged USD.
- Stripe fee comes from the actual connected-account balance transaction and shipping cost from the purchased
  label. Missing/unavailable evidence is named and never coerced to zero.
- Partner proof view aggregates only granted shops, groups by currency, refuses a cross-currency total, links
  to source order/events and labels the result `operating estimate`.
- Existing MXN views/event ingestion remain unchanged and no accounting/tax truth is claimed.

**Risk:** high — financial reporting/authorization. **QA:** pure ledger logic, event idempotency, missing-data,
USD/MXN separation, grant matrix and Daniel comparison to Stripe/provider evidence.

### Story 4.4 — Run one bounded real order and close the 90-day proof record

**As the product owner, I want** one observed end-to-end order and an explicit continue/stop decision **so
that** the next US bet is based on behavior rather than readiness screenshots.

**Acceptance:**

- After every gate is signed, Daniel enables only the three cohort shops and runs one order below the Sprint 1
  cap through paid, label-purchased, shipped, tracked, delivered and economic-view states.
- Evidence covers buyer, merchant, operator, Stripe, tax, carrier, Medusa order, ledger, incumbent
  reconciliation, notification and audit without copying secrets/unnecessary PII.
- Rollback disables new US carts/checkout/label purchase while preserving safe read/refund/fulfillment/tracking
  for the in-flight order.
- At the checkpoint Daniel records continue/reshape/stop, revokes unnecessary grants, resolves exceptions and
  routes learning into #US-4 rather than expanding this epic.

**Risk:** high — real money/label/production state. **QA:** owner-led live smoke, evidence review, rollback
rehearsal and fourth-shop denial. No agent executes the real transaction or flag flip.

## Sprint QA

- **Backend specs:** direct-charge account context, tax/total parity, webhook/refund/idempotency, fulfillment
  provider and tracking, actual fee/label ledger events, currency/auth/flag matrices and recovery carve-through.
- **Frontend specs:** checkout pending/decline/recovery, responsibility copy, rate timeout/no-rate, label
  preview/confirm/refund states and operator USD proof view.
- **Mutation proof:** every new spec observed red once, especially duplicate money/label events, ship-before-paid,
  quote-as-cost, missing-as-zero and mixed-currency aggregation.
- **Owner smoke owed:** Daniel alone enables the literal cohort, performs real payment/label steps under the cap,
  verifies delivery/economics and rehearses rollback.
- **Review:** stacked HIGH PR(s), backend/provider before frontend; mandatory cross-family and fresh reviewer on
  the fixed tip, Daniel merge and separate approval for each production mutation.

## Sprint 4 — Smoke walkthrough

Env: test mode first · production only after Daniel's explicit per-action authorization

1. With the flag OFF, open the literal proof-shop product and try to begin checkout.
   → Product read/evidence remains available as designed, but new US cart/payment/label spend is unavailable;
   the MX regression shop still works.
2. Enable only the disposable test cohort and complete checkout with Stripe test credentials/address.
   → Summary, CTA, Stripe total, tax, receipt and Medusa order agree in USD; pending/decline recover honestly.
3. As the operator, request shipping rates for the paid test order.
   → Rates show carrier/service/price/estimate; timeout/partial failures are explicit and no label is bought.
4. Preview one test label, cancel, then confirm once and retry the confirmation.
   → Cancel spends nothing; confirm buys one label; retry/reprint do not buy another; tracking is attached.
5. Send sandbox tracking states through delivered and inspect the order/economic view.
   → Tracking progresses idempotently; USD view shows actual processor/label/COGS/discount inputs and no MXN sum.
6. Disable the flag with the paid test order in flight.
   → New checkout/label spend stops while the locked recovery routes still allow safe tracking/refund/fulfillment.
7. **Real money/label steps — Daniel only:** repeat the approved path on the literal live shop/SKU under the
   Sprint 1 cap and wait for actual delivered status.
   → One real USD order is paid, labeled, tracked, delivered and represented in the operator economic view.
8. Attempt cohort access/checkout with the fourth shop, review incumbent reconciliation and record the checkpoint.
   → Fourth shop is denied, no exception is unresolved, and Daniel records continue/reshape/stop for #US-4.

If any step fails, record URL/shop, actor/grant, flag, order/payment/label/tracker IDs in the private evidence
index and the public-safe state/error here. Never paste secrets or unnecessary PII.
