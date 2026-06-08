# Epic: {{TITLE}}

> **Area:** {{MACRO}} · **Risk:** {{RISK}} · **Scope seed:** [`00-ideas/seeds/{{SLUG}}.md`](../../00-ideas/seeds/{{SLUG}}.md)

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
- [ ] Feature branch deleted; seed frontmatter `status: shipped`
