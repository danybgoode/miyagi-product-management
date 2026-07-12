---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: process-ux-rails-and-red-green
---

# Epic: Process iteration — UX rails at grooming + observed-red DoD ✅

> **Area:** 09-platform-infra · **Risk:** low · **Archetype:** Maintainer · **Scope seed:**
> [`00-ideas/seeds/process-ux-rails-and-red-green.md`](../../00-ideas/seeds/process-ux-rails-and-red-green.md)
> (approved by Daniel 2026-07-12). Child of the `process-iteration-portfolio` line.

## Why
Two process gaps found by audit (2026-07-12): UX rails exist (design-token CI guard, swept-path
lints, the audits lens) but grooming doesn't systematically name them — the groom skill promises a
"UX heuristics" seed section its own template doesn't have; and nothing verifies an agent-written
test ever went red. Fix both with ~20 lines of docs/templates, no new machinery. See the seed for the
full audit + the BDD-article mapping (what we adopted vs explicitly declined).

## Medusa-first note
n/a — root-repo process docs + groom-skill template only. No app code, no data, no agent surface.

## What already exists (reuse, don't rebuild)
- `skills/groom/SKILL.md` + `templates/scope-seed.md` — the insertion points (Stage 4 reuse-list, seed template).
- `e2e/design-token-foundation.spec.ts` + `lib/design-token-audit.ts` — the enforced token/WCAG guard.
- Seller-portal `enforcedSweptPaths` lint — the incremental-adoption enforcement shape.
- `Roadmap/00-ideas/audits/results-refresh-2026-06/` — the UX lens the block points at.
- WAYS-OF-WORKING story DoD + LEARNINGS — where the observed-red line and the article note land.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1.1 "UX heuristics & rails check" block in the scope-seed template + Stage-4 rails line in groom SKILL.md + WAYS-OF-WORKING pointer | low |
| 1 | US-1.2 Observed-red DoD line in WAYS-OF-WORKING + LEARNINGS one-liner (article cited, dated) | low |

## Deploy order
Root-repo docs only; no deploy, no flag (LOW — carve-out: doc/skill edits, revert = git revert).
Announce anyway: the groom template edit touches every future planning session.

## Definition of Done (epic)
- [x] Stories merged to `main` (commits `d7bd19b`, `a4ca168`)
- [x] This README marked ✅; sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** n/a — LOW, carve-out recorded at grooming
- [x] **This README's frontmatter `status: shipped`**; run `node scripts/build-order.mjs`
