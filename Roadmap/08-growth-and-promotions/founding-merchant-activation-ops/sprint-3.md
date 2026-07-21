# Founding merchant activation operations — Sprint 3: Commerce facts and event rail

**Status:** ⬜ not started

## Stories

### Story 3.1 — Medusa commerce-fact adapter and replay repair

**As an** operator, **I want** activation milestones derived from marketplace truth, **so that** the CRM never
lies about claim, payments, products or sales.

**Acceptance:** adapters read seller ownership, payment readiness, three public products, external share,
inquiry, first paid sale and 30-day retention from canonical facts/established mirrors; repeated evaluation is
idempotent; late facts repair the projection; manual CRM edits cannot overwrite commerce truth.

**Risk:** high — cross-system commerce projection; Daniel merges.

### Story 3.2 — PII-free Golden Beans lifecycle events

**As a** product operator, **I want** each lifecycle transition on the shared event rail, **so that** CRM and
analytics destinations can consume one reusable contract.

**Acceptance:** successful canonical transitions emit one event through `event-destination-router` using
`entity_type=merchant`, stable opaque subject id, transition id and schema version; payloads exclude names,
phones, emails, handles, notes and objections; delivery retry/replay does not duplicate the logical event.

**Risk:** high — cross-repo event and privacy contract; Daniel merges.

### Story 3.3 — Milestone mismatch and reconciliation view

**As an** admin, **I want** to see stale or mismatched commerce milestones, **so that** I can replay projection
without manually changing commerce facts.

**Acceptance:** admin sees source fact, projected stage, last evaluation and degraded/delivery state; authorized
replay uses the same idempotency key; reconciliation cannot edit Medusa ownership, products, orders or payments;
resolved mismatches retain their audit trail.

**Risk:** high — privileged replay and cross-system repair; Daniel merges.

## Sprint QA

- **api specs:** fixture-driven commerce facts, late/replayed facts, event schema/privacy, router retry/idempotency,
  admin-only reconciliation and no-manual-commerce-write invariant.
- **browser smoke owed:** yes, to Daniel — authenticated claim/payment/product setup and admin reconciliation.
- **deterministic gate:** both repos' contract/build suites green; deployed event inspected with redacted payload.

## Sprint 3 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Claim the disposable merchant, connect a test payment account and publish three approved products.
   → The relationship advances from actual facts without a manual checkbox.
2. Record an external share/inquiry and complete one safe test purchase.
   → Exactly one transition appears for each satisfied milestone.
3. Replay the same facts and router delivery.
   → No duplicate transition or logical Golden Beans event appears.
4. Inspect the routed event payload.
   → It contains the opaque merchant id and transition metadata, with no contact or notes.
5. Open the admin mismatch view and replay one deliberately delayed fact.
   → The projection repairs and the audit trail explains the change.

If any step fails, note the step number + URL — that's the bug report.
