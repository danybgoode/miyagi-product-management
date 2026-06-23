# Spike — Claude Routines: understand the feature + decide where it fits

**Status: awaiting Daniel approval — investigation only, no build.**
Macro-section: **09 · Platform & Infra**. Slug: `spike-claude-routines`.
Class: **Spike** (time-boxed investigation → a **written decision** in this doc; no code, no slicing until
the decision lands).

The fifth ask of the 2026-06-23 DevOps brain-dump. The other four are a separate cleanup epic
(`devops-reliability-cleanup.md`).

## Mirror-back
> You have access to Claude's **Routines** feature (you think 5 of them, unsure if monthly), you don't fully
> understand it, and you want me to (a) explain it and (b) figure out where it genuinely fits this project —
> then pick what to pilot. Right?

## What Claude Routines actually is (researched 2026-06-23, official docs)
A **routine** is a saved Claude Code configuration — a **prompt + one or more GitHub repos + connectors +
a cloud environment** — that runs **autonomously on Anthropic-managed cloud infrastructure** (so it keeps
running with your laptop closed). Each run is a full Claude Code cloud session: it can run shell commands,
use committed skills, call your connectors (reads *and* writes, no per-action approval), and open PRs.

**Triggers** (a routine can combine several):
- **Schedule** — hourly/daily/weekdays/weekly or a one-off future timestamp (min interval 1h; custom cron via `/schedule update`).
- **API** — a per-routine `/fire` HTTPS endpoint with a bearer token; an optional `text` body passes run
  context (e.g. an alert payload). Wire it into alerting/CD/internal tools.
- **GitHub** — reacts to repo events: **pull_request** (opened/closed/labeled/synchronized/…) or **release**,
  with filters (author, title, base/head branch, labels, is-draft, is-merged). Requires the Claude GitHub App.

**Identity / scope:** routines belong to your personal claude.ai account, run **as you** (commits/PRs carry
your GitHub user; connector actions use your linked accounts). By default Claude can only push `claude/`-prefixed
branches unless you enable unrestricted pushes. Network is allow-listed per environment.

**Limits (corrects the "5/month?" question):** Routines are on **Pro/Max/Team/Enterprise** with Claude Code
on the web enabled. The cap is **per day, not per month** — **Pro = 5 routine runs/day** (Max 15, Team/Enterprise
25). **One-off runs don't count** against the daily cap (they draw normal subscription usage). Manage at
`claude.ai/code/routines` or via `/schedule` in the CLI. Still **research preview** — limits/API may change.

> **Key nuance for fit:** a "green" run only means the session started/exited cleanly — **not** that the task
> succeeded. You must read the transcript (or have the routine post its own result). So routines suit
> **outcome-posting** work (opens a PR, posts a comment, pings Telegram), not silent fire-and-forget.

## Why this is interesting *for this repo specifically*
This project already has a deep automation surface — Cloud Scheduler jobs, GitHub Actions, Telegram
notifiers, a nightly browser smoke, and a **local-only** cross-agent review. Routines' distinct value is the
**cloud-session-as-you** model, which removes the exact blocker that descoped a prior epic:

> `cross-agent-review-always` shipped **local-only** because a CI runner had **no codex/agy auth** (would need
> a billed key + cross-repo PAT). A Routine runs as a full cloud Claude session **under your identity/connectors**
> — so "advisory review on every PR" can finally auto-run in the cloud **without** that credential problem.
> (It's the *Claude* reviewer rather than codex/agy — a different second-opinion family, but it restores the
> auto-on-every-PR goal.)

