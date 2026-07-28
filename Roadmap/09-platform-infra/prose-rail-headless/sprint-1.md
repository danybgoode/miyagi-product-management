# Prose rail headless — Sprint 1: the API backend, the worktree fix, the workflow

**Status:** ✅ Built — branch `feat/prose-rail-headless-backend`; owed: the `ANTHROPIC_API_KEY` secret and the app-repo siblings

> Gets the merge report off the git hook. A third writer backend that authenticates from an env var,
> the `.git`-is-a-file bug that killed the hook in every worktree, and a push-to-main workflow that
> does not depend on anyone pulling.

## Build contract

Cite `README.md` D1–D4. Do not re-derive them. Specifically:

- **Add a backend, do not restructure the rail.** `planWriters` is already an ordered list and
  `writeProse` already injects its runners — the change is an array entry plus a runner, and the
  guard/persona/lessons are untouched.
- **`node:test` only, zero npm dependencies** (AGENTS rule 4). This is also why the Anthropic SDK is
  out and raw HTTP is in — see D2.
- **Keep the pure seam.** Request building and response parsing are pure and tested; only the spawn
  is I/O. If a decision needs the network to test, the seam is in the wrong place.

## Stories

### Story 1.1 — `draftWithAnthropic`: a writer that works without a human ✅
**As** Daniel, **I want** the merge report written even when no CLI is logged in, **so that** a
merge nobody pulled still arrives with its CPO summary.
**Acceptance:**
- Exports `draftWithAnthropic(prompt, deps)` returning the existing runner contract
  `{ ok, text, model, error, retryable }` — no new shape for callers to learn.
- Pure helpers `buildAnthropicRequest` / `parseAnthropicResponse` carry every decision; the spawn
  carries none.
- The API key never appears in argv — a 0600 curl config file inside a 0700 temp dir, removed in a
  `finally` so a thrown exception cannot leave it behind.
- A key containing a quote or newline is **rejected before the spawn** (`jq -r`'s trailing newline
  has bitten this repo before — see `LEARNINGS.md`).
- Text blocks collected **by type**, never by index (D3 — with thinking on, `content[0]` is empty).
- `stop_reason: "refusal"` is a non-retryable failure, not an empty success.
- Retryable derived from the API error type, never assumed.

### Story 1.2 — Router placement: last, and available only with a key ✅
**As** a builder, **I want** one ordered list to serve both laptop and runner, **so that** nobody
has to remember a mode flag.
**Acceptance:**
- `planWriters` returns `['devin','agy','anthropic']` when all three are available; `['anthropic']`
  when neither CLI is installed (the runner case).
- Availability is `!!ANTHROPIC_API_KEY && hasCmd('curl')`. **No key reads as unavailable**, not as a
  failed attempt — the "three states, never two" rule.
- Both CLIs capped falls through to the API (the measured case: devin returned "high demand for this
  model" on 6 of the last 25 local runs).

### Story 1.3 — The `.git`-is-a-file bug ✅
**As** an agent working in a worktree, **I want** the hook to actually run, **so that** reports stop
vanishing without a trace.
**Acceptance:**
- `.githooks/post-merge` and `post-checkout` resolve their log path via `git rev-parse
  --git-common-dir`, not `"$root/.git"`.
- `merge-report.mjs`'s `STATE_PATH` does the same, handling the relative answer (`.git`) that a
  normal checkout gives.
- Verified from a linked worktree: `--dry-run` reads the main clone's state file and exits clean,
  where the old path raised `ENOTDIR`.
- Sharing one state file across a clone's worktrees is **correct** and keeps the once-per-commit
  guarantee honest — checking the same merge out twice cannot re-report it.

### Story 1.4 — `merge-report.yml` ✅
**As** Daniel, **I want** the report to fire on the merge itself, **so that** it no longer depends on
someone running `git pull`.
**Acceptance:**
- Fires on push to `main` plus `workflow_dispatch`; `concurrency` never cancels in progress (a
  cancelled run drops that merge's report permanently — unlike a full-rebuild sync, nothing later
  re-derives it).
- `fetch-depth: 50` — merge-report walks backwards from HEAD and needs history to describe.
- Seeds the state file to `HEAD~1` so a fresh checkout reports the triggering merge, not the whole
  50-commit window.
- A missing `ANTHROPIC_API_KEY` emits a `::warning` and exits 0 — **never** falls through to a bare
  commit header that would look like the rail working (rule 5).
- No install step: the toolchain has zero runtime deps by design.

## Verification

```
node --test scripts/lib/prose-writer.test.mjs   # 33 pass, 0 fail (was 22)
node --test "scripts/**/*.test.mjs"             # full suite green
node scripts/build-order.mjs --check
node scripts/doc-format.mjs --check
node scripts/merge-report.mjs --dry-run         # from a linked worktree — clean, was ENOTDIR
```

**Red-test evidence (DoD).** Six break-the-implementation mutations, each producing exactly one
failing spec, suite restored green after each:

| Mutation | Spec that went red |
|---|---|
| Parse `content[0]` by index instead of filtering by type | `collects text blocks BY TYPE, never by index` |
| Drop the `stop_reason === 'refusal'` check | `a REFUSAL is a failure, not an empty success` |
| Mark every API error retryable | `retryable is DERIVED from the error type, never assumed` |
| Move `anthropic` first in the router | `anthropic is LAST — the CLIs win locally` |
| Pass the key in argv alongside the config file | `the API key never appears in argv` |
| Size `max_tokens` to the prose (256) | `generous max_tokens, because thinking shares the budget` |

## Owed

- **`ANTHROPIC_API_KEY` as a repo secret** — Daniel's to set; a builder does not create secrets.
  Until then the workflow skips with a warning on every merge.
- **The sibling workflow in `miyagisanchezcommerce` and `backend`** — separate repos, separate PRs
  (AGENTS rule 1). Those repos have no `scripts/` of their own, so their copy must also check out
  this repo for the toolchain.
- **A real merge observed reporting from CI**, once the secret exists.

## Not done, and why

**`guards.yml` did not get a push-to-main trigger.** The plan was to add one now that public-repo
minutes are free, but the workflow is PR-shaped in four places — `ref: pull_request.head.sha`, the
diff base, `IS_FORK`, and a `contents: write` self-heal that pushes to `github.head_ref`. All are
empty on a push event, so the change is a rewrite rather than a trigger line, and it would put an
auto-push-to-main path one bug away from existing. The local pre-commit hook already covers
direct-to-main. Left alone deliberately; worth its own sprint if the `--no-verify` gap ever bites.
