# Founding merchant activation operations — Sprint 2: Lifecycle and stewardship

**Status:** 🟦 In review — PR 304 (`ff98cc5` S2.1 · `fca9112` S2.2 · `1581627` S2.3 · `e2c8102` review fixes)

Migration `20260723110000_activation_crm_s2.sql` **applied and verified live** 2026-07-23: all four
tables present by `to_regclass`, `UNIQUE (relationship_id, dedupe_key)` present, RLS ON with 0 policies
across all six `merchant_relationship*` tables, every CHECK matching the values the code emits,
`schema_migrations` version aligned to the file.

**C1 changed the access model** (review finding): a reassigned steward now resolves to role `manager`
on the **read side** — `resolveRelationshipAccess` and `listScopedRelationships` both consult
`steward_clerk_user_id`, and the decision lives in the pure `lib/relationship-role.ts`. No
`partner_grants` row is ever auto-inserted; deliberate human grants stay untouched.

Precedence is **admin > promoter-owner > steward > grant, with an explicit `viewer` grant flooring the
steward at `viewer`.**

> **The floor was added after a second review round — the architect's first call was wrong.** The
> original rule put steward unconditionally ahead of the grant, reasoning that a grant can go stale
> while stewardship is current. That inverts `LEARNINGS.md`'s "deliberate human decisions win" (the
> entry the fix itself cited): a `viewer` grant is a deliberate *write-denial* and may be **newer** than
> the stewardship, so naming someone steward silently upgraded an explicitly-restricted `viewer` to
> `manager` — able to edit contact and qualification fields and reassign the steward onward. A promoter
> assigning stewardship cannot see `partner_grants`, so they could not even know they were doing it.
> **Transferable:** citing a learning is not the same as satisfying it — check the spirit (who decided
> what, deliberately) against the mechanism, not just the letter (here, "don't write a grant row").

## Stories

### Story 2.1 — Deterministic lifecycle resolver and immutable history

**As an** operator, **I want** one explainable 13-stage journey, **so that** stage and age are trustworthy.

**Acceptance:** scouted through retained-at-30-days has explicit ordered definitions; each transition records
prior/new stage, actor or source and timestamp; audited correction requires a reason; replay produces no second
transition; permission stages require consent evidence.

**Risk:** high — shared state machine and audit history; Daniel merges.

### Story 2.2 — Interactions, ownership and next action

**As a** merchant steward, **I want** the relationship history, owner and next action together, **so that** no
active merchant disappears between contacts.

**Acceptance:** authorized users append interactions/notes, reassign an owner with history, and set/complete a
dated next action; every active merchant is either scheduled or visibly missing an action; prior entries are not
silently overwritten.

**Risk:** high — scoped writes and auditability; Daniel merges.

### Story 2.3 — Promoter and admin operating views

**As a** promoter or admin, **I want** the appropriate merchant pipeline, **so that** I can act on blockers and
aging without seeing another partner's contacts.

**Acceptance:** promoter view shows owned / **stewarded** / granted records only; admin can filter the full
cohort by stage, steward, blocker and missing/overdue action; each row opens history and evidence;
unauthorized ids return 403, not a partial record.

> **Amended 2026-07-23 (C1).** This line read "owned/granted records only" until the review found that
> reassigning a steward did not reassign access — the new steward could not see the record they had just
> been made responsible for. Stewardship is now a fourth access path, resolved read-side. **Fourth
> contract-vs-prose fork in this epic**, and the reviewer found it the same way as the third: by
> re-deriving every statement of the rule instead of trusting that the header banner covered the file.
> The rule's canonical home is `lib/relationship-access.ts`; this doc must agree with it, not restate it.

**Risk:** high — tenant authorization and contact data; Daniel merges.

## Build contract (locked by the architect before the builder started)

### The 13 stages, in canonical order

`scouted · qualified · permission_granted · preview_in_preparation · preview_delivered ·
activation_scheduled · claimed · payments_ready · three_products_live · shared_externally ·
first_inquiry · first_sale · retained_30d`

> **Corrected 2026-07-22.** This list originally read `permission_received` at position 3. That was
> wrong in the only way that matters: the S1 `CHECK` constraint (already applied to production),
> README D2, and the live `MERCHANT_LIFECYCLE_EVENTS` vocabulary all say **`permission_granted`**, so a
> resolver emitting `permission_received` would produce a value the database rejects. The builder
> followed the schema over this prose and flagged it — the right call, and the second time this epic's
> prose has forked from a shipped contract (see the S1 consent clause). Same lesson: when a decision is
> already encoded in a constraint or a shipped constant, the sprint doc must cite it, not restate it.

Ordinals are 1–13 and **frozen** — they are persisted in transition rows and read by the Sprint 3
reconciliation view. Inserting a stage later means appending, never renumbering.

### `lib/merchant-stage.ts` — pure, zero-import (README D3)

```ts
resolveStage(facts: StageFacts): { stage: Stage; reached: Stage[] }
```

`StageFacts` is a flat bag of already-fetched booleans/timestamps (consent evidence, commerce facts,
CRM facts). The resolver is **monotonic**: it returns the furthest stage whose predicate holds, and
never regresses — a merchant who reached `first_sale` and later refunds does not fall back. Unknown or
absent facts **decline**, they never grant: every one of these milestones is write-once and
unwithdrawable, which is exactly the trap `merchant-lifecycle-projection` paid nine defects to learn.

The two permission-gated stages (`permission_granted`, `preview_delivered`) each require **their own
dedicated evidence field** — `permissionGrantedEvidence` and `previewDeliveredEvidence` — derived from
the consent **anchor** via `readApprovalState`, never from a direct read of the decision log. A
resolver that can reach either stage from a note is the bug this epic exists to prevent, so the spec
asserts it directly.

