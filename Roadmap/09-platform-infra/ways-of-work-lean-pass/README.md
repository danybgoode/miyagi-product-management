---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: ways-of-work-lean-pass
sprints_in: https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/ways-of-work-lean-pass  # sprint docs + retro live in the foundation repo (S1.1)
build_order: 3
---

# Epic: Ways-of-work lean pass — remove the training wheels, close the adoption gap

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Chore · **Archetype:** Sweeper · **Scope seed:** [`00-ideas/seeds/ways-of-work-lean-pass.md`](../../00-ideas/seeds/ways-of-work-lean-pass.md)

> **This epic now lives in `dobby-foundation`** — Story 1.1 gave that repo its own `Roadmap/`:
> [`danybgoode/dobby-foundation` → `Roadmap/09-platform-infra/ways-of-work-lean-pass/`](https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/ways-of-work-lean-pass).
> The architecture lock (D1–D15), sprint docs, smoke walkthroughs and retrospective are there. This
> file keeps only the frontmatter, because it is this repo's board's status SSOT for the epic.

## What it changes in this repo
- Sprint 1: committed permission rules in `.claude/settings.json` with a cited `.claude/permissions-ledger.json`, checked by `scripts/permissions-smoke.mjs`.
- Sprint 2: the review stack — fresh reviewer + one external general pass + one lean external security pass, **money/auth PRs only here** (this repo's operating posture).
- Sprint 3: `WAYS-OF-WORKING.md` rendered from the shared template plus `Roadmap/fill-ins.yml`.

## Definition of Done (epic)
- [ ] Tracked in the foundation copy; this file's frontmatter `status: shipped` set at close (run `node scripts/build-order.mjs`).
