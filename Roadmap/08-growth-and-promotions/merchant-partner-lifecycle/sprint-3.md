# Merchant Partner lifecycle — Sprint 3: Retention and agent parity

**Status:** ✅ Shipped — [PR #311](https://github.com/danybgoode/miyagisanchezcommerce/pull/311) merged (squash `5e8501c`); migration `20260725120000` applied + verified live 2026-07-25

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

**Acceptance:** `ms_partner_` tools list/read **exactly the population `/partner` shows the same person** —
their own field-captured records (`promoter_id`), records they steward, and shops with an active
`partner_grants` row; mutations are propose/confirm, bounded to task/interaction state and audited;
confirmation cannot reassign ownership, change commerce facts or send merchant communication; cross-partner ids
return 403; UI and tool results agree.

> **Wording corrected 2026-07-25 (Daniel's ruling, on fresh-reviewer finding 5/6 of PR 311).** This line
> originally said "list/read only **granted** portfolio records", which contradicted README D2 ("reuse the UI's
> population verbatim") and the shipped four-actor rule in `lib/relationship-role.ts` — a partner's own
> `promoter_id` records and stewarded records are in scope in `/partner` and always were. The scaffolded text
> predated that rule. Daniel's call: **keep UI parity** — same person, same access, one population, so the UI
> and the tool can never disagree and no second authorization rule exists to drift. Recorded here rather than
> left as a silent divergence between the doc and the code.

**Risk:** high — agent authorization and consequential task mutations; Daniel merges.

### Story 3.3 — PII-free SLA and retention events

**As an** operator, **I want** reusable stewardship facts in Golden Beans, **so that** scorecards and future CRM
destinations measure service without receiving merchant contact data.

**Acceptance:** assignment, SLA due/overdue/completed and retention outcomes emit after canonical writes through
the router; stable opaque ids, schema version and idempotency keys are present; payload allowlist excludes contact,
notes and draft text; router degradation is observable and replay-safe; enablement smoke passes before flag flip.

**Risk:** high — cross-repo privacy/event contract and rollout; Daniel merges.

## Build contract (locked by the architect before the builder started)

Read `README.md` → D1–D9 first (D2, D7, D8 and D9 are this sprint's whole architecture), then Sprint 1's and
Sprint 2's build contracts — you import their layers, you do not reshape them. Branch:
`feat/merchant-partner-lifecycle-s3`, cut **from `feat/merchant-partner-lifecycle-s2`** (stacked).

### Story 3.1 — 30-day retention work

- **The task hangs off the `first_sale` TRANSITION, not off an order** (D7). `evaluateRelationship`
  (`lib/merchant-relationship-lifecycle.ts`) already writes that transition idempotently under `UNIQUE
  (relationship_id, dedupe_key)`. Read *that row* (`to_stage = 'first_sale'`, earliest `occurred_at`) and
  schedule one task due `RETENTION_WINDOW_DAYS` later. Because the transition is itself write-once, a
  replayed / late / duplicated sale fact **cannot** produce a second task — that is the whole idempotency
  argument, and it needs no "repair" code path.
- **Migration** `supabase/migrations/20260725120000_partner_portfolio_s3.sql` (the orchestrator applies it):
  - `merchant_relationship_tasks`: `kind TEXT NOT NULL DEFAULT 'manual'` (CHECK `IN ('manual',
    'retention_30d')`), `outcome TEXT`, `dedupe_key TEXT`, and a **partial** `UNIQUE (relationship_id,
    dedupe_key) WHERE dedupe_key IS NOT NULL`. The 0 existing rows keep working; manual tasks pass a null
    dedupe key and are never constrained.
  - `merchant_lifecycle_emissions`: add `dedupe_key TEXT NOT NULL DEFAULT ''` and move the primary key to
    `(merchant_id, event_type, dedupe_key)`. Milestones pass `''` and keep byte-identical write-once
    semantics.

    > **This contract's original safety argument was WRONG by the time the migration was applied, and the
    > correction is the lesson.** It said "the table holds 0 rows in production (verified live 2026-07-24) —
    > that is the only reason this is safe". Re-checked immediately before applying on 2026-07-25: **33
    > rows**, all delivered, emitted by the daily sweep at ~10:00 UTC. The widening was still safe for a
    > *different and stronger* reason — the new column is `NOT NULL DEFAULT ''`, so every pre-existing row
    > takes `''`, and the OLD key was already unique across them, so the WIDENED key is unique over exactly
    > the same set. **Re-verify a schema-change premise at APPLY time, not plan time** (now in
    > `LEARNINGS.md`), and when the premise dies, write the real reason down rather than leaving a stale one
    > standing in a shipped migration.
  - Outcome vocabulary: **do not restate it in SQL prose or in a CHECK constraint that duplicates the
    dictionary.** The allowed outcomes are exported from `lib/scorecard/dictionary.ts` and enforced in the
    route by importing them; if you add a DB CHECK, generate its value list from the same source in the
    migration's comment and say explicitly that the dictionary is authoritative.
- **`lib/portfolio/retention.ts`** — zero-import: `retentionDedupeKey(relationshipId)`,
  `retentionDueAt(firstSaleAt, retentionWindowMs)` (window threaded as a **parameter** — the constant lives in
  a `server-only` module; this is the precedent `lib/merchant-lifecycle.ts#deriveSaleFacts` and
  `lib/scorecard/dictionary.ts` both already set), and `isAllowedOutcome(value)` importing the dictionary's
  vocabulary.
- **`lib/portfolio/retention-server.ts`** — schedules the task; called from the existing
  `/api/cron/merchant-lifecycle-sweep` **after** `evaluateRelationship` (it is the sweep that discovers
  `first_sale`, so scheduling there costs no new cron and cannot run before the transition exists).
- **Completing** a retention task records an allowed `outcome` + an optional next action through the existing
  task-complete route, extended. It must be **impossible** to edit a sale, an order, a payment or a product
  from this path — assert that no module under `lib/portfolio/` imports `@/lib/medusa`.
- **Admin visibility:** missing / overdue retention work appears in the admin relationship list via the
  existing enrich path (a `retention` due-state), not a new admin page.

### Story 3.2 — partner-agent parity

- **`lib/portfolio/partner-portfolio-auth.ts`** (`server-only`) — `resolvePartnerPortfolioActor(authHeader)`.
  Reuse, do not fork: the `partners.mcp_enabled` gate **first** (OFF ⇒ indistinguishable from a bad token),
  `resolvePartnerRow`'s credential resolution shape from `lib/partner-auth.ts`, and a `partner_tool_calls`
  audit row on **every** outcome including denials. Then map the promoter's `clerk_user_id` into the same
  `RelationshipActor` shape the UI builds — **`isAdmin: false`, unconditionally and structurally** (an MCP
  credential is never a Clerk admin session; make that impossible to set, not merely defaulted) — and call
  **the same `listScopedRelationships`**. Do NOT use `resolveToolShop`: it routes to exactly one shop and
  denies when a partner holds >1 grant with no `shop_slug`, which is structurally wrong for a portfolio (D2).
- **A separate MCP route**, `app/api/partner/portfolio/mcp/route.ts`, JSON-RPC 2.0 (`initialize`,
  `tools/list`, `tools/call`) — modeled on `app/api/admin/scorecard/mcp/route.ts`. **Do not add tools to
  `app/api/ucp/mcp/route.ts`** (4050 lines, entirely built around per-shop Bearer auth; the scorecard epic
  already set the separate-route precedent and it held).
- **Tools:** `list_portfolio` (read), `get_portfolio_record` (read), `propose_task_update` (returns a
  proposal id + a human-readable diff, writes nothing to the task), `confirm_task_update` (applies the
  proposal). Reads return the *safe* projection — the preferred-channel **label**, never a contact value.
- **The propose/confirm boundary must be structural.** Proposals are rows
  (`merchant_portfolio_proposals`: `id`, `relationship_id`, `proposed_by`, `payload JSONB`, `expires_at`,
  `confirmed_at`, `confirmed_by`), and `confirm` re-runs `resolveRelationshipAccess` + `canWriteRelationship`
  against the *confirming* credential — it never trusts the proposal's own scope. A confirmation **cannot**
  reassign ownership, mutate commerce, or send any communication: the confirm handler's allowed field set is
  an explicit positive list (task `title`, `due_at`, `outcome`, `completed_at`, and interaction append), and a
  spec asserts `steward_clerk_user_id`, `promoter_id`, `cohort`, `shop_id` and every draft/send path are
  absent from it.
- **UI/tool agreement is a spec, not a hope:** one spec drives the same fixture through the resolver behind
  `GET /api/partner/portfolio` and through `list_portfolio`, and asserts the row sets are identical.
- Cross-partner ids return **403** — same shape, no record fields, indistinguishable from a nonexistent id.

### Story 3.3 — PII-free SLA and retention events

- **`lib/portfolio/events.ts`** — zero-import. `PORTFOLIO_LIFECYCLE_EVENTS` as its **own** emit-only
  vocabulary: `merchant.steward_assigned`, `merchant.sla_due`, `merchant.sla_overdue`,
  `merchant.sla_completed`, `merchant.retention_scheduled`, `merchant.retention_outcome_recorded`.
  **Do not append these to `MERCHANT_LIFECYCLE_EVENTS`** — that array doubles as the *consumer's* accept-list
  (`isMerchantLifecycleEvent`) and drives the `apply_merchant_lifecycle_event` projection RPC, so widening it
  would have Miyagi accept inbound events its projection has no branch for (D8).
- **The payload builder is a positive allowlist** (D9): relationship id (already the opaque merchant subject
  — activation-ops D1), the SLA/retention fact, `slaPolicyVersion`, `schemaVersion`, and the idempotency key.
  Construct the allowed keys; never delete keys from a wider object. A spec feeds a fully-populated
  relationship row (real-looking phone, email, WhatsApp, Instagram, business name, objections, notes, draft
  text) into the builder and asserts **none of those substrings** appear in `JSON.stringify(payload)`.
- **Emission goes through the one existing sender** — `deliverClaimedEmission` /
  `listPendingEmissions` in `lib/merchant-lifecycle-server.ts`, extended to carry the third key component
  from D8. One outbox, one drain, one flag (`growth.telemetry_enabled`, ON in prod). Do not build a parallel
  sender. After the extension, the milestone path must be **byte-identical** — call that out in the PR body
  so the reviewer checks it specifically.
- Emit **after** the canonical write, never instead of it: a failed emission leaves the claim pending for the
  drain and never blocks or rolls back the stewardship write. `flag_off` is a status, not a failure.
- **Golden Beans side, verified 2026-07-24:** `POST /api/v1/track` enforces no controlled event-name
  vocabulary, so these new types are accepted and stored; GB's `merchant_activation` journey definition
  consumes only the 13 stage events and will simply not project them. That is expected — state it in the
  route/module header so a future reader doesn't file a missing-journey-step bug.
- **Replay-safe:** re-running the sweep re-claims nothing (the widened PK) and re-delivering a pending row is
  free (GB dedupes on the idempotency key). A spec walks a double-fire.

### Deterministic gate

```
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
npm run build
npx playwright test --project=api e2e/portfolio-*.spec.ts e2e/merchant-lifecycle*.spec.ts e2e/scorecard-*.spec.ts
```

The `merchant-lifecycle` and `scorecard` suites are in the gate on purpose: this sprint edits the shared
emission seam and the shared task table, and a green portfolio suite over a broken milestone path is exactly
the regression this catches.

### Escalate, don't guess

Same triggers as Sprint 1. In particular, escalate before changing anything about
`apply_merchant_lifecycle_event`, the return-leg consumer, or the milestone write-once semantics — those cross
a repo boundary and a mistaken milestone emission is unwithdrawable.

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
