---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: founding-merchant-activation-ops
---

# Epic: Founding merchant activation operations — CRM projection and field intake

> **Area:** 08 · Growth & Promotions · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/founding-merchant-activation-ops.md`](../../00-ideas/seeds/founding-merchant-activation-ops.md)

## Why

Miyagi needs one operational record for every founding merchant from first scouting through 30-day retention.
Promoters should capture a useful record in the field, stewards should always know the stage and next action,
and commerce milestones should advance from actual marketplace facts rather than spreadsheet checkboxes.

## Medusa-first note

Medusa remains authoritative for sellers, ownership, products, orders and payment readiness. Supabase stores the
non-commerce relationship, consent references, interactions, tasks and immutable lifecycle history. The stage
resolver reads Medusa facts and existing mirrors; it never creates a second commerce model.

## Decisions locked at scope approval

1. The Miyagi relationship record is canonical; a vendor CRM may later receive routed projections only.
2. Consent-dependent stages require evidence from the consent-preview contract; notes cannot imply permission.
3. Fuzzy business-name matching may suggest a duplicate but may never merge records automatically.
4. Golden Beans events carry an opaque merchant id and no contact details, notes or objections.
5. `promoter.activation_crm_enabled` is an enablement flag born OFF in every environment.

## Build-time architecture decisions (2026-07-22, locked before Sprint 1)

Three forks the scope doc left open, resolved against the live code and the live database before any
builder started. Each is load-bearing for more than one sprint.

### D1 — `merchant_relationships.id` becomes THE opaque merchant subject id

The shipped lifecycle loop (`merchant-lifecycle-projection` S3.1) keys every Golden Beans event on
`marketplace_shops.id`. This epic's record must be able to exist **before any shop does** (scouted,
qualified, permission received, preview delivered all precede shop creation), so a shop-keyed subject
would leave the first six stages with no subject at all — and epic acceptance 7 requires *every*
transition on the rail under *one* id.

So the relationship id becomes the subject, and the shop mirror id becomes a *link* on the relationship
(`shop_id UUID UNIQUE NULL`). This is free right now and never will be again: verified live on
2026-07-22, `merchant_lifecycle`, `merchant_lifecycle_deliveries` and `merchant_lifecycle_emissions`
each hold **0 rows**, so there is no history to split across two identity namespaces.

Guarding the population, not the door: the swap happens at the single seam
(`emitMerchantLifecycle`), never at the call sites. A new `emitMerchantLifecycleForShop()` resolves
shop → relationship and delegates, and a migration backfills one relationship row per existing
`marketplace_shops` row so the resolution always hits. `resolveMerchantIdForSeller` returns a
relationship id after this change, and its name follows.

### D2 — one vocabulary: the 13 stages ARE the event types

`MERCHANT_LIFECYCLE_EVENTS` grows from 6 to 14 — the 13 canonical stages plus the already-shipped
`merchant.preview_approved` (which is a preview fact, not a stage, and keeps its own projection
column). The projection table gains one nullable timestamp column per new stage and the plpgsql
vocabulary CHECK is extended in step. Additive, and the same write-once-earliest `LEAST()` semantics
apply unchanged.

Miyagi's own `merchant_relationship_transitions` stays **canonical** for stage history; the Golden
Beans projection remains the round-trip mirror. Two tables on purpose: one is the operational record
we own, the other proves the rail is intact.

### D3 — stage is DERIVED, corrections are the only writes

The resolver is a pure function over facts (`lib/merchant-stage.ts`): consent evidence, commerce facts
and CRM facts in, the furthest-reached stage out. A stage is never set by a UI checkbox. That makes
milestone reconciliation (Story 3.3) almost free — re-running the resolver *is* the repair — and it
is what the "manual CRM edits cannot overwrite commerce truth" acceptance actually needs. The one
exception is an audited **correction**, which writes a transition row carrying a required reason and
never deletes what it corrects.

### D4 — an admin correction is an internal record, not a broadcast

*(Added 2026-07-23, from the Sprint 2 fresh-reviewer pass — a decision D1–D3 implied but never stated.)*

`POST /api/admin/relationship/[id]/correct-stage` (S2) deliberately carries **no consent check and no
ordinal-monotonicity check**: an admin can set any of the 13 stages, with a required reason, as an
audited correction. That is correct for a correction tool and harmless in S2, where nothing reads
`stage` as consent proof.

D2 makes it dangerous in S3: the stages **are** the lifecycle event types, and the Golden Beans
projection applies write-once-earliest `LEAST()`. A milestone emitted from a mistyped correction is
unwithdrawable **across two repositories** — the exact failure class `merchant-lifecycle-projection`
paid nine defects to learn.

**The rule:** a transition with `actor_type = 'admin'` onto a permission-gated stage
(`permission_granted`, `preview_delivered`) **must not emit** a lifecycle event unless
`readApprovalState` currently backs it. Fail closed — an unreadable approval state declines.

Enforced **at the emitter**, never at the correction route. The emitter is the one seam every
transition source flows through, so a transition source added later is covered without anyone
remembering to guard it — guard the population, not the door. The correction still writes its
transition row and still appears in history; it simply does not broadcast.

## Build strategy — pre-launch, so ceremony gets right-sized

Production carries **zero tenants, zero campaigns and zero transactions** (Daniel, 2026-07-22); every
`promoter.*` flag is already ON live. The sprints were scaffolded as if each shipped alone. They do
not, and the plan says so rather than pretending otherwise:

- **One feature branch, three sequential PRs** (`feat/founding-merchant-activation-ops`), built in an
  isolated worktree because the shared app checkout sits on another session's branch. S2 depends on
  S1's schema and S3 on S2's resolver, so stacking is honest and each PR still reviews on its own.
- **All three PRs are HIGH tier** — DB migrations + an authenticated write path + a cross-repo privacy
  contract. Full review stack on each: mandatory cross-agent pass, mandatory fresh `pr-reviewer`, and
  the builder never merges their own PR.
- **Migrations are applied live by hand before the code that reads them merges**, then verified with
  `to_regclass` — a merged file is not an applied migration.
- **The kill-switch still ships** and is still born OFF. Zero operations makes a bad flip cheap, not
  free: the flag is what lets Daniel put `/promotor/cerrar` back the way it is today in one row update.

## What already exists (reuse, don't rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| In-person close workspace | `/promotor/cerrar` + `PromoterCloseClient` | Add mobile intake to the existing job flow |
| Acquisition truth | promoter applications, codes, attribution, commissions and transfers | Link the relationship; do not replace compensation records |
| Shop activation | unclaimed-shop setup, WhatsApp claim link and claim completion | Continue using the shipped ownership path |
| Partner access | `partner_grants` + `/partner` | Reuse grants for scoped portfolio reads |
| Non-commerce data | existing Supabase modules and migration pattern | Store relationship, consent reference, interaction and task state |
| Commerce facts | Medusa sellers, products, orders and payment connections | Derive lifecycle milestones without copying facts |
| Preview permission | `founding-merchant-consent-previews` | Reuse its evidence/version contract |
| Event delivery | Golden Beans `event-destination-router` | Emit one provider-neutral lifecycle contract |
| Journey analytics | Golden Beans `entity-journeys-projections` | Reuse later for time/cohort projections and the scorecard |

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Canonical relationship schema and dark-launch flag | high |
| 1 | 1.2 Authorized mobile intake, resume and dedupe | high |
| 1 | 1.3 Consent evidence and acquisition attribution | high |
| 2 | 2.1 Deterministic 13-stage resolver and immutable history | high |
| 2 | 2.2 Interactions, ownership and due-dated next action | high |
| 2 | 2.3 Promoter/admin operating views | high |
| 3 | 3.1 Medusa commerce-fact adapter and replay repair | high |
| 3 | 3.2 PII-free Golden Beans lifecycle events | high |
| 3 | 3.3 Milestone mismatch and reconciliation view | high |

## Kill-switch

`promoter.activation_crm_enabled` is an enablement flag in `platform_flags`, default **false** and created
disabled everywhere. It gates new intake, relationship/pipeline pages, write routes **and — added after the
S3 fresh-reviewer pass — the cron's Sprint-3 relationship-emission walk** (`sweepMerchantLifecycle` step 5).
That last one is load-bearing: the walk emits **write-once, unwithdrawable** `merchant.<stage>` milestones to
Golden Beans, and `growth.telemetry_enabled` (which otherwise gates emission) is ON in production — so without
this gate the daily cron would emit permanent cross-repo milestones across the backfilled population *before*
the smoke. The pre-existing shop-keyed sweep (steps 1–4) is unaffected by the flag. OFF preserves today's
`/promotor/cerrar`; additive migrations remain and must be forward-compatible. Flip only after role-scope tests,
live migration verification and one disposable merchant completes the smoke walkthrough — and note that the flip
is what first sends this epic's milestones to Golden Beans, so treat it as the go-live for the emission rail,
not just a UI reveal.

## Deploy order

Land additive Supabase migrations and the disabled flag first, then Sprint 1 intake and Sprint 2 stewardship.
Verify each migration against the live schema because CI does not apply it. Sprint 3 may consume Medusa facts
before Golden Beans is available, but end-to-end event delivery waits for `event-destination-router`. Enable the
flag only after frontend/backend compatibility and the disposable-merchant production smoke are green.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough with deployed URLs and disposable data
- [ ] Cross-partner reads/writes return 403 and admin cohort access is covered deterministically
- [ ] Commerce milestones replay idempotently and PII contract tests pass
- [ ] Additive Supabase migrations are confirmed against the live schema
- [ ] `promoter.activation_crm_enabled` exists with enablement polarity, born OFF; Daniel flips it after smoke
- [ ] This README marked shipped; sprint headings carry commit refs
- [ ] `RETROSPECTIVE.md`, product poster and durable learnings updated
- [ ] Feature branch deleted and `node scripts/build-order.mjs` run
