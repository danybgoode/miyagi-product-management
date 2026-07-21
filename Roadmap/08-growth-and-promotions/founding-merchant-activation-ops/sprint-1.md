# Founding merchant activation operations — Sprint 1: Field record and consent-safe intake

**Status:** ⬜ not started

## Stories

### Story 1.1 — Canonical relationship schema and dark-launch flag

**As an** activation operator, **I want** one durable merchant relationship record, **so that** intake does not
depend on a spreadsheet or prematurely created shop.

**Acceptance:** additive tables model the merchant, opaque id, steward, lifecycle state and audit timestamps;
`promoter.activation_crm_enabled` is created disabled; the relationship may exist without a Medusa seller;
database constraints protect tenant/owner references and no commerce entity is copied.

**Risk:** high — additive database contract and runtime gate; Daniel merges.

### Story 1.2 — Authorized mobile intake, resume and dedupe

**As a** Founding Merchant Partner, **I want** to save and resume a partial merchant record on my phone, **so
that** an in-person conversation produces a usable next step without duplicate data entry.

**Acceptance:** `/promotor/cerrar` exposes the step only with the flag ON; required fields are minimal; a saved
draft resumes; claimed seller id then normalized phone/email are deterministic matches; fuzzy names only prompt
human confirmation; promoter/grant scope is enforced and OFF leaves today's flow unchanged.

**Risk:** high — authenticated write path and identity/dedupe rules; Daniel merges.

### Story 1.3 — Consent evidence and acquisition attribution

**As an** operator, **I want** permission and acquisition provenance attached to the relationship, **so that**
we know what the merchant allowed and who originated the work.

**Acceptance:** promoter, cohort, source, preferred contact channel and consent-reference fields persist;
permission-dependent stages reject a note without valid consent-preview evidence; edits are audited; the
intake never treats claim, link delivery or silence as publication permission.

**Risk:** high — consent boundary and immutable attribution; Daniel merges.

## Sprint QA

- **api specs:** extend `e2e/promoter-close.spec.ts`; add relationship specs for flag states, partial resume,
  dedupe precedence, invalid consent evidence and cross-promoter 403s.
- **observed red:** record today's absence of resumable relationship data before implementation.
- **browser smoke owed:** yes, to Daniel — authenticated phone-size promoter intake and resume.
- **deterministic gate:** frontend typecheck/build + Playwright API green; migration verified locally and live.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. With the flag OFF, sign in as a disposable promoter and open https://miyagisanchez.com/promotor/cerrar.
   → The existing close workflow is unchanged.
2. Turn the flag ON, reopen `/promotor/cerrar`, enter only the minimum merchant facts and save.
   → A relationship id and visible saved state appear without creating a shop.
3. Reload on a phone-size viewport and resume the record.
   → The prior answers and next step return.
4. Submit the same normalized phone/email again.
   → The existing relationship is offered for confirmation; no duplicate is silently created.
5. Try to record permission without consent-preview evidence.
   → The permission stage is refused while the record remains safely saved.

If any step fails, note the step number + URL — that's the bug report.
