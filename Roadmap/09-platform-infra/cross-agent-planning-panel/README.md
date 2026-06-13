# Epic — Cross-agent planning panel (single-pass advisory second opinions on plans)

**Status:** ✅ **COMPLETE — Sprint 1 (the whole v1) shipped 2026-06-13, PR #15.** `scripts/cross-panel.mjs`
is merged and runnable: two architecture lenses (purist/pragmatist), a pair-run combined block with a
contradiction-synthesis, the shared CLI plumbing in `scripts/lib/cross-agent-cli.mjs`, and the `groom`
trigger model + `Panel:` verb wiring. Advisory, single-pass, print-only, never a gate.

**Macro-section:** 09 · Platform & Infra
**Class:** Chore / planning-process tooling (Cowork track). No buyer/seller/agent-facing change.
**Scope doc:** [`Roadmap/00-ideas/seeds/cross-agent-planning-panel.md`](../../00-ideas/seeds/cross-agent-planning-panel.md) — APPROVED 2026-06-13.

## Why

The cross-agent *code* review (`scripts/cross-review.mjs`) earns its keep by giving a HIGH-risk PR a
different model family's blind spots, single-pass, advisory, never a gate. This epic brings the **same
discipline to the planning half** — a thin command that reads *one proposed plan* (a scope doc or a spike
decision) and prints a different-family / different-lens second opinion **before** the plan gets sliced
into an epic. The crux it's built around: planning has **no deterministic gate** under it (no `tsc` for a
strategy call), so the panel is deliberately bounded (one artifact), tiered (only the expensive forks),
single-pass, and required to attach a *checkable* claim — anything broader becomes plausible-sounding
noise. The full adversarial **debate loop is out** — `LEARNINGS.md` pegs the iterative loop as the #1 token
sink (~59%), which our single-pass discipline exists to avoid.

## Context

| | |
|---|---|
| **What it is** | A repo-local Node script (`scripts/cross-panel.mjs`) — planning/dev tooling, not app code |
| **Inputs** | A scope-doc / spike-brief path + `--lens purist\|pragmatist` + `--agent codex\|antigravity` |
| **Foreign CLIs** | Reuses cross-review's CLI-driving helpers: Codex `codex exec` (stdin=context); Antigravity `agy -p` (text, embedded in argv, ~256 KB cap) |
| **Output** | **Printed** advisory block (labeled lens/model, "not a gate" banner). Read-only on the doc — Daniel commits any takeaways himself |
| **Repos touched** | monorepo root (`scripts/`, `skills/groom/`, `Roadmap/`). No `apps/*`, no backend, no DB |

## Decisions (Daniel, 2026-06-13)

1. **Sibling script** — `scripts/cross-panel.mjs`, sharing cross-review's CLI helpers; not a generalized
   `cross-review.mjs`. Each script stays single-purpose.
2. **Technical pair first** — v1 ships the two architecture lenses (Medusa-**purist** vs ship-it
   **pragmatist**). CMO/brand + skeptical-customer lenses deferred to v2.
3. **Model by flag** — no fixed family-per-lens; `--agent` picks the family per run (run the pair across
   the two families when the family-diversity benefit is wanted).
4. **Print, don't auto-write** — output is printed before scaffolding; the script never edits the doc.
   Kept takeaways are committed into the scope doc as a normal doc commit.
5. **Surfaced, not forced** — the `groom` skill *surfaces* the panel when the ask qualifies (mandatory
   offer on a spike / architecture fork; on-demand otherwise) and it's always runnable via a verb. Never
   auto-fired, never a gate. Auto-surface = a required *offer*, not auto-*run* (cost-safe, matches
   cross-review).
6. **All low-risk tier** — additive planning tooling, read-only on the input doc. Daniel self-tests.

## Medusa-first note

