---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: ops-routines-reporting
---

# Epic: Ops routines & reporting — standup, weekly recap, build-order, prune, PR babysit (Telegram)

> ✅ **SHIPPED 2026-07-02 — 3 sprints, mixed LOW→MEDIUM.** **S1** (PR #50) shipped the daily-standup
> skateboard. **S2** (PR #52, first-live-action confirmations PR #53/#54) added the nightly fixers
> (`build-order-sync`, `vercel-prune`, `babysit-pr`), folded into the one `ops-nightly` routine. **S3**
> (PR #55) added `weekly-recap` — a weekly Telegram exec recap (merged PRs, shipped/closed epics, a
> merges-to-main deploy proxy, a retro digest) on its own dedicated weekly routine. Five Claude Routines
> now exist total, ~2.3/day scheduled load (well under the Pro 5/day cap). Owed to Daniel: the live
> weekly Telegram post + the `weekly-recap` routine account stand-up (same "account creation is mine"
> split every sprint here has used). See `RETROSPECTIVE.md`.

> **Area:** 09 · Platform & Infra · **Risk:** Low–Medium (two risk carve-outs) · **Scope doc:**
> [`00-ideas/2. readyforscope/ops-routines-reporting.md`](../../00-ideas/2.%20readyforscope/ops-routines-reporting.md)
> · **Portfolio parent:** [`process-iteration-portfolio`](../../00-ideas/2.%20readyforscope/process-iteration-portfolio.md) (Initiative B)
> · **Built against:** [`spike-skills-library-audit`](../../00-ideas/2.%20readyforscope/spike-skills-library-audit.md) WRITTEN DECISION (2026-07-02).

## Why
Turn overnight repo state into something Daniel wakes up to instead of assembles: a **daily standup** in
Telegram (overnight PR/CI/smoke activity, build-order drift, open-PR state, stale-preview count — delta-only)
and a **weekly exec/retro**. Overnight, the noisy chores fix themselves or surface: `BUILD-ORDER.md` is
regenerated (its CI guard stops going red), stale Vercel previews are reported for pruning, and open PRs are
babysat (flaky-CI retries + conflict surfacing). Delivery = **Telegram** (locked; the bot + notifiers already
exist).

## Conventions inherited from the D-spike (binding)
Every skill here follows the just-decided house rules: **a script does the work** (`scripts/*.mjs`), **a
`SKILL.md` under `skills/<name>/` wraps it** (description written for the model, a mandatory `## Gotchas`
section), and **a routine triggers it** (`scripts/routines/*.prompt.md`) — a routine invokes, never
re-implements. User-specific setup (the Telegram chat id) goes in a **`config.json`**, falling back to
`AskUserQuestion` when unset. `standup-post` keeps an **append-only memory log** so it diffs against
yesterday. Repo-checked-in (no marketplace at this scale).

## Medusa-first note
**N/A — zero commerce surface.** AGENTS rules 1–4 untouched; rule 5 N/A (developer-facing English). Touch
surface: `skills/{standup-post,weekly-recap,babysit-pr,build-order-sync,vercel-prune}/`, matching
`scripts/*.mjs`, and `scripts/routines/` triggers. No app code, no infra provisioning (routines run in
Daniel's account).

## What already exists (reuse, don't rebuild)
- **Routine rail** — `routines-enablement` (shipped) + `scripts/routines/` prompt format + the Pro cap model
  (GitHub/API triggers don't eat the 5/day scheduled cap; scheduled load ≈ 1/night today).
- **Telegram** — `apps/miyagisanchez/lib/telegram.ts` (`tg`), `TELEGRAM_BOT_TOKEN`/`CHAT_ID`, the backend
  Cloud Build notifier + frontend `notify-telegram.yml`. The channel is solved — reuse it.
- **`scripts/build-order.mjs`** (+ `build-order-guard.yml`) — regen + drift `--check`. `build-order-sync`
  wraps it; the standup reads its `--check` result.
- **`scripts/vercel-prune-previews.mjs`** — dry-run default, `--apply`, `--age`, `--keep-branch`. `vercel-prune`
  wraps it; the standup reads its dry-run count.
- **`browser-smoke.yml` + Routine B (smoke-triage)** — the standup reads their status, doesn't duplicate.
- **`gh` CLI + Routine A (PR review)** — `babysit-pr` reads PR/CI state; review stays separate.
- **`skills/doc-hygiene/` + `scripts/doc-hygiene.mjs`** — the reference shape (thin skill: SKILL.md + one
  script + `## Gotchas`) every skill here copies.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| [S1](sprint-1.md) | B-1 · `standup-post` skill + `scripts/standup.mjs` → nightly Telegram standup (delta-only, `config.json` chat id, `standups.log` memory) ✅ built (first live post owed) | Low |
| [S1](sprint-1.md) | B-2 · Nightly "ops" routine that triggers the standup (one routine, not many — cap-safe) ✅ built + routine created 2026-07-02 (first scheduled fire owed) | Low |
| [S2](sprint-2.md) | B-3 · `build-order-sync` skill — nightly regen; open a `claude/` **docs PR** on drift (never hand-edit) ✅ built (first drift PR already happened live — merged, #51) | Low |
| [S2](sprint-2.md) | B-4 · `vercel-prune` skill — scheduled **dry-run report**; `--apply` **human-confirmed**; `--keep-branch` open-PR previews ✅ built + first live `--apply` confirmed 2026-07-02 (0 stale to delete) | **Medium** (destructive op) |
| [S2](sprint-2.md) | B-5 · `babysit-pr` skill — watch a PR, retry flaky CI, surface conflicts; **advisory only**, never a required check ✅ built + first live action confirmed 2026-07-02 (real retry + comment on backend #23) | **Medium** (PR writes) |
| [S2](sprint-2.md) | B-6 · Fold B-3/B-4/B-5 outputs into the standup + the one nightly ops routine ✅ built | Low |
| [S3](sprint-3.md) | B-7 · `weekly-recap` skill + `scripts/weekly-recap.mjs` → weekly Telegram recap (merged PRs, closed epics, deploys, retro digest) ✅ built (first live post owed) | Low |
| [S3](sprint-3.md) | B-8 · Weekly trigger for the recap ✅ built (dedicated sibling routine; account stand-up owed) | Low |

## Deploy order
No app deploy — monorepo-root skills/scripts/routine-prompts. "Shipping" = merged to `main`; the **account
stand-up of the routines is operational, owed to Daniel** (create/trigger in `claude.ai/code/routines`, set
the Telegram env + `api.telegram.org` allow-list, per the routines runbook). S1 is the skateboard (a standup
lands); S2 adds the fixers/feeds; S3 adds the weekly recap. Build S1→S2→S3.

## Risk carve-outs (no kill-switch — no live-money surface)
- **B-4 `vercel-prune --apply`** — destructive. Keep **dry-run-first + human-confirmed**; never prune an
  open-PR preview (`--keep-branch`). Daniel confirms the first live `--apply`.
- **B-5 `babysit-pr` writes** (re-run CI, comment) — **advisory only**, never auto-merges, never reports a
  commit-status check. Daniel confirms the first live babysit action.
- Everything else (report composition, build-order docs PR) is low-risk/advisory.

## Definition of Done (epic)
- [x] A Telegram standup lands each morning; hand-checking one day's PRs/CI/previews matches it
      (delta-accurate) — confirmed live, S1/S2.
- [x] A weekly recap lands; merged-PR/closed-epic/deploy counts match a manual tally — confirmed via
      live `--dry-run` rehearsal (S3.1 walkthrough); the actual Telegram post is owed to Daniel (no
      credentials in the build sandbox).
- [x] `BUILD-ORDER.md` guard stops failing overnight (drift opens a `claude/` PR instead of going red) —
      confirmed live, S2 (PR #51).
- [x] `vercel-prune` reports stale previews nightly; `--apply` only on Daniel's confirmation; open-PR
      previews never pruned — confirmed live, S2 (PR #53).
- [x] `babysit-pr` posts advisory status; never merges; never a required check — confirmed live, S2 (PR #54).
- [x] Each skill follows the D-spike conventions (`skills/<name>/`, script-does-work, `## Gotchas`, model-
      facing description); routines invoke, never re-implement.
- [x] Each `sprint-N.md` has its verification walkthrough; this README ✅; sprint status ticked w/ refs.
- [x] `RETROSPECTIVE.md`; poster updated; team memory + `MEMORY.md` index updated.
- [x] Durable learnings promoted to `LEARNINGS.md` (dedupe — sharpen, don't append).
- [x] **Kill-switch:** N/A — no live-money surface (recorded so it isn't re-litigated).
- [x] Feature branch deleted (after merge); **frontmatter `status: shipped`**; `node scripts/build-order.mjs` re-run.

## Session kickoffs
One per sprint — see each `sprint-N.md` → *Kickoff prompt*.
