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
- [x] **Daniel approved** (2026-06-23) → investigation run; decision landed below (no scaffolding).

---

## Investigation findings (2026-06-23)

Grounded against the actual repos (root `miyagi-product-management`, app `danybgoode/miyagisanchezcommerce`, backend `medusa-bonsai-backend`):

| Existing infra | Where it lives | What it does today |
|---|---|---|
| Browser smoke | `apps/miyagisanchez/.github/workflows/browser-smoke.yml` | Playwright vs prod, cron `0 9 * * *`; on fail just uploads artifacts. Reads `MS_TEST_*` secrets, skips if unset. **Frontend repo, not root.** |
| Deploy-finish Telegram (backend) | `apps/backend/infra/gcp/cicd-telegram-notifier/index.js` | Cloud Build completion → Pub/Sub → Cloud Function → ✅/❌ ping. Lives outside the runtime (deploy-safe). |
| Deploy-finish Telegram (frontend) | `apps/miyagisanchez/.github/workflows/notify-telegram.yml` (`vercel-production-deploy` job) | On push to `main`, polls the Vercel API for that commit's prod deploy and pings Telegram with the **terminal status** (✅ READY / ❌ ERROR / ❌ CANCELED). **Corrects the initial finding — the frontend DOES have a status-aware deploy notifier** (Daniel confirmed the ping). |
| Notion sync | `scripts/roadmap-to-notion.mjs` + `.github/workflows/notion-sync.yml` (nightly `0 8 * * *` + push) + `notion-pr-sync.yml` (PR overlay) | Mechanical, deterministic, **free** one-way docs→Notion. Does NOT groom the funnel or reason about drift. |
| Build-order | `scripts/build-order.mjs` | Regenerates `BUILD-ORDER.md` from the same projection; `--check` for CI. |
| Cross-agent review | `scripts/cross-review.mjs` + `scripts/lib/cross-agent-cli.mjs` | **Local-only** (no CI runs it; `scripts-guard.yml` only runs the unit tests). This is the descoped `cross-agent-review-always` goal. |
| `.mcp.json` / Notion connector | **None found, any repo** | A committed connector/skill is genuinely net-new → a follow-up story, per the spike's own DoD. |

### Answers to the six spike questions

