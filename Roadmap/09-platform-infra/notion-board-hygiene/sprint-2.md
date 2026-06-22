# Sprint 2 — Notion board config (operational)

**Epic:** [Notion roadmap board hygiene](README.md) · **Risk:** all LOW · **Surface:** the `Marketplace Roadmap` Notion DB (`eb68a1fd…`)
**Goal:** the board groups by a merged status that shows live state, archived sprints leave Planned, and
build-order views render in order.

> **Operational sprint — NOT a repo branch.** Executed via the Notion MCP (from Cowork) or the Notion UI
> (open question 4). Do it **after S1** so the "In progress" overlay + `build_order` data exist. Re-run
> `node scripts/roadmap-to-notion.mjs --sync` (or wait for the nightly/push) to refresh rows first.

## Stories

### S2.1 — DB properties: "In progress" + "Board status" formula · LOW
- Add the **"In progress"** option to the `Lifecycle` Select.
- Add a **"Board status"** formula property = `if(empty(Lifecycle), Status, Lifecycle)` (live overlay wins
  while a PR is open; else docs-derived `Status`).
- **Acceptance:** the formula resolves per row (an open-PR epic → its `Lifecycle`; everything else → `Status`).
- **Fallback (open question 3):** if your Notion plan can't **group a board by a formula**, instead use a
  written "Board status" Select that the projection/overlay keeps in sync.

### S2.2 — Regroup the boards by Board status · LOW
- Group the **Epics** and **Sprints** board views by **Board status** (not `Status`); ensure Archived + In
  progress + In review columns are present/visible.
- **Acceptance:** `neon-egress` sprints appear under **Archived**; an epic with an open **draft** PR appears
  under **In progress**; a ready PR under **In review**.

### S2.3 — Build-order views · LOW
- Add an **Epic build-order** view (filter Grain=Epic, sort by `Build order ID`) and a **Sprint build-order**
  view (filter Grain=Sprint, group by `Epic`, sort by `Build order ID` then sprint number).
- **Acceptance:** both render in build order; sprints sit under their epic in sequence.

## Sprint QA
- No code/gate — verification is a **board eyeball after a `--sync` re-run**. The Notion query API (SQL) needs
  an Enterprise plan, so this is a manual/visual confirmation, not a programmatic assert.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the `Marketplace Roadmap` Notion DB, after S1 merged + a `--sync` re-run.

1. Open the DB → the **Sprints** board.
   → `neon-egress-and-db-isolation` sprints are under **Archived** (not Planned).
2. With a draft PR open on some epic, view the **Epics** board.
   → that epic is under **In progress**; mark the PR ready → it moves to **In review**; merge → it returns to
     its docs-derived column.
3. Open the **Epic build-order** view.
   → epics are listed in `build_order`.
4. Open the **Sprint build-order** view.
   → sprints are grouped under their epic, in build order.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S2.1 — _scaffolded_
- [ ] S2.2 — _scaffolded_
- [ ] S2.3 — _scaffolded_