## Candidate fits to evaluate (Daniel: **evaluate all four**)
| # | Routine | Trigger | Maps to / overlaps | Daily-cap fit | Notes |
|---|---|---|---|---|---|
| A | **Review on every PR** | GitHub `pull_request.opened` (filter: not draft) | Revives `cross-agent-review-always` (descoped to local) | 1 run/PR — variable; watch the 5/day cap on busy days | Strongest fit; posts inline + summary comments as you. Caveat: Claude-family review, not codex/agy. |
| B | **Nightly browser smoke + triage** | Schedule (nightly) | Folds in cleanup-epic Story 1; the existing `browser-smoke.yml` | 1 run/night | Routine runs the smoke, and **on failure opens a `claude/` draft PR** with a proposed spec/prod fix → self-healing loop. Decide: replace the GH Actions cron or run alongside it. |
| C | **Roadmap / Notion hygiene** | Schedule (weekly) | `notion-board-hygiene` epic; `scripts/build-order.mjs` + `roadmap-to-notion.mjs`; the `groom` funnel | 1 run/week | Grooms the funnel, regenerates `BUILD-ORDER.md`, reconciles the Notion board, flags status-drift, opens a docs PR. Uses the Notion connector. |
| D | **Deploy verification** | API `/fire` from the CD pipeline | The existing Vercel/Cloud Build deploy-finish Telegram pings | per-deploy; one-offs don't count | Post-deploy, runs smoke + scans logs, posts **go/no-go to Telegram**. Overlaps existing deploy-finish notifier — decide if it adds enough over a pass/fail ping. |

## Spike questions to answer (the investigation)
1. **Auth/identity reality:** confirm the Claude GitHub App can be installed on `miyagisanchezcommerce` +
   `medusa-bonsai-backend` and that runs-as-you is acceptable (PRs/commits carry Daniel's user).
2. **Connector reach:** confirm the Notion connector (for C) and any others run inside the routine's allow-listed
   environment; does the backend smoke (B/D) need a custom Allowed-domains entry for miyagisanchez.com?
3. **Cap budgeting:** with Pro = 5/day, which combination is sustainable? (A is bursty per-PR; B/C are 1/night/week;
   D via one-off/API is exempt or cheap.) Recommend a default set that won't starve.
4. **Overlap vs. existing infra:** for B and D, decide *replace vs. augment* the current GH Actions cron /
   deploy-finish notifier — avoid two systems doing the same job.
5. **Advisory-only discipline:** A must stay non-gating (matches the standing convention + the #1-token-sink
   learning). Confirm a routine comment can't become a required check.
6. **Research-preview risk:** acceptable given limits/API may change? (Low stakes — all four are advisory/observability.)

## Proposed decision shape (to confirm at spike close)
A likely landing, to be validated by the investigation: **pilot A (review on every PR)** first — it revives a
real descoped goal and is the clearest unlock — plus **C (weekly Roadmap/Notion hygiene)** as a low-frequency,
high-leverage second. Treat **B** as a fast-follow (it overlaps Story 1 — do the cleanup-epic smoke fix first,
then decide whether to move the cron into a routine). Hold **D** unless the deploy-finish ping proves too thin.
This is a *hypothesis* — the spike confirms or revises it; nothing builds until the decision is written here.

## Deliverable (Definition of Done for the spike)
- A **written decision** appended to this doc: which routine(s) to stand up, their triggers, the connector/env
  config, the daily-cap budget, and the replace-vs-augment calls for B/D.
- **No code, no branch, no slicing.** If a routine needs a committed `.mcp.json` or a skill, that becomes a
  follow-up story groomed separately.
- Setup itself is **operational, owed to Daniel** (routines are created in his claude.ai account at
  `claude.ai/code/routines` / `/schedule`); the spike produces the *plan + prompts*, not the account changes.

## Definition of Ready check
- [x] Class = spike; ends in a written decision, not a build.
- [x] Feature understood + facts cited (official docs, 2026-06-23); the "5/month?" corrected to 5 runs/day (Pro).
- [x] Candidate fits enumerated + mapped to existing epics/overlap; spike questions written.
- [ ] **Daniel approves this spike** → I run the investigation and land the decision here (no scaffolding).
