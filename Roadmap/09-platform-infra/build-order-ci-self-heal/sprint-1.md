# Build-order CI self-heal — Sprint 1: Guard heals instead of failing

**Status:** ✅ shipped — PR #93 (`29796c2`), 2026-07-17; both heal paths observed live on the PR itself

> **Re-groomed at build time (2026-07-17):** this sprint was groomed against the standalone
> `build-order-guard.yml`, which no longer exists — the 2026-07-16 local-first consolidation
> (`github-actions-local-first`) merged it into `.github/workflows/guards.yml` (PR-only) and made
> `.githooks/pre-commit` the direct-to-`main` layer. The story's *intent* (heal the derived board,
> don't punish the next passer-by) is unchanged; the fix now lands in those two files, and the
> original "hard-fail on `main` pushes" acceptance is obsolete — there is no `push` trigger anymore,
> and the pre-commit hook now heals-and-stages *before* the commit even lands, which is strictly
> stronger than failing after.

## Stories

### Story 1.1 — Self-heal the derived board at both layers
**As** Daniel, **I want** a stale `BUILD-ORDER.md` to be regenerated automatically (staged into the
commit locally; bot-committed onto the PR branch in CI), **so that** forgotten regens stop redding
unrelated PRs.
**Acceptance:**
- `.githooks/pre-commit`: a commit touching `Roadmap/` with a stale board regenerates + stages
  `Roadmap/00-ideas/BUILD-ORDER.md` into that same commit (path-scoped `git add`), warns, and
  proceeds. Only a regen *error* still blocks.
- `guards.yml` (PR fallback, e.g. `--no-verify` / hookless clone): a PR with a stale board goes
  green with a bot commit refreshing only `BUILD-ORDER.md` on the PR branch (`contents: write`,
  PR-head checkout). Fork PRs can't receive a push → loud red with the fix command instead.
- No other file is ever touched by either heal path.
**Risk:** low

## Sprint QA
- **api spec(s):** n/a (workflow YAML + shell hook; QA is the live rehearsal below)
- **browser smoke owed:** no
- **deterministic gate:** actionlint on guards.yml; live rehearsal of both heal paths

## Sprint 1 — Smoke walkthrough (do these in order)
Env: root repo, local + GitHub

1. Local layer: flip any epic README `status:` and `git commit` WITHOUT running the regenerator.
   → pre-commit prints "regenerated and staged into this commit" and the commit lands with a fresh
   `BUILD-ORDER.md` included. (`git show --stat HEAD` includes `Roadmap/00-ideas/BUILD-ORDER.md`.)
2. CI layer: open a throwaway PR whose head commit carries a stale board (commit with
   `--no-verify` to simulate a hookless clone).
   → guards run goes green and a bot commit "chore(build-order): self-heal — regenerate derived
   board" appears on the PR branch touching only `BUILD-ORDER.md`.
3. Close/revert the throwaway PR. → Board back to normal.

If any step fails, note the step number + what you saw — that's the bug report.
