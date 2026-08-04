# US operator commerce pilot — Sprint 1: Lock the cohort and rails before code

**Status:** ⬜ not started

## Outcome

The operator, three merchants, retained systems, funds/tax responsibilities, shipping provider and proof
workflow become a literal, product-owner-approved contract. A failed payment, tax or provider premise stops
the epic before application code or production resources are changed.

## Build contract — architect must lock before delegation

Before this sprint starts, cite the epic's live-verified `D1…Dn` decisions here. The contract must name the
private evidence index and public-safe decision artifact, the current #US-2 deployment/flag state, live
partner/grant populations, Stripe platform account country/configuration, the candidate provider accounts
and the rule for handling secrets/merchant/customer data. A builder may not infer any of those from the seed.

Sprint deliverable: a public-safe `pilot-contract.md` beside this file plus private evidence links stored in
the approved secret/private system. The Roadmap artifact contains decisions and checksums/references only —
never API keys, bank data, customer PII, confidential contracts or raw counsel advice.

## Stories

### Story 1.1 — Cohort and parallel-operation contract

**As the founding operator, I want** the three shops, permissions, retained systems, catalog paths and
reconciliation routine named **so that** every later story builds against real work.

**Acceptance:**

- One operator and exactly three merchants pass the distinctive-product rubric, consent to the operator and
  90-day parallel proof, and name grant/revocation contacts. Commodity resale, counterfeit/unauthorized goods,
  absent owner consent, missing US readiness or inability to name three candidates disqualifies the cohort.
- The contract names one Shopify import, one native setup, the third intake path, domains, origin ZIPs,
  representative parcels, catalog ownership, COGS owner and original-product complexity.
- It names the incumbent channel, inventory authority, safety stock, reconciliation owner/cadence/exception
  SLA, retained DNS/domain, email/CRM, analytics/pixels, accounting, tax, reviews/SEO and cutover/exit rule.
- A fourth non-cohort shop is the authorization negative control. No secret or customer PII enters Roadmap or
  relationship notes.

**Risk:** low — document-only. **QA:** Daniel reviews the cohort matrix, one merchant-consent sample and the
fourth-shop negative-control fixture; all private artifacts are referenced rather than copied.

### Story 1.2 — Funds and tax contract

**As a participating merchant, I want** funds, fee, dispute, refund and tax responsibilities proved before
checkout work **so that** a growth proof does not make a false legal or financial promise.

**Acceptance:**

- Live Stripe platform account country/configuration and US connected-account eligibility are verified
  without exposing credentials.
- Test mode completes one US connected-account onboarding, direct charge and refund; evidence names merchant
  of record, fee payer, negative-balance owner, dispute/refund owner, payout path and connected-account webhook/
  fee lookup context.
- Qualified counsel names the tax-liable party. The retained tax rail, registrations/nexus inputs,
  calculation/filing owner, receipt representation and one-total Medusa/Stripe/order/ledger contract are fixed.
- Failure of any line stops the epic. No destination charge, manual payment, zero-tax or platform-as-merchant
  fallback is silently substituted.

**Risk:** high — payment/tax/account configuration. **QA:** Daniel reviews Stripe test evidence and the
counsel-approved decision record, then writes an explicit Sprint 1 go/no-go. No live charge is used.

### Story 1.3 — Dispatch and proof contract

**As the operator, I want** one provider and one observable proof workflow selected from real shop inputs
**so that** Dispatch is built for the cohort rather than for a hypothetical platform.

**Acceptance:**

- EasyPost and Shippo produce sandbox quotes for representative parcels from all three origin ZIPs to sample
  US destinations; carrier-account, funding, timeout and coverage gaps are recorded.
- One provider is selected. The other is deleted from build scope. The contract fixes account/funding owner,
  carrier scope, quote timeout, explicit purchase preview/confirm, print/reprint, void/refund, tracking webhook,
  failure behavior and purchased-cost evidence.
- The proof reviewer, live-order shop/SKU, maximum authorized order/label spend, evidence locations, stop
  conditions, rollback owner and 90-day checkpoint are named.

**Risk:** high — provider credentials and potential label spend. **QA:** sandbox-only provider evidence plus
Daniel approval of the literal provider/proof contract; no production label is purchased.

## Sprint QA

- **Automated specs:** none in Sprint 1; this is an evidence/decision gate. The architect re-derives live
  account/resource facts and records unavailable distinctly from absent.
- **Review:** root planning-doc diff plus product-owner review. Story 1.2/1.3 evidence is HIGH despite the
  public artifact being docs-only.
- **Owner smoke owed:** Daniel owns the Stripe test direct-charge/refund, provider sandbox quote comparison
  and final go/no-go. Private dashboard URLs/IDs stay in the approved private evidence index.
- **Continuation rule:** do not cut Sprint 2 app branches until every acceptance line is literal and Daniel
  records `GO`. A failed premise returns the seed/epic to a visible blocked/queued decision; it is not patched
  with a new provider or funds flow inside this appetite.

## Sprint 1 — Smoke walkthrough

Env: provider test modes + private evidence index · no production commerce mutation

1. Open `pilot-contract.md` beside this sprint file.
   → It names one operator, three consented merchants, one Shopify/native intake map and a fourth denied shop;
   every retained system and reconciliation owner is explicit and no secret/PII is present.
2. Open the private Stripe test-evidence link recorded in the contract.
   → It shows one eligible US connected account, one direct test charge and one refund, with merchant/fee/
   dispute/payout responsibilities matching the public-safe decision.
3. Open the counsel/tax decision reference recorded in the private index.
   → The liable party and retained tax rail are approved, and the one-total checkout contract is unambiguous.
4. Open the EasyPost and Shippo sandbox evidence links.
   → Both were tested against all three origins; exactly one provider is selected with funding, confirmation,
   refund and webhook behavior named.
5. Review the proof cap, owner, rollback and checkpoint with Daniel.
   → Daniel records `GO` or `STOP`. Only `GO` unblocks Sprint 2; it does not authorize a live charge/label.

If any step fails, note the step and source that was absent/unavailable. Do not replace it with an assumption.
