---
title: "Spike — role archetypes (Prototyper/Builder/Sweeper/Grower/Maintainer) as a groom lens"
slug: spike-role-archetypes
status: ready
area: "09 · Platform & Infra"
type: spike
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-01
parent: process-iteration-portfolio
---

# Spike — Role archetypes as a classification lens

> Child of [`process-iteration-portfolio`](process-iteration-portfolio.md) — Initiative **E**. Class:
> **Spike** (investigate → written decision; no wiring until it lands). Independent of the others; lowest
> urgency. Per Daniel's call: **spike before wiring.**

## Mirror-back
> The thought-leadership framing: as eng/product/design/DS melt together, work looks like five archetypes —
> **1 Prototyper · 2 Builder · 3 Sweeper · 4 Grower · 5 Maintainer** — and a healthy team needs a mix that
> shifts with product maturity (pre-PMF → 1+2+3; growing → 2+3+4+some 5; strong-PMF → 3+4+5+some 2). You
> want to explore applying a version of this at **classify and/or build time**. Right?

## Why a spike, not a build
The open question is whether an archetype tag **changes decisions** or is just a label. It only earns wiring
if tagging an ask "Sweeper" vs "Builder" actually shifts how we slice, what acceptance emphasizes, the risk
tier, or the model choice. For a **solo operator + agents** (not a multi-person team), the "team-mix ratios"
may not translate — but the **per-ask archetype** might still sharpen grooming. Decide before touching
`skills/groom`.

## The investigation (deliverables land as a WRITTEN DECISION here)
1. **Does it change decisions?** For each archetype, state what it would *change* in groom output:
   - *Prototyper* → thin throwaway slice, minimal QA, explicitly disposable, low-risk, speed over polish.
   - *Builder* → production-grade, full DoD, the current default path.
   - *Sweeper* → deletion/simplification/perf/unship; acceptance = "less code, same behavior, faster"; a
     distinct QA emphasis (no regressions on removal).
   - *Grower* → iterate on a shipped feature for PMF; acceptance tied to a metric/funnel, not just "works."
   - *Maintainer* → security/reliability/cost on a mature system; ties to the existing runbook/infra skills.
2. **Compose vs replace?** Does the archetype sit **alongside** the existing Feature/Spike/Bug/Chore
   classification (an added tag at Stage 2), or reshape it? Recommend the lightest touch.
3. **Solo-operator fit.** Do the team-mix ratios add anything here, or only the per-ask archetype? Should the
   *product's* current maturity (per macro-section) bias which archetypes we expect?
4. **Worked examples.** Apply the lens to 2–3 recent epics (e.g. a Sweeper = a cleanup epic like
   `devops-reliability-cleanup`; a Builder = a feature epic; a Grower = a polish epic) and show whether the
   tag would have changed the plan. This is the acid test.
5. **Interaction with the model split.** Would archetype inform model choice (e.g. Prototyper → Sonnet 5 fast
   throwaway; Maintainer/money-path → Opus)? Note the overlap with Initiative C's escalation triggers.

## Scope
**In:** the investigation + a written decision (adopt as a groom Stage-2 lens · defer · drop), with the
worked examples. **Out:** any `skills/groom` edits, build-time execution wiring, or process-doc changes —
those become a follow-up chore **only if** the decision is "adopt."

## What already exists (reuse, don't rebuild)
- `skills/groom/SKILL.md` Stage 2 (classify) — the single seam a lens would slot into.
- The existing risk-tier + Feature/Spike/Bug/Chore taxonomy — the archetype must compose with these, not
  duplicate them.
- Initiative C's escalation triggers — reuse if archetype ever informs model choice.
- Recent epics under each macro-section — the corpus for the worked-example acid test.

## Definition of Ready (spike)
- [x] Class = spike; ends in a written decision; framing captured; solo-operator caveat flagged.
- [x] Investigation questions + the "does it change decisions?" acid test written.
- [ ] Daniel approves → run it; land the WRITTEN DECISION here. Wiring (if any) is a separate groomed chore.
