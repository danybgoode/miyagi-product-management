# Cross-agent planning panel — Sprint 1: Thin advisory panel command (architecture lenses)

**Status:** ⬜ not started — scaffolded 2026-06-13.

> Planning/dev tooling, not app code: this sprint touches `scripts/` + `skills/groom/` + `Roadmap/` docs
> only — **no** `apps/*`, commerce, money, auth, DB, i18n, Vercel, or Cloud Run. The app deterministic
> gate (tsc/build/Playwright) does not apply; QA is "run the command against a real recent scope doc and
> read the output." All stories LOW.

> **Reuse, don't rebuild:** `cross-panel.mjs` shares `cross-review.mjs`'s CLI-driving helpers (presence/
> version checks, single-pass, advisory banner, per-CLI context-passing). Swap `(reviewer-prompt, pr-diff)`
> → `(lens-prompt, input-doc)`. Don't re-derive the CLI plumbing.

## Stories

### Story 1.1 — Skateboard: one lens to stdout
**As a** product owner grooming a plan, **I want** `node scripts/cross-panel.mjs <scope-doc> --agent codex
--lens architect-purist` to feed the plan into a different-family model and print a single-pass critique,
**so that** I get a second opinion on an architecture call before slicing it into an epic.
**Acceptance:**
- The command reads the input doc, pipes it + the lens prompt into `codex exec` (reusing cross-review's
  helper), and prints coherent structured findings to stdout — single pass, no loop.
- Run against a real recent scope doc (e.g. one in `00-ideas/2. readyforscope/`), the output reads like a
  real architecture critique (reuse-vs-rebuild, Medusa-first, the five AGENTS rules), not an error dump.
- Missing/unauthed `codex`, or a bad/missing doc path, fails with a clear one-line message (no stack trace).
**Risk:** low

### Story 1.2 — Pragmatist lens + the lens-prompt library
**As a** product owner, **I want** a second `architect-pragmatist` lens and both lenses factored into a
shared prompt doc, **so that** I can get the "does this belong in a Medusa module?" purist view *and* the
"ship the thinnest thing that works" pragmatist view from one source of truth.
**Acceptance:**
- `--lens architect-pragmatist` switches the perspective; the two lenses produce distinct, useful critiques
  of the same doc.
- Both lenses live in `scripts/cross-panel.prompt.md` (+ per-lens text) — one durable source the command
  and a human reader both use; no rubric re-authored inline.
- **Each lens is required to attach a *checkable* claim** — an explicit assumption + a cheap way to validate
  it — so output can't be pure vibes. An unknown `--lens` value fails with a clear message.
**Risk:** low

### Story 1.3 — Run the pair → one combined advisory block
**As a** product owner, **I want** to run both lenses (across the two model families) and get one labeled
advisory block, **so that** I see the panel's combined read and any real disagreement in one place.
**Acceptance:**
- Running the pair (single-pass each; `--agent` selects the family per lens) prints **one** block headed
  `🔎 Cross-agent planning panel` with the banner: **"Advisory only — not a gate. CI/QA don't apply to
  planning; your scope-doc approval decides."**
- Where the two lenses genuinely contradict on a *specific* point, that contradiction is surfaced
  explicitly (the one thing for Daniel to adjudicate) — **no** automated back-and-forth round.
- A `--dry-run` / single-`--lens` path still works for a quick one-lens look.
**Risk:** low

### Story 1.4 — Wiring (skill + kickoff, docs-only)
**As a** future groom session or Daniel, **I want** the panel surfaced at the right grooming moments and
runnable via a verb, **so that** it's used consistently on the expensive forks and never mistaken for a gate.
**Acceptance:**
- `skills/groom/SKILL.md` gains the **trigger model**: at Stage 2 (class = Spike) and Stage 4 (an
  architecture fork — new module vs Supabase vs custom route, new primitive, AGENTS-rule tension,
  expensive-to-reverse), the skill **must surface** a one-line offer to run the panel; routine work is
  on-demand only; it's never auto-run and never a gate.
- `SESSION-KICKOFFS.md` command shorthands gain **`Panel: <scope-doc | ask>`** → `node
  scripts/cross-panel.mjs … --lens … --agent …` (advisory, single-pass, never gates).
- A fresh groom session reading the docs knows when the panel is surfaced, how to run it, and that it never
  gates/auto-approves.
**Risk:** low

## Sprint QA
- **api spec(s):** none — not app code, no Playwright surface. QA = run the command against a real recent
  scope doc (Story 1.1/1.2/1.3 acceptance) and read the printed block.
- **browser smoke owed:** no.
- **deterministic gate:** N/A (no tsc/build/Playwright surface). Lightweight self-check: the script runs
  without throwing on a one-lens dry pass, and `--help` lists the flags/lenses.
- **dependency check:** confirm `gh` (not needed here), `codex`, and `agy` are installed + authed on the
  run machine before trialing; the script must degrade with a clear message if not.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local dev machine (this is a repo CLI; pick any real **approved scope doc**, e.g.
`Roadmap/00-ideas/seeds/cross-agent-planning-panel.md` itself, as `<doc>`).

1. Run `node scripts/cross-panel.mjs <doc> --agent codex --lens architect-purist`
   → A purist architecture critique prints to the terminal, ending in a *checkable claim*; no file is edited.
2. Run `node scripts/cross-panel.mjs <doc> --agent codex --lens architect-pragmatist`
   → A distinct pragmatist critique prints (thinner-slice / reuse angle), also with a checkable claim.
3. Run the pair (per the command's pair syntax, e.g. `--lens both`)
   → One `🔎 Cross-agent planning panel` block prints with the "advisory only — not a gate" banner; any real
   disagreement between the lenses is called out as the point to adjudicate.
4. Run `node scripts/cross-panel.mjs <doc> --lens bogus`
   → It exits with a clear message (e.g. "unknown --lens 'bogus'; use architect-purist|architect-pragmatist"), no stack trace.
5. Open `Roadmap/SESSION-KICKOFFS.md` and `skills/groom/SKILL.md`
   → The `Panel:` verb exists; groom Stage 2/Stage 4 describe surfacing the panel as advisory, never a gate.

If any step fails, note the step number + what you saw — that's the bug report.
