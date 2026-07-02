# Ops routines & reporting — Sprint 3: the weekly exec recap/retro

**Status:** ⬜ not started

> The car's last increment: a weekly executive recap/retro to Telegram — the longer-horizon complement to
> the daily standup. Same conventions; weekly trigger.

## Stories

### Story 3.1 — `weekly-recap` skill + `scripts/weekly-recap.mjs` → Telegram
**As a** product owner, **I want** a weekly recap/retro in Telegram, **so that** I get an executive view of
what shipped and what's next without assembling it.
**Acceptance:**
- `scripts/weekly-recap.mjs` gathers the week: merged PRs, closed/ shipped epics (from epic frontmatter
  `status:` flips), deploys, and a short retro digest (notable learnings/gaps). Posts a formatted weekly
  message via the Telegram bot.
- `skills/weekly-recap/SKILL.md` wraps it — model-facing description ("weekly recap", "what shipped this
  week", "weekly retro"), mandatory `## Gotchas` (e.g. epic status SSOT = frontmatter, not the board).
- Optionally reuses a memory log to avoid double-counting across weeks.
- Running it produces a recap whose merged-PR/closed-epic/deploy counts match a manual tally.
**Risk:** Low (read-only aggregation + Telegram post).

### Story 3.2 — Weekly trigger for the recap
**As a** product owner, **I want** the recap to arrive weekly on its own, **so that** it's a standing ritual.
**Acceptance:**
- A weekly trigger (a schedule on the ops routine, or a small sibling weekly routine) invokes `weekly-recap`.
  Weekly cadence is ~0.14 scheduled runs/day — negligible against the Pro cap.
- Runbook updated with the weekly stand-up steps. Account creation owed to Daniel.
- Advisory/observability only.
**Risk:** Low.

## Sprint QA
- **api spec(s):** none. `node --check scripts/weekly-recap.mjs`; one live run vs a manual weekly tally.
- **browser smoke owed:** no.
- **deterministic gate:** `node --check` green; the live weekly post is the confirmation (owed to Daniel).

## Sprint 3 — Verification walkthrough (do these in order)
Env: the repo scripts + Telegram + `claude.ai/code/routines` (process change; no app deploy).

1. Run `node scripts/weekly-recap.mjs` (Telegram env set).
   → A weekly recap posts: merged PRs, closed/shipped epics, deploys, a short retro digest. Counts match a
   manual `gh pr list --state merged` + epic-frontmatter tally for the week.
2. Stand up / configure the weekly trigger (owed to Daniel).
   → The recap arrives on its weekly cadence unprompted.

If any step fails, note the step number + what you saw — that's the bug report.

## Kickoff prompt (paste into a fresh Claude Code session)
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/00-ideas/2. readyforscope/spike-skills-library-audit.md (binding conventions) and
> Roadmap/09-platform-infra/ops-routines-reporting/README.md + sprint-3.md (S1+S2 merged first).
>
> You're building Sprint 3 of "Ops routines & reporting" on feat/ops-routines-reporting. Enter plan mode,
> confirm with me. Follow the D-spike conventions (script-does-work / SKILL.md-wraps / routine-triggers;
> skills/weekly-recap/; mandatory ## Gotchas; model-facing description). B-7: scripts/weekly-recap.mjs
> gathers merged PRs + closed/shipped epics (epic frontmatter status flips) + deploys + a short retro digest
> and posts a weekly Telegram message; skills/weekly-recap/SKILL.md wraps it. B-8: wire a weekly trigger
> (schedule on the ops routine or a sibling weekly routine) and update the runbook; account creation is mine.
> All LOW risk, advisory only. Path-scoped commits. PR declares LOW risk. Update sprint-3.md's smoke
> walkthrough before done; the live weekly post is owed to me. On epic close do the full epic DoD (poster,
> RETROSPECTIVE, LEARNINGS promotion, status: shipped, re-run build-order.mjs). Nothing to tasks/. Escalate
> to Opus on ambiguity instead of guessing.
