---
status: shipped
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

## Build-time architecture decisions (2026-07-24, locked before Sprint 1)

Every decision below was checked against the **live** code and the **live** database, not against this
epic's own prose. Where the scaffolded scope said something the live system contradicts, the deviation is
stated here rather than silently resolved (`Roadmap/LEARNINGS.md`: *"a sprint doc's assumed guard/behavior
can be fiction"*, and *"a paraphrased contract drifts permissive"*). **Builders cite these; they do not
re-derive them.**

**Live baseline, verified 2026-07-24 via the Supabase MCP:** `merchant_relationships` 29 rows (the
backfilled shop mirror), `merchant_relationship_tasks` **0**, `_transitions` **0**, `_interactions` **0**,
`_owner_history` **0**, `partner_grants` (unrevoked) **0**, `marketplace_promoters` 2 (1 Clerk-bound),
`merchant_lifecycle_emissions` **0**, `merchant_lifecycle` **0**. Flags live: `partners.mcp_enabled`
**ON** (2026-07-17 — team memory's "partners are dark" note was stale), `promoter.activation_crm_enabled`
**ON**, `growth.telemetry_enabled` **ON**, `promoter.private_preview_enabled` **ON**.

### D1 — the portfolio is a READ MODEL over activation-ops, never a second CRM

No new merchant record, no new grant model, no second owner field. The portfolio is
`listScopedRelationships` (`lib/relationship-list.ts`) → `enrichRelationships` (`lib/relationship-enrich.ts`)
→ a new **SLA layer** (`lib/portfolio/*`). The only new *canonical* rows this epic writes are stewardship
artifacts that have nowhere else to live: SLA policy, follow-up drafts, reminder claims, and additive
columns on the existing task table.

`/partner` keeps today's grant list **byte-identical** when `promoter.partner_portfolio_enabled` is OFF; the
portfolio is an additional section, not a replacement. (That page is gated by `partners.mcp_enabled` — ON in
prod — so the new flag is the only thing standing between this epic and the surface.)

**Deliberate non-merge, stated:** `/promotor/relaciones` (activation-ops S2.3) already renders a scoped
pipeline over the same two seams. It is **not** merged into `/partner` and neither is retired. They differ in
audience and gate: `/promotor/relaciones` is the *acquisition workspace* for records a promoter captured
(`promoter.activation_crm_enabled`), `/partner` is the *stewardship portfolio* for merchants a partner is
accountable for (`promoter.partner_portfolio_enabled`). Both read the same scoped list, so they can never
disagree about who is in scope. Consolidating them is a follow-up, not this epic.

### D2 — the scoped population is defined ONCE, and the agent reuses it verbatim

Cross-partner isolation is **not** re-implemented. Every read/write in this epic goes through
`resolveRelationshipAccess` / `canWriteRelationship` (`lib/relationship-access.ts`) and the four-actor
precedence in `decideRelationshipRole` (`lib/relationship-role.ts`: admin > promoter-owner >
steward-unless-floored-by-an-explicit-`viewer`-grant > grant role). No new authorization rule is invented,
so the two-partner 403 matrix tests a rule that already ships.

**The partner-agent seam is the sharp edge here.** `resolveToolShop` (`lib/partner-auth.ts`) routes a
partner credential to exactly **one** shop and *denies* when a partner holds >1 grant and passes no
`shop_slug` — structurally wrong for "list my whole portfolio". So Sprint 3 adds
`resolvePartnerPortfolioActor()`: reuse `resolvePartnerRow` + the `partners.mcp_enabled` gate + the
`partner_tool_calls` audit, then map the promoter's `clerk_user_id` into the **same `RelationshipActor`
shape the UI builds** (with `isAdmin: false`, always — an MCP credential is never a Clerk admin session) and
call **the same `listScopedRelationships`**. UI and tool then agree *by construction*, which is what Story
3.2's acceptance actually demands. Guard the population, not the door
(`Roadmap/LEARNINGS.md`).

### D3 — SLA semantics IMPORT the shipped contract; only the response-window POLICY is new

`isOverdue`, `isMissingAction`, `nextOpenTask`, `ageInStageDays`, `hasBlocker`, `dueAtIsoFromDateOnly` come
from `lib/relationship-pipeline.ts` **by import**. `STAGES` / `STAGE_ORDINAL` come from
`lib/merchant-stage.ts` **by reference**. Retention/outcome and aging vocabulary come from
`lib/scorecard/dictionary.ts`. Nothing in `lib/portfolio/` restates a threshold, a stage list, or an
overdue rule that already exists — and `e2e/portfolio-sla.spec.ts` enforces that with the same
reference-equality + source-text guard `e2e/scorecard-dictionary.spec.ts` already uses.

The genuinely new contract is **the response-window policy**: per-stage "how long may this sit without a
dated next action or an interaction", the escalation target, and `SLA_POLICY_VERSION`. It is versioned like
the metric dictionary, and it is **admin-writable** (a single-row `merchant_sla_policy` table + an
admin-only GET/PUT route) with the code default as the authoritative fallback when the row is absent or
unreadable — that satisfies the seed's "SLA rules configured by admin" without building a CRUD product. No
admin UI in v1; stated.

### D4 — drafts are a versioned deterministic composer, not a model call (Daniel's call, 2026-07-24)

**Verified live:** this repo has no LLM client of any kind — no `anthropic`/`openai`/`ai` dependency in
`package.json`, no model API key in the environment, no call site anywhere. Every criterion Story 2.1
actually states is about *fact-bounding, provenance, editability and no-auto-send* — none of them require a
model. So `composeDraft()` is a pure, versioned template composer over an explicit fact allowlist, and the
provenance row records `generator: 'template'`, `generator_version`, the input `fact_ids` and the creating
Clerk user. `generator`/`generator_version` are the schema's "model/prompt version" fields, so replacing the
composer with a model call later is a swap inside one function — it never touches the provenance or no-send
boundary. Stated deviation from the scope's "agent/model output" wording; **Daniel chose this explicitly**
over provisioning an `ANTHROPIC_API_KEY` prod secret for a pre-launch surface with zero merchants.

### D5 — "cannot auto-send" is proved by ABSENCE, not by a guard

The strongest available form of Story 2.3: **no server-side path to a merchant is built at all.** The draft
never reaches a transport. `POST .../draft/[draftId]/confirm` records `confirmed_at`, `confirmed_by`,
`confirmed_channel` and the exact confirmed text; the *browser* then opens a `wa.me` / `mailto:` deep link.
The platform therefore holds no credential, queue, retry or scheduler that could deliver a draft, so
"agent, retry, scheduler and reminder paths cannot bypass this boundary" is true because those paths do not
exist — not because a boolean says no.

`e2e/portfolio-no-auto-send.spec.ts` enforces it as a **population guard**: it enumerates every server-side
transport in the repo (`lib/notify.ts`, `lib/email.ts`, `lib/telegram.ts`, `lib/notifications/dispatch.ts`,
`lib/shop-notify.ts`, `lib/promoter-close-notify.ts`) and asserts no module under `lib/portfolio/drafts*` or
any `app/api/**/draft*` route imports any of them — re-deriving the transport list from the filesystem, so a
transport added later is covered without editing the spec. A confident comment is not evidence
(`Roadmap/LEARNINGS.md`).

### D6 — reminders are steward-directed and idempotent BY CONSTRAINT

`merchant_followup_reminders` with `UNIQUE (relationship_id, kind, window_key)` — the constraint is the
idempotency guarantee, never a SELECT-then-INSERT (the discipline
`merchant_relationship_transitions.dedupe_key` already encodes). `window_key` is derived from the SLA window
the reminder is *for*, so a re-run inside the same window writes nothing.

Delivery reuses `notify(clerkUserId, …)` (web push, `lib/notify.ts`) plus the admin Telegram channel
(`lib/telegram.ts`). It must **NOT** use `lib/notifications/dispatch.ts` — that seam resolves a
**seller's** email via `getSellerEmail`, i.e. the merchant, which is exactly the duplicate-contact failure
Story 2.2 forbids. Its own cron route (`/api/cron/portfolio-reminders`, `CRON_SECRET`, same posture as the
existing crons) rather than an extension of `merchant-lifecycle-sweep`, so a reminder failure can never
degrade the Golden Beans emission drain.

### D7 — the 30-day retention task hangs off the `first_sale` TRANSITION, not off an order

`evaluateRelationship` (`lib/merchant-relationship-lifecycle.ts`) already writes a `first_sale` transition
idempotently under `UNIQUE (relationship_id, dedupe_key)`. Retention scheduling reads *that row* and creates
one task due `RETENTION_WINDOW_DAYS` later — so a replayed, late or duplicated sale fact cannot produce a
second task, because the transition it keys off is itself write-once. Medusa stays commerce truth; the task
never edits a sale.

This needs three **additive** columns on `merchant_relationship_tasks`: `kind` (`'manual' | 'retention_30d'`,
default `'manual'`), `outcome`, and `dedupe_key` with a partial `UNIQUE (relationship_id, dedupe_key) WHERE
dedupe_key IS NOT NULL`. The allowed `outcome` values are defined in the scorecard dictionary and imported —
never restated in the migration's prose or in `lib/portfolio/`.

### D8 — widening the emission claim key is FREE right now, and it is the correct fix

`merchant_lifecycle_emissions` has `PRIMARY KEY (merchant_id, event_type)` — deliberately write-once per
merchant per milestone, which the projection depends on. SLA and retention-outcome facts **recur** (a
merchant can go overdue many times), so pushing them through that key would emit each one exactly once,
forever, and silently drop the rest.

The table holds **0 rows in production** (verified live). So Sprint 3 adds `dedupe_key TEXT NOT NULL DEFAULT
''` and moves the primary key to `(merchant_id, event_type, dedupe_key)`. Milestones pass `''` and keep
byte-identical write-once semantics; recurring portfolio events pass a real key. One sender, one outbox, one
drain — `deliverClaimedEmission` and `listPendingEmissions` gain the third key component rather than being
duplicated into a parallel table. This is the same "the schema fork is free exactly once, while the table is
empty" call activation-ops D1 made, and it expires the moment a real event lands.

New event types live in their **own** emit-only vocabulary (`PORTFOLIO_LIFECYCLE_EVENTS` in
`lib/portfolio/events.ts`), **not** appended to `MERCHANT_LIFECYCLE_EVENTS` — that array doubles as the
*consumer's* accept-list (`isMerchantLifecycleEvent`) and drives the `apply_merchant_lifecycle_event`
projection RPC, so widening it would have Miyagi accept inbound events its projection has no branch for.
Verified on the Golden Beans side: `POST /api/v1/track` enforces **no** controlled event-name vocabulary, so
new `merchant.*` types are accepted and stored; GB's `merchant_activation` journey definition simply doesn't
consume them. Stated, so nobody later reads a missing journey step as a bug.

### D9 — payload allowlist is positive, and PII-free by construction

Portfolio events carry only: the relationship id (already the opaque merchant subject, activation-ops D1),
the SLA/retention fact, `slaPolicyVersion`, and the idempotency key. **Never** contact fields, interaction
notes, draft text, business name or shop slug. Built by an explicit positive-list builder (a function that
*constructs* the allowed keys), never by deleting keys from a wider object — a spec feeds it a
fully-populated relationship row and asserts the serialized payload contains none of the banned substrings.

## Build strategy — full-epic assembly line, pre-launch ceremony

**This epic is built as a whole, not sprint-by-sprint** (the emerging default — see
`Roadmap/WAYS-OF-WORKING.md` → *Epic-mode builds*). One architect (Opus) locks the decisions above against
live code first, then routes each sprint to a builder sized to its risk, reviews every PR through two
independent layers, and merges in order.

- **Stacked branches, not siblings.** `feat/merchant-partner-lifecycle` → `-s2` → `-s3`, each cut from the
  previous. All three sprints touch `lib/portfolio/`, the `/partner` page, `lib/flags.ts` and the migration
  set; `Roadmap/LEARNINGS.md` prices sibling worktrees off one base as a guaranteed integration tax
  ("stack or pay", mcp-parity-core S2–S4). Stacking also keeps the flag-count assertion in
  `e2e/flags-admin.spec.ts` (39 → 40) a one-time edit instead of a per-merge conflict.
- **Model routing by risk, not uniformly.** S1 (authorization boundary + the migration + the contract S2/S3
  import) → **Opus**; S2 and S3 (mechanical over a locked contract) → **Sonnet**. Review is inverted: the
  fresh `pr-reviewer` pass on S1 runs on Opus.
- **Review stack, unchanged and non-negotiable.** Every PR gets `scripts/cross-review.mjs` (a different model
  family — codex → antigravity → devin) **and**, because all nine stories are HIGH, a fresh `pr-reviewer`
  subagent. Findings route back to the original builder while the next sprint starts. **The builder never
  merges their own PR.**
- **Pre-launch ceremony, right-sized.** Zero real merchants, zero campaigns, zero transactions; the only
  tenants are Daniel's disposable ones. Daniel has pre-authorized merging HIGH PRs and applying migrations
  for this epic. Browser smokes that presuppose live operations are **descoped as pre-launch ceremony** and
  named in the retrospective — the same call the three sibling founding-merchant epics made — but every
  deterministic gate (typecheck, build, Playwright `api` specs, live migration verification) still runs in
  full.
- **Migrations are applied by the orchestrator, never the builder,** via the Supabase MCP `apply_migration`
  (the auto-mode classifier blocks the `supabase db query` CLI path), with `schema_migrations` aligned by
  hand and a 4-layer live verify after each. Never `supabase db push`.

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

- [x] All sprints merged to `main` + smoke-tested (**gaps stated** — the five browser smokes are descoped
      as pre-launch ceremony; see the retrospective's *Gaps / follow-ups*)
- [x] Two-partner authorization matrix proves cross-partner reads/writes return 403 — **by spec, not by
      round-trip.** No new authorization rule was written: everything routes through the shipped
      `resolveRelationshipAccess` / `decideRelationshipRole` (D2), so the matrix tests a rule that already
      ships. The authenticated round-trip is the standing Clerk-fixture gap, owed.
- [x] Reassignment preserves origin, cohort, commission and full owner history — the forbidden field set is
      **derived** from `AUDITED_FIELDS` minus the stewardship fields, so a future audited field is covered
      without editing the spec; nothing under `lib/portfolio/` can reach a commission or transfer table
      (a population guard proved this by catching a real violation of it mid-epic)
- [x] Draft generation uses allowlisted facts and no path can auto-send to a merchant — proved by
      **absence** (D5): the transitive import closure of every draft module and `draft*` route contains no
      transport at all, with the population re-derived from the filesystem
- [x] Reminder delivery and Golden Beans event replay are idempotent — `UNIQUE (relationship_id, kind,
      window_key)` and the widened `(merchant_id, event_type, dedupe_key)` claim key; the constraint is the
      guarantee, never a SELECT-then-INSERT
- [x] Thirty-day outcome definitions agree with the scorecard contract — `RETENTION_OUTCOMES` lives in
      `lib/scorecard/dictionary.ts` and is imported, not restated. **Caveat, stated:** the migration's CHECK
      is kept in lockstep **by hand** and the spec guard is one-directional (a CHECK growing *more*
      permissive than the dictionary would pass)
- [x] `promoter.partner_portfolio_enabled` exists with enablement polarity, born OFF — applied and verified
      live 2026-07-25 (`enabled = false`). **It also gates the partner-agent MCP route**, which it did not
      until the fresh-reviewer pass caught that the agent write path would otherwise have gone live on
      deploy. Daniel flips when he wants the surface on; nothing is owed first.
- [x] Every sprint walkthrough contains deployed URLs and disposable data (unchanged from scaffold; the
      walkthroughs are the descoped smokes)
- [x] This README marked shipped; retrospective, poster and durable learnings updated
- [x] Feature branches deleted and `node scripts/build-order.mjs` run
