---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: plugin-audit-and-extraction
sprints_in: https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/plugin-audit-and-extraction  # sprint docs + retro live in the foundation repo
build_order: 4
title: "Plugin audit + medusa extraction — pay the dark-skill debt, port what's stranded"
area: 09-platform-infra
risk: low
type: chore
phase: Shaping
sprints_total: 0
stories_total: 0
---

# Epic: Plugin audit + medusa extraction — pay the dark-skill debt, port what's stranded

> **Area:** 09-platform-infra · **Risk:** low · **Class:** Chore · **Archetype:** Sweeper · **Scope seed:** [`00-ideas/seeds/plugin-audit-and-extraction.md`](../../00-ideas/seeds/plugin-audit-and-extraction.md)

> **This epic lives in `dobby-foundation`** —
> [`danybgoode/dobby-foundation` → `Roadmap/09-platform-infra/plugin-audit-and-extraction/`](https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/plugin-audit-and-extraction).
> The architecture lock, sprint docs, smoke walkthroughs and retrospective are there. This file keeps
> only the frontmatter, because it is this repo's board status SSOT for the epic.

## What it changes in this repo

**This repo is the source, not the target.** The epic extracts practice that matured here into the
distributable plugin. Nothing here changes except what the extraction needs:

- The scripts being ported are read from here and generalised there: `scripts/routines/` (7 prompts),
  `.githooks/{pre-commit,pre-push}` (the three-stage cost budget), `session-note.mjs`,
  `session-resume.mjs`, `doc-format.mjs`, `owed-ledger.mjs`, and the Tier-2 set.
- **Sprint 3 story 3.3 is the only change owed here:** once the rails are in the template, this repo
  consumes the ported versions instead of keeping its own copies, so no rail ends up with two
  implementations. A divergence that is deliberate is documented with a reason rather than left silent.

## Definition of Done (epic)
- [ ] Tracked in the foundation copy; this file's frontmatter `status:` set at close (run `node scripts/build-order.mjs`).
