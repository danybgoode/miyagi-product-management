---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: routines-enablement
---

# Epic — Claude Routines enablement (A review-on-PR · C roadmap hygiene · B smoke triage)

> ✅ **SHIPPED 2026-06-24 — 1 sprint, all LOW.** The three routine prompts + the stand-up runbook are
> committed (`scripts/routines/`, PR #39); Routine A is **confirmed live** (it reviewed PRs #31 + #121
> with the advisory banner). Daniel stood up all three in his account. The first Routine C run already
> earned its keep — it flagged real drift, applied as PRs #41 (4 stale seed flips) / #42 (the
> `deriveEpicStatus` Archived false-drift fix + `00-ideas/README` accuracy). Doc corrections (PR #43)
> fixed the trigger model (one action, not a combo) + cap budget (GitHub triggers don't eat the 5/day)
> and added an optional Telegram ping-on-failure. See `RETROSPECTIVE.md`. **Owed to Daniel (operational):**
> flip both A routines `ready_for_review → opened`; optionally wire the Telegram-on-failure env.

**Macro-section:** 09 · Platform & Infra
**Class:** Chore / dev-tooling + process (engineering-facing; no buyer/seller/agent surface).
**Decision doc (the spike that approved this):** [`spike-claude-routines`](../../00-ideas/2.%20readyforscope/spike-claude-routines.md) — WRITTEN DECISION landed 2026-06-23.
**Sibling:** the four fixes that came in the same brain-dump — [`devops-reliability-cleanup`](../devops-reliability-cleanup/README.md) (✅ shipped; B's gate, the smoke fix, is done).

## Why
The Routines spike decided **stand up A first, C second, B as a now-unblocked fast-follow; hold D.** Routines
are created in Daniel's claude.ai account (operational), but the spike surfaced a small **buildable** surface
worth version-controlling: the **routine prompts** (self-contained, like the existing
`scripts/cross-review.prompt.md`) and a **stand-up runbook** so the routines are reproducible, reviewable, and
not lost in account UI. This epic commits those artifacts; Daniel does the account stand-up against the runbook.

## Context
| | |
|---|---|
| **Feature** | Claude Code Routines (research preview) — saved prompt + repos + connectors run on Anthropic cloud, triggered by schedule / API / GitHub events. Pro = **5 runs/day**. Created at `claude.ai/code/routines` or `/schedule`. |
| **A — review-on-PR** | GitHub trigger `pull_request` opened + ready_for_review, draft=false; **comment-only as Daniel** (revives the descoped `cross-agent-review-always` goal — a cloud session removes the CI-auth blocker) |
| **C — roadmap hygiene** | Weekly schedule; opens a `claude/` **docs PR** (regenerated `BUILD-ORDER.md` + a drift report). **No connector** — leans on the existing `notion-sync.yml` to propagate (Daniel's call) |
| **B — smoke triage** | Nightly schedule (~10:00 UTC, after the `0 9` smoke); reads the failing `browser-smoke.yml` run and opens a `claude/` **draft fix PR**. Augments, does not replace, the deterministic smoke |
| **D — deploy verification** | **OUT** — both deploys already ping Telegram with terminal status (backend Cloud Build fn + frontend `notify-telegram.yml`); no gap, and `/fire` likely counts against the 5/day cap |

## Medusa-first note
**N/A — zero commerce surface.** Rules 1–4 (Medusa / Supabase / UCP-MCP / Clerk) untouched. Rule 5
(bilingual) N/A — routine prompts + runbook are developer-facing English. Touch surface: a new
`scripts/routines/` (prompt artifacts + runbook README) + a poster line + `BUILD-ORDER.md`. **No app code, no
infra provisioning** — routines run in Daniel's account, not from this repo.

## What already exists (reuse, don't rebuild)
- **Prompt-artifact pattern** — `scripts/cross-review.prompt.md` / `scripts/cross-panel.prompt.md` (HTML-comment
  header + `---` body) is the house format the routine prompts follow.
- **A's review substance** — `scripts/cross-review.prompt.md` (the five-AGENTS-rule, single-pass advisory
  rubric) is the content Routine A's prompt mirrors (now run by Claude-in-cloud, not codex/agy).
- **C's mechanics** — `scripts/build-order.mjs` (regenerates `BUILD-ORDER.md`) + `notion-sync.yml` (nightly
  docs→Notion). C's prompt drives the *judgment* (funnel grooming, drift flagging) and calls the script; the
  sync workflow propagates — **no new Notion connector** needed.
- **B's detector** — `apps/miyagisanchez/.github/workflows/browser-smoke.yml` + the `playwright-browser-report`
  artifact B reads on failure.
- **Operational facts** — the spike's *Answers to the six questions* (GitHub-App install targets, allow-list
  entries for B, the cap budget) seed the runbook.

## Scope — stories & risk
| Sprint | Story | Deliverable | Risk |
|---|---|---|---|
| [S1](sprint-1.md) | R-A · Review-on-PR prompt + stand-up runbook | `scripts/routines/pr-review.prompt.md` + runbook section | low |
| [S1](sprint-1.md) | R-C · Roadmap-hygiene prompt (docs-PR, no connector) | `scripts/routines/roadmap-hygiene.prompt.md` + runbook section | low |
| [S1](sprint-1.md) | R-B · Smoke-triage prompt | `scripts/routines/smoke-triage.prompt.md` + runbook section | low |
| [S1](sprint-1.md) | R-0 · `scripts/routines/README.md` runbook (stand-up steps + cap budget + advisory-only note) | runbook index | low |

All **low** — committed prompt docs + a runbook, no executable repo code, routines are advisory/non-gating, and
the account stand-up is owed to Daniel.

## Deploy order / topology
One sprint, monorepo-root repo (`scripts/routines/`). "Shipping" = the prompt artifacts + runbook merged to
main. The **stand-up is operational, owed to Daniel**: install the Claude GitHub App on
`miyagisanchezcommerce` + `medusa-bonsai-backend` (A) and root `miyagi-product-management` (C), create the
three routines from the committed prompts, set B's `MS_TEST_*` secrets + allow-list. No app deploy, no infra
provisioning.

## Definition of Done (epic)
- [x] `scripts/routines/{pr-review,roadmap-hygiene,smoke-triage}.prompt.md` committed in the house prompt
      format; each is self-contained (a routine runs autonomously — explicit about what to do + what success is).
- [x] `scripts/routines/README.md` runbook: per-routine stand-up steps (GitHub-App install targets, trigger
      config, env/allow-list), the Pro cap budget, and the **advisory-only / never-a-required-check** rule.
- [x] A's prompt mirrors the `cross-review.prompt.md` rubric (five AGENTS rules, single-pass, advisory banner);
      C's prompt opens a docs PR + drift report and runs `build-order.mjs` (no Notion connector); B's prompt
      reads the failing smoke run and opens a `claude/` draft fix PR.
- [x] D recorded as explicitly out (with the why), so it isn't re-litigated.
- [x] `sprint-1.md` has a smoke walkthrough (Daniel stands up A, opens a test PR, sees the advisory comment).
- [x] `RETROSPECTIVE.md`; poster line in `09-platform-infra/README.md`; `node scripts/build-order.mjs` re-run;
      durable learning (cloud-routine-as-you sidesteps CI foreign-CLI auth; trigger + cap model) promoted to `LEARNINGS.md`.
- [x] Feature branch deleted at merge (PR #39); this README's frontmatter `status: shipped`.

## Session kickoff
Run in a **fresh** Claude Code session.

**Sprint 1 — Routines enablement (prompts + runbook):**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/00-ideas/2. readyforscope/spike-claude-routines.md (the WRITTEN DECISION) and
> Roadmap/09-platform-infra/routines-enablement/README.md + .../sprint-1.md. You're building Sprint 1 — all
> LOW, planning/docs artifacts only, monorepo-root repo. Enter plan mode, confirm with me, then branch
> feat/routines-enablement off latest main. Author three self-contained routine prompts under scripts/routines/
> in the house prompt format (HTML-comment header + `---` body, like scripts/cross-review.prompt.md):
> pr-review.prompt.md (mirror the cross-review.prompt.md five-AGENTS-rule single-pass advisory rubric, run by
> Claude-in-cloud, COMMENT-ONLY, carry the advisory-only banner), roadmap-hygiene.prompt.md (weekly: groom the
> 00-ideas funnel, flag status-drift, run scripts/build-order.mjs, open a claude/ DOCS PR + drift report — NO
> Notion connector; notion-sync.yml propagates), and smoke-triage.prompt.md (read the failing browser-smoke.yml
> run/artifact, propose a fix, open a claude/ DRAFT PR — augments, never replaces, the smoke). Then write
> scripts/routines/README.md: per-routine stand-up steps (Claude GitHub App install on miyagisanchezcommerce +
> medusa-bonsai-backend for A, root miyagi-product-management for C; trigger config; B's MS_TEST_* secrets +
> the miyagisanchez.com/Clerk/backend-Cloud-Run allow-list), the Pro 5/day cap budget (A bursty+self-limits, C
> ~weekly, B nightly; D held), and the advisory-only/never-a-required-check rule. Record D as explicitly out
> with the why. No app code, no infra provisioning, no account changes (those are mine). Keep any repo gates
> green. Write the SPRINT SMOKE WALKTHROUGH into sprint-1.md before done; the live stand-up is owed to me.
