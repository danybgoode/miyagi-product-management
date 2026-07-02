---
title: "Groom archetype-lens wiring — optional Stage-2 archetype tag"
slug: groom-archetype-lens
status: ready
area: "09 · Platform & Infra"
type: chore
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-02
parent: spike-role-archetypes
---

# Scope — Groom archetype-lens wiring

> The follow-up chore the [`spike-role-archetypes`](spike-role-archetypes.md) WRITTEN DECISION authorized:
> wire the five archetypes into the `groom` skill as an **optional Stage-2 lens**. Class: **Chore**
> (docs/tooling only). **Stage-2.5: light-enhancement** — a small edit to an existing skill, no new tooling.

## Outcome & signal
After this ships, `skills/groom/SKILL.md` Stage 2 offers an **optional archetype tag** (Prototyper / Builder /
Sweeper / Grower / Maintainer) alongside the existing Feature/Spike/Bug/Chore class, each with a one-line
"what this changes" cue. Signal: the next epic groomed picks up an archetype tag (where non-default) and its
acceptance/QA/risk emphasis reflects it — e.g. a Sweeper epic names "prove old path unreachable + regression
guard + announce shared surface" up front instead of discovering it mid-flight.

## Stage-2.5 bucket
**light-enhancement.** No new script, no new gate — a targeted edit to `skills/groom/SKILL.md` Stage 2 (and
optionally the epic README template), implementing an already-approved decision.

## Scope
**In v1:**
- **Story 1.1 — Stage-2 archetype tag.** Add to `skills/groom/SKILL.md` Stage 2: an **optional** archetype
  tag orthogonal to the class, with the per-archetype "what this changes" one-liners from the spike decision:
  - *Prototyper* → thin/disposable slice, minimal QA, skip full DoD, low-risk, "may never ship."
  - *Builder* → **the default** (full DoD) — no tag needed; the baseline others deviate from.
  - *Sweeper* → "less code / same behavior / no regressions"; prove old path unreachable; add a guard against
    it returning; **shared-surface → announce**.
  - *Grower* → acceptance tied to a **success signal / metric**, not just "works"; reuse-first.
  - *Maintainer* → security/reliability/cost/perf; **expect high-risk** (Stage 6b kill-switch thinking,
    Opus/escalate); ties to runbook/infra skills.
  - State it **composes with, doesn't replace** the class; it's a **planning prompt, not a gate**; and note
    the soft product-maturity-per-section expectation (pre-PMF sections lean Prototyper/Builder; mature lean
    Sweeper/Maintainer). Cross-link the spike decision.
- **Story 1.2 (optional, low) — surface the tag in the house format.** Add an optional `archetype:` line to
  the epic README template (`skills/groom/templates/epic-README.md`) so a tagged epic records it.

**Out of v1:**
- The **team-mix ratios** (dropped per the decision — solo operator).
- Any **build-time enforcement**, per-story gating, model-routing automation, or new tooling.
- Re-encoding the C escalation triggers — archetype only *suggests* a starting model; the C triggers
  (money/auth/migration/shared-infra/ambiguity) remain the hard SSOT for escalation.

## What already exists (reuse, don't rebuild)
- **`spike-role-archetypes.md` WRITTEN DECISION** — the exact content to transcribe (per-archetype cues,
  compose-not-replace, solo caveat, model-split interaction). Don't re-derive it.
- **`skills/groom/SKILL.md` Stage 2** — the single seam; the class table is where the tag slots in beside.
- **`skills/groom/templates/epic-README.md`** — the house format for the optional `archetype:` line.
- **Initiative C's escalation triggers** (`WAYS-OF-WORKING.md` Model tiers) — referenced, not duplicated.

## Acceptance criteria
- `skills/groom/SKILL.md` Stage 2 has the optional archetype tag + the five one-line cues; states
  compose-not-replace, planning-prompt-not-gate, and the soft maturity note; links the spike decision.
- Builder is explicitly the default (omit-the-tag case).
- (If 1.2) the epic README template carries an optional `archetype:` field.
- Team-mix ratios are **not** added; no gate/enforcement introduced.
- Dogfood check: re-classify one recent epic (e.g. `shop-settings-refactor` → Chore/Sweeper) using the new
  lens and confirm the cue would have front-loaded its real acceptance shape.

## Open risks / research
- **Keep it a prompt, not a process gate** — the lens is advisory; over-formalizing it (a required field, a
  CI check) would contradict the decision and add friction.
- **Don't bloat Stage 2** — a compact table/inset, not a new mega-section (respects the just-finished
  doc-hygiene sweep's spirit).

## Definition of Ready
- [x] One clear story (+ one optional), testable by Daniel; Stage-2.5 bucket named; in/out written.
- [x] Reuse list produced (the approved decision is the source); risk = low (docs/tooling).
- [ ] Daniel approves → scaffold a single-story chore under `09-platform-infra`; the `skills/groom` edit is
      done in a Claude Code session (grooming stays planning-only).
