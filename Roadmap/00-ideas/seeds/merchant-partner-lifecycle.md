---
title: "Merchant Partner portfolio — follow-up, ownership SLA, and retention"
slug: merchant-partner-lifecycle
status: scaffolded
area: "08"
type: feature
priority: "#5-fm"
risk: high
epic: "08-growth-and-promotions/merchant-partner-lifecycle"
build_order: "#5-fm"
updated: 2026-07-20
---

# Scope — Merchant Partner portfolio — follow-up, ownership SLA, and retention

## Outcome & signal

Every Merchant Partner knows which merchants they own, what to do next, which relationships are stalled and
which 30-day retention actions are due. Admin can reassign neglected work without breaking attribution. The
system helps a human follow up; it does not impersonate them or send unsolicited messages.

Daniel can test the result with two partner accounts and three disposable merchants: assign ownership, let one
next action become overdue, generate a signed-human draft, reassign the relationship as admin, and complete the
30-day retention task. Each partner must see only their active portfolio, history must remain intact, and no
message may leave the system without a human choosing the channel and sending it.

## Stage-2.5 bucket

**Light enhancement over the activation CRM and shipped partner rail.** `partner_grants`, the `/partner` shell,
promoter attribution and multi-shop MCP authorization already exist. This epic turns the activation
relationship's owner/tasks into a partner operating portfolio; it must not create a second merchant record,
grant model or commission ledger.

## Scope

**In v1:**
- A portfolio view in `/partner`: owned merchants, stage, age, next action, due/overdue state, blocker and last
  interaction, with filters for needs action, stalled, preview, activation and retention.
- Ownership SLA rules configured by admin: how long a merchant may sit without a next action/interaction at
  defined stages, with an explainable overdue reason.
- Admin reassignment that changes the active steward/grant while preserving promoter/campaign attribution,
  interaction history and any earned commission facts.
- Follow-up drafts generated from approved facts (stage, agreed next step, merchant-preferred channel and public
  shop/preview link), visibly attributed to the human partner and editable before copy/send.
- Reminder notifications to the partner/admin through the existing notification fan-out; no merchant-directed
  automatic delivery.
- A retention work item due 30 days after the agreed activation milestone, closed with a structured outcome and
  optional note.
- Partner-agent parity: read portfolio/work queue; propose a task update; explicit confirm/apply for writes under
  the existing `ms_partner_` scope. No send-message tool.
- Portfolio/task events returned to Golden Beans under the same opaque merchant subject id for SLA/retention
  measurement.

**Out of v1:**
- Autonomous WhatsApp/email/DM outreach, bulk sequences, scraped-contact enrichment or unsolicited messaging.
- Changing promoter/partner commission rates, payout milestones or money paths. Compensation is a separate HIGH
  decision after activation outcomes are measured.
- A second CRM, partner-grant system, seller ownership model or general task-management product.
- Partner access to merchants without an active grant/ownership assignment.

## What already exists (reuse, don't rebuild)

| Existing capability | Reuse decision |
|---|---|
| `founding-merchant-activation-ops` | Canonical merchant, stage, interactions, owner and next-action records. |
| `/partner`, `partner_grants`, `ms_partner_` auth | Portfolio shell and authorization boundary. |
| Promoter attribution/commission/transfer rail | Preserve acquisition and money truth; never mutate it during reassignment. |
| Existing email/Telegram/notification fan-out | Partner/admin reminders only; drafts never auto-send to merchants. |
| Existing propose → confirm → apply MCP pattern | Task-write parity with explicit confirmation and audit. |
| Merchant activation scorecard | SLA/retention definitions and operating outcomes; portfolio links back to the same metrics. |
| Golden Beans journey events | Measure stalls, follow-up and retention without embedding CRM behavior in Golden Beans. |

## UX heuristics & rails check

- **CI guards covering this surface:** partner-grant authorization specs, MCP propose/confirm patterns,
  notification preference/fan-out specs and design-token guards. Add cross-partner 403, reassignment-history,
  no-auto-send and reminder-idempotency coverage.
- **Audits-lens findings that apply:** authorization and signed-human provenance are the priority: never let a
  partner act on an ungranted shop/merchant, and make generated text visibly a draft rather than an action log.
- **Design-language debt:** keep `/partner` an action queue, not a dense enterprise CRM. Default to “needs action,”
  use one dominant next action per merchant, and disclose why an item is overdue.

## Kill-switch / runtime gate (risk:high only — Stage 6b)

Use enablement flag `promoter.partner_portfolio_enabled`, default **false** and created **disabled**. Gate the new
portfolio/task write routes, partner nav entry, reminder scheduler and MCP tools. Additive relationship/task fields
use expand/contract. Turning the flag off restores today's `/partner` behavior and stops new reminders without
revoking existing partner grants or changing attribution/commission data.

## Delivery slices

1. **Portfolio and ownership SLA:** partner-scoped queue, due/overdue derivation, admin configuration and safe
   reassignment with preserved attribution/history.
2. **Signed-human follow-up:** fact-bounded editable drafts, partner/admin reminders, idempotency and explicit
   no-auto-send rail.
3. **Retention and agent parity:** 30-day task/outcomes, read portfolio MCP tool, propose/confirm task writes and
   Golden Beans SLA/retention events.

## Acceptance criteria

1. A partner sees only merchants covered by their active grant/ownership and receives 403 for another portfolio.
2. Every merchant card names one next action or an explicit missing-action blocker and explains overdue status.
3. Reassignment changes active stewardship without changing promoter attribution, commerce ownership, commission
   history or prior interactions.
4. A generated follow-up contains only approved relationship/shop facts, is editable and cannot be sent by the
   platform or agent tool.
5. Reminder retries create one logical reminder per due window and respect existing notification preferences.
6. The 30-day task is generated once from the approved activation milestone and records a structured outcome.
7. Partner-agent writes require propose → confirm → apply, remain shop/merchant scoped and are fully audited.
8. With `promoter.partner_portfolio_enabled` off, current partner access and promoter close flows are unchanged.

## Open risks / research

- Hard dependencies: activation operations first, then scorecard definitions. Building this earlier would create
  a second work queue against unstable stage semantics.
- Daniel must set the initial ownership SLA by stage and choose which existing notification channels should carry
  partner reminders. Defaults should be conservative and editable, not hard-coded as performance policy.
- Follow-up generation must degrade to a structured template when no approved model service is configured; no
  model should receive contact notes or PII unless that processing path is separately approved and documented.
