---
title: "Founding merchant activation operations — CRM projection and field intake"
slug: founding-merchant-activation-ops
status: scaffolded
area: "08"
type: feature
priority: "#2-fm"
risk: high
epic: "08-growth-and-promotions/founding-merchant-activation-ops"
build_order: "#2-fm"
updated: 2026-07-20
---

# Scope — Founding merchant activation operations — CRM projection and field intake

## Outcome & signal

Miyagi can operate every founding-merchant relationship from first scouting through 30-day retention without
a private spreadsheet or a second CRM becoming the truth. A promoter captures the merchant once in the field,
an authorized steward always sees the current stage and next action, and commerce milestones advance from real
Medusa facts rather than manual checkboxes.

Daniel can test the result with one disposable merchant: capture it on a phone at `/promotor/cerrar`, grant
preview permission, assign a next action, claim the shop, connect payments, publish three products, share it,
record an inquiry and complete a sale. The relationship must show one auditable path through the corresponding
stages, while Golden Beans receives PII-free lifecycle events under one stable merchant subject id.

## Stage-2.5 bucket

**Genuinely new relationship layer over shipped primitives.** `/promotor/cerrar`, promoter attribution,
unclaimed-shop setup, claims, partner grants, product publishing and Medusa order/payment facts already exist.
What does not exist is the canonical merchant relationship, interaction/task history, or a resolver that turns
those facts into the 13-stage activation journey.

## Scope

**In v1:**
- A Miyagi-owned merchant relationship record in Supabase: business/contact details, preferred contact channel,
  WhatsApp, Instagram, location/event, category, current sales channels, qualification/fit, objections, source,
  promoter/cohort attribution, named steward and consent references.
- A mobile-first field form inside `/promotor/cerrar`, designed for an in-person conversation: save a useful
  partial record quickly, resume it, deduplicate before creating a second merchant, and never require a shop.
- One ordered lifecycle with explicit definitions: scouted → qualified → permission received → preview in
  preparation → preview delivered → activation scheduled → claimed → payments ready → three products live →
  shared externally → first inquiry → first sale → retained at 30 days.
- Immutable stage history, interactions/notes, due-dated next action, owner history and audited manual correction.
- Promoter and admin views: owned merchants, current stage, age in stage, next action, consent state and blockers.
- Commerce-derived milestones read from Medusa or its established read mirrors; no copied products, orders,
  payment state or seller ownership in the CRM tables.
- PII-free Golden Beans lifecycle events with `entity_type=merchant` and a stable opaque subject id, delivered
  through `event-destination-router`; the Miyagi record keeps the contact data.

**Out of v1:**
- A generic CRM builder, lead scoring system, autonomous outbound or multi-channel marketing automation.
- Making Attio, HubSpot or another vendor canonical. Attio may become an optional router destination after the
  provider-neutral proof is green.
- Editing orders, products, payments or commissions from the CRM surface.
- Merchant Partner portfolio SLAs, follow-up drafts and retention work queues; those belong to
  `merchant-partner-lifecycle` after the relationship layer proves itself.
- Compensation changes for promoters or partners.

## What already exists (reuse, don't rebuild)

| Existing capability | Reuse decision |
|---|---|
| `/promotor/cerrar` + `PromoterCloseClient` | Add the field-intake step to the existing in-person close workspace. |
| Promoter applications, codes, attributions, commissions and transfers | Preserve acquisition/compensation truth; link the relationship by promoter/cohort instead of replacing it. |
| Unclaimed shop setup + WhatsApp claim link | Continue creating/claiming the Medusa seller through the shipped path. |
| `partner_grants` + `/partner` | Reuse authorization/ownership for portfolio access; do not create a second partner model. |
| Supabase non-commerce tables | Canonical home for relationship, consent, interaction and task data. |
| Medusa sellers/products/orders/payment connections | Canonical commerce facts used by the stage resolver. |
| `founding-merchant-consent-previews` | Canonical permission/evidence contract for preview-related stages. |
| Golden Beans `event-destination-router` | Stable subject contract and reliable delivery; this epic emits, it does not build a second router. |
| Golden Beans `entity-journeys-projections` | Future reusable stage/time/cohort projection; Miyagi owns work records, Golden Beans owns analytical projection. |

## UX heuristics & rails check

- **CI guards covering this surface:** promoter-close API/browser specs, partner authorization specs, Supabase
  migration checks and the existing design-token/emoji guards; add stage-transition, tenant-scope and PII-event
  contract specs.
- **Audits-lens findings that apply:** preserve the results-refresh rule that agent/promoter surfaces never
  bypass seller ownership or invent commerce truth; no direct audit finding specifies this CRM.
- **Design-language debt:** `/promotor/cerrar` is already the correct task-focused shell. Keep one step open,
  large phone targets, explicit save state and Iconoir/semantic-token language; do not introduce a desktop CRM
  table as the field form.

## Kill-switch / runtime gate (risk:high only — Stage 6b)

Use enablement flag `promoter.activation_crm_enabled`, default **false** and created **disabled** in every
environment. Gate the new intake step, pipeline/relationship pages and write routes; flip only after migrations,
role-scope specs and a disposable-merchant smoke pass. Additive Supabase migrations use expand/contract and
cannot be rolled back by a flag. Commerce close/claim behavior stays on its existing flags and remains unchanged
when this flag is off.

## Delivery slices

1. **Field record and consent-safe intake:** canonical relationship/dedupe contract, mobile capture and resume,
   promoter/admin authorization, preview-consent reference.
2. **Lifecycle and stewardship:** 13-stage resolver, immutable history, notes/interactions, owner and next action,
   promoter/admin operating views.
3. **Commerce facts and event rail:** derive claim/payment/products/share/inquiry/sale/retention facts without
   copying Medusa, emit the stable PII-free Golden Beans contract, and prove router replay is idempotent.

## Acceptance criteria

1. A promoter can save a partially known merchant on a phone and resume it without creating a duplicate.
2. A promoter sees only merchants they own or have an active grant for; admin sees the complete cohort.
3. Permission-dependent stages require the consent-preview evidence reference; a note alone cannot imply consent.
4. Every stage change records who/what advanced it, when it entered, its prior stage and any correction reason.
5. Claim, payments-ready, three-products-live and first-sale advance from real commerce facts and repair on replay.
6. Every active merchant has either a dated next action or is visibly flagged as missing one.
7. Golden Beans receives one logical event per transition under the same opaque merchant id, with no name, phone,
   email, Instagram handle, note or objection in the payload.
8. With `promoter.activation_crm_enabled` off, today's `/promotor/cerrar` and promoter flows behave unchanged.

## Open risks / research

- **Architecture-panel trigger:** this introduces a new relational schema plus a cross-repo identity/event
  contract. The advisory architecture/strategy panel should be offered before scaffold approval; it is not a
  reason to substitute a vendor CRM for the canonical Miyagi record.
- Lock the exact dedupe precedence (claimed seller id, normalized phone/email, then human-confirmed match) during
  Sprint 1; never auto-merge two merchants on fuzzy business-name similarity.
- Golden Beans `event-destination-router` and `entity-journeys-projections` are dependencies, not hidden scope.
  Intake and stewardship can ship dark first; lifecycle delivery/scorecard cannot claim end-to-end completion
  until those contracts are available.
