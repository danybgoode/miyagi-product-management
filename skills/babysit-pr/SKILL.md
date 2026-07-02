---
name: babysit-pr
description: >
  Advisory PR watch for a single open PR — retries flaky CI (re-runs failed workflow runs) and
  surfaces merge conflicts via one comment; never merges, never a required check. Use when Daniel
  asks to "babysit this PR", "check on open PRs", "retry flaky CI", "is this PR stuck", "why isn't
  this PR moving", or as the nightly ops routine's third step (once per open PR across the 3 repos).
  Runs scripts/babysit-pr.mjs, which does the gh reads, the retry, and the comment post. A clean PR
  (no conflict, no failing checks) gets NO comment — this tool never adds nightly noise to a healthy PR.
---

# babysit-pr — advisory PR watch (never merges, never gates)

> This skill's only writes are: re-running an already-FAILED workflow run (`gh run rerun --failed`)
> and posting ONE plain PR comment. It never calls `gh pr merge`, never rebases/force-pushes a branch,
> and never touches any commit-status/check-run API — a plain comment structurally can't become a
> required check, and that's deliberate.

## When to run me
Daniel asks about a stuck/flaky PR, or the nightly **ops-nightly** routine invokes me once per open PR
across all 3 repos (it lists the open PRs itself; this skill handles one PR per invocation).

## What already exists (reuse, don't rebuild)
- **`scripts/babysit-pr.mjs`** — the mechanical part: `node scripts/babysit-pr.mjs <PR#> --repo
  owner/repo` (read PR state, retry any failing workflow run on its branch, post one advisory comment
  — unless the PR is already clean, in which case it posts nothing) or `... --dry-run` (fully
  read-only — prints what it would do, no `gh run rerun`, no comment).
- **`gh` CLI** — must be authenticated with read+write access to whichever repo the PR is in (`pr view`,
  `run list`, `run rerun`, `pr comment`).

## Stage 1 — run it
`node scripts/babysit-pr.mjs <PR#> --repo <owner/repo>`. Report back exactly what happened:
- "not OPEN" → nothing to do.
- "clean — no comment posted" → nothing to do (this is the common, expected nightly case).
- A comment URL → summarize what it found (conflict? retried which runs? still-pending checks?).

## Stage 2 — on failure
Surface stderr verbatim (a `gh` auth/permission failure, most likely). A repeated failure on the same
PR/repo across nights is a `gh` scope problem, not a flake in the PR itself.

---

## Gotchas
- **Never retries a check that's still in-flight** — only a genuinely `FAILURE`/`ERROR`/`TIMED_OUT`
  conclusion is retryable. An `IN_PROGRESS`/`QUEUED` check is reported as "still pending," not retried
  (retrying a running check is a no-op at best, confusing at worst).
- **A check that keeps failing across repeated nightly runs is a signal of a REAL regression, not
  flakiness — this tool does not track retry history itself.** It retries once per invocation, every
  time it's invoked. If the same check is red three nights running, that pattern lives in the PR's
  comment history (each night's advisory comment), not in any state this skill remembers — read the
  thread rather than expecting the tool to self-limit. A `babysit.log` memory (mirroring
  `standup-post`'s `standups.log`) is a reasonable future enhancement, explicitly out of scope for this
  sprint.
- **Never resolves a merge conflict itself** — no rebase, no merge-in-main, no force-push. Surfacing
  the conflict in the advisory comment is the entire action; a human resolves it. Attempting an
  automatic resolution on someone else's branch is exactly the kind of destructive, judgment-requiring
  action this skill exists to avoid.
- **Comment-only is a structural guarantee, not just policy** — a plain `gh pr comment` carries no
  commit-status, so it cannot be wired into branch protection as a required check even by accident.
  Keep it that way: never add a status-check/check-run call to this script.
- **A clean PR posts nothing, on purpose** — nightly execution across every open PR in 3 repos would
  otherwise spam a comment on every healthy PR every night. Silence on a clean PR is success, mirroring
  `smoke-triage`'s "green → no PR" and `roadmap-hygiene`'s "nothing to flag → no PR."
- **`--repo` is always required** — this skill has no default repo (it watches PRs across
  `miyagi-product-management`, `miyagisanchezcommerce`, and `medusa-bonsai-backend`); the caller
  (Daniel or the routine's PR-enumeration step) always supplies it explicitly.
