# Prose rail — Sprint 1: codex as the third writer, and the worktree bug

**Status:** ✅ Built — branch `feat/prose-rail-headless-backend`; owed: the same hook fix in the two app repos

> A third writer so devin's refusals can't run the rail out of options, and the `.git`-is-a-file bug
> that killed the hook in every worktree — in all three repos.

## Build contract

Cite `README.md` D1–D4. Do not re-derive them. Specifically:

- **Add a writer, do not restructure the rail.** `planWriters` is already an ordered list and
  `writeProse` already injects its runners — the change is an array entry plus a runner. The guard,
  persona and lessons are untouched.
- **Use `tryCodex`, not `runCodex`.** The structured variant is the only one that separates an auth
  lapse and a stale CLI from an ordinary failure, and D3 depends on that distinction.
- **`node:test` only, zero npm dependencies** (AGENTS rule 4).
- **Keep the pure seam.** The routing decision is pure and tested; only the spawn is I/O.

## Stories

### Story 1.1 — `draftWithCodex` ✅
**As** Daniel, **I want** a third writer behind devin and agy, **so that** a refusal from one and a
cap on the other still produces a report.
**Acceptance:**
- Exports `draftWithCodex(prompt, deps)` returning the existing runner contract
  `{ ok, text, model, error, retryable }` — no new shape for callers to learn.
- **The prompt rides stdin**; argv carries only `CODEX_DIRECTIVE`, a short constant (D2).
- `authFailed` → non-retryable, error names `codex login`.
- `cliOutdated` → non-retryable, error names `node scripts/codex-doctor.mjs`.
- Anything else → retryable, gets the rail's single retry.
- **Whitespace-only stdout is a failure** — trimmed before the emptiness test, or `'   '` reads as a
  clean draft. *(Caught by the spec, not by review.)*

### Story 1.2 — Router placement ✅
**As** a builder, **I want** codex tried last, **so that** the review layer's quota stays free.
**Acceptance:**
- `planWriters` returns `['devin','agy','codex']` when all three are installed.
- Both dedicated writers failing falls through to codex — the measured case.
- Availability is plain `hasCmd('codex')`.

### Story 1.3 — The `.git`-is-a-file bug ✅
**As** an agent working in a worktree, **I want** the hook to actually run, **so that** reports stop
vanishing without a trace.
**Acceptance:**
- Both hooks resolve their log path via `git rev-parse --git-common-dir`, handling the relative
  answer (`.git`) a normal checkout gives.
- `merge-report.mjs`'s `STATE_PATH` does the same.
- Verified from a linked worktree: `--dry-run` reads the main clone's state file and exits clean,
  where the old path raised `ENOTDIR`.

## Verification

```
node --test scripts/lib/prose-writer.test.mjs   # 28 pass, 0 fail (was 22)
node --test "scripts/**/*.test.mjs"             # full suite green
node scripts/build-order.mjs --check
node scripts/doc-format.mjs --check
node scripts/merge-report.mjs --dry-run         # from a linked worktree — clean, was ENOTDIR
```

**Red-test evidence (DoD).** Five break-the-implementation mutations, each producing exactly one
failing spec, suite restored green after each:

| Mutation | Spec that went red |
|---|---|
| Drop the `.trim()` before the empty-text check | `exit 0 with EMPTY text is a failure, not an empty success` |
| Mark an auth lapse retryable | `an AUTH lapse is non-retryable` |
| Mark a stale CLI retryable | `a STALE CLI is non-retryable and names the doctor script` |
| Move the prompt from stdin into argv | `the prompt rides STDIN, never argv` |
| Promote codex to first in the router | `codex is LAST — the review quota is the scarce one` |

## A trap this sprint re-proved

Adding a third writer **broke two existing specs** that stubbed only devin and agy while passing
`has: () => true` — `planWriters` reported codex available, nothing stubbed it, and the tests
invoked the **real codex CLI** (7s and 14s, then failed). The file already recorded this exact trap
for agy; a third writer proved it recurs, so the warning is now at the top of the file rather than
buried in one spec's comment.

**Rule:** when you add a writer, stub it in every test that passes `has: () => true`. A unit test
that can reach a network CLI when a policy constant changes is a trap for whoever changes it.

## Owed

- **The same hook fix in `miyagisanchezcommerce` and `backend`** — both ship the byte-identical
  buggy hook. Separate repos, separate PRs (AGENTS rule 1).
- **A merge observed reporting from a worktree checkout**, where it previously died silently.

## Not done, and why

**No GitHub Actions workflow.** An earlier draft of this sprint added one, on the reasoning that
public-repo minutes are now free (true) and would close the "a hook only fires on the machine that
pulls" gap (also true). It was removed: **every writer in the roster is an interactive CLI with no
headless auth**, so the job would skip on every merge. Writing prose in CI needs a paid hosted API
key, and using the cheap/free model CLIs is the point of the rail. The pull-dependency gap is
accepted, and documented in `README.md` so nobody re-derives the idea from scratch.

**`guards.yml` did not get a push-to-main trigger.** It is PR-shaped in four places —
`ref: pull_request.head.sha`, the diff base, `IS_FORK`, and a `contents: write` self-heal that pushes
to `github.head_ref` — all empty on a push event. That is a rewrite, not a trigger line, and it would
put an auto-push-to-main path one bug away from existing. The local pre-commit hook already covers
direct-to-main.
