---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: model-split-sonnet5-execution
---

# Epic: Model split — Sonnet 5 builds · Opus 4.8 plans · escalate-don't-guess ✅ COMPLETE 2026-07-01

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Scope doc:**
> [`00-ideas/2. readyforscope/model-split-sonnet5-execution.md`](../../00-ideas/2.%20readyforscope/model-split-sonnet5-execution.md)
> · **Portfolio parent:** [`process-iteration-portfolio`](../../00-ideas/2.%20readyforscope/process-iteration-portfolio.md) (Initiative C)

## Why
Make the model-tier default explicit and safe. We already plan on the strong model and execute on a faster
one; this epic names **Opus 4.8** for planning/grooming/spikes/plan-mode/review and **Sonnet 5** for
mechanical per-story execution, and adds the guardrail Daniel asked for: **Sonnet 5 escalates rather than
guesses** — it stops and asks / hands back to Opus when a story carries real judgment or money-path risk,
instead of trying to solve it alone. Docs/process only; no app surface.

## Medusa-first note
**N/A — zero commerce surface.** AGENTS rules 1–4 (Medusa / Supabase / UCP-MCP / Clerk) untouched. Rule 5
(bilingual) N/A — the only text is developer-facing English in `WAYS-OF-WORKING.md` + the groom kickoff
template. No app code, no infra.

## What already exists (reuse, don't rebuild)
- **`Roadmap/WAYS-OF-WORKING.md` → Conventions → "Model tiers"** — the paragraph already stating "strong
  model for the thinking… faster model for execution… Planning in Cowork; building in Claude Code." This is
  the doc seam to sharpen (name Sonnet 5 + add escalation), not rewrite.
- **`skills/groom/SKILL.md` Stage 8** — the per-sprint Claude Code kickoff prompt template; the escalation
  line is added here so every build session inherits it.
- **The high-risk tier definition** (WAYS-OF-WORKING *Review & merge*: payments/checkout/fulfillment/auth/
  DB-migrations/shared-infra/money) — reuse verbatim as the escalation trigger list so there is one SSOT.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| [S1](sprint-1.md) | C-1 · Name Sonnet 5 (build) + Opus 4.8 (plan) in `WAYS-OF-WORKING.md`, add the escalate-don't-guess trigger list, and mirror the rule into the groom Stage-8 kickoff template | Low |

## Deploy order
No deploy — monorepo-root docs (`Roadmap/WAYS-OF-WORKING.md` + `skills/groom/SKILL.md`). "Shipping" = merged
to `main`. Doc-only, low-risk tier → may merge directly (no preview, no Playwright).

## Definition of Done (epic)
- [x] `WAYS-OF-WORKING.md` *Model tiers* names Sonnet 5 (build) + Opus 4.8 (plan) and lists the
      escalate-don't-guess triggers (identical to the high-risk-tier list).
- [x] The groom Stage-8 kickoff template tells the build session to escalate on those triggers.
- [ ] Smoke: a Sonnet-5 session on a deliberately-ambiguous / money-path story pauses and asks / escalates
      rather than guessing (**owed to Daniel** — see sprint-1 walkthrough step 3; not self-certifiable by the
      session that wrote the docs).
- [x] This README marked ✅; `sprint-1.md` status ticked with commit ref (PR [#47](https://github.com/danybgoode/miyagi-product-management/pull/47), squash `3544073`).
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster (`Roadmap/README.md`) updated — Recent highlights entry added.
- [x] Durable learning promoted to `Roadmap/LEARNINGS.md` (the escalation-trigger = high-risk-tier SSOT link
      + the build-order-guard-on-status-flip gotcha).
- [x] Feature branch deleted; **frontmatter `status: shipped`**; `node scripts/build-order.mjs` re-run.

## Session kickoff
See [sprint-1.md](sprint-1.md) → *Kickoff prompt*.
