---
title: "Roadmap doc-format consistency — rules, sweep, and an automatic checker"
slug: doc-format-consistency
status: scaffolded
area: "09"
type: chore
priority: null
risk: low
epic: "09-platform-infra/doc-format-consistency"
build_order: null
updated: 2026-07-16
---

## Ask
Daniel: "there are old docs that had some different styling or format in general. Lets see if we can
correct them systematically... have it run whenever anyone is working on docs automatically so it
catches the drifts, agent sees and fixes if anything."

## What's actually broken
Real drift across ~30 sampled epic READMEs, sprint files, and retrospectives — not cleanly old-vs-new
(inconsistent within the same week, 2026-07-15). Biggest offender: the epic-README header blockquote
has no two of ten sampled docs using the same field set. Full findings + decisions in
`Roadmap/09-platform-infra/doc-format-consistency/README.md`.

## Why this is fixable systematically, not one-by-one
The `groom` plugin's scaffolding templates ARE the canonical shape — proven by `00-ideas/seeds/*.md`
(81 files, one authoring path, zero drift) vs epic READMEs (hand-edited after scaffolding, drifted).
So: canonicalize docs to match the template (already fixed a real template bug along the way — Class
was computed but never rendered, see `dobby-foundation` PR #1), then add a checker that keeps them
there.

## Scope
- A `scripts/doc-format.mjs` checker (pure node, `--check`/`--fix`/`--hook` modes) matching the
  `build-order.mjs`/`doc-hygiene.mjs` house shape.
- A dedicated `.github/workflows/doc-format-guard.yml`, advisory → required per macro-section as
  swept (incremental `ENFORCED_SWEPT_PATHS` allow-list, same pattern as the raw-color/emoji guards).
- A one-time sweep of existing docs, per-macro-section batches, path-limited commits.
- A `PostToolUse` Claude Code hook (`.claude/settings.json`) on `Write`/`Edit` matching
  `Roadmap/**/*.md` — surfaces drift to the acting agent (stderr, non-zero exit), does NOT silently
  auto-rewrite. This is the "runs automatically... agent sees and fixes" mechanism.

## Out of scope
The poster (`Roadmap/README.md`) — no frontmatter, already covered by `doc-hygiene.mjs`'s
dedupe/staleness checks; bullet-density is editorial, not mechanical.

## Decisions made (2026-07-16, with Daniel)
- Header field set: `Area · Risk · Class · Scope seed` (single line); Archetype optional/appended.
- `Class` = the real Stage-2 enum (Feature/Spike/Bug/Chore), not free text.
- Scope-seed link always points at `seeds/` — reversed an initial recommendation once
  `00-ideas/README.md`'s own stated policy (`2. readyforscope/` is documented legacy) was found;
  the newest hand-authored docs pointing at `readyforscope/` were themselves drift, not a new
  convention.
- `## Context` table and `## Five-rules check`: optional, never flagged either way.
- Sweep scope: active epics only (scaffolded/in-progress/shipped); `status: archived` epics are
  frozen historical record, never enforced.
