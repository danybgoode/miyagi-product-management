---
title: "Spike — skills-library audit: map to the blog's 9 categories, decide build/reuse/distribute"
slug: spike-skills-library-audit
status: ready
area: "09 · Platform & Infra"
type: spike
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-01
parent: process-iteration-portfolio
---

# Spike — Skills-library audit & conventions

> Child of [`process-iteration-portfolio`](process-iteration-portfolio.md) — Initiative **D**. Class:
> **Spike** (time-boxed investigation → a **written decision** in this doc; no build, no slicing until the
> decision lands). It **sets the skill conventions Initiative B follows**, so it runs before B.

## Mirror-back
> Anthropic's "how we use skills" blog (2026-06-03) buckets skills into 9 categories and gives best
> practices (gotchas sections, progressive disclosure, don't-state-the-obvious, descriptions-for-the-model,
> config.json setup, memory logs, on-demand hooks, distribution via repo vs marketplace). You want to
> specialize/decouple our skills accordingly and find the gaps. Right?

## Why a spike, not a build
There's a real decision under this with no deterministic gate: **which skills to build vs reuse vs skip,
where they live (repo `./.claude/skills` vs a plugin marketplace), and the house conventions** — getting
this wrong means either context bloat (too many checked-in skills) or duplicated logic (skills that overlap
routines/scripts). Decide once, then B builds against it.

## The investigation (deliverables land as a WRITTEN DECISION in this doc)
1. **Inventory** current skills: `skills/groom` (+ `scaffold-epic.mjs`/templates), `.agents/skills/stripe-*`,
   `upgrade-stripe`, the `scripts/routines/*.prompt.md`, `scripts/cross-{review,panel}.mjs`, and the
   available `consolidate-memory`. Tag each to the 9 categories; flag any that **straddle** categories
   (the blog's anti-pattern) and should be decoupled.
2. **Gap map** — for each of the 9 categories, list candidate skills mapped to this repo:
   - 4 · business process → `standup-post`, `weekly-recap` (Initiative B)
   - 5 · scaffolding → audit `skills/groom` scaffolder for gaps; any `new-<thing>` scaffolds missing?
   - 6 · quality/review → **already covered** (Routine A + `cross-review.mjs`) — record, don't rebuild
   - 7 · CI/CD → `babysit-pr`, `build-order-sync` (Initiative B)
   - 8 · runbooks → `<service>-debugging`, `oncall-runner` (which services? backend Cloud Run, Vercel,
     Stripe/MercadoPago webhooks, Supabase)
   - 9 · infra-ops → `vercel-prune` (wrap the script), `cost-investigation` (Neon egress / Vercel functions —
     there are existing epics `neon-egress-and-db-isolation`, `vercel-function-cost-reduction` to reference)
   - 1/2/3 · library-ref / verification / data → note future fits (e.g. a Medusa-v2 gotchas ref, a Playwright
     verification skill), not in this brain-dump's scope
3. **Conventions decision** (the house rules B + A inherit): SKILL.md structure, a mandatory **Gotchas**
   section, progressive disclosure (references/ + scripts/ + assets/ templates), **descriptions written for
   the model** (trigger words), `config.json` for setup (e.g. Telegram chat id), and a **memory log** where
   useful (e.g. `standups.log` so `standup-post` diffs against yesterday).
4. **Distribution decision:** repo-checked-in (`./.claude/skills`) vs an internal **plugin marketplace**.
   The blog's guidance for a small solo repo is checked-in — but each checked-in skill adds session context,
   which collides with Initiative A (trim first). Decide the threshold at which a marketplace is worth it.
5. **Skill↔routine wiring:** confirm the standing pattern — logic in a committed skill, triggered by a
   routine/hook/`/verb`; never duplicate a script's job inside a routine prompt.

## Scope
**In:** the audit, gap map, and the written conventions/distribution decision. **Out:** building any skill
(that's Initiative B and later), any marketplace infra, and categories 1/2/3 (noted as future).

## What already exists (reuse, don't rebuild)
- The blog itself (fetched 2026-07-01) — the 9 categories + tips are the rubric.
- `skills/groom/SKILL.md` — the fullest in-repo skill; the structural reference.
- `scripts/routines/README.md` + the three prompt artifacts — the committed-prompt house format.
- The `cross-agent-planning-panel` (single-pass advisory) + `cross-review` — category-6 coverage already.
- Existing cost epics (`neon-egress-and-db-isolation`, `vercel-function-cost-reduction`) for a `cost-investigation` skill.

## Definition of Ready (spike)
- [x] Class = spike; ends in a written decision, not a build; facts cited (the blog).
- [x] Investigation questions + candidate map written; overlap with shipped work named.
- [ ] Daniel approves → run the investigation; land the WRITTEN DECISION here (build/reuse/skip per
      category · distribution · conventions). Only then does Initiative B build against it.
