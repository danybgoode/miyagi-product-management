# Groom archetype-lens wiring — Retrospective

_Closed: 2026-07-02_

## What shipped
- **S1.1** — `skills/groom/SKILL.md` Stage 2 gained an optional archetype tag (Prototyper/Builder/Sweeper/
  Grower/Maintainer), orthogonal to the Feature/Spike/Bug/Chore class, as a compact table + three prose
  lines: compose-not-replace, planning-prompt-not-gate, and the soft product-maturity-per-section note.
  Builder is the explicit no-tag default. Links `spike-role-archetypes.md`. Commit `00b7e50`.
- **S1.2 (optional)** — `skills/groom/templates/epic-README.md` got a manual, HTML-comment-guided optional
  `**Archetype:**` line near the header blockquote — not a new `{{VAR}}` placeholder, since
  `scaffold-epic.mjs` does raw substitution and leaves unmatched tokens as literal text. Commit `1fa7b1c`.
- **Dogfood** — re-tagged `shop-settings-refactor` as Chore/Sweeper; the Sweeper cue ("prove old path
  unreachable + regression guard + shared-surface announce") matched what that epic actually needed,
  confirming the lens front-loads real decisions rather than adding a label. Recorded in `sprint-1.md`.
- PR #62, LOW risk, docs-only.

## What went well
- The spike decision (`spike-role-archetypes.md`) was written precisely enough that transcription was
  mechanical — no re-derivation needed, exactly as the chore's scope doc intended.
- Checking `scaffold-epic.mjs` *before* touching the template caught a real trap: a naive `{{ARCHETYPE}}`
  placeholder would have printed literally in every future scaffolded epic. The manual-comment approach
  keeps the field genuinely optional without new tooling.
- The shared root checkout had stale-looking `.git` lock files while sibling Claude Code sessions were
  active; building in an isolated `git worktree` (`.worktrees/groom-archetype-lens`) avoided any risk of
  colliding with concurrent work, per the existing parallel-agents convention.

## What we learned
- **Ticking a sprint doc's stories to "done" — not just editing the epic README's `status:` frontmatter —
  also trips the `build-order-fresh` CI guard.** `build-order.mjs`'s status-drift check compares the
  frontmatter-authoritative status against a **sprint/retro-derived** status; marking Sprint 1 done in
  `sprint-1.md` flipped the derived status to "Shipped" while the README frontmatter still said
  `scaffolded`, so CI reported `BUILD-ORDER.md` stale even though no epic-status line had been touched
  directly. Promoted to `LEARNINGS.md` (sharpened the existing `2026-07-01` corollary rather than appending
  a near-duplicate) since it generalizes to any epic-closing PR.
- Confirms the spike decision's own framing: a Sweeper tag reliably front-loads the "prove old path
  unreachable + regression guard" acceptance shape — the dogfood check found no daylight between the cue
  and `shop-settings-refactor`'s actual plan.

## Gaps / follow-ups
- None money/auth/deploy-related — this is a docs/tooling-only skill edit with no app surface.
- The trial is live as of this close: whether the archetype tag earns its keep is a judgment call for the
  next ~3–4 epics groomed (per the spike decision's own recommendation) — no action needed now, just watch
  whether it keeps collapsing to "Builder with a label" in practice.
- `Roadmap/00-ideas/2. readyforscope/groom-archetype-lens.md` seed frontmatter still reads `epic: null` /
  `status: ready` — Stage 7's "update the seed" step from the original scaffold session was skipped. Not
  blocking (the epic README frontmatter is the actual SSOT), but worth a future tidy-up pass.
