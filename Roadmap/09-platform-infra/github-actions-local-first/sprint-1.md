# GitHub Actions local-first — Sprint 1: stop the bleed + wire local hooks

**Status:** ✅ shipped — 2026-07-16.

## Stories

### Story 1.1 — Remove notion-sync's push trigger, wire local pre-commit/pre-push hooks
**As** Daniel, **I want** the repo's CI to stop burning GitHub Actions minutes on every push,
**so that** the account doesn't hit its monthly quota before reset.
**Acceptance:**
- `notion-sync.yml` no longer triggers on `push` — only nightly cron + `workflow_dispatch`.
- `.githooks/pre-commit` blocks on stale `BUILD-ORDER.md`, `doc-format` drift, or a failing
  `scripts/`/`infra/` node:test suite — each gated to only run when the commit touches that area.
- `.githooks/pre-push` runs `node scripts/roadmap-to-notion.mjs --sync` locally when `Roadmap/**`
  changed and `NOTION_TOKEN` is set; advisory only, never blocks the push.
- `package.json`'s `prepare` script sets `core.hooksPath` automatically on install.
**Risk:** Low
**Status:** ✅ shipped

## Sprint QA
- **api spec(s):** N/A.
- **browser smoke owed:** no.
- **deterministic gate:** hand-ran both hooks locally against real staged/pushed changes; confirmed
  `git config core.hooksPath` resolves to `.githooks`.

## Sprint 1 — Smoke walkthrough (do these in order)
1. `git config core.hooksPath` → `.githooks`.
2. Stage a change touching `Roadmap/**`, run `.githooks/pre-commit` directly (or `git commit`).
   → `build-order --check` and `doc-format --check` both run; a clean tree exits 0 silently.
3. Push a commit touching `Roadmap/**` with `NOTION_TOKEN` unset.
   → `pre-push` prints a skip message, push proceeds normally (never blocks).
4. Confirm `notion-sync.yml` on GitHub no longer has a `push` trigger (`gh workflow view
   notion-sync.yml` or read the file). Historical result: only `schedule` + `workflow_dispatch`
   remained while the repo was private. After the repo became public, a path-gated `main` push
   trigger was safely restored to guarantee post-merge freshness.

**Post-epic correction (2026-07-19):** retire `.githooks/pre-push`. A root PR pushed from a linked
worktree proved the local replacement was not reliable enough to own board freshness, and running
it beside the restored public-repo workflow would duplicate full-board PATCHes. The original
private-minute mitigation remains valid historically; the repository visibility change removed
the billing constraint that justified the local network write.

If any step fails, note the step number + what you saw — that's the bug report.