1. **Auth/identity reality — OK.** The Claude GitHub App installs per-repo on `danybgoode/miyagisanchezcommerce` and `medusa-bonsai-backend` (and root `miyagi-product-management` for C). Runs-as-Daniel is acceptable: he's the solo operator, and PRs/commits already carry his identity (the cross-agent tools already run locally as him). Default `claude/`-prefix push restriction is fine — A only comments (no push), B/C open `claude/` PRs.
2. **Connector reach — OK, with an allow-list note.** The Notion connector runs inside the routine env under Daniel's linked account (read+write, no per-action approval); C can use it OR just run the committed `roadmap-to-notion.mjs`/`build-order.mjs` (then it needs `NOTION_TOKEN` as an env secret + `api.notion.com` allow-listed). **B/D need a custom Allowed-domains entry** for `miyagisanchez.com` + the Clerk auth domains + the backend Cloud Run URL, plus the `MS_TEST_*` secrets, to run authed smokes.
3. **Cap budgeting (Pro = 5/day) — sustainable as A + C now; A + B + C after B lands.** C ≈ 0.14/day (weekly), B = 1/night, A = 0–3/day typical on a solo repo (bursty). A 3-PR day with A+B+C = 4 ≤ 5 ✓. On a 4+-PR day A self-limits (later PRs skip) — fine, it's non-gating. Treat API `/fire` (D) as *counting* toward the cap until Anthropic confirms otherwise (the docs only exempt manual one-off runs); this is another reason to hold D.
4. **Overlap — AUGMENT both, never replace.** *B:* keep `browser-smoke.yml` as the deterministic, cap-free, research-preview-immune **detector**; the routine is the **triage/self-heal layer** (read the failure → open a `claude/` draft PR with a proposed fix). They do different jobs, so two systems is justified. *D:* **both** deploys already have a status-aware Telegram ping (backend Cloud Build function + frontend `notify-telegram.yml`'s Vercel-poll job) — there is **no notifier gap** to fill. A routine would only add a deeper go/no-go (run smoke + scan logs), which makes D even thinner. Hold.
5. **Advisory-only — structurally guaranteed.** A posts PR *comments* as Daniel. A comment carries no commit-status, and required checks in branch protection can only require things that report a commit status — so a routine comment **cannot** be made a required check. Keep it comment-only; don't wire any status reporting. Matches the standing convention + the #1-token-sink learning.
6. **Research-preview risk — acceptable.** All four are advisory/observability; none gate a merge, deploy, or money path. If the feature changes or breaks, the deterministic layers (smoke CI, `notion-sync.yml`, the Cloud Build notifier) remain the SSOT and are untouched. The only discipline: never let a routine become load-bearing.

---

## WRITTEN DECISION (spike close, 2026-06-23)

**Stand up A first, C second. Defer B as a fast-follow. Hold D.** This confirms the proposed hypothesis, with the replace-vs-augment calls now grounded.

### ① Routine A — Review on every PR *(stand up first)*
- **Why first:** revives the genuinely-descoped `cross-agent-review-always` goal — a Routine is a full cloud Claude session **as Daniel**, which removes the exact CI-auth blocker that forced local-only. Clearest unlock.
- **Trigger:** GitHub `pull_request` → `opened` + `ready_for_review`, filter **is-draft = false**.
- **Repos / App:** install the Claude GitHub App on `danybgoode/miyagisanchezcommerce` and `medusa-bonsai-backend` (the code repos). Add root `miyagi-product-management` only if you want Roadmap-doc PRs reviewed.
- **Env/connectors:** GitHub App only. No Notion. Network = GitHub. Leave push at the `claude/` default (comments only, no push).
- **Output:** inline + summary review comments (mirror the `cross-review.mjs` advisory framing). **Comment-only, never a status check.**
- **Cap:** 1/PR, bursty; self-limits on busy days — acceptable because non-gating.

### ② Routine C — Weekly Roadmap/Notion hygiene *(stand up second)*
- **Why second:** low-frequency, high-leverage. The existing `notion-sync.yml` already does the *mechanical* docs→Notion push for free; C adds the **judgment layer** the scripts can't: groom the `00-ideas` funnel, flag status-drift, regenerate `BUILD-ORDER.md`, open a docs PR. **Augments, does not replace** `notion-sync.yml`.
- **Trigger:** Schedule, weekly (e.g. Monday 14:00 UTC — after the 08:00 nightly sync).
- **Repo / App:** root `miyagi-product-management`.
- **Env/connectors:** Notion connector (Daniel's linked account) for reconciliation; the run also executes the committed `scripts/build-order.mjs`. If it uses the script path for Notion, add `NOTION_TOKEN` env secret. Network allow-list: `api.notion.com` + `github.com`.
- **Output:** a `claude/` docs PR (regenerated `BUILD-ORDER.md` + a drift report). Non-gating.
- **Cap:** ~1/week — negligible.

### ③ Routine B — Nightly smoke triage *(deferred fast-follow)*
- **Gate:** do `devops-reliability-cleanup` Story 1 (smoke fix) **first**, then stand B up.
- **Augment, not replace:** keep `browser-smoke.yml` (cron `0 9 * * *`) as the deterministic detector; B runs ~10:00 UTC, reads/re-runs the smoke, and **on failure opens a `claude/` draft PR** with a proposed spec/prod fix.
- **Repo / App:** frontend `miyagisanchezcommerce`. **Env:** `MS_TEST_*` secrets + Allowed-domains: `miyagisanchez.com`, Clerk auth domains, the backend Cloud Run URL. **Cap:** 1/night.

### ④ Routine D — Deploy verification *(hold)*
- **Both** deploys already ping Telegram with terminal status — backend (Cloud Build function) and frontend (`notify-telegram.yml` Vercel-poll job, ✅ READY / ❌ ERROR). There's **no notifier gap**, so D is thinner than first thought: its only delta would be a deeper go/no-go (run smoke + scan logs after the ping). API `/fire` likely counts toward the 5/day cap. **Hold** unless those pings prove too thin; if revived, it *augments* the existing notifiers and triggers via `/fire` from CD.

### Daily-cap budget (Pro = 5/day)
- **Now:** A (0–3) + C (~0/day) → comfortably under 5; A self-limits on bursts.
- **After B lands:** A + B + C → 4 on a typical 3-PR day; still ≤ 5. A skips overflow PRs on heavy days (acceptable, non-gating).
- **Do not add D** on top while on Pro unless one-off/API exemption is confirmed — it would risk starving A/B.

### Follow-ups this spike surfaces (groomed separately, not built here)
- A committed `.mcp.json` (Notion connector) and/or a committed skill, **if** C uses the connector rather than the existing scripts — net-new (none exist today).
- The routine *prompts* themselves (A review prompt, C grooming prompt, B triage prompt) — author as part of stand-up.
- **Operational, owed to Daniel:** create the routines in his `claude.ai/code/routines` account, install the GitHub App on the two app repos (+ root for C), set the env secrets/allow-lists. The spike delivers the plan + config above, not the account changes.
