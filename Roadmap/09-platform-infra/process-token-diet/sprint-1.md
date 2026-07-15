# Process token-diet — Sprint 1: Script the boilerplate, flip the review policy

**Status:** ⬜ not started

## Stories

### Story 1.1 — Kickoff-prompt generator
**As** Daniel, **I want** `node skills/groom/emit-kickoff.mjs --epic <slug> --sprint N` to print the
finished Stage-8 Claude Code kickoff (invariant preamble from a template + the sprint delta read from
the epic/sprint docs), **so that** no model tokens are spent re-typing boilerplate per sprint.
**Acceptance:** generated kickoff for an existing epic matches the Stage-8 shape; groom SKILL.md
Stage 8 updated to call it; co-located pure test with `isMain` guard. **Lands in the dobby-foundation
plugin repo.**
**Risk:** low

### Story 1.2 — Smoke-walkthrough skeleton in the scaffolder
**As** a building agent, **I want** `scaffold-epic.mjs` to emit the Stage-8b numbered-steps skeleton
into each `sprint-N.md` with real URL stems pre-filled, **so that** builders fill only actions and
observable results.
**Acceptance:** freshly scaffolded sprint doc contains the skeleton; template lives in
`skills/groom/templates/`. **Lands in the dobby-foundation plugin repo.**
**Risk:** low

### Story 1.3 — Review-policy flip
**As** the team, **I want** cross-agent review mandatory on every PR and the fresh-reviewer pass
optional after cross-review findings are addressed — **except HIGH tier, where it stays mandatory**,
**so that** review cost matches risk (LEARNINGS: the independent pass repeatedly caught real
money-path issues on HIGH PRs — catalog-management S6, arranged-only-delivery S2).
**Acceptance:** WAYS-OF-WORKING → Review & merge rewritten; `scripts/routines/pr-review.prompt.md` and
`.claude/agents/pr-reviewer.md` aligned; risk-tier merge rule unchanged.
**Risk:** low

### Story 1.4 — Doc drift: deploy rail
**As** a fresh agent, **I want** WAYS-OF-WORKING cadence step 7 to say frontend → Cloud Run (not
Vercel prod — stale since 2026-07-10), **so that** orientation docs match reality.
**Acceptance:** corrected; consistent with AGENTS.md.
**Risk:** low

## Sprint QA
- **api spec(s):** n/a app-side; `node --test` on emit-kickoff's pure parts (plugin repo)
- **browser smoke owed:** no
- **deterministic gate:** scripts-guard CI (root repo) + plugin repo tests green

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local terminal, root repo + dobby-foundation checkout

1. Run `node skills/groom/emit-kickoff.mjs --epic agent-readability-marketing-surface --sprint 1` (plugin path).
   → A complete, paste-ready kickoff prints; the sprint-specific lines match sprint-1.md's stories.
2. Run the scaffolder on a throwaway slug with `--dry-run`.
   → Printed sprint doc contains the smoke-walkthrough skeleton with URL stems.
3. Open Roadmap/WAYS-OF-WORKING.md → Review & merge.
   → Cross-agent = mandatory every PR; fresh reviewer = optional after cross-review, mandatory on HIGH; step 7 says Cloud Run.

If any step fails, note the step number + what you saw — that's the bug report.
