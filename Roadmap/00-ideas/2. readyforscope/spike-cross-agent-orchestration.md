# Spike — Cross-agent build-time orchestration (Claude orchestrates codex/agy as executors)

**Status: awaiting Daniel approval — no code yet. This is a SPIKE: it ends in a written decision, not code.**
Macro-section: **09 · Platform & Infra**. Slug: `spike-cross-agent-orchestration`.
Class: **Spike** (time-boxed investigation → a decision). No slicing/build until the decision lands.

This is the **second half of ask #1**, split out at grooming (2026-06-22). The first half (cross-agent
review on every PR) is a ready light enhancement — see `cross-agent-review-always.md`. This half is *not*
ready to build: codex/agy are advisory-only today, and turning them into build-time executors runs straight
into known CLI limits, so we investigate before we commit a design.

## Mirror-back
> You want to **expand the team**: Claude stays the architect — heavy design, complex builds, anything with
> real judgment — and **delegates lower-level work to codex and agy during a build session**, "at will,"
> possibly with **specialized roles/areas**. You want this spike to decide *how* delegation should work and
> *what* the role model is. Right?

## Daniel's grooming calls (2026-06-22)
- **Spike first** — decide the delegation model before any tooling.
- **Role model: decide in the spike** — don't pre-commit to by-domain vs by-task-type; let the
  investigation recommend it based on what each CLI actually does well.

## Stage-2.5 bucket — **genuinely new** (with a "lightest path" to evaluate first)
Today codex/agy are used **only** for advisory passes (`cross-review.mjs` on a PR diff, `cross-panel.mjs`
on a plan). They have **never written code** in this repo. So build-time delegation is genuinely new.
But the spike must explicitly weigh the **lightest path first**: is this best as a *documented working
practice* (Claude drives the CLIs ad hoc, no new tooling), a *thin tool* (`scripts/delegate.mjs`), or a
*Claude Code subagent/workflow pattern*? The answer is a spike output, not a given.

## Why a spike, not a build (the constraints that shape it)
From `LEARNINGS.md`, already learned the hard way:
- **agy 1.0.7 has no stdin and a ~256 KB argv cap**; **codex takes context on stdin** and handles large
  diffs. This alone constrains what each agent can be *handed*.
- **codex tokens lapse**; the shared rail already has a codex→agy fallback. Reliability is non-trivial.
- "**Drive a young foreign CLI — `--version`-check, pin, degrade, never assume.**" Flags shift between
  releases; build against live `--help`, not memory.
- **The multi-agent iterate-to-convergence loop is the #1 token sink (~59%).** Any orchestration design
  must stay single-pass / bounded, or it eats more than it saves.
- **Model tiers:** strong model for the thinking (architecture, plan, review); execution can assembly-line
  on a faster model. This is the existing principle the ask wants to operationalize across *agents*, not
  just models.

## What already exists (reuse, don't rebuild)
| Capability | Where | Reuse for |
|---|---|---|
| Family-agnostic CLI plumbing: presence/version checks, `runCodex` (stdin), `runAntigravity` (argv + size cap), soft/degrade mode, codex→agy fallback | `scripts/lib/cross-agent-cli.mjs` | Any delegation tool drives the CLIs through this rail — don't fork it |
| Precedent single-purpose cross-agent scripts that *share the rail, don't fork it* | `scripts/cross-review.mjs`, `scripts/cross-panel.mjs` | The architectural pattern a `delegate` tool would follow |
| The deterministic gate (`tsc` + `next build` + Playwright `api`) | `apps/miyagisanchez` CI + local | **The natural verifier** of any delegated code — Claude/CI checks the agent's output against it |
| Cross-agent review on every PR | `cross-agent-review-always.md` (sibling) + `scripts/cross-review.mjs` | Load-bearing safety net: code an executor agent writes still passes a different-family review before merge |
| Risk-tier merge rule + AGENTS five rules | `WAYS-OF-WORKING.md`, `AGENTS.md` | The boundary for what a non-Claude agent may touch (never money/auth/checkout/DB/migrations autonomously) |
| Model-tier + planning-vs-building convention | `WAYS-OF-WORKING.md` Conventions | The spike extends this from models to agents |

## Investigation questions the spike must answer (the brief)
1. **What is safely delegable?** Produce a concrete map of task types → delegate-or-not, tied to the WAYS
   risk tiers. Hypothesis to test: delegate mechanical/low-judgment work (boilerplate, codemods, test
   scaffolding, doc/string updates, repetitive refactors); **never** delegate architecture or any HIGH-risk
   surface (payments/checkout/fulfillment/auth/DB/migrations/shared infra).
