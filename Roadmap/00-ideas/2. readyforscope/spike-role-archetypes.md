---
title: "Spike — role archetypes (Prototyper/Builder/Sweeper/Grower/Maintainer) as a groom lens"
slug: spike-role-archetypes
status: shipped
area: "09 · Platform & Infra"
type: spike
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-02
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
- [x] Daniel approved → investigation run; WRITTEN DECISION landed below. Wiring is a separate groomed chore.

---

## WRITTEN DECISION (spike close, 2026-07-02)

**Adopt the five archetypes as an optional, lightweight lens at groom Stage 2 — a second orthogonal tag
alongside the existing Feature/Spike/Bug/Chore class — on a trial basis. Drop the team-mix ratios (they
don't translate to a solo operator + agents). It passes the acid test: for 4 of the 5 archetypes it changes
concrete grooming decisions, not just the label.** Wiring `skills/groom` is a separate low-risk follow-up
chore (this spike is planning-only).

### 1. Does it change decisions? (the acid test — per archetype)
| Archetype | What it changes in groom output | Verdict |
|---|---|---|
| **Prototyper** | Thin, explicitly-disposable slice; **minimal/optional QA**; skip the full epic DoD; low-risk by default; speed over polish; "this may never ship" stated up front. | **Changes decisions** — a different (lighter) gate than the default. |
| **Builder** | Production-grade, full Definition of Done, per-story risk-tier, Sonnet-5 build with the C-escalation guardrail. | **No change — this IS the current default.** Its value is as the baseline the others deviate from; no tag needed when work is a Builder. |
| **Sweeper** | Acceptance flips from "new behavior works" to **"less code / same behavior / no regressions"**; QA emphasis on regression + a **guard against the thing coming back** (anti-monolith/size guards); frequently touches **shared surface → announce** (sibling-PR risk); "prove the old path is unreachable before deleting." | **Changes decisions** — a distinct acceptance + QA + risk shape. |
| **Grower** | Acceptance tied to a **success signal / metric / funnel**, not just "works"; forces a *measurement or observation plan*; iterate-on-shipped, so reuse-first is even stronger. | **Changes decisions** — adds a measurement gate the default doesn't require. |
| **Maintainer** | Security / reliability / cost / perf on a mature system; **expects high-risk** (money/auth/migrations/shared-infra) → kill-switch thinking at Stage 6b, Opus/escalation; ties to the runbook + infra-ops skills (Initiative D gap-map). | **Changes decisions** — front-loads high-risk + reliability acceptance. |

**Conclusion:** 4/5 shift the plan; Builder is the null case. That's exactly the outcome that justifies a lens
(if *all* five collapsed to "Builder with a label," it would be noise — they don't).

### 2. Compose, don't replace
The archetype is **orthogonal to the class**, not a substitute. The class answers *"what kind of work item
is this?"* (Feature/Spike/Bug/Chore → which downstream path); the archetype answers *"what mode/intent is it
in?"* (→ acceptance + QA + risk + model emphasis). They pair into a 2-tuple, e.g. **Chore/Sweeper**,
**Feature/Grower**, **Chore/Maintainer**. Keep both; the archetype is an *added* Stage-2 tag, and it's
**optional** (default = Builder, i.e. omit the tag and nothing changes).

### 3. Solo-operator fit
- **Per-ask archetype: adopt.** It's a useful mode label for one operator + agents.
- **Team-mix ratios (1+2+3 pre-PMF, etc.): drop.** They're about *staffing a multi-person team*; they don't
  translate here. Keep only the *soft* corollary: a macro-section's **product maturity** biases which
  archetypes to expect (pre-PMF `07-agentic`/`10-events` → Prototyper/Builder; mature
  `02-checkout-payments`/`09-infra` → Sweeper/Maintainer). This is an expectation-setter, never a gate.

### 4. Worked examples (recent epics — would the tag have changed the plan?)
- **`shop-settings-refactor` = Chore/Sweeper.** The plan *discovered* the Sweeper shape mid-flight (prove the
  4,076-line fallback unreachable → delete → add an anti-monolith CI guard). A Sweeper tag would have
  **front-loaded** that acceptance ("behavior-preserving; prove old path dead; add a regression guard")
  instead of finding it. **Tag changes the plan → yes.**
- **`neighborhood-pulse` = Feature/Grower** (a recurring reason to return). It shipped **live-but-empty**,
  with success measurement *owed* rather than defined. A Grower tag would have forced a **success-signal /
  observation plan** into acceptance up front. **Tag changes the plan → yes.**
- **`ops-routines-reporting` = Chore/Builder** (turn the idea into production infra). Default path; a Builder
  tag adds nothing over the status quo. **Tag changes the plan → no — and that's the correct null result.**
- **`feature-flags-inhouse` / `backend-production-readiness` = Chore/Maintainer.** A Maintainer tag would
  have named "expect high-risk + reliability/kill-switch acceptance" at Stage 2, which those epics reached
  anyway via the risk tier. **Tag changes emphasis → mildly (mostly confirms the existing HIGH-risk path).**

### 5. Interaction with the model split (Initiative C)
Archetype is a **soft input** to model choice — Prototyper → Sonnet 5 fast/throwaway; Sweeper-on-shared-infra
/ Maintainer / money-path → Opus or escalate. But the **C escalation triggers (money/auth/migration/
shared-infra/ambiguity) stay the hard SSOT** — the archetype must not *re-encode* or override them. Rule:
archetype *suggests* a starting model; the C triggers *force* escalation regardless of archetype.

### 6. Recommendation + follow-up (not built in this spike)
- **Adopt as an optional Stage-2 lens, trial it on the next ~3–4 epics, and keep it cheap to remove.** If it
  keeps collapsing to "Builder with a label" in practice, drop it — the acid test above says it shouldn't.
- **Follow-up chore (groom this separately):** a small edit to `skills/groom/SKILL.md` Stage 2 adding the
  optional archetype tag + a one-line per-archetype "what this changes" checklist (Prototyper→light gate ·
  Sweeper→regression+unreachability+announce · Grower→success signal · Maintainer→high-risk/reliability ·
  Builder=default). Docs-only, low-risk. Optionally surface the tag in the epic README house format.
- **Explicitly out:** any build-time execution wiring, new tooling, or per-story enforcement — the lens is a
  *planning prompt*, not a gate.
