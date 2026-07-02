# Claude Routines — stand-up runbook

The three approved **Claude Code Routines** (research preview) for this project, as committed,
reviewable prompt artifacts plus the steps to stand them up. Routines are saved cloud Claude Code
configurations (prompt + repos + triggers) that run **autonomously on Anthropic-managed infra, as
Daniel** — so they keep running with the laptop closed. Created/managed in Daniel's account at
`claude.ai/code/routines` (or `/schedule` in the CLI).

> **Source of decision:** [`spike-claude-routines`](../../Roadmap/00-ideas/2.%20readyforscope/spike-claude-routines.md)
> (WRITTEN DECISION, 2026-06-23) and the epic
> [`routines-enablement`](../../Roadmap/09-platform-infra/routines-enablement/README.md).
> **Decision:** stand up **A** first, **C** second, **B** as a now-unblocked fast-follow; **D is out.**

This repo commits the *prompts + this runbook*. **The account stand-up itself is operational, owed to
Daniel** — installing the GitHub App, creating the routines from these prompts, and setting B's
secrets/allow-list. Nothing here provisions infra or changes any account.

## The two rules that hold for all three

1. **Advisory only — never a required check.** Every routine's output is a PR comment or a `claude/`
   PR for a human to review. None gates a merge, deploy, or money path. A plain PR **comment carries no
   commit-status**, so it *structurally cannot* be added as a required check in branch protection —
   keep it that way (Routine A must stay comment-only; never wire any status reporting). The
   deterministic layers (CI, `browser-smoke.yml`, `notion-sync.yml`, the Cloud Build / Vercel deploy
   notifiers) remain the sole sources of truth.
2. **Leave push at the `claude/` default.** A routine may only push `claude/`-prefixed branches unless
   unrestricted push is explicitly enabled — don't enable it. A only comments (no push); B/C open
   `claude/` PRs.

---

## Routine A — Review on every PR  *(stand up first)*
**Prompt:** [`pr-review.prompt.md`](pr-review.prompt.md) · **Repos:** `danybgoode/miyagisanchezcommerce`
+ `medusa-bonsai-backend` (add root `miyagi-product-management` only if you want Roadmap-doc PRs
reviewed too).

