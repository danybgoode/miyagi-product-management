---
status: scaffolded
slug: merchant-partner-lifecycle
---

# Epic: Merchant Partner lifecycle

> **Area:** 08 · Growth & Promotions · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/merchant-partner-lifecycle.md`](../../00-ideas/seeds/merchant-partner-lifecycle.md)

## Why

Once the merchant relationship exists, each Founding Merchant Partner needs a bounded portfolio, clear response
commitments and safe assistance preparing follow-up. Miyagi should help a human keep promises from application
through 30-day retention without autonomous outreach or a second ownership model.

## Medusa-first note

Medusa continues to own sellers, products, orders, payments and sales. This epic works from the activation
relationship and existing `partner_grants`; it stores stewardship tasks, SLA state and draft provenance only.
Commerce facts may trigger work but are never editable from the partner lifecycle surface.

## Decisions locked at scope approval

1. Partner access is grant-scoped; there is no new partner identity or global merchant directory.
2. Original promoter/cohort attribution and commission truth survive stewardship reassignment.
3. Agent/model output is an editable draft built from allowlisted facts and is never auto-sent.
4. External communication requires explicit human confirmation in the merchant's preferred channel.
5. `promoter.partner_portfolio_enabled` is an enablement flag born OFF.

## What already exists (reuse, don't rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| Relationship and stages | `founding-merchant-activation-ops` | Read/write authorized stewardship state and tasks |
| Partner identity/access | `partner_grants`, `/partner`, `ms_partner_` auth | Scope every portfolio and agent operation |
| Acquisition/compensation | promoter attribution, commissions and transfers | Preserve origin and payout records on reassignment |
| Commerce facts | Medusa seller/product/payment/order facts | Trigger work without copying/editing commerce |
| Notifications | existing Telegram/email notification fan-out and idempotency patterns | Notify the steward, not the merchant, in v1 |
| Agent controls | propose/confirm tool patterns and audit metadata | Require human confirmation for task updates |
| Event rail | Golden Beans router/entity journeys | Emit PII-free SLA and retention facts |
| Scorecard definitions | `merchant-activation-scorecard` | Reuse aging/overdue semantics rather than redefining them |

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Portfolio ownership and SLA contract + OFF flag | high |
| 1 | 1.2 Grant-scoped partner work queue | high |
| 1 | 1.3 Audited admin reassignment preserving attribution | high |
| 2 | 2.1 Fact-bounded editable follow-up drafts | high |
| 2 | 2.2 Idempotent steward reminders | high |
| 2 | 2.3 Explicit human send/provenance boundary | high |
| 3 | 3.1 Thirty-day retention work and outcomes | high |
| 3 | 3.2 Partner-agent read and propose/confirm parity | high |
| 3 | 3.3 PII-free SLA/retention events and enablement | high |

## Kill-switch

`promoter.partner_portfolio_enabled` is an enablement flag in `platform_flags`, default **false** and created
disabled everywhere. It gates partner portfolio pages, new task/draft routes and partner-agent tools. OFF leaves
current `/partner` behavior intact; additive audit/task records remain. Daniel flips only after two-partner scope,
no-auto-send and reminder-idempotency smokes pass.

## Deploy order

Start after activation operations provides stable relationship/owner/task contracts. Land additive fields and
the disabled flag first, then portfolio reads/reassignment, draft/reminder assistance, retention and agent/event
parity. Notifications must degrade safely and never fall back to direct merchant sending. Verify migrations live,
then enable for one disposable partner cohort before broader access.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Two-partner authorization matrix proves cross-partner reads/writes return 403
- [ ] Reassignment preserves origin, cohort, commission and full owner history
- [ ] Draft generation uses allowlisted facts and no path can auto-send to a merchant
- [ ] Reminder delivery and Golden Beans event replay are idempotent
- [ ] Thirty-day outcome definitions agree with the scorecard contract
- [ ] `promoter.partner_portfolio_enabled` exists with enablement polarity, born OFF; Daniel flips after smoke
- [ ] Every sprint walkthrough contains deployed URLs and disposable data
- [ ] This README marked shipped; retrospective, poster and durable learnings updated
- [ ] Feature branch deleted and `node scripts/build-order.mjs` run
