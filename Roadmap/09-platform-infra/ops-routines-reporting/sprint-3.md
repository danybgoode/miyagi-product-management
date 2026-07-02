# Ops routines & reporting — Sprint 3: the weekly exec recap/retro

**Status:** ✅ Built + merged — the deterministic gate is green; the first live scheduled fire is
owed to Daniel (same "account creation is mine" split as every prior sprint's routine)

> The epic's last increment: a weekly executive recap/retro to Telegram — the longer-horizon complement to
> the daily standup. Same conventions; weekly trigger.

## Stories

### Story 3.1 — `weekly-recap` skill + `scripts/weekly-recap.mjs` → Telegram ✅ built
**As a** product owner, **I want** a weekly recap/retro in Telegram, **so that** I get an executive view of
what shipped and what's next without assembling it.
**Acceptance:**
- ✅ `scripts/weekly-recap.mjs` gathers the week: merged PRs (all 3 repos, `gh pr list --search
  "merged:>=<date>"`), shipped/closed epics (a `git log -p` scan of `Roadmap/*/*/README.md` for an added
  `+status: shipped`/`+status: archived` line — the frontmatter SSOT `build-order.mjs` already reads),
  a **merges-to-main deploy-count proxy** (per `WAYS-OF-WORKING.md`, merging to `main` *is* the deploy —
  this is exactly what a manual tally would count, and avoids a new Vercel/gcloud API dependency), and a
  short retro digest per shipped epic (the sibling `RETROSPECTIVE.md`'s "## What shipped" first
  paragraph). Posts a formatted weekly HTML message via the Telegram bot.
- ✅ `skills/weekly-recap/SKILL.md` wraps it — model-facing description ("weekly recap", "what shipped this
  week", "weekly retro"), mandatory `## Gotchas` (epic status SSOT = frontmatter not the board; the
  deploy-count proxy is deliberate; the log-commit push-scope requirement).
- ✅ Reuses a **window-tracking** memory log (`scripts/weekly-recaps.log`, JSONL) to avoid double-counting
  across weeks — next run's window starts exactly where the last one's ended, falling back to a trailing
  7 days on first run. Distinct from the standup's delta-snapshot log (a week either happened or didn't;
  there's no diff to take).
- ✅ 17 pure-logic unit tests (`scripts/weekly-recap.test.mjs`) cover the window tracker, the git-log
  status-flip parser, the retro-digest extractor, and message building — fixture-based, no live git/gh/
  network. Picked up automatically by `scripts-guard.yml`'s existing glob.
- ✅ **Live-rehearsed**: `node scripts/weekly-recap.mjs --dry-run --since 2026-06-25T00:00:00Z` ran
  against the real repo and produced a message whose per-repo merged-PR counts (9/32/16) and shipped-epic
  list matched a manual `gh pr list --state merged --search "merged:>=2026-06-25"` + `git log -p --since`
  tally exactly (see walkthrough below).
**Risk:** Low (read-only aggregation + Telegram post).

### Story 3.2 — Weekly trigger for the recap ✅ built
**As a** product owner, **I want** the recap to arrive weekly on its own, **so that** it's a standing ritual.
**Acceptance:**
- ✅ A **dedicated sibling weekly routine** (`scripts/routines/weekly-recap.prompt.md`) invokes
  `weekly-recap` — mirrors Routine C's existing precedent (a standalone weekly schedule) rather than a
  day-of-week-gated step folded into the nightly `ops-nightly` routine, which would need brittle
  "only run on Monday" self-gating logic in an LLM-driven prompt. Weekly cadence is ~0.14 scheduled
  runs/day — negligible against the Pro 5/day cap (`scripts/routines/README.md`'s budget table updated).
- ✅ Runbook (`scripts/routines/README.md`) updated with the weekly stand-up steps (install, trigger —
  Mon 15:30 UTC, env incl. the load-bearing `TELEGRAM_BOT_TOKEN` + the push-beyond-`claude/`-prefix
  grant for the log commit). **Account creation is owed to Daniel** — same split as every prior sprint's
  routine.
- ✅ Advisory/observability only — `scripts/routines.test.mjs` extended to cover the new prompt (house
  format + the "advisory only" banner), still green.
**Risk:** Low.

## Sprint QA
- **api spec(s):** none — no app surface. `node --check scripts/weekly-recap.mjs` green.
  `node --test 'scripts/*.test.mjs' 'scripts/lib/*.test.mjs'` — 82 pass, 0 fail (17 new weekly-recap
  pure-logic cases + every pre-existing one, incl. the now-covered `weekly-recap.prompt.md`).
- **browser smoke owed:** no — no app/browser surface.
- **deterministic gate:** `node --check` + the full `node --test` suite green (exactly what
  `scripts-guard.yml` runs). The live Telegram post is genuinely **owed to Daniel** — `TELEGRAM_BOT_TOKEN`
  and `skills/weekly-recap/config.json` live on his routine environment / shell, not this build sandbox
  (same gap S1/S2 stated honestly for their own first live actions).

## Sprint 3 — Verification walkthrough (do these in order)
Env: the repo scripts + Telegram + `claude.ai/code/routines` (process change; no app deploy).

1. ✅ **Ran live (dry-run)** — `node scripts/weekly-recap.mjs --dry-run --since 2026-06-25T00:00:00Z`
   against the real repo. Produced a full weekly-recap message: **9** merged PRs in
   `miyagi-product-management`, **32** in `miyagisanchezcommerce`, **16** in `medusa-bonsai-backend`
   (deploys: Frontend 32 · Backend 16), and **7** shipped/closed epics with retro-digest excerpts pulled
   from their `RETROSPECTIVE.md`s. **Confirmed:** every count matched a manual
   `gh pr list --repo <each> --state merged --search "merged:>=2026-06-25" --json number | jq length` +
   a manual `git log -p --since=2026-06-25T00:00:00Z -- 'Roadmap/*/*/README.md'` scan for
   `+status: shipped`/`+status: archived` lines — no discrepancy in either direction. The fully-read-only
   `--dry-run` mode never touches Telegram or `scripts/weekly-recaps.log`, exactly as designed.
2. ⬜ **Owed to Daniel** — the real (non-dry-run) `node scripts/weekly-recap.mjs` invocation (needs
   `TELEGRAM_BOT_TOKEN` + `skills/weekly-recap/config.json`'s `chat_id`, neither present in the build
   sandbox), confirming the message actually lands in the MiyagiDevopsTele chat and
   `scripts/weekly-recaps.log` gets a new line committed + pushed to `main`. Not achievable in this
   session (no Telegram credentials here) — same class of gap S1/S2 stated for their own first live runs.
3. ⬜ **Owed to Daniel** — stand up / configure the weekly trigger per
   `scripts/routines/README.md`'s new "Routine weekly-recap" section, and confirm one live scheduled fire
   lands unprompted on its Monday cadence.

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
