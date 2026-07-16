---
status: scaffolded
slug: build-order-ci-self-heal
---

# Epic: Build-order CI self-heal

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/build-order-ci-self-heal.md`](../../00-ideas/seeds/build-order-ci-self-heal.md)

## Why
An epic-close session that flips a README `status:` without regenerating `BUILD-ORDER.md` reds the
next unrelated PR's CI — almost every time. The guard should heal the derived board, not punish the
next passer-by for a generator nobody ran.

## Medusa-first note
N/A — root-repo tooling only; no commerce surface.

## What already exists (reuse, don't rebuild)
- `scripts/build-order.mjs` — regenerator + `--check` (used unchanged)
- `.github/workflows/build-order-guard.yml` — the failing guard this rewires
- `scripts/build-order-sync.mjs` — stays, for drift landing outside PRs
- The opt-in `.githooks` pre-commit path (unchanged; can't be forced across clones)

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Guard self-heals stale board on PRs, hard-fails on `main` pushes | low |

## Deploy order
Root repo only; merging the workflow change is the deploy.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
