# Miyagi Partners proposition and recruiting portal v3 — Sprint 1: Apply

**Status:** 🟦 in review

## Build evidence — 2026-08-08

- Code is complete at `6fd5d76` in
  [storefront PR #342](https://github.com/danybgoode/miyagisanchezcommerce/pull/342); the exact-head CI type/
  build, changed-file lint, four preview API shards and Vercel deployment are green. Rollout gates remain.
- The dark-flag proposition, exact three-shop intake, additive migration/RPC contract, privacy-closed
  analytics and one-queue admin review are implemented on `feat/miyagi-partners-recruiting-v3`.
- Security review additionally closed anonymous table access with RLS plus explicit privilege revocation,
  made duplicate intake status-neutral, put operator rollback before rate/data work on direct surfaces and
  made partner identity storage failure distinct from confirmed absence. The latter regression was observed
  red (`null` returned on unavailable storage) before the fail-closed fix.
- TypeScript, production build, changed-file lint and 105 affected local specs are green. A fresh independent
  reviewer reran 110 focused tests at exact head and returned **clean / approve**. The complete D13 continuity
  population also passed on the final stacked Sprint 2 branch (234/234).
- New validation/spec groups were observed red through deliberate mutations before restoration. Desktop,
  mobile and the final full-page local live-smoke render were inspected; the harness reported HTTP 200 and
  zero console errors.
- Earlier external-family reviews ran and their findings were fixed or answered. A new exact-head
  cross-family pass is still required; it needs explicit authorization because the reviewer receives the
  private PR diff.
- The orchestrator applied `20260806120000_miyagi_partners_recruiting_v3.sql` through the authorized
  Supabase rail and realigned the remote migration ledger to the local timestamp. Existing counts remained
  0 applications, 2 partners (1 Clerk-bound) and 0 grants; both existing partner rows backfilled to
  `program_track = 'promoter'`. The local flag row now exists OFF. Golden definition sync, authenticated
  admin smoke, existing-Promotor walkthrough and HIGH-risk merge authorization remain gates—not inferred
  successes.
- Live security verification proved all three reused tables have RLS enabled with no client policies,
  anonymous/authenticated CRUD denied and service-role CRUD preserved. The five new functions are
  `SECURITY DEFINER`, pin `search_path = public, pg_temp`, deny `PUBLIC`/`anon`/`authenticated` execute and
  permit service-role execute. Anonymous PostgREST GET/HEAD/POST returned 401 while service-role GET returned
  200 for every table.

## Outcome

A qualified US operator can understand the founding proof, choose the correct program track and submit
exactly three real shops for founder review. The existing Promotor application continues unchanged.

## Build contract — locked 2026-08-06

Build exactly epic decisions **D1–D4 and D9–D13**. The live application table has zero rows and only the
legacy columns listed in D1 evidence; Sprint 1 owns the additive migration for `program_track`, operator
details v1, operator activation fields, application status check, pending-or-approved operator duplicate index, partner
track/Clerk uniqueness, the disabled local flag row and the service-role-only function declarations consumed
in Sprint 2. Existing rows default/backfill to `promoter`.

The public contract is D2's exact version-1 object, D3's public-URL/awareness rules and D4's one-active-row
idempotency. The only flag seam is D9 and the only analytics vocabulary is D10. Admin review follows D11;
request-conversation is a mail link, not a state. The builder must run D13's whole Promotor regression
population, add new intake/admin/privacy/population specs, record one deliberate red mutation per new spec
group, and must not implement activation, grant writes or a second identity system in this sprint.

## Stories

### Story 1.1 — Miyagi Partners US proposition and track router

**As a** prospective operator, **I want** to understand the founding proof and distinguish it from the
Promotor program, **so that** I choose the correct path without interpreting a platform feature list.

**Acceptance:** with `partners.recruiting_v3_enabled` ON, `https://miyagisanchez.com/us` shows the approved
promise, four-step parallel-proof mechanism, fit/not-fit criteria, program boundaries, primary operator CTA
and secondary Promotor link. It distinguishes what Miyagi operates in Mexico from what the US pilot still
must prove. With the flag OFF, the current invitation page and mailto remain.

**Risk:** low. **QA:** claim/config spec plus rendered desktop/mobile browser smoke.

### Story 1.2 — Structured three-shop operator application

**As a** qualified operator, **I want** to submit my operating profile and three candidate shops, **so that**
Miyagi can assess a real pilot without asking for secrets or a cutover commitment.

**Acceptance:** the application requires company/role, active-shop count, exactly three valid public shop
URLs, platforms/channels, merchant-consent status, one recent operating problem, must-retain systems, why now
and 90-day checkpoint availability. Client and server validation agree; rate limiting and honeypot protection
remain; accidental retries cannot create an ambiguous review pile; no password, token, customer data, exact
revenue or regulated personal data is requested. The success state says application received, not accepted.

**Risk:** high — additive DB migration and public write. **QA:** application contract/API spec, URL and
payload validation matrix, duplicate/rate-limit/honeypot regression, rendered submit smoke. Every new spec is
observed red through mutation.

### Story 1.3 — Track-aware admin review and notification

**As an** operator-program reviewer, **I want** one queue showing track, qualification, candidate shops and
consent status, **so that** I can approve, reject or request a conversation without confusing the founding
offer with Promotor economics.

**Acceptance:** existing Promotor rows render and decide exactly as today; operator rows show a safe structured
summary and link out with appropriate protections; notifications name the track but contain no secrets;
approve/reject remains race-safe and audited; application review never contacts a nominated merchant or
creates access. A reviewer can identify missing qualification without reading an opaque free-text blob.

**Risk:** high — admin/auth surface over migrated records. **QA:** admin authorization and transition/
concurrency API specs plus authenticated admin browser smoke owed to Daniel.

### Story 1.4 — Privacy-safe recruitment measurement

**As the** product owner, **I want** to distinguish visits, track choices, starts, valid three-shop
submissions and disqualification reasons, **so that** we improve qualified commitment rather than vanity
traffic.

**Acceptance:** events contain only track, funnel stage, coarse source and approved reason enum. Candidate
URLs, company/contact fields, free text and merchant data can never enter analytics. Promotor and operator
funnels remain separable, and a browser blocked from analytics still completes the application.

**Risk:** low. **QA:** event allowlist/privacy spec; no additional authenticated smoke.

## Sprint QA

- **API specs:** extend the existing promoter-application suite for track/version validation,
  duplicate/concurrent decisions and old-row compatibility; add admin auth and event privacy assertions.
- **Browser specs:** `/us` flag-off/flag-on render, mobile form behavior, per-shop validation and successful
  public submission against a disposable application fixture.
- **Browser smoke owed:** yes, to Daniel — authenticated `/admin/promoter` review of one disposable operator
  and one Promotor application; confirm no nominated merchant is contacted.
- **Deterministic gate:** frontend type-check + lint + build + Playwright API suite green; every new spec
  observed red once. Run live-smoke against the branch preview for rendered steps.
- **Review:** HIGH PR; mandatory cross-family review, mandatory fresh reviewer, Daniel merge.

## Sprint 1 — Smoke walkthrough

Env: preview before merge · production after deploy · https://miyagisanchez.com

1. With `partners.recruiting_v3_enabled` OFF, go to https://miyagisanchez.com/us.
   → You see the current research invitation and its existing email CTA; no operator form is present.
2. Turn the flag ON for the disposable test environment and reopen https://miyagisanchez.com/us on mobile.
   → You see “Miyagi Partners,” the no-cutover proof, operator fit/boundaries, primary application and a
   separate Promotor path to https://miyagisanchez.com/vende/promotor.
3. Start the operator application with only two shop URLs and submit.
   → The third-shop field is identified, your other entries remain, and nothing is submitted.
4. Enter three valid public test-shop URLs, the required qualification facts and submit once.
   → A received-for-review confirmation appears; it does not say you were accepted or granted access.
5. Submit the same disposable application again.
   → The result follows the locked duplicate rule and does not create two ambiguous pending reviews.
6. **Admin/auth step — owed to Daniel:** sign in and open https://miyagisanchez.com/admin/promoter.
   → The new row is labeled Founding Commerce Operator and shows three shops, consent status and
   qualification summary; an existing Promotor row is unchanged.
7. Inspect analytics/debug output for the application session.
   → It contains coarse funnel events but none of the three URLs, contact fields or free text.
8. Check the nominated shops' contact channels.
   → Miyagi sent no automatic message; nomination is visibly not merchant consent.

If any step fails, note the step number, URL, account/flag state and what you saw.
