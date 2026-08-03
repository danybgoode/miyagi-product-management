# Miyagi Partners proposition and recruiting portal v3 — Sprint 2: Activate

**Status:** ⬜ not started

## Outcome

An approved founding operator activates the existing Miyagi partner identity through neutral language,
enters `/partner`, and sees the exact boundary between program approval and merchant-granted shop access.
Existing Promotores retain their current working paths.

## Build contract — architect must lock before delegation

Before a builder starts, cite the epic's live-verified `D1…Dn` decisions here. The contract must name the
partner-track backfill/default, the one approval transition and Clerk-binding seam, activation secret/replay
contract, flag resolver, no-grant population assertion and Promotor continuity suite. Sprint 2 stacks on the
merged Sprint 1 contract and may not reframe it.

## Stories

### Story 2.1 — Track-aware approval on the existing partner identity

**As an** approved founding operator, **I want** my program track preserved when my partner identity is
created, **so that** I enter the correct offer without changing authorization semantics.

**Acceptance:** approving a founding operator creates or links the existing partner identity with the locked
operator track; existing identities resolve to Promotor without manual repair; concurrent retries mint no
duplicate identity or activation; approval creates no merchant relationship, consent record or shop grant;
Promotor codes, commissions and transfers remain isolated to their existing contract. Track is never accepted
by an authorization resolver as evidence of access.

**Risk:** high — identity/auth-adjacent migration and approval transition. **QA:** transition/idempotency
spec, existing-row/backfill spec, and a re-derived population guard proving no track value can authorize a shop.

### Story 2.2 — Neutral partner activation and Clerk binding

**As an** approved operator, **I want** a neutral sign-in and binding path, **so that** I can enter Miyagi
Partners without using a Promotor close workflow that misrepresents my role.

**Acceptance:** the approval message uses the locked neutral route; signed-out applicants return through
Clerk safely; the existing binding rule remains the single writer; invalid, rejected, expired, replayed or
mismatched activation attempts fail closed; a successful activation enters `/partner`; neither binding nor
activation creates shop access.

**Risk:** high — Clerk/auth boundary. **QA:** activation API/auth matrix, replay/expiry/mismatch denial,
writer-population guard and authenticated browser smoke owed to Daniel.

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

- **API specs:** approval/identity idempotency, old-row compatibility, activation expiry/replay/mismatch,
  flag-off parity, track-not-authorization population guard, and existing Promotor grant/commission regressions.
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
   → The application becomes approved once and produces one neutral activation invitation; no shop grant or
   merchant record is created.
2. Open the neutral activation link signed out.
   → You are asked to sign in, then returned to the partner activation flow rather than `/promotor/cerrar`.
3. Complete activation with the intended Clerk account and reopen the same link.
   → The first attempt succeeds and lands at https://miyagisanchez.com/partner; the replay fails safely.
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
