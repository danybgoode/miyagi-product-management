# Retrospective — Cross-agent planning panel

**Shipped 2026-06-13** · 1 sprint, 4 stories, all LOW · PR #15 · planning/dev tooling, no app surface.

## What shipped
`scripts/cross-panel.mjs` — the planning-half sibling of `cross-review.mjs`. It reads **one** scope/seed doc
and prints a single-pass, advisory, never-gating architecture critique through two lenses (Medusa-**purist**
vs ship-it **pragmatist**), each required to end in a **checkable claim**. `--lens both` (the default) runs
both lenses on the chosen `--agent`, prints one combined `🔎 Cross-agent planning panel` block, then a single
**synthesis** pass that surfaces only genuine opposite-action contradictions for Daniel to adjudicate.
`--dry-run` composes-and-prints the prompt without calling a CLI. Wired into `groom` (Stage 2 Spike + Stage 4
architecture fork = a required one-line *offer*) and `SESSION-KICKOFFS.md` (`Panel:` verb).

## What went well
- **The rail was ~90% of it.** Extracting `cross-review.mjs`'s CLI plumbing into a shared module
  (`scripts/lib/cross-agent-cli.mjs`) and swapping `(reviewer-prompt, pr-diff)` → `(lens-prompt, input-doc)`
  meant the new command was mostly prompt design + a combined-block printer. No CLI plumbing re-derived.
- **The tool reviewed its own plan, for real.** The smoke ran the panel against this epic's own seed doc; the
  pragmatist lens independently asked "is the shared-helper extraction over-build for v1?" while the purist
  said "define the extraction contract before slicing" — and the synthesis pass surfaced exactly that as the
  one contradiction to adjudicate. The mechanism demonstrably produces a *checkable*, non-vibes second opinion.
- **Dynamic lens discovery.** Lenses are read from the prompt file's `## LENS:` headings, so adding the
  pragmatist lens (S1.2) was almost entirely a `cross-panel.prompt.md` edit — no script registration.

## What we learned (promoted to LEARNINGS.md)
- **A second single-purpose cross-agent script should share the rail, not fork it.** Extract the family-
  agnostic plumbing (presence/version checks, `runCodex`/`runAntigravity` + the agy argv size-cap, the
  prompt-body loader) into one module; keep each script's *framing* (PR diff vs plan doc) and *output* (post
  a comment vs print a panel) local. An `opts.soft` mode on the runners lets a non-essential pass (the
  synthesis) degrade to a note instead of `die()`-ing.
- **For "surface contradictions," one constrained synthesis pass beats both side-by-side and a debate loop.**
  Print the lens critiques verbatim, then a single pass that lists *only* opposite-action contradictions (or
  "complementary") — still single-pass (no back-and-forth, our #1 token sink), but the tool does the flagging
  rather than leaving the human to eyeball two blocks.

## Gotchas
- `git mv … && git commit -- <paths>` keeps the rename path-scoped; grep for stale path references in *header
  comments and docs* after moving a module, not just the imports (three comment refs to `scripts/cross-agent-
  cli.mjs` survived the import update until grepped).
- No app gate applies (no tsc/build/Playwright) — the real QA is running the command against a real doc and
  reading the printed block. `codex`/`agy` must be installed + authed; `--dry-run` is the no-CLI plumbing check.

## Owed
Nothing money/auth/browser — it's a local repo CLI. Optional: Daniel eyeballs one panel run and the groom
trigger-model wording.
