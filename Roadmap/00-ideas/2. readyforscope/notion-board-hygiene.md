# Notion roadmap board hygiene

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **09 · Platform & Infra**. Slug: `notion-board-hygiene`.
Class: **Chore** — dev-tooling/projection hygiene. No buyer/seller/agent surface.

## Mirror-back
> The Notion roadmap board lies: an archived epic still shows **Planned** in the sprint view, the **In review**
> column is stale, and **In progress** rarely updates. You want it to reflect reality, plus a view showing
> **build order by epic and by sprint**. Right?

## Daniel's grooming calls (2026-06-22)
1. **Live status** — the board groups by a **merged status that prefers the live `Lifecycle` overlay** (else
   the docs-derived `Status`), and the overlay gains an **"In progress"** state (set when a sprint's PR opens
   as a draft) so active work shows and "In review" tracks real open PRs (auto-clearing on merge).
2. **Build order** — populate a **real numeric Build order ID** (SSOT in epic README frontmatter), projected to
   the existing `Build order ID` property; the views sort by it with sprints nested under their epic.
3. **One chore epic** covering all four issues.

## Stage-2.5 bucket — **light (one code bug + a projection extension) + Notion config**
The archived-floor bug and the overlay extension are small code changes to an existing script. The
board-status formula + build-order views are **Notion-side config** (via the Notion MCP/UI), not repo code.

## Validated diagnosis (against the code + the live Notion DB, 2026-06-22)
- **Archived → Planned (sprint view):** in `scripts/roadmap-to-notion.mjs` the sprint floor only covers
  *Shipped* epics: `status === 'Shipped' && sp.status === 'Planned' ? 'Shipped' : sp.status`. An **Archived**
  epic (`neon-egress-and-db-isolation`, frontmatter `archived`) keeps its un-started sprints as `Planned`, and
  the **Sprints board groups by `Status`** → they land in the Planned column.
- **Stale "In review" + rarely-updating "In progress":** the live overlay properties **exist** (`Lifecycle`
  Select = ["In review"], `PR link` URL) and `notion-pr-sync.yml` writes them on PR events — **but no view
  groups or filters by `Lifecycle`.** The Epics + Sprints boards group by **`Status`**, which is docs-derived
  (changes only on push-to-main re-sync; epic `Status` = README frontmatter set at close; sprint `Status` =
  story ticks done at close). So the live axis is invisible and the docs axis lags → both columns go stale.
  `Lifecycle` also has no "In progress" option, so there's no live in-progress signal at all.
- **Build-order view:** "Epics" and "Sprints" board views exist (grouped by `Status`; Sprints sorted by Epic →
  Name) but **none is ordered by build order**, and `Build order ID` is sparsely populated (projection reads
  only `seed.build_order`, usually null).

## What already exists (reuse, don't rebuild)
| Capability | Where | Reuse for |
|---|---|---|
| The one-way docs→Notion projection (epic/sprint/seed grains, status derivation, `--extract` testable core, `--sync`, scoped `--pr` overlay) | `scripts/roadmap-to-notion.mjs` | Fix the floor (S1.1); extend `--pr` for an "In progress" lifecycle (S1.3); read epic `build_order` (S1.2) |
| The live overlay workflow (PR open → `Lifecycle`/`PR link`; clear on close) | `.github/workflows/notion-pr-sync.yml` | Send "In progress" for **draft** PRs, "In review" for **ready_for_review** (S1.3) |
| The full-rebuild sync workflow (push-to-main + nightly + dispatch) | `.github/workflows/notion-sync.yml` | Unchanged — it already leaves `Lifecycle` alone |
| The Notion DB + its existing properties & views | `Marketplace Roadmap` DB (`eb68a1fd…`): `Status`, `Lifecycle`, `PR link`, `Build order ID`, `Epic`/`Sprints` relations, `Grain`; Epics/Sprints board views | Add the "Board status" formula + "In progress" option + build-order views (S2) |
| The status-SSOT convention + `BUILD-ORDER.md` generator | `roadmap-to-notion.mjs`, `scripts/build-order.mjs`, WAYS §Documentation map | `build_order` SSOT lives in epic README frontmatter, like `status` |
| "infra's deterministic gate is a pure `node:test`" | `LEARNINGS.md` | S1's floor + lifecycle logic get free coverage via `--extract` assertions |

## Medusa-first reframe (AGENTS five-rule check)
**N/A — zero commerce/app surface.** Pure docs-tooling + Notion config. Rules 1–4 untouched; rule 5 N/A
(no user copy — Notion board labels are internal).

## In scope (v1)
- **Fix the archived-epic sprint floor** so an Archived epic's sprints project as **Archived** (not Planned).
- **Extend the live overlay to "In progress"** — `roadmap-to-notion.mjs --pr` accepts the lifecycle value;
  `notion-pr-sync.yml` sends **"In progress" for draft PRs**, **"In review" for ready-for-review**, clears on close.
- **A merged "Board status"** the boards group by — a Notion **formula** = `Lifecycle` if set, else `Status`
  (so the live overlay wins while a PR is open, and it falls back to docs truth otherwise). Add the
  **"In progress"** option to `Lifecycle`.
