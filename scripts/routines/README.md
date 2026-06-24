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
3. **Trigger:** GitHub → `pull_request`, events **opened + ready_for_review**, filter **is-draft =
   false**.
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
   the `00-ideas` funnel, flags status-drift, runs `node scripts/build-order.mjs`, and opens a
   `claude/` **docs PR** with the regenerated `BUILD-ORDER.md` + a drift report. Network = GitHub.
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

## Daily-cap budget (Pro = 5 routine runs/day)

| Routine | Cadence | Typical runs/day |
|---|---|---|
| A — review-on-PR | per non-draft PR | 0–3 (bursty; **self-limits** on busy days — later PRs skip, acceptable because non-gating) |
| C — roadmap hygiene | weekly | ~0 (≈0.14/day) |
| B — smoke triage | nightly | 1 |

- **Now (A + C):** comfortably under 5; A self-limits on bursts.
- **After B (A + B + C):** 4 on a typical 3-PR day — still ≤ 5. On a 4+-PR day A skips the overflow
  PRs (fine — advisory, non-gating).
- One-off **Run now** draws normal subscription usage; the docs only exempt manual one-offs from the
  daily cap. Treat API `/fire` as **counting** toward the cap until Anthropic confirms otherwise.

## Routine D — Deploy verification: **OUT** (recorded, do not re-litigate)
Held by decision. **Both** deploys already ping Telegram with terminal status — backend (Cloud Build
completion → Pub/Sub → Cloud Function) and frontend (`notify-telegram.yml`'s Vercel-poll job: ✅ READY
/ ❌ ERROR / ❌ CANCELED). There is **no notifier gap** to fill, so D's only delta would be a deeper
go/no-go (run smoke + scan logs after the ping) — thin. Its API `/fire` trigger also likely counts
against the 5/day cap, risking starving A/B on Pro. **Hold** unless those pings prove too thin; if ever
revived, it *augments* the existing notifiers and triggers via `/fire` from CD.

## Notes
- **Research preview:** limits/API may change. All three routines are advisory/observability; if the
  feature breaks, the deterministic layers above remain the SSOT and are untouched. The only standing
  discipline: never let a routine become load-bearing.
- **Smoke walkthrough** for verifying the stand-up:
  [`sprint-1.md`](../../Roadmap/09-platform-infra/routines-enablement/sprint-1.md) → *Smoke walkthrough*.
