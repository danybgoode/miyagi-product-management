# Merchant Partner lifecycle — Sprint 1: Portfolio and ownership SLA

**Status:** ✅ Shipped — [PR #308](https://github.com/danybgoode/miyagisanchezcommerce/pull/308) merged (squash `33facbf`); migration `20260725100000` applied + verified live 2026-07-25

## Stories

### Story 1.1 — Portfolio ownership and SLA contract

**As an** activation lead, **I want** explicit stewardship commitments, **so that** every active merchant has an
accountable owner and response deadline.

**Acceptance:** additive relationship fields/config define steward, assignment reason, response due time, overdue
state and escalation target using versioned scorecard semantics; `promoter.partner_portfolio_enabled` is created
disabled; origin/promoter/cohort/commission fields are immutable through stewardship changes.

**Risk:** high — additive schema, SLA state and runtime gate; Daniel merges.

### Story 1.2 — Grant-scoped partner work queue

**As a** Merchant Partner, **I want** my prioritized merchant portfolio, **so that** I know who needs attention
and why without seeing another partner's contacts.

**Acceptance:** authenticated `/partner` view lists active granted/owned merchants ordered by overdue/next action;
filters cover stage, blocker and due state; rows show safe contact preference, last interaction and next action;
server scope returns 403 for ungranted ids; flag OFF preserves today's partner surface.

**Risk:** high — partner authorization over merchant PII; Daniel merges.

### Story 1.3 — Audited reassignment preserving attribution

**As an** admin, **I want** to reassign stewardship without rewriting acquisition history, **so that** capacity can
change while credit and accountability remain trustworthy.

**Acceptance:** admin-only reassignment requires reason/effective time; prior/new owner and actor remain in
history; promoter/cohort/referral/commission records are unchanged; outstanding tasks are explicitly transferred
or reassigned; both parties' views update consistently.

**Risk:** high — privileged ownership mutation and compensation boundary; Daniel merges.

## Build contract (locked by the architect before the builder started)

Read `README.md` → *Build-time architecture decisions* first (D1–D9). Cite them; do not re-derive them.
Branch: `feat/merchant-partner-lifecycle`, cut from `origin/main` (worktree
`apps/miyagisanchez/.worktrees/mpl`).

### What already exists — verified live 2026-07-24, do NOT rebuild

| You might think you need to build… | It already ships at | Use it |
|---|---|---|
| The scoped "which relationships may this actor see" rule | `lib/relationship-list.ts#listScopedRelationships` | Call it. Four populations: own `promoter_id`, steward, active `partner_grants` shop, admin. |
| The per-id 403 | `lib/relationship-access.ts#resolveRelationshipAccess` + `canWriteRelationship` | Call them. Do not add a second rule. |
| Overdue / next-action / age-in-stage / blocker | `lib/relationship-pipeline.ts` | Import. Never restate (D3). |
| View-ready enrichment (age, next action, overdue, blocker, consent state) | `lib/relationship-enrich.ts#enrichRelationships` | Call it. It is already fail-closed on read errors. |
| Steward reassignment + owner history | `POST /api/promoter/relationship/[id]/owner` + `merchant_relationship_owner_history` | **Extend**, don't replace (see Story 1.3 below). |
| Stage list / ordinals | `lib/merchant-stage.ts#STAGES` / `STAGE_ORDINAL` | Re-export by reference. |
| Aging / retention / outcome vocabulary | `lib/scorecard/dictionary.ts` | Import. |

### Story 1.1 — the SLA contract

1. **Migration** `supabase/migrations/20260725100000_partner_portfolio_s1.sql`. **You do not apply it** — the
   orchestrator does, by hand, via the Supabase MCP. Write the same "how this gets applied" header the
   activation-ops migrations carry. Additive only:
   - `merchant_relationships`: `assignment_reason TEXT`, `assigned_at TIMESTAMPTZ`,
     `response_due_at TIMESTAMPTZ`, `escalation_clerk_user_id TEXT`, `sla_policy_version INT`.
     All nullable — the 29 live rows must stay valid with no backfill.
   - `merchant_sla_policy`: single active versioned row (`version INT`, `policy JSONB`, `updated_by TEXT`,
     `updated_at`), RLS ON with no policies (same posture as every other table in this family). Seed nothing
     — absence means "use the code default".
   - Seed `promoter.partner_portfolio_enabled` into `platform_flags` **disabled**.
2. **`lib/portfolio/sla.ts`** — zero-import (no `server-only`, no `next`, no Clerk), so an `api` Playwright
   spec loads it with no database. Owns `SLA_POLICY_VERSION`, the per-stage response-window defaults, the
   pure `resolveSlaState(facts) → { dueAt, overdue, overdueReason, escalationTarget }`, and
   `parseSlaPolicy(unknown)` (fail-closed to the code default on any malformed shape). It IMPORTS
   `STAGES`/`STAGE_ORDINAL` and the pipeline predicates; it defines no threshold that exists elsewhere.
   **The overdue *reason* must be explainable** — a discriminated union (`'no_dated_action'`,
   `'action_past_due'`, `'stage_stalled'`), not a bare boolean, because the queue renders *why*.
3. **`lib/portfolio/policy-server.ts`** — `server-only`. Reads the single `merchant_sla_policy` row, returns
   the code default when absent **or unreadable** (log loudly; never a silent half-policy). Admin GET/PUT at
   `app/api/admin/sla-policy/route.ts`, `requireAdmin`-gated, flag-gated, bumping `version` on every write.
   No admin UI in v1 — say so in the route header.
4. `lib/flags.ts`: add `promoter.partner_portfolio_enabled`, default `false`, with the same ENABLEMENT doc
   block the neighbouring flags carry. Update `e2e/flags-admin.spec.ts`'s count 39 → 40 **and** the
   `flags-admin-view.spec.ts` page-item counts if the pagination math shifts.

### Story 1.2 — the work queue

- **`lib/portfolio/loader.ts`** (`server-only`) composes: `listScopedRelationships` → `enrichRelationships`
  → SLA state → last interaction (ONE batched read over `merchant_relationship_interactions`, not N+1) →
  ordering. **`lib/portfolio/resolver.ts`** is the pure, network-free part: filtering + ordering + the row
  DTO. Same split as `lib/scorecard/{loader,resolver}.ts` — copy that shape deliberately.
- **Ordering:** overdue first (most overdue first), then missing-action, then next-action ascending, then
  `created_at` desc as the final tiebreak. Ordering must be **total** — `Roadmap/LEARNINGS.md` records a real
  scorecard bug where an unordered read made a median flip 10 → 50.
- **Filters:** stage, blocker, due-state (`overdue | due_soon | scheduled | missing`). Parse them in the pure
  resolver so a spec can walk every branch.
- **Contact preference is SAFE-ONLY:** the row exposes `preferredChannel` (the *label*: WhatsApp / teléfono /
  email / Instagram) and **never the contact value**. The raw `phone_e164` / `email_normalized` /
  `whatsapp_e164` / `instagram_handle` stay out of the list DTO entirely; a partner reaches them through the
  existing per-record route, which is already scope-checked. This is not a nicety — the list is the widest
  surface in the epic.
- **`GET /api/partner/portfolio/route.ts`** — `authorizeRelationshipRequest`-shaped gate but on the NEW flag
  (404 when OFF), then Clerk, then rate limit, then the scoped load. A read failure is a **500**, never a
  silently-empty 200 (the exact rule `listScopedRelationships` already applies).
- **`/partner` page:** today's grant list renders unchanged when the flag is OFF (assert this in a spec — it
  is the kill-switch's whole promise). With the flag ON, the portfolio section renders above it. Keep it an
  **action queue**, not a dense CRM: default view is "needs action". es-MX only. Iconoir icons, never emoji
  (there is a CI guard). Never build a Tailwind arbitrary value by string interpolation.

### Story 1.3 — audited reassignment

`POST /api/promoter/relationship/[id]/owner` already exists and already writes owner history **before** the
access-changing field (D3a of activation-ops — preserve that order). What this story adds:

1. **A new admin-only route** `POST /api/admin/relationship/[id]/reassign` — the *privileged* reassignment
   with `reason` (required, 422 without one) and `effectiveAt` (optional, defaults to now). Do **not**
   loosen the existing promoter-facing owner route; do **not** make it admin-only either (that would break
   activation-ops S2.2's shipped behavior). Two routes, two audiences, one shared writer in
   `lib/portfolio/reassign-server.ts`.
2. **Additive columns on `merchant_relationship_owner_history`:** `reason TEXT`, `effective_at TIMESTAMPTZ`,
   `tasks_transferred INT`. Same fail-closed rule: no history row ⇒ no reassignment (500).
3. **Explicit task transfer.** Every open task (`completed_at IS NULL`) either moves `assigned_to` to the new
   steward or is left with the old one — the request says which (`transferOpenTasks: boolean`), the response
   reports the count, and the history row records it. Silence is not an option: an untransferred task is an
   orphan the queue would show to nobody.
4. **The attribution invariant is a SPEC, not a comment.** `e2e/portfolio-reassign.spec.ts` must assert the
   writer's update payload touches **only** `steward_clerk_user_id` / `assignment_reason` / `assigned_at` /
   `escalation_clerk_user_id` — and that `promoter_id`, `cohort`, `source`, `preview_id`, `shop_id` are
   absent from it. Derive the forbidden set from `AUDITED_FIELDS`
   (`lib/relationship-access.ts`) minus the stewardship fields, so a future audited field is covered without
   editing the spec. Commission/transfer tables (`promoter_transfers`, `promoter_commission*`) are not
   imported by anything in `lib/portfolio/` — assert that too.

### Deterministic gate (all must be green before the PR is opened)

```
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
npm run build
npx playwright test --project=api e2e/portfolio-*.spec.ts e2e/flags-admin*.spec.ts e2e/relationship-*.spec.ts
```

Every new spec must be **observed red once** before it goes green (red-green DoD,
`Roadmap/WAYS-OF-WORKING.md`). State in the PR body which specs you watched fail and why they failed.

### Escalate, don't guess

Stop and hand back to the architect on: an acceptance criterion the live code contradicts, a decision D1–D9
does not cover, anything that would touch payments/checkout/fulfillment/auth beyond the seams named here, or
2+ failed attempts at the same problem.

## Sprint QA

- **api specs:** flag states, SLA fixtures/timezone, partner/grant authorization matrix, cross-partner 403,
  reassignment audit and attribution/commission invariants.
- **browser smoke owed:** yes, to Daniel — two authenticated partner identities plus admin reassignment.
- **deterministic gate:** typecheck/build + focused partner/admin specs + live migration verification.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. With the flag OFF, sign in as a disposable partner and open https://miyagisanchez.com/partner.
   → Today's partner experience is unchanged.
2. Enable for the disposable cohort and reopen `/partner`.
   → Only granted/owned merchants appear, ordered by due/overdue work.
3. Request a second partner's merchant id using the first partner session.
   → The server returns 403 with no contact details.
4. Sign in as admin and reassign one merchant with a reason.
   → Owner history changes while promoter/cohort/commission attribution remains identical.
5. Reopen both partner portfolios.
   → The merchant appears for the new steward only and transferred tasks are explicit.

If any step fails, note the step number + URL — that's the bug report.
