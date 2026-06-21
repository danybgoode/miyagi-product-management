# Retrospective — Dev-tooling reliability

**Closed:** 2026-06-21 · **Class:** chore / dev-tooling · **Risk:** LOW (all sprints) · **Repos:** backend
(S1) + monorepo-root (S2–S3).

## What shipped

Three independent frictions in the ship loop, each fixed as a script/config (not agent prose):

- **S1 — backend pre-merge CI.** A `ci.yml` on the backend repo (`tsc --noEmit` + `medusa build` +
  `npm run test:unit`), modelled on the frontend's `typecheck-build` job. Wired as a **required status
  check** on `main` (branch protection, Daniel's op step). Backend PR #29 `21b1e16`.
- **S2 — Codex endurance.** `cross-review.mjs` no longer hard-fails on a lapsed Codex token: it detects the
  **auth signal only** and falls back once to Antigravity for that run, clearly labeled, with a `codex login`
  restore hint. Pure `decideCodexFallback` + `isCodexAuthError` under a `node:test`. Root PR #16 `cbed936`.
- **S3 — wrong-branch tax.** `<PR#>` is optional → resolved from the current branch via
  `gh pr view --json number,state,headRefName,headRefOid`; a stale local HEAD (≠ the PR head SHA) is refused
  unless `--force`; an explicit `<PR#>` bypasses both (escape hatch). Resolver + pure `decideHeadGuard` live
  in the shared rail `cross-agent-cli.mjs`. Root PR #17 `2534aeb`.

## What went well

- **The shared-rail pattern paid off three times.** `scripts/lib/cross-agent-cli.mjs` already held the
  family-agnostic plumbing (from the cross-panel epic); S2 added the fallback and S3 the resolver/guard
  there, so `cross-panel.mjs` inherited both with zero fork. Each new pure decision function
  (`decideCodexFallback`, `decideHeadGuard`) slotted into the existing injectable-deps + `node:test` shape —
  the `node:test` IS the deterministic gate for CLI tooling (no Playwright).
- **Dogfooding caught a real bug.** Running the S3 cross-review on its own PR (#17) with no PR# exercised the
  new resolver live — and the advisory codex pass flagged an over-broad `isNoPrError` that could mask a
  repo/auth misconfig as "no open PR". Fixed before merge.
- **Both fallback families earned their keep as reviewers.** codex (S3 review) found a should-fix + a nit;
  antigravity (judgment pass) confirmed no blocking and found one cosmetic nit. Single-pass, advisory, cheap.

## What we learned (promoted to LEARNINGS)

- **`gh pr view` resolves MERGED/CLOSED PRs too** — for a "resolve the PR from the current branch" tool,
  query `state` and treat `!= 'OPEN'` as "no open PR." A reused branch name (this epic's S3 branch was reused
  from the merged S2 PR #16) otherwise silently resolves a stale merged diff.
- **Keep a "no-result" stderr matcher tight to the tool's actual message.** A broad `isNoPrError`
  (`could not find` / `no default branch` / `no git remotes found`) masks genuine repo/auth/`--repo` failures
  as "no open PR" and sends the operator chasing the wrong fix. Tighten to `no … pull requests found`; let
  everything else fall through to the generic error.
- **`node --test <dir>` (bare directory) was dropped in Node 24** — use a glob (`'scripts/lib/*.test.mjs'`).

## Gaps / owed

- **S1 destructive red-path smoke** (deliberately-failing backend PR, steps 2–4) is owed to Daniel on a
  throwaway branch if he wants the red gate exercised live — the green path is proven (PR #29 first run).
- Nothing owed on S2/S3 — all smoke is agent-runnable (dry-run, no money/auth path).
