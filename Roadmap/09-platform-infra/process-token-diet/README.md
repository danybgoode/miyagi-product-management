---
status: scaffolded
slug: process-token-diet
---

# Epic: Process token-diet

> **Area:** 09-platform-infra · **Risk:** low · **Scope seed:** [`00-ideas/seeds/process-token-diet.md`](../../00-ideas/seeds/process-token-diet.md) · **Archetype:** Sweeper

## Why
Stop spending model tokens on invariant boilerplate (kickoff prompts, smoke-walkthrough skeletons) and
right-size the review stack now that the rhythm is sustainable: cross-agent review mandatory everywhere,
the fresh-reviewer pass optional except HIGH tier (Daniel's call, 2026-07-14).

## Medusa-first note
N/A — root-repo scripts + process docs only.

## What already exists (reuse, don't rebuild)
- `skills/groom` (ways-of-work plugin) — Stage-8 kickoff shape + `scaffold-epic.mjs` + `templates/`
- `scripts/cross-review.mjs` + `scripts/lib/cross-agent-cli.mjs` — the mandatory layer, unchanged
- `.claude/agents/pr-reviewer.md` + `scripts/routines/pr-review.prompt.md` — the now-optional layer
- LEARNINGS `isMain`-guard rule for any script with a co-located test

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Kickoff-prompt generator (`emit-kickoff.mjs`) | low |
| 1 | 1.2 Smoke-walkthrough skeleton in the scaffolder | low |
| 1 | 1.3 Review-policy flip in WAYS-OF-WORKING + reviewer prompts | low |
| 1 | 1.4 Doc drift: cadence step 7 still says Vercel prod | low |

## Deploy order
Root repo only. Note: stories 1.1/1.2 change the **plugin-distributed** groom skill — land them in
`danybgoode/dobby-foundation` (the plugin repo), not a resurrected in-repo copy (PR #89 retired those).

## Definition of Done (epic)
- [ ] All sprints merged + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough
- [ ] This README marked ✅; sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md`
- [ ] Feature branch deleted; **frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
