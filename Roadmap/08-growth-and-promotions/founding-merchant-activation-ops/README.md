---
status: scaffolded
slug: founding-merchant-activation-ops
---

# Epic: Founding merchant activation operations — CRM projection and field intake

> **Area:** 08 · Growth & Promotions · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/founding-merchant-activation-ops.md`](../../00-ideas/seeds/founding-merchant-activation-ops.md)

## Why

Miyagi needs one operational record for every founding merchant from first scouting through 30-day retention.
Promoters should capture a useful record in the field, stewards should always know the stage and next action,
and commerce milestones should advance from actual marketplace facts rather than spreadsheet checkboxes.

## Medusa-first note

Medusa remains authoritative for sellers, ownership, products, orders and payment readiness. Supabase stores the
non-commerce relationship, consent references, interactions, tasks and immutable lifecycle history. The stage
resolver reads Medusa facts and existing mirrors; it never creates a second commerce model.

## Decisions locked at scope approval

1. The Miyagi relationship record is canonical; a vendor CRM may later receive routed projections only.
2. Consent-dependent stages require evidence from the consent-preview contract; notes cannot imply permission.
3. Fuzzy business-name matching may suggest a duplicate but may never merge records automatically.
4. Golden Beans events carry an opaque merchant id and no contact details, notes or objections.
5. `promoter.activation_crm_enabled` is an enablement flag born OFF in every environment.

## What already exists (reuse, don't rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| In-person close workspace | `/promotor/cerrar` + `PromoterCloseClient` | Add mobile intake to the existing job flow |
| Acquisition truth | promoter applications, codes, attribution, commissions and transfers | Link the relationship; do not replace compensation records |
| Shop activation | unclaimed-shop setup, WhatsApp claim link and claim completion | Continue using the shipped ownership path |
| Partner access | `partner_grants` + `/partner` | Reuse grants for scoped portfolio reads |
| Non-commerce data | existing Supabase modules and migration pattern | Store relationship, consent reference, interaction and task state |
| Commerce facts | Medusa sellers, products, orders and payment connections | Derive lifecycle milestones without copying facts |
| Preview permission | `founding-merchant-consent-previews` | Reuse its evidence/version contract |
| Event delivery | Golden Beans `event-destination-router` | Emit one provider-neutral lifecycle contract |
| Journey analytics | Golden Beans `entity-journeys-projections` | Reuse later for time/cohort projections and the scorecard |

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Canonical relationship schema and dark-launch flag | high |
| 1 | 1.2 Authorized mobile intake, resume and dedupe | high |
| 1 | 1.3 Consent evidence and acquisition attribution | high |
| 2 | 2.1 Deterministic 13-stage resolver and immutable history | high |
| 2 | 2.2 Interactions, ownership and due-dated next action | high |
| 2 | 2.3 Promoter/admin operating views | high |
| 3 | 3.1 Medusa commerce-fact adapter and replay repair | high |
| 3 | 3.2 PII-free Golden Beans lifecycle events | high |
| 3 | 3.3 Milestone mismatch and reconciliation view | high |

## Kill-switch

`promoter.activation_crm_enabled` is an enablement flag in `platform_flags`, default **false** and created
disabled everywhere. It gates new intake, relationship/pipeline pages and write routes. OFF preserves today's
`/promotor/cerrar`; additive migrations remain and must be forward-compatible. Flip only after role-scope tests,
live migration verification and one disposable merchant completes the smoke walkthrough.

## Deploy order

Land additive Supabase migrations and the disabled flag first, then Sprint 1 intake and Sprint 2 stewardship.
Verify each migration against the live schema because CI does not apply it. Sprint 3 may consume Medusa facts
before Golden Beans is available, but end-to-end event delivery waits for `event-destination-router`. Enable the
flag only after frontend/backend compatibility and the disposable-merchant production smoke are green.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough with deployed URLs and disposable data
- [ ] Cross-partner reads/writes return 403 and admin cohort access is covered deterministically
- [ ] Commerce milestones replay idempotently and PII contract tests pass
- [ ] Additive Supabase migrations are confirmed against the live schema
- [ ] `promoter.activation_crm_enabled` exists with enablement polarity, born OFF; Daniel flips it after smoke
- [ ] This README marked shipped; sprint headings carry commit refs
- [ ] `RETROSPECTIVE.md`, product poster and durable learnings updated
- [ ] Feature branch deleted and `node scripts/build-order.mjs` run
