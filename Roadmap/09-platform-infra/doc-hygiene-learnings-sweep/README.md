---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: doc-hygiene-learnings-sweep
---

# Epic: Doc hygiene — LEARNINGS/README de-noise sweep + a rolling doc-hygiene skill

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Scope doc:**
> [`00-ideas/2. readyforscope/doc-hygiene-learnings-sweep.md`](../../00-ideas/2.%20readyforscope/doc-hygiene-learnings-sweep.md)
> · **Portfolio parent:** [`process-iteration-portfolio`](../../00-ideas/2.%20readyforscope/process-iteration-portfolio.md) (Initiative A)

## Why
Agents flag the always-read docs as over-budget. The real bloat (confirmed) is **`LEARNINGS.md`** (~1,125
lines / 114 KB) and the **`README.md` poster** (114 KB), both loaded at session start — not the tiny repo
`memory/MEMORY.md`. This epic does a one-time **de-noise sweep** (dedupe, prune stale, tighten — with a
reviewed diff and **no durable learning lost**) and stands up a repeatable **`doc-hygiene` skill** the weekly
Routine C can call so the files never re-bloat. Every future session starts cheaper.

## Medusa-first note
**N/A — zero commerce surface.** AGENTS rules 1–4 untouched; rule 5 N/A (docs are English by convention).
Touch surface: `Roadmap/LEARNINGS.md`, `Roadmap/README.md`, and a new `doc-hygiene` skill. No app code/infra.

## What already exists (reuse, don't rebuild)
- **Weekly Routine C** + `scripts/routines/roadmap-hygiene.prompt.md` — the trigger + the house pattern for a
  hygiene pass that opens a `claude/` docs PR. The `doc-hygiene` skill plugs into this, doesn't replace it.
- **`00-ideas/HYGIENE-REPORT-2026-06-24.md` / `-06-29.md`** — the dated advisory-report format to emit.
- **`consolidate-memory` skill** (available) — the reflective merge/prune/index pattern to mirror for docs;
  also the parallel lever for the actual memory store (not rebuilt here).
- **`scripts/build-order.mjs` / `roadmap-to-notion.mjs`** — derived views regenerate from source; the sweep
  edits source docs and lets the generators re-derive (don't fight them).
- Related seeds: `seeds/repo-hygiene-and-build-order.md`, `seeds/process-scaffolding-and-00-ideas.md`.

## What already exists — the discipline to honor
`LEARNINGS.md`'s own rule: every retained line keeps its **one-liner + why + date/source**; **dedupe by
sharpening the existing line, don't append a near-duplicate**; status/content changes are a **human merge**
(proposals only, no silent deletes) — same rule the HYGIENE-REPORTs follow.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| [S1](sprint-1.md) | A-1 · One-time de-noise sweep of `LEARNINGS.md` + `README.md` poster (reviewed diff + "removed & why" note; no learning lost) | Low |
| [S1](sprint-1.md) | A-2 · `doc-hygiene` skill — measures the always-read set, flags dedupe/staleness, emits an advisory report; weekly Routine C invokes it (never auto-edits) | Low |

## Deploy order
No deploy — monorepo-root docs + a `skills/doc-hygiene/` (or `scripts/routines/` prompt, per the D-spike's
convention decision). "Shipping" = merged to `main`. Doc/tooling, low-risk tier. **Sequence note:** run the
sweep (A-1) before the wider skills build-out (Initiatives D/B) loads more skills into session context.

## Definition of Done (epic)
- [ ] `LEARNINGS.md` + poster smaller (report before/after line + KB counts) via a **reviewed diff**; Daniel
      confirms no durable learning dropped.
- [ ] `doc-hygiene` skill runs on demand and via weekly Routine C, emitting an advisory report; **never
      auto-edits** (proposals only).
- [ ] A follow-up session's start-cost is demonstrably lower (spot-check the always-read set).
- [ ] Each `sprint-N.md` has its verification walkthrough; this README marked ✅; sprint status ticked w/ refs.
- [ ] `RETROSPECTIVE.md` written; poster updated if needed; team memory + `MEMORY.md` index updated.
- [ ] Durable learning promoted to `LEARNINGS.md` (dedupe — sharpen, don't append).
- [ ] Feature branch deleted; **frontmatter `status: shipped`**; `node scripts/build-order.mjs` re-run.

## Session kickoff
See [sprint-1.md](sprint-1.md) → *Kickoff prompt*.
