---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: {{SLUG}}
---

# Epic: {{TITLE}}

> **Area:** {{MACRO}} · **Risk:** {{RISK}} · **Scope seed:** [`00-ideas/seeds/{{SLUG}}.md`](../../00-ideas/seeds/{{SLUG}}.md)
<!-- Optional: if this epic was tagged at grooming (see spike-role-archetypes.md), append
     " · **Archetype:** <Prototyper|Builder|Sweeper|Grower|Maintainer>" to the line above.
     Omit entirely for the Builder default — untagged is fine. -->

## Why
<!-- One paragraph: the outcome this epic delivers and for whom. Plain product language, no tech. -->

## Medusa-first note
<!-- Does Medusa already model this? Which primitive backs it? (AGENTS rule #1) -->

## What already exists (reuse, don't rebuild)
<!-- Concrete files / routes / primitives the Medusa-first reframe surfaced. -->
-

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
{{SPRINT_LIST}}

## Deploy order
<!-- Backend-first? Frontend degrade gracefully? Preview vs prod. -->

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (only if one was planned at grooming — Stage 6b):** the flag slice shipped + the flag
      exists in Flagsmith / Edge Config with the stated polarity. *Verify-only — not a new gate; whether a
      high-risk epic needs one is decided at grooming, not here.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
