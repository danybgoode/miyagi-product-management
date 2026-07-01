---
title: "Model split — Sonnet 5 for execution, Opus for planning, with an escalation guardrail"
slug: model-split-sonnet5-execution
status: ready
area: "09 · Platform & Infra"
type: chore
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-01
parent: process-iteration-portfolio
---

# Scope — Model split (Sonnet 5 builds · Opus plans · escalate-don't-guess)

> Child of [`process-iteration-portfolio`](process-iteration-portfolio.md) — Initiative **C**. Class:
> **Chore** (one story, docs/process only). **Stage-2.5: already-possible** — this is the documented
> default; we only name the execution model and add the escalation guardrail.

## Outcome & signal
After this ships, the process docs and every per-sprint kickoff explicitly say: **plan on Opus 4.8, build
on Sonnet 5, and escalate rather than guess.** Signal: a fresh Sonnet-5 build session, handed an ambiguous
or money-path story, **pauses and asks / hands back to Opus** instead of inventing an answer.

## Stage-2.5 bucket
**already-possible.** `WAYS-OF-WORKING.md` *Conventions → Model tiers* already says "strong model for the
thinking… a faster model is fine [for execution]… Planning in Cowork; building in Claude Code." Missing
pieces: (a) name **Sonnet 5** as the execution model, (b) codify the **escalation** rule you asked for.

## Scope
**In v1 (one story):**
- Edit `WAYS-OF-WORKING.md` *Model tiers* to name **Sonnet 5** as the per-story execution model and Opus 4.8
  as the planning/grooming/spike/plan-mode/review model.
- Add the **escalation guardrail**: Sonnet 5 must stop and ask / escalate to Opus when a story hits **money
  or auth paths · a schema/DB migration · an architecture fork · plan ambiguity or a decision the plan
  doesn't cover · a repeated failed attempt (2+).** Default to escalate when unsure.
- Mirror the rule into the **per-sprint kickoff prompt** template in `skills/groom/SKILL.md` (Stage 8) so
  every build session inherits it.

**Out of v1:** any automated model-routing tooling or CLI wiring; changing the planning model; per-model
benchmarking. (Sonnet-5 fit is validated informally on 1–2 low-risk stories, not built as a project.)

## What already exists (reuse, don't rebuild)
- `WAYS-OF-WORKING.md` *Model tiers* paragraph (the doc seam to edit).
- `skills/groom/SKILL.md` Stage 8 kickoff prompt (the template to amend).
- The escalation triggers already exist implicitly as the **high-risk tier** definition (payments/checkout/
  fulfillment/auth/DB/shared-infra) — reuse that list so the guardrail and the risk tier stay in sync.

## Acceptance criteria
- `WAYS-OF-WORKING.md` names Sonnet 5 (build) + Opus 4.8 (plan) and lists the escalate-don't-guess triggers.
- The groom Stage-8 kickoff prompt tells the build session to escalate on those triggers.
- Smoke: start a Sonnet-5 session on a deliberately-ambiguous story → it asks a clarifying question / flags
  the fork rather than proceeding on a guess.

## Open risks / research
- Sonnet 5 is current (Anthropic model lineup, 2026). Validate execution fit on 1–2 low-risk stories before
  treating it as the blanket default; the escalation guardrail is the safety valve if fit is uneven.
- Keep the guardrail's trigger list identical to the high-risk-tier list so there's one source of truth.

## Definition of Ready
- [x] As-a/I-want/so-that clear; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (already-possible); in/out written; reuse list produced; risk = low.
- [ ] Daniel approves → scaffold as a single-story chore (docs-only, low-risk, can merge directly).
