# Merchant Partner lifecycle — Sprint 1: Portfolio and ownership SLA

**Status:** ⬜ not started

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
