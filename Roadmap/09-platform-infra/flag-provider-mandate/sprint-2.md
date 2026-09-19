---
epic: flag-provider-mandate
sprint: 2
title: Retire the second lane
risk: high
phase: Shaping
stories_total: 3
stories:
  - id: S2.1
    title: "/admin/flags becomes a labelled read-only mirror"
    as_a: the product owner
    i_want: exactly one place that can change a flag
    so_that: I am never again unsure where to manage anything
    risk: low
    status: planned
  - id: S2.2
    title: Delete local, shadow, and the machinery that chose between them
    as_a: the maintainer
    i_want: one code path
    so_that: no env var can silently move the commerce path back to a second store
    risk: high
    status: planned
  - id: S2.3
    title: Park platform_flags, delete the Flagsmith wrapper
    as_a: the maintainer
    i_want: the dead store and the dead tooling gone
    so_that: nobody rediscovers a second flag surface in six months
    risk: high
    status: planned
---
# Golden Frijoles is the only flag surface — Sprint 2: Retire the second lane

**Status:** ⬜ not started

**Epic:** [Golden Frijoles is the only flag surface](README.md) · **Risk: HIGH — the product owner merges** (deleting the fallback on a commerce path)

⛔ **Does not start until Sprint 1's Story 1.4 is green.** Deleting the fallback while any flag lacks a
Golden activation changes live behaviour silently — a `killswitch` would resolve to its compile
default ON, an `enablement` to OFF.

## Stories

### Story 2.1 — `/admin/flags` becomes a labelled read-only mirror
**As the** product owner, **I want** exactly one place that can change a flag,
**so that** I am never again unsure where to manage anything.
**Acceptance:** the page keeps rendering Golden's snapshot — the operational view inside Miyagi is
worth keeping — but **the toggle is removed** and `app/api/admin/flags/route.ts` loses its write path
entirely (`setGoldenAdminFlag` deleted, not merely hidden). The page carries an unmissable label
saying it is a read-only mirror of Golden Frijoles, and links straight to this project's flag console.
Per **D5**. The existing "Golden no está disponible" empty state stays as-is — it is already correct.
**Risk:** low

### Story 2.2 — Delete `local`, `shadow`, and the machinery that chose between them
**As the** maintainer, **I want** one code path, **so that** no env var can silently move the
commerce path back to a second store.
**Acceptance:** `flag-provider-evaluator.ts` collapses to a single Golden read with a safe default.
Deleted: `flag-cutover.ts`, `flag-provider-mode.ts`, `flag-shadow-observation.ts`,
`flag-authority-observation.ts`, the `readLocal` lane, and both env vars. **The specific hazard this
closes:** `parseFlagCutover` resolves any malformed *or unset* manifest to `local`, silently — one
typo could move every flag decision back to `platform_flags` with no error anywhere. After this there
is nothing to fall back to and nothing to mis-parse. The durable mirror **stays** — it is the outage
fallback, and `LEARNINGS.md` already records what removing it cost (a cold instance served a compile
default and 404'd one live `/us/operators` request).
**Risk:** high

### Story 2.3 — Park `platform_flags`, delete the Flagsmith wrapper
**As the** maintainer, **I want** the dead store and the dead tooling gone,
**so that** nobody rediscovers a second flag surface in six months.
**Acceptance:** nothing reads `platform_flags`; the table is **left in place, unread, for one wave** as
the rollback, with a follow-up chore seeded to drop it. **`scripts/flags.mjs` is deleted** — a
Flagsmith Admin-API wrapper for a provider this project left months ago. Any now-dead migration or
mirror scaffolding goes with it.
**Risk:** high

## Sprint QA
- **api spec(s):** the checkout guards' fail-open specs re-run against the collapsed evaluator (a
  Golden outage must still resolve to the safe default and never throw); a spec asserting no code path
  reads `platform_flags`; a spec asserting the admin route rejects a write.
- **browser smoke owed:** **yes, to the product owner by name** — the money path, after the fallback
  is gone.
- **deterministic gate:** `tsc --noEmit` + `npm run build` (both apps) + `medusa build` + unit +
  Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/admin/flags.
   → It renders Golden's flags, is **clearly labelled a read-only mirror**, links to Golden's console,
     and **has no toggle**.
2. `POST` to `/api/admin/flags` directly.
   → Rejected. The write path is gone, not hidden.
3. Change a flag in **Golden's** console.
   → The live site and the mirror both reflect it within the snapshot TTL.
4. `git grep -n "platform_flags" -- apps` .
   → No read path. Only the parked migration and a comment saying it is parked.
5. `git grep -rn "flagsmith\|FLAG_PROVIDER_MODE\|FLAG_CUTOVER" -- apps scripts`.
   → Nothing in live code. `scripts/flags.mjs` is gone.
6. Set `GOLDEN_BEANS_FLAG_CUTOVER` to deliberate nonsense and redeploy a preview.
   → **Nothing happens.** The var is not read any more. *(Before this sprint, that typo would have
     moved every flag decision to `platform_flags` silently.)*
7. Make Golden unreachable briefly.
   → The site stays up; the durable mirror serves last-known-good; checkout does not error.
     *(Restore immediately.)*
8. (money/auth path — **owed to the product owner by name**) Complete a real test-mode checkout.
   → Order completes; the guards behave as before.

If any step fails, note the step number + what you saw — that's the bug report.

**Steps 6 and 7 are the two that matter.** One proves the silent-downgrade hazard is closed; the other
proves closing it didn't cost the outage fallback.
