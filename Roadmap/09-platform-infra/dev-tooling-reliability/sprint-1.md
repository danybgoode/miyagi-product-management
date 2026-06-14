# Dev-tooling reliability — Sprint 1: Backend CI gate

**Status:** 📋 scaffolded — not started.

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
- **dependency check:** confirm the backend `npm install` succeeds on a clean runner and `npx tsc --noEmit`
  is clean against the backend `tsconfig` (open question 2); fall back to `medusa build` + `test:unit` only
  if `tsc` is noisy.
- **operational, owed to Daniel:** the required-status-check toggle in the backend repo's settings.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the **backend** repo on GitHub (`medusa-bonsai-backend`). Use a throwaway branch.

1. Create a branch off `main`, push a trivial no-op change, open a PR.
   → A **CI / Type-check + build + unit** check appears on the PR and goes **green**.
2. On the same branch, introduce a deliberate TypeScript error (e.g. assign a string to a number) and push.
   → The CI check goes **red** at the `tsc` / `medusa build` step; merge is blocked (once the required-check toggle is on).
3. Revert the error; push.
   → CI goes **green** again.
4. Temporarily break a unit spec (flip an assertion) and push.
   → CI goes **red** at the `test:unit` step.
5. Open `Roadmap/WAYS-OF-WORKING.md` §"Review & merge".
   → It now states the backend has a real tsc + build + unit gate, with the "no preview, no e2e" caveat.

If any step fails, note the step number + what you saw — that's the bug report.
