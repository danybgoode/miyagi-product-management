# Retrospective — Notion roadmap board hygiene

_Closed: 2026-06-23_ · **2 sprints** · Risk LOW throughout · monorepo-root repo + the live `Marketplace Roadmap` Notion DB.

## What shipped

The Notion roadmap board was misreporting reality: archived epics showed "Planned" sprints, the board
grouped only by the slow docs-derived `Status` (the live `Lifecycle` overlay was invisible and had no
"In progress" state), and there was no build-order axis. This epic fixed the projection and extended the
board config.

**S1 — projection & overlay fixes (repo, [PR #32](https://github.com/danybgoode/miyagi-product-management/pull/32) squash `6ea4959`):**
- **S1.1** `floorSprintStatus(epicStatus, sprintStatus)` — an **archived** epic floors all its sprints to
  `Archived`; a Shipped epic's stale `Planned` sprints to `Shipped`; in-flight signals pass through.
- **S1.2** `build_order` read from the epic README frontmatter (SSOT, seed fallback), normalized to a
  number, emitted on epic **and** sprint rows (sprints inherit the epic's order). Populated
  admin-consolidation=1, notion-board-hygiene=2.
- **S1.3** pure `lifecycleForPr({action, draft})` + a `--lifecycle` CLI mode; `notion-pr-sync.yml` now
  sends **In progress** for a draft PR, **In review** when ready, clears on close (was hardcoded "In review").
- Refactor: wrapped the CLI dispatch in `main()` + an `isMain` guard so the pure helpers import cleanly
  under `node:test`. Covered by `scripts/roadmap-to-notion.test.mjs` (35 cases, run via
  `node --test 'scripts/**/*.test.mjs'`).

**S2 — Notion board config (operational, via the Notion MCP):**
- **S2.1** Added the "Board status" **formula** = `if(empty(prop("Lifecycle")), prop("Status"), prop("Lifecycle"))`.
  The "In progress" Lifecycle option already existed — S1's `inflight` job auto-created it when it wrote
  this epic's own draft-PR overlay.
- **S2.3** Created **Epic build-order** + **Sprint build-order** views (sorted tables).
- **S2.2** Regrouping the boards by the formula is a **UI step owed to Daniel** (see below).

## What went well

- **The epic dog-fooded itself.** S1's overlay fired on this epic's own PR #32: the draft set
  `Lifecycle="In progress"`, marking ready flipped it to "In review", and the merge cleared it — the live
  end-to-end S1.3 path was exercised for real by the very PR that shipped it. It also auto-created the
  "In progress" select option, completing half of S2.1 before S2 started.
- **Pure-seam testing carried a script with no Playwright gate.** Extracting `floorSprintStatus` /
  `lifecycleForPr` / `normalizeBuildOrder` as exported pure helpers (behind an `isMain` guard) made the
  `node:test` the real deterministic gate — plus two live `--extract` integration assertions.
- **Cross-review earned its keep cheaply.** Codex flagged a genuine should-fix (live `--pr` silently
  succeeding on 0 row matches → now warns) and a deferred-but-real one (numeric sort vs rich_text). The
  one "blocking" item was a diff-only false positive (imports present in the unchanged header).

## What we learned (promoted to LEARNINGS.md)

- **The Notion API can't set a board to group by a formula property** — a `GROUP BY "<formula>"` update
  silently drops the grouping (board ends up ungrouped). Same for grouping by a **relation**. Set those in
  the UI, or design around them (we used a sorted table for the build-order views instead of a board
  grouped-by-`Epic`). Verify a view change by re-fetching the DB (the view JSON shows `groupBy` only when
  it actually took).
- **Notion auto-creates an unknown select option on write** — S1's overlay PATCH writing
  `Lifecycle="In progress"` created the option; we didn't have to pre-add it.
- **The Notion SQL `query_data_sources` mode needs a Business+ plan** — on this plan, S2 verification is a
  visual board eyeball, not a programmatic assert (as the sprint doc predicted).

## Gaps / follow-ups

- **Owed to Daniel (operational, no code):** flip both boards to **Group by → Board status** in the Notion
  UI (S2.2); the live draft-PR overlay eyeball.
- **Deferred (documented in sprint-2.md S2.3):** convert `Build order ID` to a **Number** property for true
  numeric sort, landed atomically with a one-line `props()` change in `roadmap-to-notion.mjs` — not urgent
  at 1–2 entries (lexical sort of `1`/`2` is correct), but do it before the count crosses 9→10.
- If the Notion plan turns out not to support formula grouping in the UI either, fall back to a
  code-maintained "Board status" **Select** kept in sync by the projection + overlay (the heavier
  alternative we deliberately did not take).
