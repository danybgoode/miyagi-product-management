---
status: shipped      # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. (S1 repo fixes merged #32; S2 Notion config applied via MCP; board-grouping UI flip owed to Daniel.)
slug: notion-board-hygiene
build_order: 2       # numeric build-order sequence (SSOT for the Notion build-order views)
---

# Epic — Notion roadmap board hygiene

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore

Dev-tooling/projection hygiene. No buyer/seller/agent surface. Scope doc: [`Roadmap/00-ideas/2. readyforscope/notion-board-hygiene.md`](../../00-ideas/2.%20readyforscope/notion-board-hygiene.md) — APPROVED 2026-06-22.

## Why

The Notion roadmap board misreports reality: an **archived** epic still shows **Planned** in the sprint view,
the **In review** column is **stale**, and **In progress** rarely moves. Root causes (validated against the
code + the live DB): a sprint-status floor that only covers Shipped epics; and a board that groups by the
slow docs-derived `Status` while the **live `Lifecycle` overlay is invisible** (no view uses it) and has no
"In progress" state. Plus there's no build-order view. This epic fixes the projection bug, makes the board
group by a merged status that prefers the live overlay, adds an "In progress" overlay state, and adds
build-order views keyed on a real numeric `build_order`.

## Context

| | |
|---|---|
| **What it is** | A projection bug-fix + overlay extension (repo) + Notion board config (formula, options, views) |
| **Repos touched** | monorepo-root only (`scripts/`, `.github/`, `Roadmap/`) for S1. S2 is **Notion-side** (MCP/UI) |
| **SSOT** | docs stay the only source of truth; `build_order` lives in epic README frontmatter, like `status` |
| **Live axis** | `Lifecycle` overlay (PR open) + a "Board status" formula = `Lifecycle ?? Status` the boards group by |

## Decisions (Daniel, 2026-06-22)

1. **Merged board status** preferring the live `Lifecycle` overlay; add a **"In progress"** lifecycle state
   (draft PR → In progress; ready-for-review → In review; clear on close).
2. **Real numeric `build_order`** (epic README frontmatter SSOT) → projected → build-order views.
3. **One chore epic** covering all four issues.

## Medusa-first note

N/A — zero commerce/app surface. Rules 1–4 untouched; rule 5 N/A (Notion labels are internal, not user copy).

## What already exists (reuse, don't rebuild)

- **`scripts/roadmap-to-notion.mjs`** — the one-way projection (epic/sprint/seed grains, status derivation,
  `--extract` testable core, `--sync`, scoped `--pr` overlay). Fix the floor; read epic `build_order`; extend `--pr`.
- **`.github/workflows/notion-pr-sync.yml`** — the live overlay (PR open → `Lifecycle`/`PR link`; clear on
  close). Send "In progress" for draft, "In review" for ready_for_review.
- **`.github/workflows/notion-sync.yml`** — the full rebuild; unchanged (already leaves `Lifecycle` alone).
- **`Marketplace Roadmap` DB (`eb68a1fd…`)** — existing `Status`, `Lifecycle`, `PR link`, `Build order ID`,
  `Epic`/`Sprints` relations, `Grain`, and the Epics/Sprints board views to regroup + extend.
- **`scripts/build-order.mjs`** + the "infra gate = pure `node:test`" learning — for the S1 coverage shape.

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 Archived-epic sprint floor fix (project Archived, not Planned) | low |
| **[S1](sprint-1.md)** | S1.2 `build_order` SSOT (epic frontmatter) + projection + populate the sequence | low |
| **[S1](sprint-1.md)** | S1.3 "In progress" lifecycle overlay (draft→In progress, ready→In review) | low |
| **[S2](sprint-2.md)** | S2.1 DB: add `Lifecycle="In progress"` + "Board status" formula (`Lifecycle ?? Status`) | low |
| **[S2](sprint-2.md)** | S2.2 Regroup Epics/Sprints boards by Board status | low |
| **[S2](sprint-2.md)** | S2.3 Build-order views (epic ordered by build order; sprints nested under epic) | low |

## Deploy order

S1 is a normal monorepo-root code sprint (branch `chore/notion-board-hygiene`; merge → push triggers a
re-`--sync`). **S2 is operational** — Notion-side config via the Notion MCP (Cowork) or the UI; do it after
S1 lands so the build-order data + the "In progress" overlay exist for the views to use.

## Definition of Done (epic)

- [x] An archived epic's sprints show **Archived** (not Planned) — `floorSprintStatus` (S1.1), `neon-egress`
      verified in `--extract` + `node:test`. Visible on the Sprints board after the S2.2 UI grouping flip.
- [~] The Epics + Sprints boards group by a **Board status** that prefers the live overlay — the formula +
      "In progress" option exist (S2.1); the **grouping flip is a UI step owed to Daniel** (API can't set
      formula grouping — S2.2).
- [x] Build-order views render epics in `build_order`, sprints in their epic's order — **Epic build-order**
      + **Sprint build-order** views created (S2.3).
- [x] `build_order` set in epic README frontmatter (admin-consolidation=1, notion-board-hygiene=2); the
      projection emits it on epic + sprint rows (S1.2).
- [x] S1 covered by a pure `node:test`/`--extract` assertion (`scripts/roadmap-to-notion.test.mjs`, 35 cases).
- [x] Each `sprint-N.md` status ticked (S1 commit refs; S2 marks the owed UI step).
- [x] This `README.md` marked `status: shipped`; `RETROSPECTIVE.md` written; learnings promoted to `LEARNINGS.md`.
- [x] Ran `node scripts/build-order.mjs`; staged `BUILD-ORDER.md`.

**Owed to Daniel (operational, no code):** (1) flip both boards to **Group by → Board status** in the
Notion UI; (2) the live draft-PR overlay eyeball (open a draft PR → row shows In progress → ready → In
review → merge clears). **Deferred (documented):** convert `Build order ID` to a Number property for
true numeric sort, landed with a one-line `props()` change (S2.3 note) — not urgent at 1–2 entries.
