# Ops routines & reporting — Sprint 1: the standup skateboard

**Status:** 🟦 In review — PR open, live Telegram confirmation owed to Daniel

> The thinnest end-to-end slice that ships value: a delta-only **daily standup in Telegram**, triggered by
> one nightly routine. It composes signals from scripts/tools that already exist (`gh`, `build-order.mjs
> --check`, `vercel-prune --age N` dry-run, the smoke result) — no fixer skills yet (those are S2).

## Stories

### Story 1.1 — `standup-post` skill + `scripts/standup.mjs` → Telegram ✅ built
**As a** product owner, **I want** a daily standup posted to Telegram each morning, **so that** I wake up to
an accurate picture of overnight repo state instead of assembling it myself.
**Acceptance:**
- ✅ `scripts/standup.mjs` gathers overnight signals across **all 3 repos** (`miyagi-product-management`,
  `miyagisanchezcommerce`, `medusa-bonsai-backend`): opened/merged PRs + their CI status (`gh`), the latest
  `browser-smoke.yml` result (frontend repo only — the backend has no per-branch preview/Playwright),
  build-order drift (`node scripts/build-order.mjs --check`), open-PR count/state + any red CI on an open PR,
  and the stale-preview count (`vercel-prune-previews.mjs --age 7`, dry-run). Posts a **delta-only** formatted
  HTML message via `api.telegram.org/bot<token>/sendMessage` (same shape as `lib/telegram.ts`'s `tgSend`,
  reimplemented standalone). Each signal degrades to "unavailable" independently rather than failing the run
  (confirmed live: the sandbox had no `VERCEL_API_TOKEN`, and the stale-preview line correctly read
  "unavailable" while every other section still populated).
- ✅ `skills/standup-post/SKILL.md` wraps it — description written for the model ("post the standup", "daily
  standup", "what happened overnight"), a mandatory `## Gotchas` section (5 gotchas: log persistence, gh
  multi-repo auth, the token/config.json secret boundary, the frontend-only smoke, the `--age 7` default
  divergence, and the push-permission dependency for cross-night log persistence).
- ✅ **Memory log:** `scripts/standups.log` (JSONL, append-only) so each run diffs against the last logged
  snapshot and reports **changes**, not a re-dump. Committed + pushed directly to `main` after every
  successful post (path-scoped, data-only commit) so a fresh nightly-routine session has state to diff
  against — see the design decision recorded in this sprint's build.
- ✅ **`config.json`** (gitignored; `config.example.json` checked in as the template) holds the Telegram chat
  id; the skill asks via `AskUserQuestion` if unset. `TELEGRAM_BOT_TOKEN` stays an env var — never written to
  `config.json`.
- ⬜ **Owed to Daniel:** running it once live posts a coherent standup to Telegram that matches a hand-check
  of that day's PRs/CI, and running it again immediately shows "quiet night, no change." I don't hold
  `TELEGRAM_BOT_TOKEN` or the chat id, so this couldn't be executed in this session — see the walkthrough below.
**Risk:** Low (read-only aggregation + a Telegram post + a path-scoped log commit; no writes to app code or infra).

### Story 1.2 — Nightly "ops" routine that triggers the standup ✅ built
**As a** product owner, **I want** one nightly routine to run the standup automatically, **so that** it
arrives without me triggering it, and we stay well under the Pro scheduled-run cap.
**Acceptance:**
- ✅ `scripts/routines/ops-nightly.prompt.md` (house prompt format — HTML-comment header, `---`, second-person
  body, closing failure-ping block matching Routines A/B/C) invokes the `standup-post` skill as its one step
  (S2 will add the fixer skills to this same routine — one routine, not many).
- ✅ `scripts/routines/README.md` gains a fourth routine section: schedule (~10:30 UTC, after both the
  frontend's `browser-smoke.yml` and Routine B), the Telegram env (`TELEGRAM_BOT_TOKEN` + `config.json`
  chat id + optional `TELEGRAM_CHAT_ID` for the failure ping) + `api.telegram.org` allow-list, the
  **push-enabled-beyond-`claude/`-prefix** requirement (new — needed so the log commit persists), and the
  updated Pro daily-cap table/total (now ~2/day, still well under 5).
- ✅ **Advisory/observability only** — the routine's prompt states it merges nothing, gates nothing, and makes
  no code changes; its Telegram post is its entire output.
- ⬜ **Account creation of the routine is operational, owed to Daniel** (per the runbook) — this sprint commits
  the prompt + runbook, not the account change.
**Risk:** Low.

## Sprint QA
- **api spec(s):** none — no app surface. `node --check scripts/standup.mjs` (passed). `node
  scripts/standup.mjs --dry-run` run live against the real repos (gathers via authenticated `gh`, `--dry-run`
  is fully read-only — no log write, no Telegram, no git) — confirmed real signals for all 3 repos, correct
  frontend-only smoke handling, correct build-order drift detection, and correct graceful degradation on the
  Vercel signal when no token was available in this sandbox.
- **browser smoke owed:** no — no app/browser surface.
- **deterministic gate:** `node --check` on the new script (green). The live standup post + the "run twice"
  delta proof is the real confirmation — **owed to Daniel**, who holds `TELEGRAM_BOT_TOKEN` and the chat id.

## Sprint 1 — Verification walkthrough (do these in order)
Env: the repo scripts + the Telegram bot (process change; no app deploy / production URL).

1. `export TELEGRAM_BOT_TOKEN=<the MiyagiDevopsTele bot token>`, then run `node scripts/standup.mjs`.
   → On first run (no `skills/standup-post/config.json` yet), the assisting agent asks for the Telegram chat
   id via `AskUserQuestion` and writes it to `config.json` (or copy `config.example.json` → `config.json`
   yourself and fill in `chat_id` before running). The script then gathers signals from all 3 repos, posts a
   standup to the Telegram chat (overnight PRs + CI, smoke result, build-order drift, open-PR state,
   stale-preview count), appends a snapshot to `scripts/standups.log`, and commits + pushes that log file
   directly to `main`. Cross-check one line (e.g. open-PR count) against `gh pr list --repo
   danybgoode/miyagisanchezcommerce` — it matches.
2. Run `node scripts/standup.mjs` again immediately.
   → The second post reads "🌙 Quiet night — nothing new since the last standup" (proving the
   `standups.log` diff works, not a re-dump). `git log -1 -- scripts/standups.log` shows a second commit.
3. Stand up the nightly ops routine in `claude.ai/code/routines` from `ops-nightly.prompt.md` (owed to
   Daniel) — per `scripts/routines/README.md`'s new section, including enabling push beyond the
   `claude/`-prefix default.
   → Next morning a standup arrives unprompted. Two nights in a row, confirm the second night's standup
   only reports genuinely new overnight activity (proving the log persisted across a fresh routine session,
   not just consecutive local runs).

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
