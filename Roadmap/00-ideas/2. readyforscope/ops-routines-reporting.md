---
title: "Ops routines & reporting — standup, weekly recap, build-order, prune, PR babysit (Telegram)"
slug: ops-routines-reporting
status: ready
area: "09 · Platform & Infra"
type: chore
priority: null
risk: medium
epic: null
build_order: null
updated: 2026-07-01
parent: process-iteration-portfolio
---

# Scope — Ops routines & reporting

> Child of [`process-iteration-portfolio`](process-iteration-portfolio.md) — Initiative **B**. Class:
> **Chore (epic).** **Stage-2.5: light-enhancement** — every rail exists (routines, Telegram, prune +
> build-order scripts); the **skills** that produce the reports and wrap the ops are new but thin.
> **Gated on the D-spike conventions** (build against the agreed skill house-rules). Delivery channel =
> **Telegram** (locked).

## Outcome & signal
A **daily standup** lands in Telegram each morning and a **weekly exec/retro** each week — both delta-accurate.
Overnight, `BUILD-ORDER.md` is regenerated (guard stops going red), stale Vercel previews are pruned, and open
PRs are babysat (flaky-CI retries + conflict surfacing) — the noise reported into the standup. Signal: you
wake up to an accurate standup you didn't have to assemble, and the build-order guard stops failing.

## Stage-2.5 bucket
**light-enhancement.** Reuse: routine rail (`routines-enablement`), `lib/telegram.ts` + the bot, the deploy
notifiers' Telegram pattern, `scripts/vercel-prune-previews.mjs`, `scripts/build-order.mjs`, and the
`gh`/CI surface. New: the report-composing + ops-wrapping **skills**.

## Scope — stories (skateboard → car)
**In v1 (each is a committed skill; a routine/schedule triggers it):**
1. **`standup-post` skill → Telegram (the skateboard).** Aggregate overnight: merged/opened PRs + their CI
   status, `browser-smoke.yml` result, build-order drift, open-PR state, stale-preview count → a **delta-only**
   formatted Telegram message. Keeps a `standups.log` to diff against yesterday (blog category 4 pattern).
2. **`build-order-sync` skill.** Nightly `node scripts/build-order.mjs`; if the board drifted, open a
   `claude/` **docs PR** (never hand-edit; SSOT = epic frontmatter). Feed the drift line into the standup.
3. **`vercel-prune` skill.** Wrap `vercel-prune-previews.mjs` — scheduled **dry-run report** into the standup;
   `--apply` stays **human-confirmed** (keeps `--keep-branch` for open-PR previews). Destructive-op guardrail
   per blog category 9 (dry-run → soak → confirm).
4. **`babysit-pr` skill.** For an open PR: watch CI, retry flaky runs, surface merge conflicts, report status.
   **Advisory only** — never auto-merges, never a required check.
5. **`weekly-recap` skill → Telegram.** Weekly: merged PRs + closed epics + deploys + a short retro digest.
6. **Trigger consolidation.** Prefer **one nightly "ops" routine** that runs skills 1–4 in sequence (plus a
   weekly trigger for 5), to stay well under the Pro 5/day scheduled cap (B-smoke already uses 1/night).

**Out of v1:** email delivery (Telegram only); auto-merge / auto-deploy / auto-apply of prunes; a deploy-
verify routine (D stays OUT — both deploys already Telegram-ping); PR-babysit as a gate.

## Kill-switch / runtime gate (risk:high stories only)
No live-money surface, so **no Flagsmith kill-switch** needed. The risk carve-outs are the **destructive/
shared-infra ops**: `vercel-prune --apply` and any `babysit-pr` write action → keep **dry-run-first +
human-confirmed**, and treat those specific stories as the ones to tier carefully (Daniel confirms the first
few live runs). Everything else (report composition, build-order docs PR) is low-risk/advisory.

## What already exists (reuse, don't rebuild)
- `Roadmap/09-platform-infra/routines-enablement` + `scripts/routines/` — the routine rail + prompt format.
- `apps/miyagisanchez/lib/telegram.ts` (`tg`), `TELEGRAM_BOT_TOKEN`/`CHAT_ID`, the backend Cloud Build
  notifier + frontend `notify-telegram.yml` — the delivery channel is solved.
- `scripts/vercel-prune-previews.mjs` (dry-run default, `--apply`, `--age`, `--keep-branch`).
- `scripts/build-order.mjs` + `build-order-guard.yml` (regen + CI guard).
- `browser-smoke.yml` + Routine B (smoke triage) — the standup reads their status, doesn't duplicate them.
- `gh` CLI + Routine A (PR review) — babysit reads PR/CI state; review stays separate.

## Acceptance criteria
- A Telegram standup arrives each morning; hand-checking one day's PRs/CI/previews matches it (delta-accurate).
- A weekly recap arrives; merged-PR/closed-epic/deploy counts match a manual tally.
- The `BUILD-ORDER.md` guard stops failing overnight (a drift opens a `claude/` PR instead).
- `vercel-prune` reports stale previews nightly; `--apply` only runs on your confirmation; open-PR previews
  are never pruned.
- `babysit-pr` posts advisory status and never merges or reports a commit-status check.

## Open risks / research
- **Routines are research-preview** — keep every routine advisory/non-gating; budget scheduled runs ≤5/day
  (favor one nightly ops routine over many).
- **Skill conventions come from the D-spike** — don't finalize SKILL structure/config/memory-log format here.
- **Delta accuracy** — the standup must diff against `standups.log`, not re-summarize, or it becomes noise
  (the #1 way these reports get ignored).
- **Destructive ops** — prune `--apply` is the one place to be conservative; dry-run-first, human-confirmed.

## Definition of Ready
- [x] Stories sliced skateboard→car, each testable by Daniel; Stage-2.5 bucket named; in/out written.
- [x] Reuse list produced; risk carve-outs identified (prune apply / babysit writes); channel = Telegram.
- [ ] **Blocked-by:** the `spike-skills-library-audit` written decision (skill conventions).
- [ ] Daniel approves → scaffold the epic under `09-platform-infra` (S1 `standup-post` skateboard first).
