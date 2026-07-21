# Founding merchant activation operations — Sprint 2: Lifecycle and stewardship

**Status:** ⬜ not started

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

**Acceptance:** promoter view shows owned/granted records only; admin can filter the full cohort by stage,
steward, blocker and missing/overdue action; each row opens history and evidence; unauthorized ids return 403,
not a partial record.

**Risk:** high — tenant authorization and contact data; Daniel merges.

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
