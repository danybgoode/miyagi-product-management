# Process token-diet — Retrospective

_Closed: 2026-07-20_

## What shipped
A four-story chore that trims invariant boilerplate and right-sizes the review stack to risk. Built in a
two-epic parallel batch alongside `ssrf-dns-pinning`.

- **S1.1 — kickoff-prompt generator** (`dobby-foundation#4`, merged `6e5cfbb`). `node
  skills/groom/emit-kickoff.mjs --epic <slug> --sprint N` prints the finished Stage-8 kickoff — invariant
  preamble from `templates/kickoff.md`, sprint delta parsed from the epic/sprint docs. Groom SKILL.md Stage 8
  now calls it (the literal block kept as the documented SSOT + fallback). Lands in the plugin repo (PR #89
  retired the in-repo copy). Pure-function `node --test`, `isMain`-guarded.
- **S1.2 — smoke-walkthrough URL stems** (`dobby-foundation#4`). Found ~90% pre-existing: `templates/sprint-N.md`
  already carried the whole Stage-8b skeleton and already lived in `skills/groom/templates/`. Reduced to the
  one real gap — pre-filled three concrete URL stems. Recorded as reduced, not rebuilt.
- **S1.3 — review-policy flip** (root `#104`, merged `889f5ba`). Cross-agent review (`cross-review.mjs`)
  advisory → **mandatory on every PR** (findings fixed or answered before merge); fresh `pr-reviewer`
  **mandatory on HIGH, optional on LOW** with named judgment triggers. Stated once in WAYS-OF-WORKING with a
  when/blocks-merge table; every downstream prompt/banner realigned.
- **S1.4 — deploy-rail drift** (root `#104`). The story's *named* target was already correct; swept for the
  drift it was reaching for and fixed three real stale Vercel-prod claims instead.

## What went well
- **Verifying acceptance against the live artifact before building disproved two of four stories' premises.**
  S1.2 was already built; S1.4's target was already fixed. Both were recorded as scope corrections in the
  stories rather than silently rewritten — the honest record is the useful one, and it stopped ~1.5 stories
  of make-work.
- **The mandatory-review flip caught its own incompleteness.** The `pr-reviewer` pass on the PR that
  introduced the policy refuted the PR's own "no artifact left claiming more than the policy grants" — a
  re-derived whole-population grep found six live artifacts still teaching the old policy (incl. the PR
  template and the kickoff SSOT). Fixed in the same PR. The layer earned its keep on the exact change that
  made it optional.
- **Dogfooding worked end to end**: the new mandatory `cross-review.mjs` ran on its own policy-change PR
  (clean), and the fresh `pr-reviewer` caught a real semantic hole (LOW merge-actor could resolve to the
  builder merging their own PR).

## What we learned
Promoted to `Roadmap/LEARNINGS.md`:
- **A policy change is only half-shipped until every artifact that *asserts* the policy is re-swept — and
  "every" means a re-derived grep over the whole population, not the files the story named.** The prose can be
  perfect while the PR template, the kickoff SSOT, a script's own header comment, and a poster line still teach
  the old rule. Sample-then-claim is how the overclaim survives; re-derive the population.
- **When a story's stated premise is already true, that IS the deliverable — say so and fix the real drift,
  don't implement the fiction.** (Sharpens the existing "sprint-doc assumed state can be fiction" line with a
  docs-side instance: two of four stories here.)

## Gaps / follow-ups
- **Owed to Daniel — the behavioural signal for S1.3 can't be self-certified.** Whether a fresh session
  actually *runs* the mandatory cross-agent pass and *skips-with-a-stated-reason* the optional fresh reviewer
  on a real LOW PR is a standing owed-observation, same shape as the model-tiers escalation signal — not a
  one-time close item.
- **No enforcement teeth by design.** `cross-review.mjs` is local-only (no codex/agy auth on a CI runner), so
  "mandatory" means an agent must run it before merging, not a required status check. If a future agent skips
  it, nothing blocks the merge but the convention. Accepted trade-off, stated in the docs.
- **codex CLI was behind its model requirement** during this batch (`gpt-5.6-sol` needs a newer Codex); every
  cross-review ran via the Antigravity fallback. Worth a routine `agy-doctor`-style check for codex too.
