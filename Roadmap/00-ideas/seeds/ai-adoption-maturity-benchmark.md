---
title: "AI-adoption maturity: benchmark vs the Steps-of-AI-Adoption ladder + the harness plan"
slug: ai-adoption-maturity-benchmark
status: ready
area: "09"
type: spike
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-17
---

# Scope — where this team sits on the AI-adoption ladder, and what moves it up

Reference: `references/Steps-of-AI-Adoption.md` (Boris Cherny, 2026-07-16). The ladder: 0 Gated →
1 Assisted (you + one agent, ~1) → 2 Parallel (one orchestrator, 5–10 agents, auto mode always on)
→ 3+ (the doc's capture is truncated past step 2, but the trajectory is clear: agents run agents,
verification is fully delegated, humans review outcomes not diffs).

## Benchmark (assessed 2026-07-17, during the four-epic batch session)

**We operate at step 2, with several step-3 behaviors already real.** Evidence from this very
session: one Fable orchestrator ran 3 Sonnet builders + 2 reviewers concurrently on isolated
worktrees; auto mode on; the deterministic gate (tsc + build + Playwright + node:test + guards)
is what builders trust, not re-reading; cross-agent review (codex) runs on every PR and its
findings routed back to builders without human relay; merged LOW-tier PRs shipped with zero human
diff-reads (Daniel's control point is the risk-tier merge rule + owed-smoke ledger, not code
review).

**Step-2 bottlenecks the doc predicts, confirmed live here:**
- *Reviewing output is the orchestrator's cost center* — mitigated by the two-layer review
  (deterministic gate + fresh reviewer + codex advisory), but the orchestrator still reads three
  streams of findings. The report-verification pattern (pr-reviewer re-derives the builder's
  claims) is the right shape; keep hardening it.
- *Session/rate limits are the new flakiness* — 5 concurrent agents died TWICE mid-session to a
  shared session cap; the salvage discipline (LEARNINGS: killed-subagent tree is evidence;
  resume-from-transcript) is what made that survivable at near-zero cost. This is a step-2→3
  capability: the orchestration must assume workers die and design for cheap resume.

**What genuinely separates us from step 3 (the actionable gap list):**
1. **Verification breadth** — the browser-credentialed smoke layer still bottlenecks on Daniel
   (the standing owed-smoke ledger). `live-smoke` + Playwright cover API-level; the
   `browser-smoke-ci-gap` memory shows no credentialed browser spec runs anywhere automatically.
   Closing that is the single highest-leverage step-3 move.
2. **Merge autonomy is calibrated, not expanded** — HIGH stays human by design (money paths).
   That's correct and shouldn't change; step 3 for us means widening what's *provably* LOW via
   better guards, not loosening the rule.
3. **Ops loops are half-automated** — routines (standup/weekly/PMO/ops-nightly) run unattended,
   but epic close-out (retro, poster, learnings promotion, memory) is still orchestrator manual
   labor. `prose-draft.mjs` (PR #95) starts moving that to cheap delegated drafts.
4. **"Fix the class, not the instance" is now reflex** — this session alone: build-order guard
   self-heals (class: derived-artifact staleness), NEXT_PUBLIC source-scan spec (class:
   half-wired env vars), GTM outage → guard extension (class: Vercel-only env dropped in
   cutover). The doc's core thesis (automation compounds across the agent army) is measurably
   true here: every guard written this way has fired for real within days.

## The plan (what to actually do)

1. **Port `prose-draft` into the `ways-of-work` plugin** (dobby-foundation) once root PR #95
   merges: skill doc wrapping `scripts/prose-draft.mjs` (babysit-pr distribution-note pattern) +
   ship the script/prompt in `template/scripts/` so golden-beans and every sibling gets it.
   One story, LOW.
2. **Credentialed browser smoke in CI** — revive `browser-smoke.yml` with `MS_TEST_BROWSER_AUTH=1`
   against the preview (the browser-smoke-ci-gap memory has the wiring gap enumerated). This
   converts the largest human-owed verification category into gate coverage. One sprint, MED
   (test-credential handling).
3. **Wakeup-resilient orchestration note in WAYS-OF-WORKING** — codify this session's pattern:
   spawn builders on isolated worktrees, treat worker death as normal (diff the tree, resume from
   transcript, never re-spawn cold), verify by re-derivation not by worker report. (Done in
   LEARNINGS if promoted at batch close; the plugin's groom/kickoff docs should carry it too.)
4. **Golden-beans as the dogfood target** — its Growth Engine build (S1–S4, scoped in
   miyagi-product-management) should be run exactly in this session's shape (Fable orchestrates,
   Sonnet builds, codex+fresh-reviewer review, prose-draft closes) as the controlled trial of the
   step-3 loop on a greenfield repo. Success signal: epics/day per human-minute spent, and zero
   regression escapes.

## Out of scope
Model-tier changes (the Opus-plans/Sonnet-builds split memory stays authoritative — this session
validated Fable-orchestrates/Sonnet-builds as its successor shape for multi-epic batches).
