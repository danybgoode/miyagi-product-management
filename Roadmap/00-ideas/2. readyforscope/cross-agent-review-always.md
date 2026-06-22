# Cross-agent review on every PR — CI auto-run + policy

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **09 · Platform & Infra**. Slug: `cross-agent-review-always`.
Class: **Chore / dev-tooling + process** (engineering-facing; no buyer/seller/agent surface).

This is the **first half of ask #1**, split out at grooming (2026-06-22) so it can ship fast on its own.
The second half — Claude orchestrating codex/agy as build-time *executors* — is a separate spike
(`spike-cross-agent-orchestration.md`). Keep them apart: this one is a near-done light enhancement; that
one needs investigation first.

## Mirror-back
> You want the cross-agent second opinion to run on **every** PR — not just HIGH-risk — and you want it to
> happen **automatically** (a CI job posts the advisory comment) **and** be written into the policy so the
> expectation is explicit. It stays **advisory and never gates** (your standing convention). Right?

## Daniel's grooming calls (2026-06-22)
- **Split** review-always (this doc) from build-time orchestration (the spike).
- **Mechanism = both** — CI auto-runs `cross-review.mjs` on every PR **and** the docs/kickoffs document it.
- Advisory only, **never a gate** (preserved — your LEARNINGS peg the iterative review loop as the #1 token
  sink; CI + the Claude reviewer + the risk-tier rule stay the sole authorities).

## Stage-2.5 bucket — **light enhancement + one small new CI job**
| Slice | Bucket | Why |
|---|---|---|
| Policy change ("always", not "suggested on HIGH") | **Light / copy** | The behavior already exists; only the *default expectation* changes (WAYS, PR template, kickoffs). |
| CI auto-run on every PR | **Genuinely new (but small)** | `cross-review.mjs` exists and runs on any PR, but **only when a human invokes it locally**. No workflow runs it automatically. This adds one non-blocking GitHub Actions job per repo. |

The tool is done. What's missing is (a) the policy saying *always*, and (b) automation so "always" is real
without manual discipline.

## What already exists (reuse, don't rebuild) — verified against the repo 2026-06-22
| Capability | Where | Reuse for |
|---|---|---|
| The cross-agent review command itself — runs on **any** PR, `--agent codex\|antigravity`, posts a labeled "advisory only, not a gate" comment | `scripts/cross-review.mjs` | The CI job just *invokes* this; no new review logic |
| Codex→Antigravity auto-fallback, PR-resolve-from-branch, stale-HEAD guard, agy size-cap/version-pin | `scripts/lib/cross-agent-cli.mjs` | Inherited free; the CI job passes an explicit `<PR#>` + `--repo` so branch-resolve isn't even needed |
| Single shared reviewer rubric (five AGENTS rules + single-pass discipline) | `scripts/cross-review.prompt.md` | Unchanged — the CI run reads the same prompt the human does |
| Non-blocking CI job pattern (`continue-on-error`, runs but never gates) | `apps/miyagisanchez/.github/workflows/ci.yml` → "Browser smokes vs preview (non-blocking)" | **The template** for a never-gating advisory job |
| "Skip cleanly when an optional secret is absent, never hard-fail" idiom | `apps/*/.github/workflows/notify-telegram.yml` | If the codex/agy credential is missing, the job no-ops instead of failing the PR |
| `gh` in Actions via `GITHUB_TOKEN` + `pull-requests: write` | GitHub-hosted runners (gh preinstalled) | `gh pr diff` / `gh pr comment` need only a scoped token, no PAT |
| PR template's "Cross-agent review (optional)" section | `.github/PULL_REQUEST_TEMPLATE.md` | Reword to "runs automatically; advisory" |
| WAYS §Review & merge "suggested on HIGH-risk, optional on any, advisory only"; `SESSION-KICKOFFS.md` #4 line | `Roadmap/WAYS-OF-WORKING.md`, `Roadmap/SESSION-KICKOFFS.md` | The exact copy to change to "every PR" |

## Medusa-first reframe (AGENTS five-rule check)
**N/A — zero commerce surface.** Rules 1–3 (Medusa / Supabase / UCP-MCP) untouched. Rule 4 (Clerk)
untouched. Rule 5 (bilingual) N/A — strings are developer-facing (CI logs, PR-comment text). This is
`.github/` workflows + `Roadmap/` docs + the PR template only.

## In scope (v1)
- A **`cross-review.yml` GitHub Actions workflow** on `pull_request` (`opened`, `synchronize`, `reopened`)
  that installs the reviewer CLI, runs `node scripts/cross-review.mjs <PR#> --agent codex`, and lets the
  script post its existing advisory comment. **`continue-on-error: true` / never a required check** — it
  can fail or be skipped and the PR still merges.
- **Graceful skip** when the reviewer credential/CLI is unavailable: the job logs "cross-review skipped
  (no codex credential)" and exits 0 — never reds a PR (notify-telegram secret-skip idiom).
- **Policy + docs** so the expectation is explicit: WAYS §Review & merge ("runs on every PR, advisory"),
  the PR-template section retitled (no longer "(optional)"), `SESSION-KICKOFFS.md` #4 line, and the kickoff
  template's review line.
- The advisory banner, single-pass discipline, and the risk-tier *merge* rule stay exactly as they are.

## Out of scope (v1)
- **Making it a blocking / required check.** This would break the standing "advisory, never gates"
  convention and reintroduce the token-sink risk. Explicitly out.
- **The adversarial debate / iterate-to-convergence loop.** Out, as decided at the cross-agent-review epic.
- **Running the planning panel (`cross-panel.mjs`) in CI.** That's plan-time, not PR-time — separate.
- **Auto-running `agy` in CI** *if* it can't authenticate headlessly (see open question 1). Codex is the
  CI default; agy stays a local/manual option via the existing `--agent antigravity`.

