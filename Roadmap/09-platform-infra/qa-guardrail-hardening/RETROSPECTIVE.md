# Retrospective — QA guardrail hardening

_Closed: 2026-07-26_

## What shipped

**S1 — lint actually runs, in both repos.** Frontend: `scripts/lint-changed.mjs` + a CI job
(`0c9b88b`, `919cdfa`). Backend: its first ESLint config of any kind, plus a CI job (`77ec16f`).
Both gates proven to bite with planted violations.

**S2 — the false gates deleted, coverage measured** (`9e30fd5`). `test:integration:http` and
`test:integration:modules` removed; first coverage numbers recorded.

**S3 — the owed ledger, generated** (`360597a`). `scripts/owed-ledger.mjs` + committed artifact:
**75 checks owed across 70 spec files** — 16 money-path, 14 auth-path, 4 admin-only, 41 other.

**S4 — a security lens on the mandatory rail** (`94e5cff`). `cross-review.mjs --lens security`, plus
the reviewer model now recorded in every comment.

## What went well

**The audit's cheapest recommendation was its most wrong, and checking beat trusting.** "Wire
`npm run lint` into CI — one line" is false: a clean checkout reports **238 problems, 124 errors, none
auto-fixable**. Fifty-two are React Hooks *correctness* rules on live commerce surfaces. Clearing them
is a behaviour-changing refactor, not a config sprint.

**The incremental gate is this repo's own pattern, not a compromise.** `doc-format.mjs` already
hard-gates only the paths actually swept and leaves the rest advisory. `lint-changed.mjs` does the
same: any file you touch must be clean, tree-wide debt stays visible, and the enforced set grows as the
tree gets swept rather than by decree.

**The backend's first lint run found something real on day one.** `require-atomic-updates` flagged six
genuine read-then-write cache patterns across three files — the same shape as *a read is not a claim*.

## What we learned

**Downgrading rules to make a full-tree gate green is worse than no gate**: it looks enforcing while
enforcing nothing, and it blesses the debt permanently. The choice is an honest incremental gate or an
honest absence — never a green lie.

**A number nobody can regenerate is a number nobody should cite.** The audit counted 80 markers across
75 files on 2026-07-24; two days later it was 76/71. Neither was wrong when written. That drift *is*
the argument for generating it.

**A test caught the categoriser mis-filing its own output.** Substring matching filed a pin-*ordering*
check as money-path, because "order" is inside "ordering" — and money-path is the bucket a human is
told to run first, so a false entry there is the most misleading kind.

## Gaps / follow-ups

- **The six `require-atomic-updates` sites are tracked, not fixed** — listed in the backend config.
  Almost certainly benign (stable cached ids), but each fix changes caching on live commerce paths.
- **A real integration tier does not exist.** Removing the false scripts made the absence visible; it
  did not fill it. Needs Postgres + Redis in CI.
- **Coverage has no threshold, deliberately.** First numbers: **50.93% statements, 44.39% branches,
  52.17% functions** (backend). Pick a threshold from data, later.
- **The security lens is not SAST.** LLM-advisory, single-pass, local-only, not a required check. It
  narrows the ladder's "automatic security review" gap; it does not close it. The posted comment says so.
- **Frontend coverage was not wired** — the backend number exists, the Playwright V8 side does not.
- Cross-agent review + fresh `pr-reviewer` owed on all four sprints.
