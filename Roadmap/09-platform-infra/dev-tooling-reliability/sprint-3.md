# Dev-tooling reliability — Sprint 3: Wrong-branch tax (auto-resolve PR + HEAD assertion)

**Status:** 📋 scaffolded — not started.

> Lands in the **monorepo-root** repo (`scripts/lib/cross-agent-cli.mjs`, `scripts/cross-review.mjs`, and
> `scripts/cross-panel.mjs` if it shares the path). Dev tooling, not app code. QA = a pure `node:test` on
> the resolve + compare logic (mock `gh`/`git`) + a real run. All stories LOW. Goal: the **first** run
> reviews the **right** diff, so nobody reruns.

## Stories

### Story 3.1 — PR# optional, resolved from the current branch
**As a** developer on a feature branch, **I want** `cross-review.mjs` to figure out the PR itself,
**so that** I don't pass the wrong number and review the wrong PR.
**Acceptance:**
- With no `<PR#>` argument, the command runs `gh pr view --json number,headRefName,headRefOid` for the
  current branch and uses that PR. An explicit `<PR#>` still overrides (escape hatch), as does `--repo`.
- If the current branch has **no open PR**, it fails with a clear message ("no open PR for branch
  `<name>` — push/open one or pass `<PR#>`"), not a stack trace.
- The resolve logic lives in `scripts/lib/cross-agent-cli.mjs` (shared rail), not inline in `cross-review.mjs`.
**Risk:** low

### Story 3.2 — Stale / wrong-branch guard
**As a** developer, **I want** the command to refuse a stale diff, **so that** I never review code that
isn't what's actually on the branch HEAD.
**Acceptance:**
- The command compares `git rev-parse HEAD` to the PR's `headRefOid`. On mismatch it **warns** ("your local
  HEAD is ahead of / differs from the PR head — push first, or pass `--force`") and **requires `--force`**
  (or an explicit `<PR#>`) to proceed.
- Matching SHAs proceed silently.
- Detached HEAD / no upstream / dirty-but-unpushed states all produce a clear message, never a silent wrong review.
**Risk:** low

### Story 3.3 — Share the resolver with `cross-panel.mjs`
**As a** maintainer, **I want** one resolver, not two, **so that** the planning panel gets the same
branch-safety for free (reuse, don't fork — per LEARNINGS).
**Acceptance:**
- The branch-resolve + HEAD-check helpers live once in `scripts/lib/cross-agent-cli.mjs`; both
  `cross-review.mjs` and `cross-panel.mjs` call them (where `cross-panel` operates on a branch/PR).
- No duplicated logic; the `node:test` covers the shared helper.
**Risk:** low

## Sprint QA
- **deterministic gate:** a pure `node:test` on the resolver + SHA-compare seam — mock `gh pr view` and
  `git rev-parse`: asserts (a) no PR# → resolves from branch, (b) no open PR → clear error, (c) HEAD≠head
  SHA → warns/requires `--force`, (d) HEAD==head SHA → proceeds. No network.
- **api spec(s):** none — not app code.
- **browser smoke owed:** no.
- **dependency check:** `gh` authed and the working dir resolves to the intended repo (open question 4);
  `--repo` remains the override when run outside the repo root.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: local dev machine + GitHub. Check out a branch that **has an open PR**.

1. On that branch, run `node scripts/cross-review.mjs --agent codex --dry-run` (no PR number).
   → It resolves the branch's PR and prints findings for the right diff.
2. Check out a branch with **no** open PR, run the same command.
   → It exits with "no open PR for branch `<name>` …" — clear, no stack trace.
3. On the PR branch, make a local commit but **don't push**, run the command.
   → It warns that local HEAD is ahead of the PR head and asks you to push or pass `--force`.
4. Push the commit (so HEAD matches the PR head), rerun.
   → It proceeds silently and reviews the up-to-date diff.
5. Run `node scripts/cross-panel.mjs` on a branch (its normal usage).
   → It uses the same branch-resolution/guard behavior (no wrong/stale plan review).

If any step fails, note the step number + what you saw — that's the bug report.
