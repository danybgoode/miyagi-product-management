# Miyagi Partners proposition and recruiting portal v3 — Sprint 2: Activate

**Status:** 🟡 in progress

## Build evidence — 2026-08-06

- Code is complete in stacked [storefront PR #343](https://github.com/danybgoode/miyagisanchezcommerce/pull/343);
  rollout gates remain pending.
- Sprint 2 is one stacked delta over Sprint 1: atomic approve/invite, provider-truthful outcome recording,
  audited rotate-before-resend, verified-email activation, the single database binding writer and a
  track-aware zero-grant workspace.
- Final head `46c16f1` passes TypeScript, changed-file lint, production build, 25 focused recruiting/
  activation specs and the complete 227-test D13 continuity population. Token, provider outcome, Clerk
  email, serialization, RPC, route/workspace, query-normalization and unavailable-state groups were each
  observed red before restoration.
- The executable provider seam proves non-empty ID, null ID and thrown/ambiguous outcomes; composite RPC
  rows cannot serialize activation hashes or internal MYP identifiers.
- Both required external-family reviews ran on head `46c16f1`; their repeated language finding was fixed in
  `86af18f` by moving the founding-operator activation, workspace and email lifecycle into a matching
  English/Spanish `partnersRecruiting` dictionary namespace. The US journey defaults to English and exposes
  Spanish; Promotor branches retain their existing Spanish behavior. Exact-head review is being rerun. The
  mandatory fresh reviewer remains blocked by the revoked subagent refresh token.
- No migration, flag sync, activation, grant or merchant mutation was performed from the builder rail. The
  authenticated Clerk activation/zero-grant smoke and live Promotor continuity walkthrough remain owed.

## Outcome

An approved founding operator activates the existing Miyagi partner identity through neutral language,
enters `/partner`, and sees the exact boundary between program approval and merchant-granted shop access.
Existing Promotores retain their current working paths.

## Build contract — locked 2026-08-06

Stack on Sprint 1 and build exactly epic decisions **D5–D9 and D12–D13**. Consume D1's deployed/backfilled
`program_track` and unique Clerk invariant without a second identity table. Existing Promotor approval stays
on its current PRM path; operator approval uses D5's atomic RPC, D6 isolates every Promotor economic/code
lookup, and both PRM binding and activation call D7's single database writer. Activation is D8's seven-day,
SHA-256-hashed, GET-read/POST-write, verified-email-bound transactional replay contract at
`/partner/activate/<token>`. Implement D8's awaited delivery-state recording and audited rotate-and-resend;
email is not part of approval's transaction and no plaintext token is persisted. Use the named additive
outcome helper; only a non-null provider acceptance ID records `provider_accepted` and the truthful timestamp
is `provider_accepted_at`, never `delivered_at`. Preserve every existing void email caller.

Use only D9's flag resolver. D12's workspace remains grant-derived and must prove the live fixture has zero
grants before and after operator approval/activation. Run D13's complete continuity population plus new
approval/activation/auth/workspace specs, recording a deliberate red mutation for each new group. Do not
create relationships, consent, grants, operator economics, a second dashboard or a second Clerk-binding
writer.

## Stories

### Story 2.1 — Track-aware approval on the existing partner identity

**As an** approved founding operator, **I want** my program track preserved when my partner identity is
created, **so that** I enter the correct offer without changing authorization semantics.

**Acceptance:** approving a founding operator creates or links the existing partner identity with the locked
operator track; existing identities resolve to Promotor without manual repair; concurrent retries mint no
duplicate identity or activation; approval creates no merchant relationship, consent record or shop grant;
an unconfirmed provider result leaves a visible recoverable invitation state rather than an unrecoverable
approved row;
Promotor codes, commissions and transfers remain isolated to their existing contract. Track is never accepted
by an authorization resolver as evidence of access.

**Risk:** high — identity/auth-adjacent migration and approval transition. **QA:** transition/idempotency
spec, existing-row/backfill spec, and a re-derived population guard proving no track value can authorize a shop.

### Story 2.2 — Neutral partner activation and Clerk binding

**As an** approved operator, **I want** a neutral sign-in and binding path, **so that** I can enter Miyagi
Partners without using a Promotor close workflow that misrepresents my role.

**Acceptance:** the approval message uses the locked neutral route; signed-out applicants return through
Clerk safely; the existing binding rule remains the single writer; only a Clerk account with a verified email
matching the application can bind. Invalid, rejected, expired, replayed, wrong-email or otherwise mismatched
attempts fail closed without consuming the token. Missing configuration, failure or an ambiguous provider
result is visibly `unconfirmed`; an audited resend rotates the token before another awaited outcome-bearing
send, and stale links fail. The UI says provider accepted, not delivered. A successful activation enters `/partner`;
neither binding nor activation creates shop access.

**Risk:** high — Clerk/auth boundary. **QA:** activation API/auth matrix, verified/unverified/wrong-email,
replay/expiry/mismatch denial, email missing-config/null-ID/exception/acceptance outcomes, ambiguous-send/
resend rotation, writer-population guard and authenticated browser smoke owed to Daniel.

### Story 2.3 — Track-aware `/partner` orientation

**As an** activated partner, **I want** to see my program, current permissions and next pilot step, **so that**
an empty workspace does not imply broken access or an available US shop.

**Acceptance:** the workspace says Miyagi Partners, labels Founding Commerce Operator or Promotor, explains
that program approval is not shop access, and gives the correct next step. Existing grants, shop visibility,
stewardship portfolio and revoke behavior remain. A founding operator with no grants sees zero shops and no
“Administer” shortcut. A Promotor still sees the applicable close path.

**Risk:** low. **QA:** track/copy rendering spec and browser smoke for both tracks and empty/granted states.

### Story 2.4 — Existing-Promotor continuity contract

**As an** existing Promotor, **I want** my application, code, earnings, close and partner workspace to behave
as before, **so that** the umbrella transition does not interrupt live operations.

**Acceptance:** flag OFF is behaviorally identical; flag ON does not change Promotor validation, approval,
code minting, commission, transfer, close, auto-grant, seller revoke or Spanish copy contracts. Historical
rows need no manual repair, and operator copy/economics never appear in the Promotor funnel.

**Risk:** low for code/test changes, covering high-risk shared identity and grant seams. **QA:** targeted
Promotor regression matrix plus a production Promotor walkthrough owed to Daniel before cohort enablement.

## Sprint QA

- **API specs:** approval/identity idempotency, old-row compatibility, activation verified-email/expiry/
  replay/mismatch, invitation provider acceptance/missing-config/null-ID/exception/ambiguous-send/resend
  rotation, flag-off parity,
  track-not-authorization population guard, and existing Promotor grant/commission regressions.
- **Browser specs:** neutral activation redirect, track-aware empty workspace, operator zero-grant state,
  Promotor route/copy parity and granted-shop rendering.
- **Browser smoke owed:** yes, to Daniel — approve and activate one disposable founding operator in a real
  Clerk session; verify zero implicit grants; then walk one existing Promotor through its current path.
- **Deterministic gate:** frontend type-check + lint + build + Playwright API suite green; every new spec
  observed red once. Run live-smoke against the stacked branch preview for rendered steps.
- **Review:** HIGH PR; mandatory cross-family review, mandatory fresh reviewer, Daniel merge.

## Sprint 2 — Smoke walkthrough

Env: preview before merge · production after deploy · https://miyagisanchez.com

1. **Admin/auth step — owed to Daniel:** sign in at https://miyagisanchez.com/admin/promoter and approve the
   disposable Founding Commerce Operator application from Sprint 1.
   → The application becomes approved once, provider acceptance is visible (or the result is recoverably
   unconfirmed), and no shop grant or merchant record is created. No UI claims mailbox delivery. If resend is
   exercised, the prior link becomes invalid.
2. Open the neutral activation link signed out.
   → You are asked to sign in, then returned to the partner activation flow rather than `/promotor/cerrar`.
3. Try a signed-in Clerk account without the application email, then complete activation with an account
   whose verified email matches and reopen the same link.
   → The wrong account fails without consuming the token; the matching account succeeds and lands at
   https://miyagisanchez.com/partner; replay fails safely.
4. On https://miyagisanchez.com/partner inspect the heading, program label and shop list.
   → It says Miyagi Partners / Founding Commerce Operator, explains the founder-review next step and shows
   zero shops until a separate merchant/admin grant exists.
5. Attempt to open or operate a nominated but ungranted shop with the new operator identity.
   → Access is denied; a submitted URL and program track confer no permission.
6. Grant the disposable operator `viewer` access to one disposable shop through the existing authorized rail.
   → Exactly that shop appears read-only; manager-only actions remain denied and seller revoke still removes it.
7. **Promotor continuity step — owed to Daniel:** activate or sign in as a disposable existing Promotor and
   open https://miyagisanchez.com/vende/promotor, https://miyagisanchez.com/promotor/cerrar and
   https://miyagisanchez.com/partner.
   → The Spanish offer, code, earnings/close behavior and applicable workspace path remain unchanged.
8. Turn `partners.recruiting_v3_enabled` OFF and reopen `/us`, the neutral activation route and `/partner`.
   → `/us` returns to the old invitation, new activation is unavailable, and existing Promotor/partner
   operation remains available exactly as the architect's flag contract states.

If any step fails, note the step number, URL, account/track/grant/flag state and what you saw.
