---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: build-visualization-claude-mods
sprints_in: https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/build-visualization-claude-mods  # sprint docs + retro live in the foundation repo
build_order: 6
title: "The build view — a machine-readable frontmatter contract, rendered in the CLI as a Claude Mod"
area: 09-platform-infra
risk: low
type: feature
phase: Shaping
sprints_total: 0
stories_total: 0
---

# Epic: The build view — a machine-readable frontmatter contract, rendered in the CLI as a Claude Mod

> **Area:** 09-platform-infra · **Risk:** low · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/build-visualization-claude-mods.md`](../../00-ideas/seeds/build-visualization-claude-mods.md)

> **This epic lives in `dobby-foundation`** —
> [`danybgoode/dobby-foundation` → `Roadmap/09-platform-infra/build-visualization-claude-mods/`](https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/build-visualization-claude-mods).
> The status ladder, sprint docs and retrospective are there. This file keeps only the frontmatter,
> because it is this repo's board status SSOT for the epic.

## What it changes in this repo

- **Sprint 2, story 2.2 — the backfill.** ~54 epics here gain the new machine-readable frontmatter
  (epic README fields, `sprint-N.md` frontmatter where there is none today, and the per-story block).
  Scripted and spot-checked, never hand-edited; the report lists every doc it could not resolve, with
  a reason, and those are findings rather than blockers.
- `doc-format.mjs` here starts enforcing the widened contract once the scaffolder emits it.
- Nothing else. The generator, the resolver and the mod all ship in the foundation repo.

## Definition of Done (epic)
- [ ] Tracked in the foundation copy; this file's frontmatter `status:` set at close (run `node scripts/build-order.mjs`).
