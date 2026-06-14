---
title: "Repo hygiene — branch cleanup + build-order/status reconciliation"
slug: repo-hygiene-and-build-order
status: shipped                     # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "09"                          # 09-platform-infra (process/tooling)
type: chore
priority: null
risk: low                           # docs/tooling/branches; no app-code behaviour change
epic: null                          # likely doesn't need a full epic — a single Claude Code chore session
build_order: null
updated: 2026-06-14
---

# Repo hygiene — branch cleanup + build-order/status reconciliation (chore)

> Groomed in Cowork 2026-06-14. **Take to Claude Code live** (needs `gh` + a fresh fetch across all three
> repos; the Cowork sandbox has a FUSE git-lock quirk that makes branch/ref deletes painful). The ready-to-paste
> kickoff is at the bottom.

## Mirror (the ask in one line)
Clean up the forgotten/merged branches across the three repos **and** fix the root cause of the
build-order/status drift, so the board (and Notion) tell the truth and can't silently rot again.

## Why now
Two pains converged:
1. **Branch sprawl** — ~36 local branches are merged-by-ancestry (pure clutter); a forgotten one
   (`feat/inventory`) directly caused a scoping mix-up in the PWA-nav groom.
2. **The build-order board was wrong** — `BUILD-ORDER.md` was hand-maintained, so it drifted on every merge.
   It's now **generated** (`scripts/build-order.mjs`, committed `21a8a96`) — but generating it exposed that
   the *status data itself* is drifted and split across two disagreeing sources:
   - the extractor (which also feeds Notion) **prose-parses** sprint docs and misfires (table-format sprints
     mis-count; several epics show "Shipped" that aren't);
   - **seed frontmatter** disagrees and is itself stale in places.
   No generated view can be correct until the data is reconciled against live code, and one authoritative
   status source is chosen.

## Current state (already done in Cowork)
- `scripts/build-order.mjs` — generates `Roadmap/00-ideas/BUILD-ORDER.md` from the same projection Notion
  reads, keyed off frontmatter, with a **self-flagging drift table** (frontmatter vs prose-derived) and a
  `--check` mode. Stale `BUILD-ORDER-RECOMMENDATION-2026-06-08.md` removed from git (a stray untracked copy
  may linger — delete it physically).

## Branch snapshot (2026-06-14, pre-fetch)
| Repo | local | merged-by-ancestry (safe) | unmerged (verify) |
|---|---|---|---|
| PM (root) | 2 | 0 | 1 (`feat/cross-agent-planning-panel` — likely squash-merged) |
| FE (apps/miyagisanchez) | 27 | 20 | 6 (several squash-merged; `feat/pdp-redesign-s4` is live WIP) |
| BE (apps/backend) | 19 | 16 | 2 (`feat/custom-domain-paywall`, `feat/flagsmith-stripe-enforcement`) |
> "Unmerged" overstates it — squash-merges break `--is-ancestor`; verify each via `gh pr` state or empty diff.

## Recommendation (the durable fix)
Settle on **one authoritative status field**: an explicit `status:` on each **epic README** frontmatter, set
at epic close (already a DoD step), read by **both** `scripts/build-order.mjs` and
`scripts/roadmap-to-notion.mjs`. Retire the brittle prose-parse (story-tick regex + status-line) and the
seed-vs-epic ambiguity. Then the board + Notion are correct by construction, and `--check` in CI keeps them honest.

## Acceptance (Daniel can verify)
- Each repo's merged branches deleted; WIP untouched; report of what was removed/kept.
- `node scripts/build-order.mjs` → drift table is **empty**; the board's buckets match reality.
- Notion `--extract` matches the board.
- `--check` wired into CI/precommit; process docs point at the generated-board model.

## In scope / Out
- **In:** branch cleanup (3 repos) · reconcile epic/seed statuses to live truth · consolidate the status
  source · fix the story-counter · regenerate board + verify Notion · `--check` in CI · repoint process docs
  · delete the stray RECOMMENDATION file.
- **Out:** the deep line-by-line doc↔code audit (separate, still deferred) · any app-feature change.

## Risk
LOW — docs/tooling/branches only. The one caution: `scripts/roadmap-to-notion.mjs` is shared with the live
Notion sync — change its status-source carefully and re-run `--extract` to confirm before/after.

## Claude Code kickoff (paste this)
```
Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Work live (gh + network). PLANNING/REPORT FIRST across all phases — do NOT delete, rewrite status, or
change tooling until I approve each phase's report. Three repos: PM (monorepo root / Roadmap),
FE (apps/miyagisanchez), BE (apps/backend).

PHASE 1 — Branch cleanup (all three repos)
  `git fetch --prune origin` each. For every local branch except the checked-out one and `main`, classify:
  MERGED-CLEAN (ancestor of origin/main) · MERGED-SQUASH (no ancestry but a merged PR via `gh pr list
  --state merged --head <branch>`, or empty net diff vs main) · WIP/UNMERGED (real work; show last commit
  date + ahead/behind) · GONE-ON-REMOTE. Output one table per repo: branch · class · last commit · maps-to-epic
  · recommend · why. Never propose deleting the current branch, main, or genuine WIP.

PHASE 2 — Status reconciliation (the real fix for the build-order drift)
  Start from the drift table in Roadmap/00-ideas/BUILD-ORDER.md (regenerate it: `node scripts/build-order.mjs`)
  AND any epic whose board status looks wrong (e.g. shows Shipped with 0 stories). For EACH such epic,
  establish TRUE status by checking the cited PRs/commits against the relevant repo's origin/main (the check
  used on homepage-polish-b: are the commits actually in main? does the code exist?). Then:
   - Decide the authoritative status source WITH ME: recommendation is an explicit `status:` field on each
     epic README frontmatter, set at epic close, read by BOTH scripts/build-order.mjs and
     scripts/roadmap-to-notion.mjs — retiring the brittle prose-parse and the seed-vs-epic ambiguity.
     Propose the exact mechanism, then implement once I agree.
   - Correct the stale statuses (epic README + matching seed frontmatter) to the verified truth.
   - Update scripts/roadmap-to-notion.mjs + scripts/build-order.mjs to read the agreed authoritative field;
     fix the story-counter so table-format sprints count correctly. Re-run `node scripts/build-order.mjs`
     until the drift table is EMPTY, and re-run the Notion --extract to confirm the projection matches.

PHASE 3 — Drift-proof + tidy
  Wire `node scripts/build-order.mjs --check` into CI (and/or a precommit hook) so the board can't go stale.
  Repoint the remaining process docs that still describe a hand-maintained queue — SESSION-KICKOFFS.md,
  WAYS-OF-WORKING.md, skills/groom/SKILL.md, Roadmap/00-ideas/README.md lifecycle lines — to: "status SSOT =
  <agreed field>; BUILD-ORDER.md + Notion are generated views; never hand-edit the board." Physically delete
  the stray Roadmap/00-ideas/BUILD-ORDER-RECOMMENDATION-2026-06-08.md (already untracked).

On my approval per phase: delete the safe branches; commit the status/tooling/doc fixes path-scoped per repo
(Roadmap/ + scripts/ in PM; code-repo fixes in their own repos), one clear commit per logical change.
Report what changed and what you deliberately left.
```
