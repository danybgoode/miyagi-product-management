# Tiendas Fundadoras acquisition — Sprint 2: Attributed application

**Status:** ✅ Shipped + LIVE — PR #306 merged 2026-07-24 (squash 4f40cb3); migration applied, flag ON, prod smoke passed

## Stories

### Story 2.1 — Attributed and deduplicated public application

**As a** prospective founding merchant, **I want** a short, trustworthy application, **so that** Miyagi can
follow up without asking me to create a shop first.

**Acceptance:** rate-limited public submission validates minimal contact/business facts; source, UTM, referral
and promoter code are preserved; activation-operations dedupe creates or enriches one relationship; retries use
one idempotency key; no Medusa seller is created by applying.

**Risk:** high — anonymous PII write, abuse boundary and attribution; Daniel merges.

### Story 2.2 — Separate contact and preview permissions

**As an** applicant, **I want** to understand each permission I grant, **so that** applying never silently
authorizes a public shop or promotional use.

**Acceptance:** necessary follow-up contact is explained; optional channel preferences are explicit; preview
preparation/publication and marketing permissions are separate affirmative fields where applicable; consent text
version, timestamp and source are auditable; omission does not fabricate permission.

**Risk:** high — consent and privacy boundary; Daniel merges.

### Story 2.3 — PII-free funnel events and launch controls

**As a** growth operator, **I want** the campaign funnel measured without contact data, **so that** we can improve
conversion while the Miyagi relationship remains the PII source of truth.

**Acceptance:** view, CTA, start, validation failure and accepted application events use anonymous/opaque ids;
accepted event fires only after the canonical write; event payloads exclude form values; closed/full requests do
not count as accepted; router failure degrades safely and is observable.

**Risk:** high — public event/write ordering and privacy contract; Daniel merges.

## Sprint QA

- **api specs:** validation/rate limit, capacity race, dedupe/idempotency, UTM/promoter attribution, consent
  separation, PII event allowlist and router-failure behavior.
- **browser smoke owed:** yes, to Daniel — inspect the resulting authenticated admin relationship/consent record.
- **deterministic gate:** typecheck/build + focused API/browser specs; deployed event sample contains no PII.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/vende/fundadoras with disposable UTM/referral values and start the form.
   → The form is short, mobile-friendly and explains how contact details will be used.
2. Submit once without optional preview/marketing permissions.
   → The application succeeds without inventing those permissions.
3. Submit the same identity and idempotency key again.
   → One activation relationship exists and retains the original attribution/history.
4. Sign in as admin and inspect the applicant.
   → Source, promoter/cohort and consent text version are auditable; no shop was created.
5. Inspect the accepted Golden Beans event, then force the cohort full and try a direct API submit.
   → The event has no form values; the full request is refused and does not emit acceptance.

If any step fails, note the step number + URL — that's the bug report.
