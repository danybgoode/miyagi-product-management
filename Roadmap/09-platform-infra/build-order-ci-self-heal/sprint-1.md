# Build-order CI self-heal — Sprint 1: Guard heals instead of failing

**Status:** ⬜ not started

## Stories

### Story 1.1 — Guard self-heals stale board on PRs, hard-fails on `main` pushes
**As** Daniel, **I want** `build-order-guard.yml` to regenerate and commit a stale `BUILD-ORDER.md`
back to the PR branch instead of failing, **so that** forgotten regens stop redding unrelated PRs.
**Acceptance:**
- A PR flipping an epic README `status:` without regen goes green, with a bot commit refreshing only
  `Roadmap/00-ideas/BUILD-ORDER.md` on the same branch (path-scoped add, `contents: write`).
- A stale board pushed directly to `main` still fails the guard.
- No other file is ever touched by the auto-commit.
**Risk:** low

## Sprint QA
- **api spec(s):** n/a (workflow YAML; the QA is the live rehearsal below)
- **browser smoke owed:** no
- **deterministic gate:** the rehearsal PR itself — self-heal observed once (green + bot commit), and
  the mutation check: stale board on `main` observed red once

## Sprint 1 — Smoke walkthrough (do these in order)
Env: GitHub — root repo

1. Open a throwaway PR that edits any epic README `status:` field without running the regenerator.
   → CI goes green and a bot commit "chore(build-order): self-heal regenerated board" appears on the PR branch touching only BUILD-ORDER.md.
2. Revert the throwaway change, close the PR.
   → Board back to normal.
3. (mutation check, agent-run) Push a deliberately stale board to a `claude/`-prefixed test ref simulating `main` rules, or verify the `push: main` job path in the workflow still ends in `exit 1` on `--check` failure.
   → Hard fail confirmed on the main path.

If any step fails, note the step number + what you saw — that's the bug report.
