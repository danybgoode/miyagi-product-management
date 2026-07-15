# ReportHub as the Notion replacement — Sprint 1: True short links (the registry)

**Status:** ⬜ not started

## Stories

### Story 1.1 — GCS report registry
**As** the routines, **I want** a Cloud Storage bucket mapping `slug → immutable markdown payload`,
**so that** reports have durable, short addresses.
Bucket in `miyagisanchezback-497722` / us-east4; lifecycle rule: objects under a `daily/` prefix expire
at 90 days, everything else kept forever. Writes: routine/service account only. Reads: public.
Slugs: predictable prefix + collision-safe suffix (`pmo-weekly-2026-07-14`, `daily-story-2026-07-14-x7`).
**Acceptance:** provisioning is an idempotent script under `infra/gcp/` (create-if-absent, `TARGET`
param, config-guard test — same shape as the monitoring scripts); lifecycle verified on a throwaway
object.
**Risk:** high (shared infra — Daniel merges)

### Story 1.2 — `/r/<slug>` resolver in the fork
**As** a stakeholder clicking a Telegram link, **I want** `https://<hub>/r/pmo-weekly-2026-07-14` to
open the report, **so that** links are short, readable, and survive big payloads.
Resolver fetches the payload from GCS and renders via the existing `/docs#md=…` viewer. Missing slug →
friendly 404 explaining URL-hash links remain valid (the stateless fallback is a feature, keep it).
**Acceptance:** round-trip live: write payload → open `/r/<slug>` → report renders; 404 path humane;
`SDOCS_ENABLE_STATEFUL_APIS` stays 0 (registry is read-through, not the upstream stateful API).
**Risk:** high (production service change — Daniel merges)

### Story 1.3 — Report scripts emit short links
**As** Daniel reading Telegram, **I want** standup/weekly/PMO messages to carry real short URLs,
**so that** links stop being HTML labels hiding URL-hash monsters.
Scripts upload the payload (service-account write) and emit `/r/<slug>`; on upload failure they fall
back to the current URL-hash link (degrade gracefully — LEARNINGS soft-mode pattern). Artifact-only
modes stay stateless (`shouldPersistWindow` discipline).
**Acceptance:** one live scheduled fire of standup + weekly shows short links; kill the bucket access
in a test run → long-link fallback observed; `node --test` on the pure slug/fallback logic.
**Risk:** low

## Sprint QA
- **api spec(s):** `node --test` on slug generation + fallback decision (pure); live round-trip in the walkthrough
- **browser smoke owed:** yes, to Daniel — open both link forms from a real Telegram message
- **deterministic gate:** root `scripts-guard` + fork repo tests green; infra config-guard test green

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://pmo-smalldocs-oehqqtyoia-uk.a.run.app

1. After the nightly fires (or `node scripts/standup.mjs` manually), open the Telegram message.
   → The link reads like /r/daily-story-2026-…, short and visible — not an HTML label.
2. Click it.
   → The report opens in the branded hub viewer.
3. Open /r/does-not-exist-xyz.
   → Friendly 404 explaining the link may have expired and URL-hash links remain valid.
4. (fallback check, agent-run) Run a report script with bucket access revoked in a test env.
   → Message still sends, with the long URL-hash link.

If any step fails, note the step number + what you saw — that's the bug report.
