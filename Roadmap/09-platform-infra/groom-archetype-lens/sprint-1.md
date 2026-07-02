# Groom archetype-lens — Sprint 1: wire the optional Stage-2 tag

**Status:** ⬜ not started

## Stories

### Story 1.1 — Optional archetype tag + cues in groom Stage 2
**As a** groomer (Cowork planning session), **I want** an optional archetype tag with per-archetype cues at
Stage 2, **so that** an ask's mode (Sweeper/Grower/etc.) front-loads the right acceptance/QA/risk emphasis
instead of it being discovered mid-build.
**Acceptance:**
- `skills/groom/SKILL.md` Stage 2 gains an **optional** archetype tag (Prototyper/Builder/Sweeper/Grower/
  Maintainer), orthogonal to the Feature/Spike/Bug/Chore class, with a compact one-line-per-archetype "what
  this changes" cue (transcribed from the spike decision):
  - Prototyper → thin/disposable, minimal QA, skip full DoD, low-risk, "may never ship."
  - Builder → **default** (full DoD) — no tag needed.
  - Sweeper → less code / same behavior / no regressions; prove old path unreachable; add a return-guard;
    shared-surface → announce.
  - Grower → acceptance tied to a success signal/metric; reuse-first.
  - Maintainer → security/reliability/cost/perf; expect high-risk (Stage 6b), Opus/escalate; ties to
    runbook/infra skills.
- The text states it **composes with, doesn't replace** the class; it's a **planning prompt, not a gate**;
  and includes the soft product-maturity-per-section note. It links `spike-role-archetypes.md`.
- **Team-mix ratios are NOT added.** No new gate/enforcement/model-routing. The C escalation triggers are
  referenced, not re-encoded.
- Compact (a small table/inset), not a new mega-section — respects the doc-hygiene sweep's spirit.
**Risk:** Low (docs/tooling; may merge directly).

### Story 1.2 (optional) — Optional `archetype:` line in the epic README template
**As a** groomer, **I want** an optional `archetype:` field in the epic README house format, **so that** a
tagged epic records its archetype.
**Acceptance:** `skills/groom/templates/epic-README.md` carries an **optional** `archetype:` line (clearly
optional; Builder/untagged is fine). No other template change.
**Risk:** Low.

## Sprint QA
- **api spec(s):** none — no code surface.
- **browser smoke owed:** no.
- **deterministic gate:** N/A (docs/tooling). Verify by reading the edited Stage 2; run the dogfood re-tag
  below.

## Sprint 1 — Verification walkthrough (do these in order)
Env: the repo skill docs (process change; no app deploy / production URL).

1. Open `skills/groom/SKILL.md` → Stage 2.
   → An optional archetype tag with the five one-line cues sits beside the class table; it says
   compose-not-replace + planning-prompt-not-gate + the soft maturity note; the spike decision is linked.
2. Confirm the negatives.
   → No team-mix ratios; no new required field/gate; the C escalation triggers are referenced, not copied.
3. (If 1.2) open `skills/groom/templates/epic-README.md`.
   → An optional `archetype:` line is present and clearly optional.
4. **Dogfood** — mentally re-groom `shop-settings-refactor` with the lens (Chore/Sweeper).
   → The Sweeper cue ("prove old path unreachable + regression guard + announce shared surface") matches what
   that epic actually needed — confirming the lens front-loads real decisions, not just a label.

If any step fails, note the step number + what you saw — that's the bug report.

## Kickoff prompt (paste into a fresh Claude Code session)
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/00-ideas/2. readyforscope/spike-role-archetypes.md (the WRITTEN DECISION — the source of
> truth for the cues), Roadmap/00-ideas/2. readyforscope/groom-archetype-lens.md, and
> Roadmap/09-platform-infra/groom-archetype-lens/README.md + sprint-1.md.
>
> You're building Sprint 1 of "Groom archetype-lens wiring" — one LOW-risk docs/tooling story (+ one optional),
> monorepo-root repo. Enter plan mode, confirm with me, then branch chore/groom-archetype-lens off latest main.
> Story 1.1: edit skills/groom/SKILL.md Stage 2 to add an OPTIONAL archetype tag (Prototyper/Builder/Sweeper/
> Grower/Maintainer) orthogonal to the Feature/Spike/Bug/Chore class, with the compact one-line-per-archetype
> "what this changes" cues transcribed from the spike decision (Builder = default/no-tag). State
> compose-not-replace, planning-prompt-NOT-a-gate, and the soft product-maturity-per-section note; link the
> spike decision. Do NOT add the team-mix ratios, any new gate/required field, or model-routing; reference
> (don't re-encode) the C escalation triggers. Keep it compact (a small table/inset), not a mega-section.
> Story 1.2 (optional): add an optional `archetype:` line to skills/groom/templates/epic-README.md. Dogfood by
> re-tagging shop-settings-refactor as Chore/Sweeper and confirming the cue fits. Path-scoped commits. Open a
> PR declaring LOW risk; docs-only may merge directly once I confirm. Nothing to tasks/. If anything is
> ambiguous, ask / escalate to Opus rather than guessing.