2. **The handoff + verify contract.** How does Claude specify a scoped task to codex/agy, and how is the
   result verified before it counts? Define: the task-spec shape, who runs the deterministic gate, who owns
   the commit, and how a failed/garbage result is detected and discarded (not silently merged).
3. **Which CLI for which job.** Given codex-has-stdin / agy-no-stdin-256 KB-cap, which agent suits which task
   class? Confirm live with `codex --help` / `agy --help` (don't assume current flags).
4. **The role model** (the deferred decision). Recommend **by-domain** (e.g. one agent on backend/Medusa,
   one on frontend/tests), **by-task-type** (mechanical work regardless of area), or a **hybrid** — with the
   reasoning grounded in what each CLI demonstrably does well.
5. **Orchestration surface.** Documented practice vs `scripts/delegate.mjs` vs a Claude Code
   subagent/workflow. Evaluate each against token cost (the #1-sink rule) and the "share the rail, don't
   fork it" precedent. Recommend one, with a thin v1 proposal **only if** a tool is warranted.
6. **Safety & correctness under delegation.** How the AGENTS five rules and the risk-tier merge rule stay
   intact when a non-Claude agent writes code — cross-review-on-every-PR (the sibling epic) + CI are the
   spine; spell out the rest (e.g. delegated work always lands on a branch, never direct-to-main; HIGH-risk
   stays Claude+Daniel).
7. **Cost/benefit honesty.** When does delegation actually beat Claude just doing it? Name the break-even
   (specification + verification overhead vs. time saved) so this doesn't become ceremony.

## Deliverable (what "spike done" means)
A **written decision** appended to this doc (or a short decision note linked from it):
- the delegable/not map (Q1) + the handoff-verify contract (Q2),
- which-CLI-for-what (Q3) + the recommended role model (Q4),
- the recommended orchestration surface (Q5) with a thin v1 proposal *if* warranted,
- the safety model (Q6) + the cost/benefit break-even (Q7),
- and a clear **build-or-don't recommendation**. If "build," it then grooms into its own epic (with its own
  risk tiers); if "documented practice only," it lands as a WAYS/kickoff addition. **No code in the spike.**

Natural fit: run `scripts/cross-panel.mjs` (the planning panel) on this decision for a different-family
second opinion before it's finalized — exactly the case it was built for.

## Medusa-first reframe (AGENTS five-rule check)
**N/A for the spike — investigation only, zero commerce surface.** Any *resulting* build epic gets its own
Medusa-first pass. Flagged now: delegated code that touches commerce must still obey rules 1–5 and go
through CI + cross-review + the risk-tier merge gate — delegation changes *who types*, never the guardrails.

## Risk tier
**The spike is LOW** (reading, CLI probing, writing a decision — no code, no app surface). Called out: the
*outcome* may propose work at any tier, and a delegation tool that lets a foreign agent write code is a
trust/safety surface — which is exactly why this is a spike with a safety question (Q6), not a build.

## Open questions to resolve in the spike (don't assume)
- Current `codex` / `agy` capabilities and flags (probe live — versions drift).
- Whether codex/agy can be driven reliably enough for unattended execution, or only Claude-supervised.
- Token/$$ cost of a delegation pass vs. Claude doing the task directly (the Q7 break-even).
- Whether the existing `scripts/lib/cross-agent-cli.mjs` rail is sufficient or needs an execution-mode
  addition (it's built for advisory read passes, not for applying edits).

## Research note
No external standard is load-bearing. The load-bearing "research" is **live probing of the two CLIs**
(`codex --help`, `agy --help`, a trial scoped task) at spike time, per the "degrade, never assume" rule —
not web search.

## Definition of Ready — checklist
- [x] Class = Spike; ends in a written decision, no code (groom Stage 2).
- [x] Stage-2.5 bucket named (genuinely new; lightest-path evaluated inside the spike).
- [x] Investigation questions written (Q1–Q7) with a concrete deliverable.
- [x] Reuse list produced (shared CLI rail, cross-review/panel precedent, the deterministic gate as verifier).
- [x] Risk named (spike LOW; outcome + safety flagged); second-opinion path (cross-panel) identified.
- [ ] **Daniel approves this spike brief** → then scaffold the spike note + emit the investigation kickoff
      (no branch, no build).
