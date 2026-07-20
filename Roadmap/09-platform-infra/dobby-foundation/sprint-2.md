# dobby-foundation — Sprint 2: process distribution (from the AI-adoption split)

**Status:** ⬜ not started

Filed 2026-07-20 as **part C** of the three-way split of
[`00-ideas/seeds/ai-adoption-maturity-benchmark.md`](../../00-ideas/seeds/ai-adoption-maturity-benchmark.md).
Both stories are process distribution — neither is product, and both should reach every `~/dobby/`
sibling from one versioned place rather than being re-invented per repo. Companion scope doc for the
split's part B: `~/dobby/golden-beans/Roadmap/00-ideas/seeds/ai-adoption-maturity-lens.md`.

## Stories

### Story 2.1 — Port `prose-draft` into the `ways-of-work` plugin
**As** any `~/dobby/` project, **I want** `prose-draft` available as an installed skill rather than a
script checked into one repo, **so that** epic close-out prose (retro, poster, learnings promotion)
is a cheap delegated draft everywhere, not orchestrator manual labour in medusa-bonsai only.

**Ships:** a skill doc wrapping `scripts/prose-draft.mjs` (follow the `babysit-pr`
distribution-note pattern) + the script and its prompt shipped in `template/scripts/`, so
golden-beans and every future sibling inherit it on spawn.
**Depends on:** root PR #95 merged.
**Acceptance:** installing the plugin in a repo that never had the script yields a working
`prose-draft`; medusa-bonsai's in-repo copy is retired in the same pass (no two sources); one real
epic close-out drafted through it.

**Known constraint to document, not solve:** Codex's external-data boundary blocked `prose-draft`
from sending Roadmap contents to its configured different-family service (2026-07-19 trial). The
skill doc must state plainly which model family the draft goes to, so a session on a restricted rail
knows to go local *before* close-out rather than discovering the boundary at close-out.
**Risk:** LOW

### Story 2.2 — Wakeup-resilient orchestration, codified
**As** an orchestrator starting a multi-agent batch, **I want** the survival pattern written into the
plugin's own docs, **so that** worker death is a designed-for normal case instead of a per-session
rediscovery.

**Ships:** the pattern promoted into the generalized `WAYS-OF-WORKING.md` template + the
`groom`/kickoff docs the plugin distributes — spawn builders on **isolated worktrees**; treat worker
death as **normal** (diff the tree, resume from transcript, never re-spawn cold); **verify by
re-derivation, not by worker report**.

**Why it's earned, not theoretical:** 5 concurrent agents died *twice* mid-session to a shared
session cap (2026-07-17 batch), and the salvage discipline is what made that survivable at near-zero
cost. medusa-bonsai's `LEARNINGS.md` already carries the killed-subagent-returns-a-plausible-result
rule; this story is what makes it reach siblings that will hit the same cap without the scar tissue.
**Acceptance:** a fresh agent reading only the plugin's distributed docs can state the three rules;
the medusa-bonsai LEARNINGS entry and the template text don't contradict each other (dedupe —
sharpen, don't append).
**Risk:** LOW

## Sprint QA
- **specs:** 2.1 → the plugin-installed skill resolves and runs in a repo with no in-repo copy ·
  2.2 → docs-only, no spec; the check is the fresh-agent read-back in acceptance
- **deterministic gate:** whatever the foundation repo's gate is at the time — docs/tooling only
- **browser smoke owed:** none (no user-facing surface)

## Sprint 2 — Smoke walkthrough (do these in order)
_Write the fool-proof numbered walkthrough here at sprint close (real paths/commands). Expect it to
be: install the plugin fresh in a sibling → run `prose-draft` against a real epic → read the
generated draft._
