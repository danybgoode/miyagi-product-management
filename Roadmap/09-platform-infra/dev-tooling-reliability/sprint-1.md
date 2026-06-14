# Dev-tooling reliability — Sprint 1: Backend CI gate

**Status:** ✅ **MERGED** — backend **PR #29** squash-merged to `main` (`21b1e16`), gate **green on first CI run** (2m2s). The `Type-check + build + unit` check is now a **required status check** on the backend repo's `main` (branch protection configured 2026-06-14), so a red run blocks merge. Advisory cross-agent review (Antigravity — codex token revoked) returned two false positives, both declined with rationale on the PR. Owed: only the destructive red-path smoke (steps 2–4) on a throwaway branch, if you want it exercised live.

## Resolved decisions
- **Open question 2 — `tsc` is kept, ordered after `build`.** On a fresh checkout `tsc --noEmit` needs
  `.medusa/types/*` (link/module declarations the `tsconfig` `include`s), which `medusa build` generates;
  `medusa build` itself is swc-based and does **not** type-check. So the gate runs **`medusa build` → `tsc --noEmit` → `test:unit`** — build first (generates the types + proves compile), then tsc as the real type gate. Verified locally: build clean, `tsc --noEmit` exits 0, `test:unit` 3 suites/13 tests green. No `tsc`-noisy fallback needed.
- **No env block / no service container.** `medusa build` falls back to a fake redis and never connects to a
  DB at build time (no `DATABASE_URL`/`REDIS_URL` required), and the unit specs are DB-free — so the workflow
  needs no secrets, no placeholder env, and no Postgres/Redis `services:` block.
- **Open question 1 — backend uses a PR flow**, so `on: pull_request` is the right trigger; no `on: push`
  gate is added (`notify-telegram.yml` already covers the post-push ping).

> Lands in the **backend** repo (`apps/backend/.github/workflows/`). Dev tooling, not commerce: no
> products/orders/payments/DB/auth/i18n surface. The backend has **no per-branch preview** (WAYS §40), so
> there is **no Playwright/e2e step** — that's correct, not a gap. Mirror the frontend's `typecheck-build`
> job. All stories LOW.

## Stories

### Story 1.1 — Backend `ci.yml` on `pull_request`
**As a** developer opening a backend PR, **I want** GitHub Actions to type-check, build, and unit-test the
backend automatically, **so that** a broken backend can't reach `main` (and thus Cloud Run) unnoticed.
**Acceptance:**
- A new `apps/backend/.github/workflows/ci.yml` triggers on `pull_request` (`opened`, `synchronize`,
  `reopened`) with `concurrency` cancel-in-progress, mirroring the frontend `typecheck-build` job shape.
- Steps: checkout → `setup-node@v4` (node 20) → `npm install --no-audit --no-fund` → `npx tsc --noEmit`
  (or `medusa build` only, per open question 2) → `npm run build` (`medusa build`) → `npm run test:unit`.
- A deliberate type error **or** a failing unit spec turns the job **red**; a clean branch is **green**.
- No DB/Redis service container and no e2e step (unit specs are DB-free; preview e2e is N/A for the backend).
**Risk:** low

### Story 1.2 — Make it the merge gate + correct the docs
**As a** reviewer, **I want** the CI check to actually block a red backend merge and the docs to say so,
**so that** WAYS reflects reality (it currently implies the backend already has a tsc+build gate).
**Acceptance:**
- `WAYS-OF-WORKING.md` §"Review & merge" is corrected: the deterministic gate now genuinely covers the
  backend (`tsc` + `medusa build` + `test:unit`), with the no-preview/no-e2e caveat stated.
- The PR body notes the **one operational step owed to Daniel**: add this job to the backend repo's
  required-status-checks (branch protection) so it gates merge — and resolve open question 1 (does the
  backend use a PR flow, or should CI also run `on: push`?).
- No change to `cloudbuild.yaml` — the deploy is **not** gated inside Cloud Build (scope decision).
**Risk:** low

## Sprint QA
- **api spec(s):** none — CI config, not app code.
- **deterministic gate (this sprint's own QA):** the new workflow **is** the gate; prove it by pushing a
  red commit to a branch and seeing the check fail, then green on fix.
- **browser smoke owed:** no.
- **dependency check:** ✅ confirmed locally — `npm install` succeeds, `medusa build` clean (no DB env),
  `npx tsc --noEmit` exits 0 **after** the build, `test:unit` 3 suites/13 tests green. `tsc` kept (not noisy);
  ordered after `build` so the generated `.medusa/types` resolve (OQ2, see *Resolved decisions*).
- **operational:** ✅ done — `Type-check + build + unit` is a required status check on `main` (branch
  protection, configured via `gh api` 2026-06-14; `strict:false`, no mandatory review approval so the
  low-risk reviewer-auto-merge flow still works, admins not locked out).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the **backend** repo on GitHub (`medusa-bonsai-backend`). Use a throwaway branch.

1. Create a branch off `main`, push a trivial no-op change, open a PR.
   → A **CI / Type-check + build + unit** check appears on the PR and goes **green**.
2. On the same branch, introduce a deliberate TypeScript error (e.g. assign a string to a number) and push.
   → The CI check goes **red** at the **Type-check (`tsc --noEmit`)** step (`medusa build` is swc-based and
     strips types without checking, so a pure type error surfaces at `tsc`, which runs right after build);
     merge is blocked (once the required-check toggle is on).
3. Revert the error; push.
   → CI goes **green** again.
4. Temporarily break a unit spec (flip an assertion) and push.
   → CI goes **red** at the **Unit tests (`test:unit`)** step. *(The `ci-workflow.unit.spec.ts` self-check also
     rides this step, so gutting the workflow itself — dropping a step, narrowing the trigger, adding a DB
     service — turns it red too.)*
5. Open `Roadmap/WAYS-OF-WORKING.md` §"Review & merge".
   → It now states the backend has a real tsc + build + unit gate, with the "no preview, no e2e" caveat.

If any step fails, note the step number + what you saw — that's the bug report.
