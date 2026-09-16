---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: build-visualization-claude-mods
build_order: 6
---

# Epic: The build view — a machine-readable frontmatter contract, rendered in the CLI as a Claude Mod

> **Area:** 09-platform-infra · **Risk:** low · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/build-visualization-claude-mods.md`](../../00-ideas/seeds/build-visualization-claude-mods.md)
> **Appetite:** M (one wave — architect session + builder fan-out + one review round) · **Bet:** [`bets/wave-2026-09-16.md`](../../bets/wave-2026-09-16.md)

> ⛔ **Stacks on** [`plugin-audit-and-extraction`](../plugin-audit-and-extraction/README.md) — this epic
> changes the `groom` scaffolder templates and extends `doc-format.mjs`, both of which that epic
> touches. Code lands in `dobby-foundation`; the backfill touches `medusa-bonsai` and `golden-beans`.

## Why

While an agent builds, the CLI should show what it is working on at an executive level — the epic,
the story and its user story, progress through the sprint, and a status like *Locking architecture /
Building / In review / Shipped*.

**The renderer is nearly here. The data is not.** Claude Mods are confirmed and committed to ship "on
the scale of weeks": plugins using **function hooks**, declared in `hooks/hooks.json`, written in
TypeScript against a middleware/continuation model (`on('ui.render', …)`, `on('turn.start', …)`,
`$.ui.status`, `$.ui.log`, `$.store.get/set`, `$.fs.readFile`), validated offline with
`claude plugin validate`, gated today behind `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`.

But what the docs carry today is this, and only this:

```yaml
# epic README.md — the ENTIRE frontmatter
---
status: shipped   # scaffolded | in-progress | shipped | archived
slug: arranged-only-delivery
---
```

`sprint-N.md` files have **no frontmatter at all** — epic, risk and status live in bold prose. Story
status is an inline `✅ MERGED — backend 21b1874 (PR #84 squash)` appended to a `### S1.1 —` heading.
The user story is prose inside the story block. **Nothing anywhere says which story is in flight.**

A mod built on today's docs would scrape bold markdown, break the first time someone reworded a
sprint header, and **report confidently while being wrong**.

**So: the frontmatter contract is the epic. The mod is the last sprint.** That ordering is also the
insurance — the contract feeds `build-order.mjs`, `doc-format.mjs`, `epic-dod.mjs` and the Notion
projection, so **if function hooks slip, Sprints 1–3 still ship and still pay.**

## The status ladder

Executive-level, and — the important property — **each status maps to a cadence event the docs
already mandate**, so the mod reads the process rather than becoming a second source of truth.

| Status | Entered when | Already observable? |
|---|---|---|
| `Shaping` | groom running, before the scope-doc gate | seed `status: ready` |
| `Locking architecture` | the epic-mode orchestrator is writing `D1…Dn` into the epic README | ✅ a real, named step in WAYS-OF-WORKING |
| `Building` | first story commit on `feat/<slug>` | ✅ git |
| `Verifying` | the deterministic gate is running (tsc + build + tests) | ✅ CI |
| `In review` | PR open with findings outstanding | ✅ `gh` |
| `Shipped` | merged **and deployed** — the doctrine's own *"done means shipped"* | 🟡 needs the deploy confirm |

Six, not four. `Locking architecture` and `Verifying` are the two the existing cadence makes free, and
dropping them would hide the most interesting minutes of an epic-mode run. **`Shipped` is deliberately
not `Merged`**: the docs already insist a merged-but-undeployed PR isn't done, and a ladder that said
"Deployed" when it meant "merged" would quietly contradict that.

## The target render

```
Currently building
  Epic     Arranged-only delivery            04 · Shipping & Delivery · risk HIGH
  Story    S2.1 — Agent surface parity
           As a buyer's agent, I want checkout options to reflect arranged-only listings,
           so that I'm never offered a carrier rail the seller can't fulfil.
  Progress Story 4 of 7 · Sprint 2 of 2
  Status   Building
```

## Platform-first note

**~70% of the value is a frontmatter schema plus a guard, and both have existing homes.**

- `groom/scaffold-epic.mjs` + `templates/` already generate the docs, and CI already renders a
  throwaway epic on every run to prove the templates still substitute. Widening the schema rides that.
- `doc-format.mjs` already validates epic docs against those exact templates — it exists *because*
  hand-edited epic READMEs drift away from them. Extending it is the natural home for enforcement.
- `build-order.mjs` already parses epic frontmatter across the whole corpus. **The frontmatter reader
  exists.**
- The `status:`-as-SSOT rule is **already established doctrine**. This epic widens the schema; it does
  not invent the concept.
- `session-note.mjs`'s intent journal (ported by the previous epic) is already the doctrinal answer to
  "what can't be derived".

## What already exists (reuse, don't rebuild)

- `groom/scaffold-epic.mjs`, `templates/{epic-README,sprint-N,RETROSPECTIVE}.md`, and the generator
  tests in `ci.yml`.
- `medusa-bonsai/scripts/doc-format.mjs` (ported by the previous epic).
- `template/scripts/build-order.mjs` — the corpus-wide frontmatter reader.
- `medusa-bonsai/scripts/{session-note,session-resume}.mjs` — the intent journal.
- `template/scripts/lib/gh-rest.mjs` — REST-only `gh` reads, already used by the reporting rail.
- `medusa-bonsai/scripts/merge-report.mjs` + the prod-smoke rail — the closest thing we have to a
  deploy confirmation, which `Shipped` needs.

## Architecture decisions to lock before any builder starts

- **D1 — where per-story data lives.** YAML in the sprint frontmatter, or a fenced block per story?
  **Scraping `###` headings is what we are escaping**, so the decision must produce something a
  parser owns. Locked against the real corpus, read first — 80+ epics with varying story shapes.
- **D2 — how "which story is in flight" is derived.** Three options: the last commit's `S<n>.<m>`
  prefix (cheap; needs a commit convention we nearly have), an explicit agent write (accurate;
  another thing to forget), or the `session-note.mjs` journal (already doctrine: *journal intent,
  derive the rest*). **Recommendation: derive from commits, fall back to the journal.**
- **D3 — the mod is a thin renderer.** All logic lives in `build-state.mjs` — plain Node, testable,
  useful on its own. The hook file only renders. **Function hooks are pre-release; if the API moves,
  one thin file changes.** This is structural mitigation, not optimism.
- **D4 — latency budget.** Derive on `turn.start`, cache in `$.store`, invalidate on branch change or
  a `Roadmap/` write. **Never shell out to `gh` inside a hook.**
- **D5 — the backfill's failure policy.** 80+ epics will surface real inconsistencies (prose status
  disagreeing with frontmatter, sprints with no clean story boundaries). Those are **findings,
  recorded**, not blockers — fixing them all is outside the appetite.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Epic README frontmatter schema | low |
