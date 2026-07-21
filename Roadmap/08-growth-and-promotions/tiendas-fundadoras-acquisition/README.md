---
status: scaffolded
slug: tiendas-fundadoras-acquisition
---

# Epic: Tiendas Fundadoras acquisition

> **Area:** 08 · Growth & Promotions · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/tiendas-fundadoras-acquisition.md`](../../00-ideas/seeds/tiendas-fundadoras-acquisition.md)

## Why

Miyagi needs a focused invitation for the first 25 founding shops: one promise, one proof path and one
attributed application that enters activation operations without copying contact data into a marketing tool.
The page should sell hands-on setup and a consent-safe preview, not every marketplace feature.

## Medusa-first note

This epic does not create sellers, products or orders. The public campaign captures an application into the
Miyagi relationship layer; only the existing activation/claim paths later create and transfer Medusa entities.

## Decisions locked at scope approval

1. The wedge is 25 founding shops receiving hands-on setup and a private preview before publication.
2. Application consent and preview/publication permission are separate affirmative choices.
3. The application writes to activation operations; no parallel lead spreadsheet or vendor CRM is canonical.
4. Capacity is enforced server-side and can switch the page to a closed or waitlist state.
5. `growth.founding_merchants_enabled` is an enablement flag born OFF.

## What already exists (reuse, don't rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| Marketing pages | existing `/vende/*` routes, shared renderer and editable content keys | Repurpose layout; write campaign-specific Spanish copy |
| Platform proof | seller, product, checkout, claim and promoter journeys | Use truthful screenshots/outcomes, not speculative claims |
| CMS/editability | existing landing namespaces and admin/agent content editing | Keep campaign copy operationally editable |
| Promoter attribution | promoter code/source/UTM primitives | Preserve origin through the application |
| Merchant relationship | `founding-merchant-activation-ops` | Create or enrich one canonical applicant record |
| Preview permission | `founding-merchant-consent-previews` | Keep application and publication consent distinct |
| Telemetry | `/api/growth/track`, growth engine and Golden Beans router | Emit PII-free funnel facts only |
| Feature flags | `lib/flags.ts`, `platform_flags`, `/admin/flags` | Dark-launch public acquisition |

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Focused `/vende/fundadoras` campaign surface | low |
| 1 | 1.2 Editable content, metadata and agent parity | low |
| 1 | 1.3 Capacity-aware closed state and dark-launch flag | high |
| 2 | 2.1 Attributed, deduplicated public application | high |
| 2 | 2.2 Separate contact and preview-permission choices | high |
| 2 | 2.3 PII-free funnel events and launch controls | high |

## Kill-switch

`growth.founding_merchants_enabled` is an enablement flag in `platform_flags`, default **false** and created
disabled. OFF keeps the route unavailable or in its configured closed state and disables the public write route.
Capacity enforcement is independent: reaching the cohort limit cannot be bypassed by a stale page or direct API
request. Daniel flips the flag only after a disposable attributed application passes production smoke.

## Deploy order

Ship the editable page/metadata behind the OFF flag first. Sprint 2 depends on activation-operations Sprint 1
and the consent-preview contract. Land the rate-limited write path disabled, verify migrations and attribution,
then run anonymous plus authenticated-admin smoke before Daniel opens the cohort.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] `/vende/fundadoras` communicates the founding-shop wedge in Spanish and works on mobile
- [ ] One application creates/enriches one canonical activation relationship with source attribution
- [ ] Contact consent and preview/publication permission remain independent and auditable
- [ ] Capacity, rate-limit, dedupe and PII-free event tests pass
- [ ] `growth.founding_merchants_enabled` exists with enablement polarity, born OFF; Daniel flips after smoke
- [ ] Every sprint walkthrough contains deployed URLs and disposable data
- [ ] This README marked shipped; retrospective, poster and durable learnings updated
- [ ] Feature branch deleted and `node scripts/build-order.mjs` run
