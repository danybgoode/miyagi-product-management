---
title: "Build-order CI self-heal — guard regenerates the board instead of failing"
slug: build-order-ci-self-heal
status: scaffolded
area: "09"
type: chore
priority: "#1"
risk: low
epic: "09-platform-infra/build-order-ci-self-heal"
build_order: "#1"
updated: 2026-07-14
---

# Scope — Build-order CI self-heal

**Groomed in:** `Roadmap/00-ideas/audits/batch-groom-2026-07-14.md` (Ask 2a). Approved 2026-07-14.

**As** Daniel, **I want** the `build-order-guard` workflow to heal a stale `BUILD-ORDER.md` instead of
failing CI, **so that** an epic-close session that forgets to regen the board no longer reds the next
unrelated PR (currently happens almost every time).

**Stage-2.5 bucket:** light enhancement — every piece exists (`build-order.mjs --check`,
`build-order-sync.mjs`, `build-order-guard.yml`, the opt-in `.githooks` path); this only rewires CI.

**The one story:**
Extend `.github/workflows/build-order-guard.yml`: on a PR, when `node scripts/build-order.mjs --check`
fails, run the regenerator and **commit the refreshed board back to the PR branch** (path-scoped to
`Roadmap/00-ideas/BUILD-ORDER.md`, `contents: write`), then pass. Keep the hard fail on pushes to
`main` (belt-and-braces). Reuse `build-order.mjs` unchanged.

**Acceptance:**
- A PR that flips an epic README `status:` without regenerating the board goes green, with a bot commit
  refreshing `BUILD-ORDER.md` on the same branch.
- A stale board pushed directly to `main` still fails the guard.
- No other file is ever touched by the auto-commit (path-scoped add).

**Out of scope:** default-enabling the git hook (can't be forced across clones); changes to
`build-order-sync.mjs` (still useful for drift that lands outside PRs).

**Risk:** low (docs/tooling; no app code). **QA:** deliberately open a PR with a stale board and watch
it self-heal; then the mutation check — a stale board on `main` must still red.
