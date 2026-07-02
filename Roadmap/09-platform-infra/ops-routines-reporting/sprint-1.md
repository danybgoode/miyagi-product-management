# Ops routines & reporting — Sprint 1: the standup skateboard

**Status:** ⬜ not started

> The thinnest end-to-end slice that ships value: a delta-only **daily standup in Telegram**, triggered by
> one nightly routine. It composes signals from scripts/tools that already exist (`gh`, `build-order.mjs
> --check`, `vercel-prune --age N` dry-run, the smoke result) — no fixer skills yet (those are S2).

## Stories

### Story 1.1 — `standup-post` skill + `scripts/standup.mjs` → Telegram
**As a** product owner, **I want** a daily standup posted to Telegram each morning, **so that** I wake up to
an accurate picture of overnight repo state instead of assembling it myself.
**Acceptance:**
- `scripts/standup.mjs` gathers overnight signals: opened/merged PRs + their CI status (`gh`), the latest
  `browser-smoke.yml` result, build-order drift (`node scripts/build-order.mjs --check`), open-PR count/state,
  and the stale-preview count (`vercel-prune-previews.mjs` dry-run). Posts a **delta-only** formatted message
  via the existing Telegram bot (`lib/telegram.ts` pattern / `TELEGRAM_BOT_TOKEN`+`CHAT_ID`).
- `skills/standup-post/SKILL.md` wraps it — description written for the model ("post the standup", "daily
  standup", "what happened overnight"), a mandatory `## Gotchas` section.
- **Memory log:** `standups.log` (append-only) so each run diffs against yesterday and reports **changes**,
  not a re-dump.
- **`config.json`** holds the Telegram chat id; if unset the skill asks via `AskUserQuestion`.
- Running it once posts a coherent standup to Telegram that matches a hand-check of that day's PRs/CI.
**Risk:** Low (read-only aggregation + a Telegram post; no writes to the repo or infra).

### Story 1.2 — Nightly "ops" routine that triggers the standup
**As a** product owner, **I want** one nightly routine to run the standup automatically, **so that** it
arrives without me triggering it, and we stay well under the Pro scheduled-run cap.
**Acceptance:**
- A `scripts/routines/ops-nightly.prompt.md` (house prompt format) that invokes `standup-post` (S2 adds the
  fixers to this same routine — one routine, not many).
- The routines runbook (`scripts/routines/README.md`) gains stand-up steps: schedule (~after the nightly
  smoke), the Telegram env + `api.telegram.org` allow-list, the Pro cap note (this is +1 scheduled run/night).
- **Advisory/observability only** — never gates anything (standing routines discipline).
- Account creation of the routine is **operational, owed to Daniel** (per the runbook); the epic commits the
  prompt + runbook, not the account change.
**Risk:** Low.

## Sprint QA
- **api spec(s):** none — no app surface. `node --check scripts/standup.mjs`; run it once live against a real
  overnight and eyeball the Telegram message vs a hand-check.
- **browser smoke owed:** no.
- **deterministic gate:** `node --check` on the new script; the live standup post is the real confirmation
  (owed to Daniel — he holds the Telegram chat).

## Sprint 1 — Verification walkthrough (do these in order)
Env: the repo scripts + the Telegram bot (process change; no app deploy / production URL).

1. Run `node scripts/standup.mjs` locally (with the Telegram env set).
   → A delta-only standup posts to the Telegram chat: overnight PRs + CI, smoke result, build-order drift,
   open-PR state, stale-preview count. Cross-check one line against `gh pr list` — it matches.
2. Run it again immediately.
   → The second post reflects "no change since last run" (proving the `standups.log` diff works, not a re-dump).
3. Stand up the nightly ops routine in `claude.ai/code/routines` from `ops-nightly.prompt.md` (owed to Daniel).
   → Next morning a standup arrives unprompted.

If any step fails, note the step number + what you saw — that's the bug report.

## Kickoff prompt (paste into a fresh Claude Code session)
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/00-ideas/2. readyforscope/spike-skills-library-audit.md (the WRITTEN DECISION — the
> binding skill conventions), Roadmap/00-ideas/2. readyforscope/ops-routines-reporting.md, and
> Roadmap/09-platform-infra/ops-routines-reporting/README.md + sprint-1.md.
>
> You're building Sprint 1 of "Ops routines & reporting" — the standup skateboard, monorepo-root repo. Enter
> plan mode, confirm with me, then branch feat/ops-routines-reporting off latest main. Follow the D-spike
> conventions exactly: a script does the work (scripts/standup.mjs), a SKILL.md under skills/standup-post/
> wraps it (description written for the model + a mandatory ## Gotchas section), a routine triggers it.
> B-1: scripts/standup.mjs gathers overnight signals (gh PRs+CI, browser-smoke result, `node
> scripts/build-order.mjs --check` drift, open-PR state, vercel-prune dry-run stale count) and posts a
> DELTA-ONLY Telegram message via the existing bot; keep an append-only standups.log so it diffs vs
> yesterday; put the chat id in config.json (fall back to AskUserQuestion if unset). B-2: author
> scripts/routines/ops-nightly.prompt.md that invokes standup-post, and update scripts/routines/README.md
> with the stand-up steps + Telegram env + api.telegram.org allow-list + the +1/night cap note. Advisory
> only — never a gate. Account creation of the routine is mine (operational). Path-scoped commits. Open a PR
> declaring LOW risk. Write the SPRINT SMOKE WALKTHROUGH into sprint-1.md before done; the live Telegram
> confirmation is owed to me. Write nothing to tasks/. If a story hits real ambiguity or a money/auth path,
> stop and ask / escalate to Opus rather than guessing.
