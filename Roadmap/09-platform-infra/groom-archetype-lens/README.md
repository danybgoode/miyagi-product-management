---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: groom-archetype-lens
---

# Epic: Groom archetype-lens wiring — optional Stage-2 archetype tag

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Type:** Chore (docs/tooling) · **Archetype:** Builder
> (small additive tooling) · **Scope doc:**
> [`00-ideas/2. readyforscope/groom-archetype-lens.md`](../../00-ideas/2.%20readyforscope/groom-archetype-lens.md)
> · **Decision it implements:** [`spike-role-archetypes`](../../00-ideas/2.%20readyforscope/spike-role-archetypes.md) WRITTEN DECISION (2026-07-02).

## Why
The role-archetypes spike decided to **adopt the five archetypes as an optional groom Stage-2 lens** (trial
basis) because 4 of 5 change concrete grooming decisions. This chore wires it in: a small edit to
`skills/groom/SKILL.md` Stage 2 adding the optional tag + per-archetype "what this changes" cues, so the next
epics groomed inherit the lens. Planning prompt, not a gate; team-mix ratios excluded (solo operator).

## Medusa-first note
**N/A — zero commerce surface.** AGENTS rules 1–4 untouched; rule 5 N/A (developer-facing English). Touch
surface: `skills/groom/SKILL.md` (+ optionally `skills/groom/templates/epic-README.md`). No app code/infra.

## What already exists (reuse, don't rebuild)
- **`spike-role-archetypes.md` WRITTEN DECISION** — the exact per-archetype cues + framing to transcribe;
  don't re-derive.
- **`skills/groom/SKILL.md` Stage 2** — the class table is the seam; the tag slots in beside it.
- **`skills/groom/templates/epic-README.md`** — for the optional `archetype:` line (this epic's own header
  already dogfoods it: *Archetype: Builder*).
- **Initiative C escalation triggers** (`WAYS-OF-WORKING.md` Model tiers) — referenced, not duplicated.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| [S1](sprint-1.md) | 1.1 · Add the optional archetype tag + five "what this changes" cues to `skills/groom/SKILL.md` Stage 2 (compose-not-replace; prompt-not-gate; soft maturity note; link the decision) | Low |
| [S1](sprint-1.md) | 1.2 (optional) · Optional `archetype:` line in the epic README template | Low |

## Deploy order
No deploy — monorepo-root skill docs. "Shipping" = merged to `main`. Docs/tooling, low-risk tier → may merge
directly.

## Definition of Done (epic)
- [ ] `skills/groom/SKILL.md` Stage 2 has the optional archetype tag + five one-line cues; states
      compose-not-replace, planning-prompt-not-gate, and the soft product-maturity note; links the decision.
- [ ] Builder recorded as the default (omit-the-tag case); team-mix ratios **not** added; no gate introduced.
- [ ] (If 1.2) epic README template carries an optional `archetype:` field.
- [ ] Dogfood: re-tag one recent epic (`shop-settings-refactor` → Chore/Sweeper) and confirm the cue would
      have front-loaded its real acceptance shape.
- [ ] This README ✅; `sprint-1.md` ticked with commit ref; `RETROSPECTIVE.md` written.
- [ ] Poster updated only if it references groom's classification (likely N/A).
- [ ] Durable learning promoted to `LEARNINGS.md` only if one emerges (a trial-adoption note may not warrant one).
- [ ] Feature branch deleted; **frontmatter `status: shipped`**; `node scripts/build-order.mjs` re-run.

## Session kickoff
See [sprint-1.md](sprint-1.md) → *Kickoff prompt*.