| 1 | 1.2 `sprint-N.md` frontmatter — it has none today | low |
| 1 | 1.3 The per-story block (D1) | low |
| 1 | 1.4 The six-value status ladder, written not inferred | low |
| 1 | 1.5 `groom` scaffolder templates emit the new shape | low |
| 2 | 2.1 `doc-format.mjs` enforces the contract | low |
| 2 | 2.2 Backfill `medusa-bonsai` (~54 epics) | low |
| 2 | 2.3 Backfill `golden-beans` (~28 epics) | low |
| 3 | 3.1 `build-state.mjs --json` — one resolver | low |
| 3 | 3.2 Story-in-flight derivation (D2) | low |
| 4 | 4.1 `hooks/hooks.json` + the thin renderer | low |
| 4 | 4.2 `claude plugin validate` in CI | low |
| 4 | 4.3 The latency budget, measured | low |

## Deploy order

**No runtime deploy.** Docs, a generator, a check, a resolver and an opt-in plugin hook.

1. **Sprint 1 before Sprint 2** — enforce a schema only once the scaffolder emits it, or every
   existing doc fails on day one.
2. **Sprint 2 before Sprint 3** — `build-state.mjs` reads the contract; backfill first or it resolves
   nothing on real epics.
3. **Sprint 4 last, and independently droppable.** If function hooks haven't landed, Sprints 1–3 ship
   and Sprint 4 waits. **The epic is not blocked on a pre-release API.**

Branches stack: `feat/build-visualization-claude-mods` → `-s2` → `-s3` → `-s4`, cut from the previous
epic's final branch.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch: carve-out (risk: low).** The mod's own gate is its `hooks.json` registration —
      removing the entry disables it with no deploy. Everything else is docs and checks; git is the rollback.
- [ ] **Uninstalling the mod changes nothing about how the docs work.** The contract stands alone.
- [ ] **The mod never shows a status the docs don't.** One source of truth, or it becomes a dashboard
      people stop trusting.
- [ ] Feature branches deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
