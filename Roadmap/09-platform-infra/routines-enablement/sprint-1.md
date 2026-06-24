# Sprint 1 — Routines enablement (prompts + runbook)

**Epic:** [Claude Routines enablement](README.md) · **Risk:** all LOW · **Repo:** monorepo-root (`scripts/routines/`)
**Goal:** the three approved routines (A review-on-PR, C roadmap hygiene, B smoke triage) exist as committed,
reviewable prompt artifacts + a stand-up runbook, ready for Daniel to create in his claude.ai account.

> Docs/artifacts only — no executable repo code, no infra, no account changes. The build is *authoring*; the
> stand-up is owed to Daniel against the runbook.

## Stories

### R-A — Review-on-PR prompt + runbook section · LOW
**As** Daniel, **I want** a committed, self-contained prompt for the PR-review routine, **so that** the
cross-agent second opinion runs on every PR in the cloud (the descoped goal) and the prompt is version-controlled.
- **In:** `scripts/routines/pr-review.prompt.md` — mirrors `scripts/cross-review.prompt.md` (five AGENTS rules,
  single-pass, **advisory-only banner**), framed for a cloud Claude session reacting to a PR. **Comment-only;
  no push; never a required check.** Runbook section: install the Claude GitHub App on
  `miyagisanchezcommerce` + `medusa-bonsai-backend`; trigger `pull_request` opened + ready_for_review, filter
  draft=false.
- **Out:** wiring any commit-status/required-check; codex/agy (this is the Claude-family reviewer); root-repo
  PR review unless Daniel opts in.
- **Acceptance (Daniel can run):** stand up Routine A from the prompt, open a non-draft test PR → one advisory
  review comment appears (as Daniel), carrying the advisory-only banner; the PR's required checks are unaffected.

### R-C — Roadmap-hygiene prompt (docs-PR, no connector) + runbook section · LOW
**As** Daniel, **I want** a weekly routine that grooms the roadmap and opens a docs PR, **so that** funnel
drift and stale status get caught without manual sweeps — leaning on the existing Notion sync, not a new connector.
- **In:** `scripts/routines/roadmap-hygiene.prompt.md` — groom the `00-ideas` funnel, flag status-drift
  (README frontmatter vs sprint/retro derivation), run `node scripts/build-order.mjs`, open a `claude/` **docs
  PR** with the regenerated `BUILD-ORDER.md` + a drift report. **No Notion connector** — `notion-sync.yml`
  propagates after merge. Runbook section: weekly schedule (e.g. Mon 14:00 UTC, after the 08:00 nightly sync),
  root repo `miyagi-product-management`.
- **Out:** direct Notion read/write (no `.mcp.json`, no `NOTION_TOKEN`); auto-merging the docs PR.
- **Acceptance (Daniel can run):** stand up Routine C, *Run now* → a `claude/` PR appears with an updated
  `BUILD-ORDER.md` + a short drift report; merging it lets `notion-sync.yml` propagate as usual.

### R-B — Smoke-triage prompt + runbook section · LOW
**As** Daniel, **I want** a nightly routine that triages a failed browser smoke into a draft fix PR, **so that**
a red nightly arrives with a proposed fix instead of just an artifact.
- **In:** `scripts/routines/smoke-triage.prompt.md` — read the latest `browser-smoke.yml` run / its
  `playwright-browser-report` artifact; if failed, name the spec + assertion, propose a spec realign or prod
  fix, open a `claude/` **draft** PR; if green, no-op. **Augments** the deterministic smoke (which stays the
  detector). Runbook section: nightly ~10:00 UTC (after the `0 9` smoke), frontend repo; env `MS_TEST_*`
  secrets + Allowed-domains: `miyagisanchez.com`, Clerk auth domains, the backend Cloud Run URL.
- **Out:** replacing `browser-smoke.yml`; auto-merging; running before the smoke completes.
- **Acceptance (Daniel can run):** with the smoke red, Routine B's nightly run opens a `claude/` draft PR
  naming the failing spec + a proposed fix; with the smoke green, no PR is opened.

