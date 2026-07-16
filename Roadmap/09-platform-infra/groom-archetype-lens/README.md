---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: groom-archetype-lens
---

# Epic: Groom archetype-lens wiring — optional Stage-2 archetype tag

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore

Small additive tooling (docs/tooling). Scope doc: [`00-ideas/2. readyforscope/groom-archetype-lens.md`](../../00-ideas/2.%20readyforscope/groom-archetype-lens.md)
· **Decision it implements:** [`spike-role-archetypes`](../../00-ideas/2.%20readyforscope/spike-role-archetypes.md) WRITTEN DECISION (2026-07-02).

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
| [S1](sprint-1.md) | 1.1 · Add the optional archetype tag + five "what this changes" cues to `skills/groom/SKILL.md` Stage 2 (compose-not-replace; prompt-not-gate; soft maturity note; link the decision) — `00b7e50` | Low |
| [S1](sprint-1.md) | 1.2 (optional) · Optional `archetype:` line in the epic README template — `1fa7b1c` | Low |

## Deploy order
No deploy — monorepo-root skill docs. "Shipping" = merged to `main`. Docs/tooling, low-risk tier → may merge
directly.

## Definition of Done (epic)
- [x] `skills/groom/SKILL.md` Stage 2 has the optional archetype tag + five one-line cues; states
      compose-not-replace, planning-prompt-not-gate, and the soft product-maturity note; links the decision.
- [x] Builder recorded as the default (omit-the-tag case); team-mix ratios **not** added; no gate introduced.
- [x] (If 1.2) epic README template carries an optional `archetype:` field (as a manual, HTML-comment-guided
      line — not a new `{{VAR}}` — see `sprint-1.md` Story 1.2 for why).
- [x] Dogfood: re-tag one recent epic (`shop-settings-refactor` → Chore/Sweeper) and confirm the cue would
      have front-loaded its real acceptance shape — confirmed in `sprint-1.md`.
- [x] This README ✅; `sprint-1.md` ticked with commit ref; `RETROSPECTIVE.md` written.
- [x] Poster updated — no Feature-map line (09-platform-infra has no Feature-map section; internal tooling
      only), one **Recent highlights** entry added for consistency with sibling 09-infra chores.
- [x] Durable learning promoted to `LEARNINGS.md` — sharpened the existing "editing status: frontmatter
      mid-PR triggers the build-order guard" corollary to also cover ticking a sprint doc to done (the
      derivation heuristic reads sprint status too, not just README frontmatter) — this is exactly what
      happened in this epic's own PR.
- [x] Feature branch deleted; **frontmatter `status: shipped`**; `node scripts/build-order.mjs` re-run.

## Session kickoff
See [sprint-1.md](sprint-1.md) → *Kickoff prompt*.
