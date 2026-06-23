# Sprint 2 — Notion board config (operational)

**Epic:** [Notion roadmap board hygiene](README.md) · **Risk:** all LOW · **Surface:** the `Marketplace Roadmap` Notion DB (`eb68a1fd…`)
**Goal:** the board groups by a merged status that shows live state, archived sprints leave Planned, and
build-order views render in order.

> **Operational sprint — NOT a repo branch.** Executed via the Notion MCP (from Cowork) or the Notion UI
> (open question 4). Do it **after S1** so the "In progress" overlay + `build_order` data exist. Re-run
> `node scripts/roadmap-to-notion.mjs --sync` (or wait for the nightly/push) to refresh rows first.

## Stories

### S2.1 — DB properties: "In progress" + "Board status" formula · LOW ✅
- ✅ The **"In progress"** option already exists on the `Lifecycle` Select — S1's `notion-pr-sync`
  `inflight` job created it automatically when it wrote this epic's draft-PR overlay (Notion auto-creates
  an unknown select option on write). No action needed.
- ✅ Added a **"Board status"** formula property = `if(empty(prop("Lifecycle")), prop("Status"), prop("Lifecycle"))`
  via the Notion MCP (`update_data_source` ADD COLUMN … FORMULA). Live overlay wins while a PR is open;
  else docs-derived `Status`.
- **Acceptance met:** the formula resolves per row (an open-PR epic → its `Lifecycle`; everything else → `Status`).

### S2.2 — Regroup the boards by Board status · LOW — ⚠️ manual UI step owed to Daniel
- **API limitation found:** the Notion API **cannot set a board to group by a formula property** — a
  `GROUP BY "Board status"` update silently drops the grouping (the board ends up ungrouped). The boards
  were therefore left safely on their original `GROUP BY "Status"`.
- **Decision (Daniel, 2026-06-23):** keep the formula; **flip the grouping in the Notion UI** (the
  fallback's UI half, not the code-Select half). Owed to Daniel, ~2 clicks per board:
  open the **Epics** board → **Group by → Board status**; repeat on the **Sprints** board. (If the plan
  doesn't offer formula grouping in the UI either, fall back to a code-maintained "Board status" Select —
  see RETROSPECTIVE.)
- **Acceptance (verify after the UI flip):** `neon-egress` sprints appear under **Archived**; an epic with
  an open **draft** PR appears under **In progress**; a ready PR under **In review**.

### S2.3 — Build-order views · LOW ✅
- ✅ Created **Epic build-order** (table, filter Grain=Epic, sort `Build order ID` ASC) and **Sprint
  build-order** (table, filter Grain=Sprint, sort `Build order ID` ASC then `Name` ASC) via the Notion MCP.
  Used a *sorted table* rather than a board grouped-by-`Epic` relation: relation grouping is as
  API-unsettable as formula grouping (S2.2), and a `Build order ID, Name` sort clusters each epic's sprints
  in sequence — meeting "sprints sit under their epic in order" without the fragile grouping.
- **Acceptance met:** both render in build order (admin-consolidation=1 then notion-board-hygiene=2);
  sprints follow their epic's order, then by name.
- **⚠️ Property-type coupling (from S1 cross-review):** `Build order ID` is currently a **rich_text**
  property, so a sort is *lexical* — `10` would sort before `2`. S1 already emits a real numeric
  `build_order` in `--extract`. To sort numerically, **convert `Build order ID` to a Number property** —
  and land it atomically with a one-line `props()` change in `roadmap-to-notion.mjs` (`'Build order ID':
  { number: row.build_order }` instead of `rt(row.build_order)`), or the next `--sync` errors writing
  rich_text into a Number property. (With only 1–2 today the lexical sort happens to be correct, so this
  isn't urgent — but do it before the count crosses 9→10.)

## Sprint QA
- No code/gate — verification is a **board eyeball after a `--sync` re-run**. The Notion query API (SQL) needs
  an Enterprise plan, so this is a manual/visual confirmation, not a programmatic assert.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the `Marketplace Roadmap` Notion DB ([open](https://app.notion.com/p/eb68a1fd05f443b184b6b5b3db89f47e)).
The formula + build-order views are live; the board **grouping** flip (step 0) is owed to Daniel.

0. **(Owed to Daniel — one-time UI step)** On the **Epics** board: **Group by → Board status**. Repeat on
   the **Sprints** board. (The API can't set formula grouping — see S2.2.)
1. After step 0, open the **Sprints** board.
   → `neon-egress-and-db-isolation` sprints sit under **Archived** (not Planned).
2. With a draft PR open on some epic, view the **Epics** board.
   → that epic is under **In progress**; mark the PR ready → it moves to **In review**; merge → it returns to
     its docs-derived column (the `Lifecycle` overlay clears, `Board status` falls back to `Status`).
3. Open the **Epic build-order** view (no UI step needed — already created).
   → epics with a `Build order ID` list in order: **admin-consolidation (1)** before **notion-board-hygiene (2)**.
4. Open the **Sprint build-order** view.
   → sprints follow their epic's build order, then by name (each epic's sprints sit together in sequence).

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] S2.1 — ✅ done (Notion MCP): "Board status" formula added; "In progress" Lifecycle option already existed (auto-created by S1's overlay).
- [~] S2.2 — ⚠️ **manual UI step owed to Daniel** — API can't group a board by a formula; flip both boards to "Group by → Board status" in the UI (boards left safely on `Status`).
- [x] S2.3 — ✅ done (Notion MCP): **Epic build-order** + **Sprint build-order** views created (sorted tables; numeric-Number-property refinement deferred — see S2.3 note).