> **Corrected 2026-07-23.** This paragraph survived the first correction pass carrying *both* forks at
> once: the dead slug `permission_received` (see the banner above) and a single shared `consentEvidence`
> boolean read from `merchant_preview_decisions` — the same decision-log shortcut whose two holes were
> already corrected out of `sprint-1.md`. Shipped is two distinct fields off the anchor. **Third
> contract-vs-prose fork in this epic, and the second one in this file**, which is itself the finding:
> a correction banner does not correct the rest of the document. When a fork is found, re-derive every
> instance in the file — the fresh reviewer caught this one precisely by re-deriving instead of trusting
> that the earlier fix had covered it.

**Downstream constraint this creates for Sprint 3** (recorded here because S2 is where the surface is
born): `POST /api/admin/relationship/[id]/correct-stage` deliberately has no consent check — it is an
audited *internal* correction. That is safe while nothing reads `stage` as consent proof, which is true
in S2. It stops being safe in S3, where D2 makes these stages the lifecycle event types under
write-once-earliest `LEAST()` semantics. So **S3's emitter must refuse to emit a permission-gated stage
whose transition has `actor_type = 'admin'` unless `readApprovalState` currently backs it** — enforced
at the emitter, not the correction route, so every present and future transition source is covered.

### Migration `20260723110000_activation_crm_s2.sql`

**`merchant_relationship_transitions`** — immutable history.
`(id, relationship_id, from_stage, to_stage, to_stage_ordinal, actor_type CHECK
('promoter'|'admin'|'system'|'commerce_fact'), actor_id, reason, evidence_ref JSONB, dedupe_key TEXT,
occurred_at, created_at)`. `UNIQUE (relationship_id, dedupe_key)` is what makes replay a no-op —
enforced by the constraint inside one statement, never by a SELECT-then-INSERT. The natural key is
`<to_stage>` for a derived advance and `correction:<uuid>` for a correction. A correction **requires**
`reason` (a CHECK, not a convention) and never deletes the row it corrects.

**`merchant_relationship_interactions`** — append-only.
`(id, relationship_id, kind CHECK ('note'|'call'|'whatsapp'|'visit'|'email'|'other'), body,
author_clerk_user_id, occurred_at, created_at)`. No UPDATE path exists at all; an edit is a new row.

**`merchant_relationship_tasks`** — the dated next action.
`(id, relationship_id, title, due_at, assigned_to, completed_at, completed_by, created_by,
created_at)`. Partial index `WHERE completed_at IS NULL` — "the next action" is the earliest-due open
task. Completing writes `completed_at`; it never deletes.

**`merchant_relationship_owner_history`** — `(id, relationship_id, from_steward, to_steward,
actor_clerk_user_id, at)`. Written by the reassign route in the same request as the
`merchant_relationships.steward_clerk_user_id` update.

### Routes (all flag-gated; unauthorized id ⇒ 403 with no record fields)

- `POST /api/promoter/relationship/[id]/interaction`
- `POST /api/promoter/relationship/[id]/task` · `POST …/task/[taskId]/complete`
- `POST /api/promoter/relationship/[id]/owner` — reassign, writes owner history
- `POST /api/admin/relationship/[id]/correct-stage` — admin only, `reason` required, 422 without it
- `GET /api/promoter/relationships` — the caller's owned + granted records
- `GET /api/admin/relationships` — full cohort, filters: `stage`, `steward`, `blocker`,
  `missing_action`, `overdue`

Scope resolution is **one shared helper** — shipped in S1 as **`lib/relationship-access.ts`** (this
doc originally guessed the filename `relationship-scope.ts`; use the real one) →
`resolveRelationshipAccess(clerkUserId, relationshipId)` returning
`{ ok: true, relationship, role: 'owner'|'admin'|'manager'|'viewer' } | { ok: false }`. Every route
above calls it, and every **write** route additionally calls `canWriteRelationship(role)` so a
`partner_grants` **`viewer` cannot write** — the denial `lib/partner-auth.ts` already enforces at the
MCP layer. No route re-implements the check. Guarding the population, not the door.

Also shipped beyond this contract's route list: **`GET /api/promoter/relationship/[id]/history`**.
Story 2.3's acceptance ("each row opens history and evidence") needs it and the contract omitted it;
it sits under the existing relationship prefix and reuses `resolveRelationshipAccess`, so admin
inherits it rather than needing a duplicate admin route.

### Views

- `/promotor/relaciones` — promoter pipeline. Owned/granted only, showing stage, **age in stage**,
  next action (or a visible "sin próxima acción" warning), consent state and blocker.
- `/admin/relaciones` — full cohort with the filters above; each row opens history + evidence.

Both are Iconoir + semantic tokens, es-MX only (not on the bilingual allow-list), and 404 with the
flag OFF.

## Sprint QA

- **api specs:** pure stage-transition table; transition replay/correction; owner/task audit; partner/grant scope;
  admin filters and cross-partner 403.
- **browser smoke owed:** yes, to Daniel — authenticated promoter and admin views using two partner identities.
- **deterministic gate:** typecheck/build + focused API/browser specs green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Sign in as a disposable promoter and open the activation pipeline from `/promotor/cerrar`.
   → Only the promoter's owned/granted merchants appear with stage age and next action.
2. Add an interaction and due-dated action, then complete it.
   → Both events remain in history and a missing-next-action warning appears.
3. Attach valid preview consent and advance the disposable merchant.
   → One permission transition appears with its evidence reference.
4. Sign in as admin, filter the cohort and correct the stage with a reason.
   → The correction is visible; prior history remains intact.
5. Request another promoter's relationship id with the first promoter session.
   → The server returns 403 and no contact data.

If any step fails, note the step number + URL — that's the bug report.
