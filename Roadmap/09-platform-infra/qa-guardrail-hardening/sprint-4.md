# QA guardrail hardening — Sprint 4: a security lens on the mandatory review rail

**Status:** ⬜ not started

> The clearest unclaimed item on the AI-adoption ladder. Built as a lens on the rail that is already
> mandatory on every PR, not as a new tool that would need its own mandate.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D6. **This sprint edits the rail that reviews every other PR — a regression here is
silent and affects everything downstream. Treat it as higher-care than its LOW tier suggests.**

- **`cross-review.mjs` is MANDATORY on every PR** (WAYS-OF-WORKING). Its existing behaviour —
  default prompt, `--agent` selection, the codex→agy auto-fallback, `--skip-trivial`, the agy version
  pin, the PR-comment shape — **must be unchanged when `--lens` is not passed.** Prove this: run it
  without the flag and confirm identical behaviour.
- **Do not overstate what this is.** It is LLM-advisory, local-only, single-pass. It is **not** SAST,
  not CodeQL, not a required status check. The benchmark seed warns explicitly against assuming the
  cross-review rail counts as automatic security review; a lens narrows that gap, it does not close it.
  The retro must say so plainly.
- Model recording (seed D-2): live probe 2026-07-26 gave `gpt-5.6-terra`, effort `high` — the intended
  tier. **Change no model.** The gap is that no artifact records which model ran.
- Read `scripts/cross-review.prompt.md` and `.claude/agents/pr-reviewer.md` first — the lens prompt
  must carry the same substance discipline (the five AGENTS rules, single-pass, no debate loop).

## Stories

### Story 4.1 — `--lens security` ⬜
**As a** builder, **I want** a security-specific pass over the diff, **so that** an injected
vulnerability has a chance of being caught automatically rather than only by whoever thought to look.
**Acceptance:**
- `node scripts/cross-review.mjs <PR#> --lens security` runs the same single-pass cross-family rail
  with a security-focused prompt (`scripts/cross-review.security.prompt.md`).
- The prompt targets the classes this codebase has **actually shipped and had caught**, not a generic
  OWASP recital — read `LEARNINGS.md` and the epic retros first: IDOR / missing tenant scoping,
  SSRF including redirect-following, open redirect, secrets in logs or transcripts, a read-then-write
  race used as a claim, an authorization check gated on the wrong flag, and consent/population
  guards that cover one door out of several.
- **Without `--lens`, behaviour is byte-identical to today.** Prove it.
- The posted PR comment is clearly labelled as a **security lens** pass and states its limits in one
  line, so nobody reads it as a clean bill of health.
- Pure prompt-assembly and arg-parsing unit-tested.

### Story 4.2 — record the model that actually reviewed ⬜
**As a** reviewer of the process, **I want** each cross-review comment to name the model that ran,
**so that** review strength is auditable instead of inherited from invisible machine-local config.
**Acceptance:**
- The PR comment footer names the agent **and** the resolved model (e.g. codex / `gpt-5.6-terra`),
  including on the auto-fallback path — where naming the model matters most, because the family
  changed mid-run.
- When the model genuinely cannot be resolved, the footer says so explicitly rather than guessing or
  printing a default that may be wrong.
- Unit-tested on the pure footer-builder.
- `WAYS-OF-WORKING.md`'s review-tooling roster gains one line: the reviewer model is machine-local
  config, and this is where it gets recorded.

## Definition of Done (sprint)
- [ ] `node --test scripts/` green; every new spec observed red once.
- [ ] **Run for real against an actual PR**, both with and without `--lens`; both outputs pasted in
      the PR body. Verify-by-running is mandatory here — this rail gates every other merge.
- [ ] Retro text drafted stating what the lens does **not** cover.
- [ ] Cross-agent review **and** a fresh `pr-reviewer` (Opus 5) — regardless of tier, per the epic README.
