# Retrospective — Claude Routines enablement

**Shipped:** 2026-06-24 · **1 sprint, all LOW** · monorepo-root (`scripts/routines/`).
**Class:** chore / dev-tooling + process (engineering-facing; zero buyer/seller/agent surface).

## What shipped
The buildable surface the `spike-claude-routines` decision surfaced: **three self-contained routine
prompts + a stand-up runbook**, version-controlled so the routines are reproducible and reviewable
instead of living only in account UI. The account stand-up itself is Daniel's (routines run in his
claude.ai account) — this epic delivered the *artifacts + runbook*, and Daniel stood the routines up
against them.

- **S1 (PR #39 `c192df3`)** — `scripts/routines/{pr-review,roadmap-hygiene,smoke-triage}.prompt.md` in
  the house format (HTML-comment header + `---` body, like `cross-review.prompt.md`) + `README.md`
  runbook + a free `scripts/routines.test.mjs` format guard (caught by `scripts-guard.yml`):
  - **A (review-on-PR)** mirrors the five-AGENTS-rule single-pass advisory rubric, run by Claude-in-cloud
    on a GitHub `pull_request` trigger, **comment-only, never a required check**.
  - **C (roadmap hygiene)** weekly: groom the `00-ideas` funnel, flag status-drift, run `build-order.mjs`,
    open a `claude/` **docs PR** + drift report — **no Notion connector** (`notion-sync.yml` propagates).
  - **B (smoke triage)** nightly after `browser-smoke.yml`: read the failing run → `claude/` **draft** fix
    PR; green = no-op. **Augments, never replaces** the deterministic smoke.
  - **D recorded out** (both deploys already ping Telegram with terminal status).
- **Stand-up + live smoke** — Daniel installed the GitHub App + created all three. **Routine A confirmed
  live** (advisory comments with the banner on PRs #31 BE + #121 FE). C's **first run earned its keep**:
  it flagged real drift, applied as **PR #41** (4 stale seed statuses → `shipped`) and **PR #42**
  (tier-2 `deriveEpicStatus` Archived false-drift fix + tier-3 `00-ideas/README` accuracy). The C run's
  own report merged as **PR #40** (historical record).
- **Doc corrections (PR #43)** — grounded in the official routines docs after live setup exposed two
  scope errors: the trigger model and the cap budget (below), plus an optional Telegram ping-on-failure.

## What went well
- **Reuse over rebuild.** A's prompt mirrors the existing `cross-review.prompt.md` rubric; C calls the
  existing `build-order.mjs` and leans on `notion-sync.yml`; B reads the existing `browser-smoke.yml`
  artifact. No new executable infra — just prompts + a runbook over proven seams.
- **The free format guard paid off immediately.** `scripts/routines.test.mjs` (parse via `loadPromptBody`
  + assert the advisory banner) locked the house-format invariant for $0, caught by the existing guard
  glob with no workflow change.
- **The routine validated itself.** C found genuine drift on run #1 (stale seeds + a permanent false-drift
  flag the board had been carrying) — exactly the judgment layer the deterministic `notion-sync.yml`
  can't provide. The tier-1/2/3 split (apply-now vs tooling-fix vs Daniel-decision) kept the response
  proportionate.
- **Advisory-only held structurally.** A posts comments (no commit-status), so it *cannot* become a
  required check — the standing convention is enforced by the medium, not just policy.

## What we learned (promoted to LEARNINGS.md)
- **A cloud Routine runs as you, which sidesteps the CI foreign-CLI auth blocker** that forced
  `cross-agent-review-always` local-only — restoring auto-review-on-every-PR (as the Claude family, not
  codex/agy). The standing advisory-only / never-a-required-check discipline carries over unchanged.
- **A GitHub trigger is ONE specific action OR all-actions-in-category — you cannot combine `opened` +
  `ready_for_review`.** `opened` does not fire on a draft→ready flip; pick the action that matches how
  PRs actually land (here `opened` + draft=false, incl. Dependabot). This was a real scope bug: A was set
  to `ready_for_review`, so directly-opened PRs never auto-fired.
- **The Pro daily routine cap (5/day) bites SCHEDULED runs only** — GitHub-event and API triggers have
  separate hourly caps and don't consume it; one-off `Run now` runs don't count. So a GitHub-triggered
  review routine is effectively uncapped for solo volume — verify the cap model before budgeting/scoping.
- **Routines have no built-in failure alert** ("green" = the session exited cleanly, *not* that the task
  succeeded). Route the *actionable* output to a channel you already watch (GitHub PR comments/PRs, or a
  connector/`curl` ping) so healthy runs aren't silent and failed runs are visible without daily app-checks.

## Gaps / residual (owed to Daniel — operational)
- **Flip both A routines `ready_for_review → opened`** so directly-opened non-draft PRs auto-trigger
  (currently verified via *Run now* only).
- **Routine B's red-smoke → draft-PR path** is unverified end-to-end (the smoke was green at stand-up);
  it'll exercise on the next genuinely-red night.
- **Optional Telegram-on-failure** is in the prompts but **off** until Daniel adds `TELEGRAM_BOT_TOKEN` +
  `TELEGRAM_CHAT_ID` to the routine env and allow-lists `api.telegram.org`.
- **Research preview** — limits/API may change; the deterministic layers (`browser-smoke.yml`,
  `notion-sync.yml`, CI) remain the SSOT, so a routine breaking is never load-bearing.
