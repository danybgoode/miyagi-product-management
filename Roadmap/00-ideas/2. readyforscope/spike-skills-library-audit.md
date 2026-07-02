---
title: "Spike — skills-library audit: map to the blog's 9 categories, decide build/reuse/distribute"
slug: spike-skills-library-audit
status: shipped
area: "09 · Platform & Infra"
type: spike
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-02
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
- [x] Daniel approves → run the investigation; land the WRITTEN DECISION here (build/reuse/skip per
      category · distribution · conventions). Only then does Initiative B build against it.

---

## WRITTEN DECISION (spike close, 2026-07-02)

### 0. Source verified
Re-fetched the actual post — [Anthropic, "Lessons from building Claude Code: How we use skills"](https://claude.com/blog/lessons-from-building-claude-code-how-we-use-skills) (`claude.com/blog`) — rather than trusting the mirror-back from memory. It confirms the 9 categories exactly as this doc's gap-map skeleton already assumed:

1. Library and API reference
2. Product verification
3. Data fetching and analysis
4. Business process and team automation
5. Code scaffolding and templates
6. Code quality and review
7. CI/CD and deployment
8. Runbooks (symptom → structured investigation report)
9. Infrastructure operations

Best-practice guidance confirmed verbatim: **Gotchas is the highest-signal section** ("update it as you hit edge cases"); **progressive disclosure** = use the filesystem as context engineering (folders for scripts/references/assets, not one giant file); **don't state the obvious** (skip what Claude already knows — write what's non-default or org-specific); **descriptions are written to trigger the agent**, not to summarize for a human reader (include literal activation keywords); **`config.json`** holds user-specific setup, falling back to `AskUserQuestion` when unset; **memory logs** (append-only text/JSON) let a skill avoid redoing work across runs; **on-demand hooks** are session-scoped guardrails a skill can install only while it's active; **distribution** is checked-in-repo for small teams, an internal marketplace once you need scalable, selective install across teams.

### 1. Inventory — tagged to the 9 categories
| Item | Category | Shape | Note |
|---|---|---|---|
| `skills/groom` | **4** (business process) + touches **5** (scaffolding, via `scaffold-epic.mjs`) | Full 9-stage agentic skill | Acceptable straddle — scaffolding is one step inside the planning workflow it owns, not a competing concern. Uses `## Guardrails`, not `## Gotchas` (see §3). |
| `skills/doc-hygiene` | **8** (Runbooks — measure → flag → structured report) | Thin skill (SKILL.md + one script) | Already has a `## Gotchas` section — the reference shape for future thin skills. |
| `.agents/skills/stripe-best-practices` (symlinked from `skills/`) | **1** (library/API reference) | Reference doc, no executable automation | Vendored/shared skill, not repo-original — lives at `.agents/skills/`, `skills/` just symlinks it in. |
| `.agents/skills/stripe-projects` | **1**, light touch of **9** (provisioning) | CLI-wrapper skill (allow-listed `stripe` commands) | Same vendored-skill home as above. |
| `.agents/skills/upgrade-stripe` | **1** (library/API reference — version migration) | Reference doc | Same vendored-skill home. |
| Routine A (`scripts/routines/pr-review.prompt.md`) | **6** (quality/code review) | Routine prompt, not a `SKILL.md` | Advisory PR comments; mirrors `cross-review.prompt.md`'s rubric. |
| Routine B (`scripts/routines/smoke-triage.prompt.md`) | **8** (Runbooks) | Routine prompt | Nightly: red smoke → diagnosis → draft PR. Same shape as `doc-hygiene` (measure/diagnose → report), just event-triggered instead of on-demand. |
| Routine C (`scripts/routines/roadmap-hygiene.prompt.md`) | **9** (infra-ops / maintenance) | Routine prompt, now **invokes** the `doc-hygiene` skill as one step | Correctly composes a skill rather than re-implementing its logic — the standing wiring pattern (§5). |
| `scripts/cross-review.mjs` / `cross-panel.mjs` | **6** (quality/review) | Scripts, not skills (no `SKILL.md`) | Already the category-6 answer per the original gap-map — confirmed, not rebuilt. |
| `scripts/lib/cross-agent-cli.mjs` | *(not a skill)* | Shared library | Infrastructure code both cross-agent scripts import — correctly not duplicated. |
| `scripts/build-order.mjs`, `scripts/vercel-prune-previews.mjs` | **9** (infra-ops) — **no skill wrapper today** | Scripts only | Real, low-urgency gap: both are invoked directly (`node scripts/x.mjs`); a thin wrapping skill is optional polish, not a blocker. |

No skill in the repo straddles categories badly enough to need decoupling right now — `groom`'s 4↔5 overlap is the one to watch if it keeps growing (see `LEARNINGS.md`'s anti-monolith guard precedent: decompose when a file/skill creeps, don't let the cap creep with it).

