---
epic: flag-provider-mandate
sprint: 2
title: Retire the second lane
risk: high
phase: Shipped
stories_total: 3
stories:
  - id: S2.1
    title: "/admin/flags becomes a labelled read-only mirror"
    as_a: the product owner
    i_want: exactly one place that can change a flag
    so_that: I am never again unsure where to manage anything
    risk: low
    status: done
  - id: S2.2
    title: Delete local, shadow, and the machinery that chose between them
    as_a: the maintainer
    i_want: one code path
    so_that: no env var can silently move the commerce path back to a second store
    risk: high
    status: done
  - id: S2.3
    title: Park platform_flags, delete the Flagsmith wrapper
    as_a: the maintainer
    i_want: the dead store and the dead tooling gone
    so_that: nobody rediscovers a second flag surface in six months
    risk: high
    status: done
---
# Golden Frijoles is the only flag surface — Sprint 2: Retire the second lane

**Status:** ✅ Shipped — frontend [#423](https://github.com/danybgoode/miyagisanchezcommerce/pull/423) `c2754c6` · backend [#194](https://github.com/danybgoode/medusa-bonsai-backend/pull/194) `cf6cb3b` (+ deploy unblock [#195](https://github.com/danybgoode/medusa-bonsai-backend/pull/195) `8ff200f`) · root `66ebed8`

**Epic:** [Golden Frijoles is the only flag surface](README.md) · **Risk: HIGH — the product owner merges** (deleting the fallback on a commerce path)

⛔ **Does not start until Sprint 1's Story 1.4 is green.** Deleting the fallback while any flag lacks a
Golden activation changes live behaviour silently — a `killswitch` would resolve to its compile
default ON, an `enablement` to OFF.

## Sprint 2 record — shipped 2026-09-23

- **S2.1 `/admin/flags` is a read-only mirror.**
  - What changed: it renders the runtime's own Golden snapshot (`readGoldenFlagSnapshot`, the same
    credential and provider as `isEnabled()`). It carries a "Espejo de sólo lectura de Golden
    Frijoles" banner linking to `goldenfrijoles.com/app/flags/miyagisanchez`, and it names catalog
    flags that Golden does not define.
  - The toggle is gone: `FlagsAdminClient.tsx` and `setGoldenAdminFlag` are deleted.
  - **Live:** `POST`/`PUT`/`DELETE /api/admin/flags` → **405**; anonymous `GET` → **401**; the page
    redirects a signed-out visitor (307).
- **S2.2 One lane.**
  - The chain in both apps is now: live snapshot → durable mirror → one bounded initial fetch →
    compile default. The last two rungs were added on the backend after both fresh reviewers found
    the cold-start window.
  - Deleted: `flag-cutover.ts`, `flag-provider-mode.ts`, `flag-shadow-observation.ts`,
    `golden-flag-read-key-routing.ts`, `golden-flag-mirror-scope.ts`, `flags-cache.ts`,
    `flags-admin.ts`, and the backend `getFlagAuthorityReport`.
  - **Deviation, stated:** `flag-authority-observation.ts` was replaced by
    `flag-decision-observation.ts`, not deleted. Its `[golden-beans:flag-decision]` record
    (`golden`/`durable`/`default`) is the only signal that exposed the expired read key.
  - **The mirror moved** to the `miyagisanchez` lane of `golden_flag_scoped_snapshot_mirror`. The
    legacy lane sits at v47 and the monotonic RPC would refuse v44 forever. **Live:** that lane row
    was written at 2026-09-23 00:24:40Z (v44, 42 flags), *before* the backend shipped.
- **S2.3 Parked, not dropped.**
  - Nothing reads `platform_flags`. The source sweeps in both apps enforce it: `flag-single-lane.spec.ts`,
    `flags-single-authority.unit.spec.ts`.
  - `scripts/flags.mjs` (Flagsmith) is deleted. The standup's `liveFlags` now reads Golden through
    `scripts/golden-flags-on.mjs`.
  - The table, the legacy mirror table, and the now-unread `GOLDEN_BEANS_FLAG_CUTOVER`/
    `GOLDEN_BEANS_PARTNERS_RECRUITING_V3_FLAG_READ_KEY` env vars stay one wave as the rollback. The
    follow-up is seeded in `00-ideas/seeds/flag-lane-cleanup.md`.
- **Found while shipping: the backend had not deployed since 2026-09-04.**
  - Every `backend-main-deploy` since 09-11 hung on an interactive `db:migrate` link prompt. The
    Medusa 2.21 bump changed a link column from integer to numeric, and the container has no TTY.
  - [#195](https://github.com/danybgoode/medusa-bonsai-backend/pull/195) added
    `--execute-safe-links`, and `medusa-web-00085-z4p` became the first healthy deploy in 19 days.
    It carried #190–#193, including Medusa 2.21, to production.
  - **Live:** `/health` 200; `/store/regions` returns MXN and USD; a real cart lands on the
    publishable key's sales channel.

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
