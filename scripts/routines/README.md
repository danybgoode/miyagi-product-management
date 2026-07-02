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
> A fourth and fifth routine, **ops-nightly** and **weekly-recap**, were added by the
> [`ops-routines-reporting`](../../Roadmap/09-platform-infra/ops-routines-reporting/README.md) epic —
> built against the skill conventions from
> [`spike-skills-library-audit`](../../Roadmap/00-ideas/2.%20readyforscope/spike-skills-library-audit.md).
> S1 shipped `ops-nightly` as the daily standup alone; **S2 added the three nightly fixer steps that now
> run before it** (`build-order-sync`, `vercel-prune` dry-run, `babysit-pr`); **S3 added `weekly-recap`**,
> a dedicated weekly routine (mirroring Routine C's precedent) for the longer-horizon exec recap.

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

## Routine ops-nightly — Daily standup + the nightly fixers  *(fourth routine, stand up any time after B)*
**Prompt:** [`ops-nightly.prompt.md`](ops-nightly.prompt.md) · **Repo:** root `miyagi-product-management`
(reads/writes `gh` across all 3 repos: root, `miyagisanchezcommerce`, `medusa-bonsai-backend`).

**Sprint 1** shipped step 4 alone (the standup). **Sprint 2**
([`ops-routines-reporting`](../../Roadmap/09-platform-infra/ops-routines-reporting/README.md) S2) added
steps 1–3 — the routine now runs, in order: `build-order-sync` (regen + docs PR on drift),
`vercel-prune` (dry-run report only — **never** `--apply`), `babysit-pr` (once per open PR across all 3
repos — silent on a clean PR), then `standup-post` (reports what happened). Still **one** scheduled
routine (cap-safe) — see the budget table below.

1. **Install the Claude GitHub App** on `miyagi-product-management` (root repo) if not already done for
   Routine C.
2. **Create the routine** from `ops-nightly.prompt.md`.
3. **Trigger:** Schedule, **nightly ~10:30 UTC** — after both the frontend's `browser-smoke.yml`
   (`0 9 * * *`) and Routine B (smoke-triage, ~10:00 UTC) have had a chance to complete, so the standup's
   smoke signal reflects the night's actual result.
4. **Env:**
   - **`TELEGRAM_BOT_TOKEN`** in the routine's environment — this routine's Telegram use is
     **LOAD-BEARING** (step 4's actual output), not the optional failure-ping the other three routines
     use.
   - **`TELEGRAM_CHAT_ID`** in the routine's environment — **this is the one that actually works for an
     unattended routine run.** `skills/standup-post/config.json`'s `chat_id` (gitignored, per the
     D-spike's user-specific-setup convention) is preferred when present, but a routine's cloud sandbox
     is a fresh checkout every run, so a locally-written `config.json` never persists to the next run —
     `standup.mjs` falls back to this env var, and it's the same one the optional failure-ping already
     needed, so one setting covers both.
   - **Network access → Custom**, with **`api.telegram.org`** allow-listed (same requirement as the
     other three routines' optional ping — here it's required for step 4 to do anything at all).
   - **⚠️ The `gh` CLI is NOT pre-installed in a routine's cloud sandbox — every step here shells out to
     it, so this is the #1 thing that blocks the whole routine if skipped.** (Confirmed live, 2026-07-02:
     the first two `ops-nightly` runs both failed at step 2 with "no `gh` CLI binary at all" — only the
     built-in GitHub tools were present, and those are read-oriented and scoped to whichever repo the
     routine cloned, not the 3-repo `gh pr list`/`gh run rerun`/`gh pr comment` calls these scripts make.)
     Fix, in the routine's **environment** settings (Edit routine → environment icon → settings gear):
     1. **Setup script** — add `apt update && apt install -y gh`. This runs once and is cached (~7-day
        expiry); it does not re-run every session.
     2. **`GH_TOKEN`** env var — a GitHub Personal Access Token with access to all 3 repos
        (`miyagi-product-management`, `miyagisanchezcommerce`, `medusa-bonsai-backend`). `gh` reads
        `GH_TOKEN` automatically — no `gh auth login` step needed. A **fine-grained PAT** scoped to just
        those 3 repos with **Contents: Read & Write**, **Pull requests: Read & Write**, **Actions: Read &
        Write** (Metadata: Read is auto-included) is the least-privilege choice; a classic PAT with the
        `repo` scope also works if simpler. Mint one at
        [github.com/settings/tokens](https://github.com/settings/tokens) (or
        [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
        for fine-grained).
     3. `github.com`/`api.github.com` are already in the **Trusted** network-access default — no domain
        change needed there, only the two steps above.
   - **`gh` write scope sufficient for `run rerun`, `pr comment`, and `pr create` on a `claude/`-branch.**
     Steps 1 and 3 write (build-order-sync opens a docs PR; babysit-pr re-runs failed workflow runs and
     posts a PR comment) — both stay inside the routine's **default** `claude/`-prefix push scope (step
     1's branch is `claude/build-order-sync-<date>`; step 3 never pushes a branch at all, only comments
     + re-runs). **No broader push grant is needed for steps 1 or 3** — that's a deliberate contrast
     with the requirement just below, which is about `standup.mjs`'s *own* log-persistence commit, not
     these two.
   - **Push enabled beyond the `claude/`-prefix default.** `scripts/standup.mjs` (step 4) commits +
     pushes `scripts/standups.log` directly to `main` after every successful post (a path-scoped,
     data-only commit) so the *next* run — a fresh routine session with no local state — has
     yesterday's snapshot to diff against. Without this, the standup still posts fine, but the delta
     silently degrades to a full re-dump every night (see `skills/standup-post/SKILL.md`'s Gotchas).
   - **`VERCEL_API_TOKEN`** so step 2's richer per-branch report actually resolves. Not load-bearing —
     `standup.mjs`'s own simpler stale-preview count (step 4) already degrades gracefully to
     "unavailable" without it (confirmed live in S1), same fallback the standup has always had; this is
     purely so step 2's own dry-run report has real numbers to show, rather than an auth error.
5. **Output:** one Telegram message per night (the standup) — either the delta lines or a one-line
   "quiet night, no change" post — **plus, only when there's something to act on:** a `claude/` docs PR
   from step 1 (board was stale) and/or an advisory comment on a PR from step 3 (it had a conflict or a
   retryable failing check). **Never** an `--apply` run, **never** a merge, **never** a required check.
   - ⚠️ **First-live-action gate (owed to Daniel, per the epic's risk-tier rule):** before this routine
     runs unattended on schedule, confirm the first live `vercel-prune --apply` (run only by explicit
     ask, never by this routine) and the first live `babysit-pr` action (a real retry/comment on a real
     PR) each look correct — see
     [`sprint-2.md`](../../Roadmap/09-platform-infra/ops-routines-reporting/sprint-2.md)'s walkthrough.

## Routine weekly-recap — Weekly executive recap  *(fifth routine, the longer-horizon complement to ops-nightly)*
**Prompt:** [`weekly-recap.prompt.md`](weekly-recap.prompt.md) · **Repo:** root `miyagi-product-management`
(reads `gh` + `git log` across all 3 repos: root, `miyagisanchezcommerce`, `medusa-bonsai-backend`).

Shipped by [`ops-routines-reporting`](../../Roadmap/09-platform-infra/ops-routines-reporting/README.md)
S3 — a dedicated **weekly** routine (mirroring Routine C's precedent of a standalone weekly schedule,
rather than a day-of-week-gated step folded into the nightly `ops-nightly` routine). One step: the
`weekly-recap` skill (`scripts/weekly-recap.mjs`) gathers the week's merged PRs (all 3 repos),
shipped/closed epics (README frontmatter `status:` flips), a merges-to-main deploy count per app repo,
and a short retro digest per shipped epic — then posts one Telegram message.

1. **Install the Claude GitHub App** on `miyagi-product-management` (root repo) if not already done for
   Routine C / `ops-nightly`.
2. **Create the routine** from `weekly-recap.prompt.md`.
3. **Trigger:** Schedule, **weekly — Mon 15:30 UTC** (after Routine C's Mon 14:00 roadmap-hygiene and
   comfortably after the prior night's `ops-nightly` run, so the recap can reflect that week's tail end).
4. **Env:**
   - **The `gh` CLI setup script + `GH_TOKEN`** — same requirement as `ops-nightly`'s (see its own env
     section above for the exact setup script and PAT scopes). `weekly-recap.mjs` shells out to
     `gh pr list` across all 3 repos, so this is load-bearing here too. If `ops-nightly` and
     `weekly-recap` share the same cloud environment (the usual setup), provisioning it once for
     `ops-nightly` covers this routine too — nothing to redo.
   - **`TELEGRAM_BOT_TOKEN`** in the routine's environment — this routine's Telegram use is
     **LOAD-BEARING** (its one step's actual output), same as `ops-nightly`'s.
   - **`TELEGRAM_CHAT_ID`** in the routine's environment — **this is the one that actually works for an
     unattended routine run** (same reasoning as `ops-nightly`'s: `skills/weekly-recap/config.json`'s
     `chat_id`, its own file separate from `standup-post/config.json` per the D-spike's per-skill
     convention, is preferred when present, but can't persist across a routine's fresh-checkout-per-run
     sandbox — `weekly-recap.mjs` falls back to this env var, the same one the optional failure-ping
     already needed).
   - **Network access → Custom**, with **`api.telegram.org`** allow-listed (same requirement as the
     other routines).
   - **Push enabled beyond the `claude/`-prefix default.** `scripts/weekly-recap.mjs` commits + pushes
     `scripts/weekly-recaps.log` directly to `main` after every successful post (a path-scoped, data-only
     commit), so the *next* run — a fresh routine session with no local state — knows where the last
     window ended. Without this, the recap still posts fine, but the window silently falls back to a
     plain trailing-7-days read every time instead of picking up exactly where the last run left off (see
     `skills/weekly-recap/SKILL.md`'s Gotchas). This is the **same** grant `ops-nightly` already needs for
     `standup.mjs` — if that's already enabled account-wide, nothing new to configure here.
5. **Output:** one Telegram message per week — merged PRs, deploys (merge counts), shipped/closed epics,
   and a short retro digest per shipped epic, or a one-line "quiet week" post when there's nothing to
   report. **Never** a PR, **never** a code change, **never** a required check.

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
| ops-nightly — standup + nightly fixers | Schedule, nightly | Yes, 1/day (still one routine, now 4 steps) |
| weekly-recap — weekly exec recap | Schedule, weekly | Yes, but ~0.14/day |

- **Scheduled load = B (1/day) + ops-nightly (1/day) + C (~0.14/day) + weekly-recap (~0.14/day) ≈ 2.3/day**
  — still well under the 5/day cap.
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

This section is about that **optional** ping for A/B/C — none of them has a Telegram post as its actual
output. **ops-nightly and weekly-recap are the two exceptions**: their Telegram post IS the routine's
output, so their Telegram setup is load-bearing, not optional (see each one's own section above for the
full env list). Both still use this same failure-ping *pattern* for the "couldn't even attempt the
post" case.

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