### 2. Gap map — per category, confirmed against the live repo (not guessed)
- **1 · library-ref** — covered for Stripe (3 skills). A Medusa-v2-gotchas reference skill does **not exist** — real future candidate, not urgent (Medusa gotchas currently live distilled in `LEARNINGS.md` § Medusa gotchas, which already serves this need at the "always-read" layer).
- **2 · verification** — no Playwright/Medusa-specific verification skill exists, but the generic built-in `verify` skill (launch the app, drive the feature, observe) already covers this layer for this project size. Not a gap worth a bespoke skill yet.
- **3 · data/analysis** — no candidate scoped anywhere in `00-ideas/`. Confirmed out of scope, as the spike said.
- **4 · business process** — `standup-post`, `weekly-recap`, `babysit-pr` are named in `process-iteration-portfolio.md` / `ops-routines-reporting.md` as Initiative B candidates. **Confirmed they do not exist yet** — real gap, but building them is explicitly Initiative B's job, not this spike's.
- **5 · scaffolding** — `groom`'s `scaffold-epic.mjs` already covers the one scaffolding need (epics). No other `new-<thing>` scaffold gap found.
- **6 · quality/review** — already covered (Routine A + `cross-review.mjs` + `cross-panel.mjs`). Confirmed, don't rebuild.
- **7 · CI/CD** — `babysit-pr` and `build-order-sync` (Initiative B) don't exist as skills yet; `scripts/build-order.mjs` exists as a bare script. Same "confirmed gap, not this spike's job to build" as category 4.
- **8 · runbooks** — Routine B (smoke-triage) and the new `doc-hygiene` skill already establish this shape. A broader `<service>-debugging`/`oncall-runner` skill (backend Cloud Run, Vercel, Stripe/MercadoPago webhooks, Supabase) is a real future candidate — no existing coverage, not urgent (Cloud Run/Vercel dashboards + `LEARNINGS.md`'s tooling-gotchas section currently substitute).
- **9 · infra-ops** — `vercel-prune-previews.mjs` has no skill wrapper (candidate: wrap it); a `cost-investigation` skill referencing the existing cost epics (`neon-egress-and-db-isolation`, `vercel-function-cost-reduction`) doesn't exist. Both low-urgency — the scripts/epics already work standalone.

### 3. Conventions decision (binding for every skill built from here on)
- **SKILL.md structure**: YAML frontmatter with `name` + a `description` **written for the model** (trigger words/phrases a request would actually use — e.g. doc-hygiene's description lists "check doc hygiene", "measure LEARNINGS size", "is LEARNINGS bloated again"). This is already how `groom` and `doc-hygiene` are written — keep doing it.
- **A `## Gotchas` section is mandatory** on every new skill, using that exact heading (matches the blog's own naming so it's recognizable across the org, not just this repo). `groom`'s existing `## Guardrails` section is functionally the same thing and is **not** being renamed retroactively (churn for no benefit) — but the next time `groom`'s SKILL.md gets a substantive edit, fold `## Guardrails` into a `## Gotchas` heading for consistency.
- **Progressive disclosure**: once a skill needs more than SKILL.md + one script, split into `references/`, `scripts/`, `assets/` subfolders (mirrors `groom/templates/`). A thin single-script skill (like `doc-hygiene`) staying as `SKILL.md` + one `.mjs` is correct as-is — don't force subfolders prematurely.
- **Descriptions for the model, not for a human reader** — confirmed convention, no change needed.
- **`config.json`**: adopt for any *future* skill needing user-specific setup (e.g. a Telegram chat id for a notification skill). No currently-built skill needs one — env vars cover today's cases.
- **Memory log**: adopt as a pattern where a skill benefits from remembering its own past runs (e.g. a future `standup-post` diffing against yesterday's log). Not needed by any skill built so far.
- **On-demand hooks**: noted as available for a future skill that needs a session-scoped guardrail (e.g. blocking a destructive command only while that skill is active). No current skill needs one.

### 4. Distribution decision
**Stay repo-checked-in.** Two valid homes, both already in use — keep both:
1. **`skills/<name>/` directly** — for repo-original skills (`groom`, `doc-hygiene`). New repo-authored skills go here.
2. **`skills/<name>` symlinked to `.agents/skills/<name>`** — for vendored/shared skills (the three Stripe skills). Use this pattern only for skills that come from outside this repo's own authorship (a vendor, a shared org-wide skill), not as an alternative for new repo-original work.

An internal plugin marketplace is **not worth it yet** — the blog's own threshold ("scalable distribution where teams select which to install") doesn't apply to a solo/small-team repo with ~2 repo-original skills. Revisit if the skill count grows past roughly 15–20, or if a second team/repo needs to selectively install a subset rather than getting everything checked in.

### 5. Skill↔routine wiring — confirmed standing pattern
Logic lives in a **committed script** (`scripts/doc-hygiene.mjs`, `scripts/build-order.mjs`, `scripts/cross-review.mjs`); a **skill** (`SKILL.md`) is the model-facing wrapper that knows when to run it and how to interpret the output; a **routine** (`scripts/routines/*.prompt.md`) is what triggers it on a schedule/event. A routine must **invoke** the skill/script, never re-implement its logic inline — `roadmap-hygiene.prompt.md`'s new step 4 (invoking `doc-hygiene`) is the reference example of this wiring done right, just shipped in the prior sprint.

### What this unblocks
Initiative B (`standup-post`, `weekly-recap`, `babysit-pr`, `build-order-sync`) and Initiative C (`<service>-debugging`/`oncall-runner`) can now be groomed and built against these conventions — repo-checked-in under `skills/<name>/`, mandatory `## Gotchas`, descriptions written for the model, script-does-the-work/skill-wraps-it/routine-triggers-it. No skill build happens in this spike.