- **Populate a numeric `build_order`** (SSOT = epic README frontmatter `build_order:`), projected to the
  `Build order ID` property; add **build-order views** (epics ordered by build order; sprints nested under their
  epic, in order).
- A pure `node:test` (or `--extract` assertion) covering the floor fix + the lifecycle mapping.

## Out of scope (v1)
- Two-way sync / editing the board as a source of truth (docs stay the only SSOT).
- Re-architecting the projection grains or the status vocabulary.
- Backfilling `build_order` for **every** historical epic in one go (populate active/near-term first; shipped/
  archived can default to a high/!null value or be backfilled incrementally) — confirm scope (open question 2).
- Any app/commerce change.

## Slicing — skateboard → car (2 sprints, both LOW)
Monorepo-root repo (`scripts/`, `.github/`, `Roadmap/`) for S1; **Notion-side config** for S2. QA = pure
`node:test`/`--extract` for S1; a board eyeball + a re-sync for S2.

### Sprint 1 — Projection & overlay fixes (repo) · **risk: LOW**
- **S1.1 — Archived floor fix.** In `roadmap-to-notion.mjs`, an Archived epic's sprint rows project as
  `Archived`. *Acceptance:* `--extract` shows `neon-egress-and-db-isolation` sprints as Archived, not Planned.
  *QA:* `node:test`/`--extract` assertion.
- **S1.2 — `build_order` SSOT + projection.** Read epic README frontmatter `build_order:` (fallback
  `seed.build_order`); emit it on epic **and** sprint rows. Populate the sequence for active/near-term epics.
  *Acceptance:* `--extract` rows carry the numeric build order. *QA:* assertion + a doc pass assigning the order.
- **S1.3 — "In progress" lifecycle overlay.** `--pr` accepts the lifecycle label; `notion-pr-sync.yml` sends
  "In progress" for **draft** PRs and "In review" for **ready_for_review** (clear on close). *Acceptance:* a
  draft PR sets `Lifecycle="In progress"`; marking ready flips it to "In review"; merge clears it. *QA:*
  `--dry` preview + a real PR smoke (owed to Daniel).

### Sprint 2 — Notion board config (operational, via the Notion MCP/UI) · **risk: LOW**
- **S2.1 — DB props.** Add `Lifecycle` option **"In progress"**; add a **"Board status"** formula
  = `if(empty(Lifecycle), Status, Lifecycle)`. *(If Notion can't group a board by a formula, fall back to a
  Select that the projection/overlay writes — open question 3.)* *Acceptance:* the formula resolves per row.
- **S2.2 — Regroup boards.** Group the **Epics** and **Sprints** boards by **Board status** (so live In
  progress/In review show and Archived is its own column). *Acceptance:* `neon-egress` sprints show under
  Archived; an open draft PR's epic shows under In progress.
- **S2.3 — Build-order views.** An **Epic build-order** view (Grain=Epic, sorted by Build order ID) and a
  **Sprint build-order** view (Grain=Sprint, grouped by Epic, sorted by Build order ID then sprint number).
  *Acceptance:* both render in build order. *QA:* eyeball after a `--sync` re-run.

## Risk tier (WAYS §6 / groom Stage 6)
**LOW** throughout — docs-tooling + Notion config; no app/commerce/money/auth/DB. Caveat: S1.3 edits the live
`notion-pr-sync.yml` (a shared workflow) — announce it; it stays advisory/non-gating to PRs.

## Open questions (validate before/at the sprint — don't assume)
1. **Lifecycle granularity:** is **draft = In progress / ready = In review** the mapping you want, or should
   *any* open PR = In review and "In progress" be driven another way (e.g. frontmatter at sprint start)?
2. **build_order backfill depth:** populate just active/near-term epics now (rest default high/unset), or
   assign the full sequence across all ~52 epics? (The ordering itself is a product-priority call — yours.)
3. **Formula grouping:** confirm whether your Notion plan lets a **board group by a formula** property; if not,
   we use a written "Board status" Select kept in sync instead (slightly more moving parts).
4. **Who executes S2:** via the Notion MCP (I can do it from Cowork) or by you in the Notion UI? (S1 is a normal
   Claude Code repo sprint; S2 is Notion-side.)

## Research note
No external standard load-bearing. The "research" was reading the live Notion DB schema/views + the projection
code — done. The Notion query API (SQL mode) needs an Enterprise plan, so verification of S2 is an eyeball/
`--sync` re-run, not a programmatic assert.

## Definition of Ready — checklist
- [x] "As a / I want / so that" clear; acceptance testable by Daniel (archived epic's sprints show Archived;
      a draft PR shows In progress; build-order views render in order).
- [x] Stage-2.5 bucket named (light code + Notion config).
- [x] v1 in/out boundary written (two-way sync, full backfill, grain re-architecture out).
- [x] Reuse list produced (the projection, both workflows, the existing DB props/views).
- [x] Each story risk-tiered (LOW); QA named (`node:test`/`--extract` for S1; board eyeball for S2; PR smoke owed to Daniel).
- [ ] **Daniel approves this scope doc** → then scaffold the epic + 2 sprint docs and emit the kickoffs.