### R-0 — `scripts/routines/README.md` runbook · LOW
**As** Daniel, **I want** one runbook for standing up + operating the routines, **so that** the account setup is
reproducible and the guardrails are written down.
- **In:** per-routine stand-up steps (GitHub-App install targets, trigger config, env/allow-list), the **Pro
  5/day cap budget** (A bursty + self-limits; C ~weekly; B nightly → ≤5 on a typical day), the
  **advisory-only / never-a-required-check** rule, and **D recorded as explicitly out** (both deploys already
  ping Telegram; `/fire` likely counts to the cap).
- **Acceptance:** the runbook alone is enough to stand up all three without re-reading the spike.

## Sprint QA
- Docs/prompt artifacts — no app/money/auth/DB surface, so no Playwright spec. The "gate" is a structural check
  that each `*.prompt.md` parses in the house format (HTML-comment header + `---` body) the existing
  `loadPromptBody()` expects — if any tooling is added, a `node:test` asserting `loadPromptBody()` returns a
  non-empty body for each new prompt is free coverage. Otherwise review-by-reading.
- Keep existing repo gates green (`scripts-guard.yml`, `build-order --check`).
- The live stand-up (account changes, GitHub-App install, a real test-PR comment) is **owed to Daniel**.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: Daniel's `claude.ai/code/routines` account + the two app repos. (Artifacts live in the root repo on the
merged branch.)

1. Open `scripts/routines/README.md` on the merged branch and follow the **Routine A** stand-up steps: install
   the Claude GitHub App on `miyagisanchezcommerce`, create Routine A from `pr-review.prompt.md` with the
   GitHub trigger (pull_request opened + ready_for_review, draft=false).
   → The routine appears at `claude.ai/code/routines`.
2. Open a small non-draft test PR in `miyagisanchezcommerce`.
   → Within a few minutes one **advisory review comment** appears (authored as you), carrying the
     "advisory only — not a gate" banner. The PR's required checks are unaffected and it stays mergeable.
3. Stand up **Routine C** from `roadmap-hygiene.prompt.md` (weekly schedule, root repo) and click **Run now**.
   → A `claude/` docs PR appears with a regenerated `BUILD-ORDER.md` + a short drift report.
4. Stand up **Routine B** from `smoke-triage.prompt.md` (nightly, frontend repo, `MS_TEST_*` + allow-list set).
   While the browser smoke is red, click **Run now**.
   → A `claude/` **draft** PR appears naming the failing spec + a proposed fix. (Green smoke → no PR.)
5. Check `claude.ai/settings/usage` / the routines page.
   → Remaining daily routine runs reflect the runs above; the A+C+B mix stays within the Pro 5/day budget.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] **R-A** — built. `scripts/routines/pr-review.prompt.md` (mirrors `cross-review.prompt.md` — five
      AGENTS rules, single pass, advisory banner; cloud Claude reviewer, **comment-only, never a check**).
- [x] **R-C** — built. `scripts/routines/roadmap-hygiene.prompt.md` (groom funnel, flag status-drift,
      run `build-order.mjs`, open a `claude/` **docs PR** + drift report; **no Notion connector**).
- [x] **R-B** — built. `scripts/routines/smoke-triage.prompt.md` (read failing `browser-smoke.yml`
      run/artifact → `claude/` **draft** fix PR; green = no-op; augments the smoke).
- [x] **R-0 (runbook)** — built. `scripts/routines/README.md` (per-routine stand-up, Pro 5/day cap
      budget, advisory-only/never-a-required-check rule, **D recorded out**). Free format guard:
      `scripts/routines.test.mjs` (parses each prompt + asserts the advisory banner).

> Refs: PR _(fill on open)_ · commit _(fill on commit)_. The live routine stand-up (account + GitHub
> App + a real test-PR comment) is **owed to Daniel** — see the Smoke walkthrough above.