## Slicing — skateboard → car (2 sprints, independent)
Branch `chore/cross-agent-review-always`. Lands in the **monorepo-root** repo (`.github/`, `Roadmap/`,
`PULL_REQUEST_TEMPLATE.md`) and the two **app repos'** `.github/workflows/` (one workflow file each).
Dev-tooling QA = the workflow's own first run on a real PR (the smoke) + doc diffs. No money/auth/DB path.

### Sprint 1 — CI auto-run (the skateboard) · **risk: LOW**
- **S1.1 — Validate headless reviewer auth in CI (do this first, it's load-bearing).** Confirm how `codex`
  authenticates in a GitHub runner (API-key env var vs interactive `codex login`). If codex supports a
  key-based mode, that's the path; if neither codex nor agy can auth headlessly, **stop and report** — the
  CI half degrades to "policy says run it locally on every PR" and Sprint 2 still ships. *Acceptance:* a
  one-paragraph finding in this doc + the chosen auth mechanism. *QA:* a throwaway PR proves the CLI runs in
  Actions (or proves it can't).
- **S1.2 — `cross-review.yml` workflow, non-blocking.** On `pull_request`: checkout → setup-node 20 →
  install the reviewer CLI → `node scripts/cross-review.mjs ${{ pr number }} --agent codex --repo <this
  repo>`. `continue-on-error: true`; **not** added to required checks. Credential from a repo secret; if
  absent, log-and-skip (exit 0). *Acceptance:* opening any PR posts one advisory "Cross-agent review"
  comment automatically; deleting the secret makes the job skip cleanly, PR still mergeable. *QA:* open a
  real throwaway PR in each repo and watch the comment appear (Daniel-owned smoke — he holds the credential).
- **S1.3 — Cost guard (optional within S1).** Skip the run on trivial diffs (docs-only / under N changed
  lines) so every-PR doesn't mean per-API-spend on a typo fix. *Acceptance:* a docs-only PR skips with a
  logged reason. *QA:* a docs-only throwaway PR shows the skip.

### Sprint 2 — Policy & docs ("always", advisory) · **risk: LOW**
- **S2.1 — WAYS §Review & merge.** Change "suggested on HIGH-risk, optional on any" → "**runs on every PR**
  (CI-automated), **advisory only, never gates**." Keep the risk-tier merge rule untouched. *Acceptance:*
  WAYS reflects the new default. *QA:* doc diff.
- **S2.2 — PR template + kickoffs.** Retitle the PR-template "Cross-agent review (optional)" section to note
  CI auto-runs it on every PR (advisory); update `SESSION-KICKOFFS.md` #4 and the kickoff review line.
  *Acceptance:* a fresh agent reading the kickoff knows cross-review is expected on every PR and that it's
  advisory. *QA:* doc diff.

## Risk tiers (WAYS §6 / groom Stage 6)
Both sprints → **LOW**: additive non-blocking CI + docs/copy; no app code, no money/auth/DB/shared runtime
surface; the review remains advisory and cannot block a merge. **Two caveats to flag in the PR body:**
(1) S1 introduces a **CI credential** (a codex/OpenAI API key as a repo secret) — Daniel provisions it; and
(2) running on every PR is **recurring API spend** — the S1.3 cost guard exists to bound it.

## Open questions (validate before/at the sprint — don't assume)
1. **Headless reviewer auth in CI (S1.1, load-bearing).** `codex login` is interactive; a GitHub runner
   needs non-interactive auth. Does your codex CLI support an API-key/env-var mode (e.g. `OPENAI_API_KEY`)?
   If yes → that's the CI path. If neither codex nor agy can auth headlessly, the CI auto-run isn't possible
   and we ship Sprint 2 (policy "run locally on every PR") only — confirm you're OK with that fallback.
2. **API spend tolerance.** Codex on every PR costs per run. OK to default-on with the S1.3 trivial-diff
   guard, or do you want a tighter scope (e.g. only PRs over N lines, or skip `chore`/docs branches)?
3. **Which repos.** Both app repos (`miyagisanchezcommerce`, `medusa-bonsai-backend`) **and** the
   monorepo-root repo? cross-review targets a repo via `--repo`/cwd; confirm the set.
4. **Comment noise.** Every push (`synchronize`) re-runs CI — do you want a fresh advisory comment per push,
   or only on `opened` (one per PR) to avoid comment pile-up? (Cheap to scope either way.)

## Research note
No present-day external standard is load-bearing. The only "foreign" surfaces are the Codex/Antigravity
CLIs, already pinned/handled in `scripts/lib/cross-agent-cli.mjs`. Per the LEARNINGS "drive a young foreign
CLI — `--version`-check, pin, **degrade, never assume**" rule, S1.1 verifies codex's *current* headless-auth
support live rather than assuming it.

## Definition of Ready — checklist
- [x] "As a / I want / so that" clear; acceptance testable by Daniel (open a PR → an advisory comment
      appears automatically; a docs-only PR skips; the comment never blocks merge).
- [x] Stage-2.5 bucket named per slice (light/copy + small-new CI job).
- [x] v1 in/out boundary written (blocking/required check, debate loop, panel-in-CI all explicitly out).
- [x] Reuse list produced (cross-review.mjs, the non-blocking CI job pattern, the secret-skip idiom, gh-in-Actions).
- [x] Each story risk-tiered (all LOW); QA stage named (real-PR smoke owed to Daniel + doc diffs).
- [ ] **Daniel approves this scope doc** → then scaffold the epic + 2 sprint docs and emit the kickoffs.
