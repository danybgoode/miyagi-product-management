# Merchant Partner lifecycle — Sprint 2: Signed-human follow-up

**Status:** ⬜ not started

## Stories

### Story 2.1 — Fact-bounded editable follow-up drafts

**As a** Merchant Partner, **I want** help drafting a relevant follow-up, **so that** I can respond quickly while
remaining responsible for what the merchant receives.

**Acceptance:** draft input is limited to allowlisted relationship/commerce facts; unsupported claims and secrets
are excluded; generated text is visibly editable and labeled as a draft; model/prompt version, input fact ids and
creator are auditable; failures leave manual composition available.

**Risk:** high — model output over merchant context and PII; Daniel merges.

### Story 2.2 — Idempotent steward reminders

**As a** Merchant Partner, **I want** reminders for overdue merchant work, **so that** I keep service promises
without repeatedly checking the queue.

**Acceptance:** existing notification fan-out sends to the steward/admin only; one logical reminder per SLA/task
window; retries are idempotent; quiet/failure state is visible; no merchant contact occurs; reminder links return
to an authorized portfolio record.

**Risk:** high — notification routing and duplicate-contact risk; Daniel merges.

### Story 2.3 — Explicit human send and provenance boundary

**As a** merchant, **I want** outreach to come from an accountable person, **so that** assistance never becomes
unreviewed automated messaging.

**Acceptance:** Miyagi never sends a generated draft automatically; partner must edit/review and explicitly copy
or confirm the chosen external channel; UI states recipient/channel and records human confirmation/provenance;
agent, retry, scheduler and reminder paths cannot bypass this boundary.

**Risk:** high — external communication and consent/reputation boundary; Daniel merges.

## Sprint QA

- **api specs:** allowlisted draft facts, secret/PII boundaries, provenance, provider failure, reminder
  idempotency, steward-only routing and invariant that no generated text reaches a merchant automatically.
- **browser smoke owed:** yes, to Daniel — authenticated partner draft/edit/copy flow in a real preferred channel.
- **deterministic gate:** typecheck/build + model/notification contract specs + no-auto-send regression green.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Open an overdue disposable merchant from https://miyagisanchez.com/partner.
   → A draft action explains which allowlisted facts will be used.
2. Generate a draft, inspect provenance and edit the text.
   → It remains clearly unsent and identifies its input/version.
3. Trigger the same overdue reminder twice.
   → The steward receives one logical notification; the merchant receives none.
4. Simulate model and notification provider failure.
   → Manual follow-up remains possible and degraded state is visible.
5. Explicitly copy/confirm the edited message for the merchant's preferred channel.
   → Human confirmation is audited; no platform path auto-sends the draft.

If any step fails, note the step number + URL — that's the bug report.
