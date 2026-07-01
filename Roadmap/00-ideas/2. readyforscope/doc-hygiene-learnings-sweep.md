---
title: "Doc hygiene — LEARNINGS/README de-noise sweep + a rolling doc-hygiene skill"
slug: doc-hygiene-learnings-sweep
status: ready
area: "09 · Platform & Infra"
type: chore
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-01
parent: process-iteration-portfolio
---

# Scope — Doc hygiene sweep + rolling maintenance

> Child of [`process-iteration-portfolio`](process-iteration-portfolio.md) — Initiative **A**. Class:
> **Chore** (small epic: a one-time sweep + a standing skill). **Stage-2.5: light-enhancement** — the
> rolling half already exists (weekly Routine C + the `consolidate-memory` skill); the one-time sweep is
> new but bounded. **Confirmed target: `LEARNINGS.md`** (Daniel, 2026-07-01), plus the `README.md` poster.

## Outcome & signal
Every session starts cheaper: the always-read docs (`LEARNINGS.md`, the `README.md` poster) are tighter and
de-duplicated, **with no durable learning lost**, and a repeatable **`doc-hygiene` skill** keeps them from
re-bloating. Signal: token count of the always-read set drops measurably; a diff shows only noise removed;
the next weekly hygiene run can call the skill and report drift.

## Stage-2.5 bucket
**light-enhancement.** Reuse Routine C (weekly roadmap/Notion hygiene) as the trigger and the
`consolidate-memory` skill's reflective-pass pattern; add a `doc-hygiene` skill scoped to the big
session-start docs. Corrected referent: repo `memory/MEMORY.md` is 3 lines — **not** the problem;
`LEARNINGS.md` (~1,125 lines / 114 KB) and the poster (114 KB) are.

## Scope
**In v1:**
- **Story 1 — the sweep (one-time).** A de-noise pass on `LEARNINGS.md`: merge near-duplicate lines, prune
  stale/superseded entries, tighten wording, verify every retained line still maps to a real retro. Produce
  a **reviewable diff + a short "what was removed and why" note** — no silent deletions. Same lighter pass on
  the `README.md` poster (drop dead lines, keep ✅=enforced-in-code accuracy).
- **Story 2 — the `doc-hygiene` skill (standing).** A committed skill (`skills/doc-hygiene/` or
  `scripts/routines/` prompt, per the D-spike's convention) that: measures the size of the always-read set,
  flags dedupe/staleness candidates in `LEARNINGS.md`/poster, and emits an advisory report (like the
  existing `HYGIENE-REPORT-*.md`). Weekly Routine C invokes it; output is a proposal, never an auto-edit.

**Out of v1:**
- Restructuring macro-section epic docs or `.claude/context/*.md` (separate pass if wanted later).
- Any `tasks/` or code edits; auto-applying prunes (status/content changes stay a human merge — the
  standing HYGIENE-REPORT rule).
- The memory-store consolidation itself — that's the `consolidate-memory` skill's job, noted as a parallel
  lever, not rebuilt here.

## What already exists (reuse, don't rebuild)
- **Weekly Routine C** + `scripts/routines/roadmap-hygiene.prompt.md` — the trigger + the house pattern for a
  hygiene pass that opens a `claude/` docs PR.
- **`HYGIENE-REPORT-2026-06-24.md` / `-06-29.md`** — the dated advisory-report format to mirror.
- **`consolidate-memory` skill** (available) — the reflective merge/prune/index pattern for memory files.
- **`scripts/build-order.mjs` / `roadmap-to-notion.mjs`** — already keep derived views in sync; the sweep
  must not fight them (touch source docs, let the generators re-derive).
- Related seeds: `seeds/repo-hygiene-and-build-order.md`, `seeds/process-scaffolding-and-00-ideas.md`.

## Acceptance criteria
- `LEARNINGS.md` + poster are smaller (report the before/after line + KB counts) with a reviewed diff; Daniel
  confirms no durable learning was dropped.
- The `doc-hygiene` skill runs on demand and via weekly Routine C, emitting an advisory report; it never
  auto-edits.
- A follow-up session's start-cost is demonstrably lower (spot-check the always-read set).

## Open risks / research
- **Don't over-prune.** LEARNINGS is load-bearing institutional memory; bias to merging/tightening over
  deleting, and keep the "why + date/source" on every retained line (the file's own convention).
- Sequence **before** loading many new skills (Initiative D/B) — skills add session context, so trim the
  always-read set first.
- Decide skill home (repo `./.claude/skills` vs marketplace) in step with the **D-spike** conventions.

## Definition of Ready
- [x] Two clear stories, each testable by Daniel; Stage-2.5 bucket named; in/out written; reuse produced.
- [x] Risk = low (docs only; proposals not auto-edits). Target confirmed = `LEARNINGS.md` + poster.
- [ ] Daniel approves → scaffold a small epic (S1 sweep · S2 `doc-hygiene` skill) under `09-platform-infra`.
