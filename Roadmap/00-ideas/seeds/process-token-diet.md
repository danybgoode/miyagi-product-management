---
title: "Process token-diet — kickoff/smoke templating, review-policy flip, doc drift"
slug: process-token-diet
status: ready
area: "09"
type: chore
priority: "#3"
risk: low
epic: null
build_order: "#3"
updated: 2026-07-14
---

# Scope — Process token-diet (lose the training wheels)

**Groomed in:** `Roadmap/00-ideas/audits/batch-groom-2026-07-14.md` (Ask 2b–2d). Approved 2026-07-14.

**Goal:** stop spending model tokens on invariant boilerplate; keep judgment where judgment lives.

## Story 1 — Kickoff-prompt generator
`node skills/groom/emit-kickoff.mjs --epic <slug> --sprint N`: reads epic/sprint doc frontmatter,
prints the finished Stage-8 Claude Code kickoff (invariant preamble from a template file + the sprint
delta). Groom skill Stage 8 updated to call it instead of hand-writing.
**Acceptance:** generated kickoff for an existing epic is byte-equivalent in content to the Stage-8
shape; co-located pure test (`isMain` guard per LEARNINGS).

## Story 2 — Smoke-walkthrough skeleton in the scaffolder
`scaffold-epic.mjs` emits the Stage-8b numbered-steps skeleton into each `sprint-N.md` with real URL
stems pre-filled; builders fill only actions/observables.
**Acceptance:** freshly scaffolded sprint doc contains the skeleton; template lives in
`skills/groom/templates/`.

## Story 3 — Review-policy flip (Daniel's call, 2026-07-14)
Cross-agent review (`cross-review.mjs`) becomes **mandatory** on every PR. The fresh-reviewer subagent
pass becomes **optional after cross-review findings are addressed — except HIGH tier, where it stays
mandatory** (LEARNINGS: it repeatedly caught real money-path issues on HIGH PRs — catalog-management S6,
arranged-only-delivery S2).
**Acceptance:** WAYS-OF-WORKING → Review & merge rewritten; `scripts/routines/pr-review.prompt.md` and
`.claude/agents/pr-reviewer.md` aligned; risk-tier merge rule unchanged.

## Story 4 — Doc drift fix
WAYS-OF-WORKING cadence step 7 still says "frontend → Vercel prod"; stale since the Cloud Run cutover
(2026-07-10). Correct it (AGENTS.md already right).

**Out of scope:** changing the deterministic CI gate; the cross-panel (planning) trigger model;
build-order healing (own seed, `build-order-ci-self-heal`).

**Risk:** low (docs + root-repo scripts only). **QA:** node:test on the generator's pure parts; the
policy change is doc-reviewed by Daniel.
