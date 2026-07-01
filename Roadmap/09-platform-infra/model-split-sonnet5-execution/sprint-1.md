# Model split — Sprint 1: name the models + the escalation guardrail

**Status:** ⬜ not started

## Stories

### Story 1.1 — Name Sonnet 5 / Opus 4.8 + add the escalate-don't-guess rule
**As a** builder (and the agents that execute stories), **I want** the process docs and every build kickoff
to say plan-on-Opus / build-on-Sonnet-5 and to escalate rather than guess, **so that** execution runs on the
faster model without silently making judgment or money-path calls it should hand back.
**Acceptance:**
- `Roadmap/WAYS-OF-WORKING.md` *Conventions → Model tiers* names **Sonnet 5** as the per-story execution
  model and **Opus 4.8** as the planning/grooming/spike/plan-mode/review model.
- The same section lists the **escalate-don't-guess triggers**, identical to the high-risk-tier list
  (payments · checkout · fulfillment · auth · DB migrations · shared infra · money) **plus** plan ambiguity
  / a decision the plan doesn't cover / a repeated failed attempt (2+). Default: escalate when unsure.
- `skills/groom/SKILL.md` Stage 8 kickoff template includes a line instructing the Sonnet-5 build session to
  stop and ask / escalate to Opus on those triggers.
- No contradiction with the existing risk-tier wording (one SSOT for the trigger list).
**Risk:** Low (docs/process only; may merge directly).

## Sprint QA
- **api spec(s):** none — no code surface.
- **browser smoke owed:** no.
- **deterministic gate:** N/A (docs-only). Verify by reading the edited sections; ensure the trigger list
  matches the high-risk-tier list verbatim.

## Sprint 1 — Verification walkthrough (do these in order)
Env: the repo docs (this is a process change, not an app deploy — no production URL).

1. Open `Roadmap/WAYS-OF-WORKING.md` → *Conventions → Model tiers*.
   → It names Sonnet 5 (build) + Opus 4.8 (plan) and lists the escalate-don't-guess triggers.
2. Open `skills/groom/SKILL.md` → Stage 8 kickoff template.
   → The kickoff prompt tells the build session to escalate to Opus on those triggers.
3. **(the real test)** Start a fresh Claude Code build session **on Sonnet 5** and hand it a deliberately
   under-specified or money-path story (e.g. "add a discount to checkout" with no rule stated).
   → It **pauses and asks a clarifying question / flags the fork / escalates to Opus** rather than inventing
   an answer. This is the acceptance signal.

If any step fails, note the step number + what you saw — that's the bug report.

## Kickoff prompt (paste into a fresh Claude Code session)
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/00-ideas/2. readyforscope/model-split-sonnet5-execution.md and
> Roadmap/09-platform-infra/model-split-sonnet5-execution/README.md + sprint-1.md.
>
> You're building Sprint 1 of "Model split" — a single LOW-risk docs/process story, monorepo-root repo.
> Enter plan mode, confirm the plan with me, then branch chore/model-split-sonnet5-execution off latest main.
> Edit Roadmap/WAYS-OF-WORKING.md (Conventions → Model tiers) to name Sonnet 5 as the per-story execution
> model and Opus 4.8 as the planning model, and add the escalate-don't-guess trigger list — identical to the
> high-risk-tier list (payments/checkout/fulfillment/auth/DB migrations/shared infra/money) plus plan
> ambiguity / uncovered decision / 2+ failed attempts; default escalate when unsure. Mirror that instruction
> into the skills/groom/SKILL.md Stage 8 kickoff template. Keep one SSOT for the trigger list (don't
> duplicate/contradict the risk-tier wording). No app code. Path-scoped commit. Open a PR declaring LOW risk;
> docs-only may merge directly once I confirm. Write nothing to tasks/.
