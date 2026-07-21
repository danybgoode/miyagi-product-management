# Merchant Partner lifecycle — Sprint 3: Retention and agent parity

**Status:** ⬜ not started

## Stories

### Story 3.1 — Thirty-day retention work and outcomes

**As a** Merchant Partner, **I want** a defined post-sale retention task, **so that** activation does not end at
the first transaction.

**Acceptance:** first paid sale schedules one idempotent 30-day check-in; due/complete/outcome values follow the
scorecard dictionary; partner records an allowed outcome and next action without editing the sale; late/replayed
sale facts do not create duplicate tasks; admin can see missing/overdue retention work.

**Risk:** high — scheduled work and cross-system event timing; Daniel merges.

### Story 3.2 — Partner-agent read and propose/confirm parity

**As an** authorized Merchant Partner using an agent, **I want** my portfolio and task actions available safely,
**so that** assistance respects the same grants and human decisions as the UI.

**Acceptance:** `ms_partner_` tools list/read only granted portfolio records; mutations are propose/confirm,
bounded to task/interaction state and audited; confirmation cannot reassign ownership, change commerce facts or
send merchant communication; cross-partner ids return 403; UI and tool results agree.

**Risk:** high — agent authorization and consequential task mutations; Daniel merges.

### Story 3.3 — PII-free SLA and retention events

**As an** operator, **I want** reusable stewardship facts in Golden Beans, **so that** scorecards and future CRM
destinations measure service without receiving merchant contact data.

**Acceptance:** assignment, SLA due/overdue/completed and retention outcomes emit after canonical writes through
the router; stable opaque ids, schema version and idempotency keys are present; payload allowlist excludes contact,
notes and draft text; router degradation is observable and replay-safe; enablement smoke passes before flag flip.

**Risk:** high — cross-repo privacy/event contract and rollout; Daniel merges.

## Sprint QA

- **api specs:** 30-day clock/replay, outcome dictionary, partner MCP scope, propose/confirm, no-send invariant,
  event allowlist/idempotency and router failure/replay.
- **browser smoke owed:** yes, to Daniel — authenticated partner retention completion and MCP confirmation.
- **deterministic gate:** frontend/backend/Golden Beans contract suites green; deployed sample event inspected.

## Sprint 3 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Replay the disposable merchant's first paid sale and advance the test clock to the retention window.
   → One 30-day task appears; replay creates no duplicate.
2. Ask the partner agent for due retention work.
   → It returns only the authenticated partner's granted merchant.
3. Propose then confirm a task outcome through the agent.
   → The UI agrees and audit history names the proposal/confirmation; no message is sent.
4. Inspect the Golden Beans events and retry delivery.
   → SLA/retention facts contain no contact, notes or draft text and do not duplicate.
5. Complete the two-partner, reminder and no-auto-send matrix, then have Daniel flip the flag.
   → The disposable cohort activates while unrelated partner behavior remains unchanged.

If any step fails, note the step number + URL — that's the bug report.
