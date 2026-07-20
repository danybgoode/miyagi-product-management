# Founding merchant consent-safe previews — Sprint 3: Checklist, migration posture, and telemetry

**Status:** ⬜ not started

## Stories

### Story 3.1 — Preview-readiness checklist and lifecycle events

**As a** Merchant Partner, **I want** one readiness checklist and visible audit trail, **so that** every
activation follows the same quality and consent standard.

**Acceptance:** required items cover merchant identity/contact verification, asset provenance, product facts,
prices, merchant review, current approval, steward and next action; incomplete required items block activation;
each canonical transition emits one PII-free Golden Beans event after success (`preview_created`,
`preview_delivered`, `preview_approved`, `preview_invalidated`, `preview_activated`, `shop_claimed`); telemetry
failure never rolls back the merchant action.

**Risk:** high — server-enforced checklist + cross-product event contract; Daniel merges.

### Story 3.2 — Historical public/unclaimed inventory

**As Daniel, I want** a read-only inventory of existing promoter-created public/unclaimed shops, **so that** I
can decide their disposition without silently changing merchants under a new consent rule.

**Acceptance:** report identifies source/provenance, public product count, claim state and last relevant activity;
it recommends review categories but performs no mutation; unknown provenance is labeled unknown; rerunning the
same dataset is deterministic.

**Risk:** low — read-only report; no bulk mutation.

## Sprint QA

- **api specs:** checklist enforcement and post-success telemetry ordering; event payload asserts no email,
  WhatsApp, name or raw token.
- **report fixture:** known public/unclaimed/promoter/unknown cases; deterministic rerun.
- **browser smoke owed:** yes to Daniel for promoter checklist usability on a phone and review of the real
  historical inventory; no money path.
- **deterministic gate:** frontend gate green; Golden Beans endpoint may be unavailable and must degrade safely.

## Sprint 3 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/promotor/cerrar and load the disposable preview before all required items are complete.
   → The readiness checklist names the missing item and “Activar tienda” remains disabled.
2. Complete the missing item, deliver and approve the current preview, then activate it.
   → Every checklist item is complete and activation succeeds.
3. Inspect the Golden Beans delivery/event view for the disposable merchant subject.
   → Each lifecycle transition appears once with ids/timestamps and no merchant PII.
4. Open the generated historical public/unclaimed inventory artifact.
   → Existing rows are grouped for manual review; no shop or product changed as a result of generating it.

If any step fails, note the step number + merchant/shop id — that's the bug report.
