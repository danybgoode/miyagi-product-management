---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: notion-board-hygiene
build_order: 2       # numeric build-order sequence (SSOT for the Notion build-order views)
---

# Epic — Notion roadmap board hygiene

**Macro-section:** 09 · Platform & Infra
**Class:** Chore — dev-tooling/projection hygiene. No buyer/seller/agent surface.
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/notion-board-hygiene.md`](../../00-ideas/2.%20readyforscope/notion-board-hygiene.md) — APPROVED 2026-06-22.

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

- [ ] An archived epic's sprints show **Archived** (not Planned) in the Sprints board (`neon-egress` is the test case).
- [ ] The Epics + Sprints boards group by a **Board status** that shows live **In progress** (draft PR) /
      **In review** (ready PR), auto-clearing on merge back to the docs-derived status.
- [ ] Build-order views render epics in `build_order`, with sprints nested under their epic in order.
- [ ] `build_order` is set in epic README frontmatter for active/near-term epics; the projection emits it.
- [ ] S1 covered by a pure `node:test`/`--extract` assertion; `tsc`/build N/A (script-only).
- [ ] Each `sprint-N.md` status ticked with commit refs; S2 runbook executed (or assigned).
- [ ] This `README.md` marked ✅ (`status: shipped`); `RETROSPECTIVE.md` written; learnings promoted to `LEARNINGS.md`.
- [ ] Ran `node scripts/build-order.mjs`; staged `BUILD-ORDER.md`.
