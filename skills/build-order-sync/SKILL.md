---
name: build-order-sync
description: >
  Regenerates Roadmap/00-ideas/BUILD-ORDER.md when it has drifted from the SSOT (each epic README's
  frontmatter status:) and opens a claude/ docs PR with the fix — never hand-edits the board. Use when
  Daniel asks to "sync the build order", "regenerate BUILD-ORDER.md", "check board drift", "is the
  build-order board stale", "open a build-order PR", or as the nightly ops routine's first step. Runs
  scripts/build-order-sync.mjs, which does the check, the regen, and (on real drift) the branch/commit/
  push/PR — this skill just invokes it and reports the result.
---

# build-order-sync — keep the generated board honest

> This skill never hand-edits `Roadmap/00-ideas/BUILD-ORDER.md`. Its only writes are: regenerating that
> one file (via the existing generator) and, only on real drift, a `claude/`-branch docs PR containing
> just that regenerated file.

## When to run me
Daniel asks to check/regenerate the build-order board, or the nightly **ops-nightly** routine
(`scripts/routines/ops-nightly.prompt.md`) invokes me as its first step.

## What already exists (reuse, don't rebuild)
- **`scripts/build-order.mjs`** — the actual generator + `--check` drift detector. SSOT = each epic
  `README.md`'s frontmatter `status:` field; seed frontmatter owns only the un-scaffolded funnel. Don't
  re-derive status yourself — this is the one source of truth.
- **`scripts/build-order-sync.mjs`** — the mechanical part this skill wraps: `node
  scripts/build-order-sync.mjs` (check → regen → branch → commit → push → `gh pr create`, only if
  actually drifted) or `node scripts/build-order-sync.mjs --dry-run` (check → regen on disk → print
  `git diff --stat` only — no branch/commit/push/PR; use this to sanity-check without touching git).

## Stage 1 — run it
`node scripts/build-order-sync.mjs`. Report back exactly what it printed:
- "up to date — no PR needed" → done, nothing else to do.
- A PR URL → the board was stale and a fix PR is now open; surface the URL.

## Stage 2 — on failure
Surface the script's stderr verbatim (a `git`/`gh` step failing). Don't retry blindly — a `gh` auth
failure or a push rejection is a config problem, not a flake.

---

## Gotchas
- **The board is a generated view — never edit `BUILD-ORDER.md` by hand**, here or anywhere else. If a
  drift PR looks wrong, the fix is to correct the SSOT (an epic README's `status:` frontmatter, or a
  seed's frontmatter for the funnel) and re-run this skill — not to hand-tweak the generated file.
- **A drift PR only regenerates the board — it never touches whatever caused the drift.** If the board
  changed because a status genuinely needs correcting, that's a separate, human-reviewed doc edit; this
  skill's PR is just "the board now matches the SSOT as it stands today."
- **The `claude/`-prefixed branch is deliberate and needs NO extra push grant.** A routine's *default*
  push scope already allows `claude/`-prefixed branches (`scripts/routines/README.md`'s two standing
  rules) — this is unlike `standup-post`, which needs push enabled *beyond* that default to land its
  log commit on `main` directly. Don't grant this routine broader push on this skill's account; if
  `gh pr create` fails, the cause is almost always `gh` auth/scope, not the branch prefix.
  - **Corollary:** if the script's `git push -u origin <branch>` step fails, the working tree is now
    left checked out on the new local branch with an uncommitted-nowhere commit — re-run isn't
    idempotent from that state (`git checkout -b` would fail on an existing branch name). Check
    `git status`/`git branch` before re-invoking; delete the stray local branch and re-run from `main`
    if the push genuinely never landed.
- **If `--check` says drifted but the regen produces no file diff**, the script reports that and exits
  cleanly with no PR — this can happen if a prior run already regenerated the file on disk but the
  commit step didn't run (e.g. an interrupted previous invocation). Not a bug to chase; just re-run.