1. **Install the Claude GitHub App** on `danybgoode/miyagisanchezcommerce` and `medusa-bonsai-backend`.
2. **Create the routine** from `pr-review.prompt.md`.
3. **Trigger:** GitHub → `pull_request`, action **`opened`**, filter **Is draft = `false`**.
   ⚠️ A GitHub trigger takes **one specific action OR all-actions-in-category — you cannot combine
   `opened` + `ready_for_review`** ([docs](https://code.claude.com/docs/en/routines)). Pick **`opened`**:
   it matches directly-opened non-draft PRs (incl. Dependabot), which is how PRs land here. (`opened`
   does **not** fire on a draft→ready flip — `ready_for_review` does; pick that instead only if you
   habitually open drafts first, or pick **all pull_request actions** + the draft filter for full
   coverage, at the cost of also firing on label/sync/close.)
4. **Env/connectors:** GitHub App only. No Notion. Network = GitHub. Push left at the `claude/`
   default (the routine only comments).
5. **Output:** one advisory review comment per PR (mirrors the `cross-review.prompt.md` rubric — five
   AGENTS rules, single pass). **Comment-only; never a status check.**

Revives the descoped `cross-agent-review-always` goal: a cloud session runs *as Daniel*, so it
sidesteps the CI foreign-CLI auth blocker that forced that epic local-only. (This is the
**Claude-family** reviewer, not codex/agy — a different second-opinion family, but auto-on-every-PR is
restored.)

## Routine C — Weekly roadmap/Notion hygiene  *(stand up second)*
**Prompt:** [`roadmap-hygiene.prompt.md`](roadmap-hygiene.prompt.md) · **Repo:** root
`miyagi-product-management`.

1. **Install the Claude GitHub App** on `miyagi-product-management` (root repo).
2. **Create the routine** from `roadmap-hygiene.prompt.md`.
3. **Trigger:** Schedule, **weekly — Mon 14:00 UTC** (after the 08:00 nightly `notion-sync.yml`).
4. **Env/connectors:** **No Notion connector** — no `.mcp.json`, no `NOTION_TOKEN`. The routine grooms
   the `00-ideas` funnel, flags status-drift, runs `node scripts/build-order.mjs`, invokes the
   `doc-hygiene` skill (`node scripts/doc-hygiene.mjs` — always-read-set size + LEARNINGS/poster
   dedupe-staleness candidates), and opens a `claude/` **docs PR** with the regenerated
   `BUILD-ORDER.md` + any new `DOC-HYGIENE-REPORT-*.md` + a drift report. Network = GitHub.
5. **Propagation:** after Daniel merges the docs PR, the existing `notion-sync.yml` propagates
   docs→Notion as usual. **Augments, does not replace** that workflow.

## Routine B — Nightly smoke triage  *(now-unblocked fast-follow)*
**Prompt:** [`smoke-triage.prompt.md`](smoke-triage.prompt.md) · **Repo:**
`danybgoode/miyagisanchezcommerce` (frontend). **Gate:** `devops-reliability-cleanup` Story 1 (the
smoke fix) — done, so B is unblocked.

1. **Install the Claude GitHub App** on `miyagisanchezcommerce` (already done for A).
2. **Create the routine** from `smoke-triage.prompt.md`.
3. **Trigger:** Schedule, **nightly ~10:00 UTC** (after the `0 9 * * *` `browser-smoke.yml`).
4. **Env:** the `MS_TEST_*` secrets (`MS_TEST_BUYER_*`, `MS_TEST_SELLER_*`, `MS_TEST_PDP_LISTING_ID`,
   `MS_TEST_PERSONALIZED_LISTING_ID`) so authed smokes light up; **Allowed-domains:**
   `miyagisanchez.com` + the Clerk auth domains + the backend Cloud Run URL.
5. **Output:** on a **red** smoke, a `claude/` **draft** PR naming the failing spec + assertion with a
   proposed spec realign or prod fix; on a **green** smoke, no PR. **Augments, never replaces** the
   deterministic smoke (which stays the detector); does not auto-merge.

---

## Daily-cap budget (Pro)

The **daily routine-run cap (Pro = 5/day) bites the SCHEDULED runs** — GitHub-event and API triggers
have their **own separate per-routine/per-account hourly caps**, not the scheduled daily cap, and
**one-off `Run now` runs don't count** at all ([docs](https://code.claude.com/docs/en/routines) ·
[blog](https://claude.com/blog/introducing-routines-in-claude-code)).

| Routine | Trigger | Counts against the 5/day scheduled cap? |
|---|---|---|
| A — review-on-PR | GitHub `pull_request.opened` | **No** — GitHub-event, separate hourly caps |
| C — roadmap hygiene | Schedule, weekly | Yes, but ~0.14/day |
| B — smoke triage | Schedule, nightly | Yes, 1/day |

- **Scheduled load = B (1/day) + C (~0/day) ≈ 1/day** — nowhere near the 5/day cap.
- **A is effectively uncapped for our volume** (GitHub events, hourly caps only); it does **not** eat
  the scheduled budget. On a busy day it's bounded by the preview hourly cap, not the daily 5.
- **No upgrade pressure:** everything here runs on **Pro**. Higher daily run counts are the only
  routines-relevant Max/Team/Enterprise upsell, and our scheduled load doesn't approach the Pro cap.

## Routine D — Deploy verification: **OUT** (recorded, do not re-litigate)
Held by decision. **Both** deploys already ping Telegram with terminal status — backend (Cloud Build
completion → Pub/Sub → Cloud Function) and frontend (`notify-telegram.yml`'s Vercel-poll job: ✅ READY
/ ❌ ERROR / ❌ CANCELED). There is **no notifier gap** to fill, so D's only delta would be a deeper
go/no-go (run smoke + scan logs after the ping) — thin. **Hold** unless those pings prove too thin; if
ever revived, it *augments* the existing notifiers and triggers via `/fire` from CD (API triggers
don't consume the scheduled 5/day cap).

## Run-failure visibility (optional Telegram ping)

Routines have **no built-in failure alert** — *"a green status means the session started and exited
without an infrastructure error. It does not mean the task succeeded"* ([docs](https://code.claude.com/docs/en/routines)).
Your **actionable output is already visible via GitHub** (A's PR comment, B/C's `claude/` PRs all
trigger GitHub notifications). The gap is a **run that fails to complete** (network blocked, auth,
hourly cap) — that shows only on `claude.ai/code/routines` / the transcript unless you check.

To close it without checking the app daily, each prompt has an **optional, best-effort Telegram
ping-on-failure** step, gated on two env vars being present (so it degrades to a no-op where unset).
To enable it on a routine:
1. Add env vars to the routine's environment: **`TELEGRAM_BOT_TOKEN`** + **`TELEGRAM_CHAT_ID`** (the
   same MiyagiDevopsTele bot/chat the deploy notifiers use).
2. Set the environment's **Network access → Custom** and add **`api.telegram.org`** to Allowed-domains
   (the Default "Trusted" allowlist does not include it), keeping the default package-manager list.

The ping fires **only on a blocking failure** (never on a healthy run — those reach you via GitHub),
naming the routine + what failed. Skip steps 1–2 to leave a routine silent-except-GitHub.

## Notes
- **Research preview:** limits/API may change. All three routines are advisory/observability; if the
  feature breaks, the deterministic layers above remain the SSOT and are untouched. The only standing
  discipline: never let a routine become load-bearing.
- **Smoke walkthrough** for verifying the stand-up:
  [`sprint-1.md`](../../Roadmap/09-platform-infra/routines-enablement/sprint-1.md) → *Smoke walkthrough*.