N/A — zero backend, zero DB, zero Medusa/Supabase, zero commerce surface. AGENTS five-rule check:
rules 1–3 N/A (no commerce / no Supabase / no UCP-MCP surface touched), rule 4 (Clerk) untouched,
rule 5 (bilingual) N/A — no user-facing copy (the only strings are developer-facing CLI/lens-prompt text).

## What already exists (reuse, don't rebuild)

- **`scripts/cross-review.mjs` + `scripts/cross-review.prompt.md`** — the rail is ~90% of this: CLI
  presence/version checks, single-pass discipline, the advisory banner, per-CLI context-passing (codex
  stdin / `agy` argv + size cap). `cross-panel.mjs` **shares these helpers** and swaps `(reviewer-prompt,
  pr-diff)` → `(lens-prompt, input-doc)`. Do not re-derive the CLI plumbing.
- **`skills/groom/SKILL.md`** — the surface points already exist: Stage 2 (classify → Spike), Stage 4
  (Medusa-first reframe → architecture fork), Stage 7 (scope-doc gate). The panel is a step *before*
  Daniel's approval, not a new gate.
- **`SESSION-KICKOFFS.md` command shorthands** — a `Panel:` verb slots into the existing thin-pointer
  vocabulary, exactly like `Cross-review PR #<N>`.

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **1** | US-1 Skateboard — one lens to stdout (`cross-panel.mjs <doc> --agent codex --lens architect-purist` → print findings) | low |
| **1** | US-2 Pragmatist lens + lens-prompt library (`architect-pragmatist`; `cross-panel.prompt.md` + per-lens; each must attach a checkable claim) | low |
| **1** | US-3 Run the pair → one combined advisory block (single-pass each, across families; contradictions flagged) | low |
| **1** | US-4 Wiring — trigger model into `skills/groom/SKILL.md` (Stage 2 + Stage 4) + `Panel:` verb in `SESSION-KICKOFFS.md` | low |

## Deploy order

No deploy — repo script + a skill/doc edit, not an app surface. No Vercel/Cloud Run. "Shipping" = the
script merged to `main` and runnable. US-1→US-2→US-3 in order (each builds on the prior); US-4 is
independent after US-1.

## Definition of Done (epic)
- [x] `node scripts/cross-panel.mjs <scope-doc> --agent codex --lens architect-purist` prints a coherent,
      clearly-advisory critique that names a checkable claim, against a real recent scope doc. *(Smoked vs the
      epic seed doc.)*
- [x] `--lens architect-pragmatist` produces a distinct, useful perspective; lenses live in one shared
      `cross-panel.prompt.md`; a bad/missing CLI or lens fails with a clear message.
- [x] Running the pair prints one combined "🔎 Cross-agent planning panel" block with the advisory banner,
      flagging any genuine contradiction for Daniel. *(Synthesis surfaced one real contradiction in the smoke.)*
- [x] `skills/groom/SKILL.md` surfaces the panel per the trigger model (Stage 2 spike / Stage 4
      architecture fork = mandatory offer; on-demand otherwise) and `SESSION-KICKOFFS.md` has the `Panel:` verb.
- [x] No gating: nothing blocks on the panel; Daniel's scope-doc approval stays the only gate.
- [x] Smoke walkthrough in `sprint-1.md` run green against a real scope doc.
- [x] This README marked ✅; sprint status ticked with commit refs; `RETROSPECTIVE.md` written.
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md`; seed frontmatter `status: shipped`.

## Shipped
Sprint 1 (the whole v1) — PR #15, all 4 stories LOW: S1.1 `ef29869` skateboard + shared-module extraction ·
S1.2 `75c821b` pragmatist lens · S1.3 `05aa539` pair + synthesis + `--dry-run` · S1.4 `9cf62ae` groom/kickoff
wiring · `5dc8116` moved the shared plumbing to `scripts/lib/`. See [`sprint-1.md`](sprint-1.md) for the
smoke walkthrough and [`RETROSPECTIVE.md`](RETROSPECTIVE.md) for what we learned.
