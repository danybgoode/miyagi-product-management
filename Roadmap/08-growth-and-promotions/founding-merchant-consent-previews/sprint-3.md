# Founding merchant consent-safe previews — Sprint 3: Checklist, migration posture, and telemetry

**Status:** ✅ Merged — FE #295; flag OFF, smoke owed to Daniel

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

## What shipped (implementation notes)

- **3.1 checklist** — `lib/preview-checklist.ts` (pure, zero imports) declares eight **required**
  items: merchant identity, merchant contact, product facts, prices, asset provenance, merchant
  review, current approval, steward — plus the derived next action. `checkActivation` now composes
  BOTH pure rules (`canActivate` for current approval AND `checklistComplete`), so the workspace,
  the activation route and the specs read one rule. It fails **closed**: an unreadable shop row
  reads as "no contact/location" ⇒ incomplete ⇒ no publication. An already-activated preview stays
  idempotently activatable, so adding a checklist item later can't break re-runs.
- **3.1 events** — `lib/preview-events.ts` (pure) builds the payload; `lib/preview-lifecycle.ts`
  (server) emits it. The payload is an **allow-list** — ids, version and counts only — so a future
  caller has nowhere to put a name, email, WhatsApp number or raw token; the subject is the shop
  mirror UUID. Gated by `growth.telemetry_enabled`, emitted only AFTER the canonical write, and
  structurally unable to fail the merchant action. Each transition fires exactly once
  (`preview_created` via `ensureShopPreviewReportingCreation`; `_delivered` only on the real
  draft→delivered flip; `_invalidated` only when consent actually went stale; `_activated` only
  after publish AND the anchor flip).
- **3.2 inventory** — `lib/preview-inventory.ts` (pure) classifies provenance
  (`promoter` / `import` / `unknown`, with unknown **labeled**, never guessed), claim state, public
  product count, last activity and a recommended review category.
  `scripts/preview-inventory.ts` does GET-only Supabase reads and renders a deterministic Markdown
  artifact (no timestamp in the body, so a rerun over an unchanged dataset is byte-identical).

  Run it with:
  ```bash
  node --experimental-strip-types --env-file=.env.local scripts/preview-inventory.ts
  ```

### Live inventory result (2026-07-21, read-only against production)

182 shops. **`public_unclaimed_promoter`: 0** — the historical population this epic worried about
(promoter-created, public, unclaimed, unanchored) is **empty**. The 168 `public_unclaimed_other`
rows are scraped/imported gem shops, a separate population with its own provenance question; 13 are
merchant-owned (claimed), 1 has no public presence. Provenance split: 1 promoter, 167 import,
14 unknown.

**Consequence for step 4 of the walkthrough:** there is no promoter-created backlog to disposition.
The decision Daniel actually owes is about the 168 imported public/unclaimed shops, which locked
decision #4 covers but this epic never scoped — worth a separate call, not a silent bulk mutation.
