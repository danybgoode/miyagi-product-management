# Dev-tooling reliability — Sprint 3: Wrong-branch tax (auto-resolve PR + HEAD assertion)

**Status:** 🏗 In progress — built on `chore/dev-tooling-reliability`, awaiting PR + merge.
- ✅ S3.1 PR# optional, resolved from current branch (`resolveCurrentPr` in `scripts/lib/cross-agent-cli.mjs`).
- ✅ S3.2 Stale/wrong-branch guard (`decideHeadGuard` + HEAD vs `headRefOid`; warn + require `--force`).
- ✅ S3.3 Resolver shared in `cross-agent-cli.mjs` (which `cross-panel.mjs` already imports); no fork.
- ✅ QA: `node --test 'scripts/lib/*.test.mjs'` green (17 tests; resolve + SHA-compare seam mocks gh + git).

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

## PR draft

> **Title:** `chore(dev-tooling): cross-review — auto-resolve PR from branch + stale-HEAD guard (S3)`
> **Risk tier:** LOW (dev tooling only — repo scripts + docs; no app code, commerce, auth, DB, or money).
> Reviewer may auto-merge on green CI per the risk-tier rule.

**What & why.** `cross-review.mjs` took an explicit `<PR#>` and never tied it to the current branch or
checked the head SHA, so the **first** run regularly reviewed the wrong or a stale diff and got rerun. This
makes the first run hit the right diff:
- **S3.1** — `<PR#>` is now optional; with none, the command resolves the open PR for the current branch via
  `gh pr view --json number,state,headRefName,headRefOid`. Explicit `<PR#>` and `--repo` still override. No
  open PR (incl. a reused branch name whose PR already **merged** — `state !== 'OPEN'`) → a clear message,
  no stack trace.
- **S3.2** — compares `git rev-parse HEAD` to the PR's `headRefOid`; on mismatch it **warns + requires
  `--force`**. Matching SHAs proceed silently; detached HEAD → a clear message. An explicit `<PR#>` bypasses
  the guard (escape hatch).
- **S3.3** — `resolveCurrentPr` + `decideHeadGuard` + `currentHeadSha` live in the shared rail
  `scripts/lib/cross-agent-cli.mjs` (which `cross-panel.mjs` already imports) — no fork.

**Files:** `scripts/lib/cross-agent-cli.mjs` (resolver + pure guard) · `scripts/cross-review.mjs` (optional
PR# + `--force` + guard wiring) · `scripts/lib/cross-agent-cli.test.mjs` (resolve + SHA-compare seam, mocks
gh + git) · `scripts/README.md` + this sprint doc.

**QA.** `node --test 'scripts/lib/*.test.mjs'` — 17 tests green (no network; gh + git mocked). Live dry-run
walkthrough below. The deterministic gate for this CLI **is** the node:test (no Playwright — not app code).

**Smoke split:** all steps are agent-runnable locally (dry-run, no real money/auth path) — nothing owed to
Daniel beyond an optional eyeball.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: local dev machine + GitHub. Real production scripts (no preview — dev tooling, not app code).

1. **Deterministic gate.** Run `node --test 'scripts/lib/*.test.mjs'`.
   → 17 tests pass (the resolve + SHA-compare seam mocks gh + git; no network).
2. **No PR# resolves the current branch.** Check out a branch that **has an open PR** and run
   `node scripts/cross-review.mjs --agent codex --dry-run` (no PR number).
   → It prints `Resolved PR #<n> from branch \`<name>\`` and the findings are for the right diff.
3. **No open PR → clear message.** Check out a branch with **no open PR** (e.g. a reused branch name whose
   PR already **merged**) and run the same command.
   → It exits with `no open PR for branch \`<name>\` …` (a merged PR reads `(found #<n>, state MERGED)`) —
     clear, no stack trace.
4. **Stale HEAD is refused.** On the PR branch, make a local commit but **don't push**, run the command.
   → It stops with `local HEAD … differs from PR #<n> head … — push first, or pass --force`; nothing posted.
5. **`--force` overrides; a pushed HEAD proceeds silently.** Re-run step 4 with `--force` (it warns and
   proceeds); then push the commit so HEAD matches the PR head and re-run with no `--force`.
   → `--force` reviews despite the mismatch; once pushed, it proceeds silently on the up-to-date diff.
6. **Explicit `<PR#>` is the escape hatch.** Run `node scripts/cross-review.mjs <PR#> --dry-run`.
   → It skips resolution **and** the stale guard and reviews exactly that PR.
7. **`cross-panel.mjs` shares the rail (no fork).** It reviews a *scope-doc file*, not a PR/branch, so it has
   no PR to resolve — the no-fork proof is that the resolver/guard live once in the shared
   `scripts/lib/cross-agent-cli.mjs` (the module `cross-panel.mjs` already imports) and are covered by the
   one `node:test`. Confirm `node scripts/cross-panel.mjs <a-scope-doc> --dry-run` still works unchanged.

If any step fails, note the step number + what you saw — that's the bug report.
