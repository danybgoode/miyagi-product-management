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
updated: 2026-07-19
---

# Scope — where this team sits on the AI-adoption ladder, and what moves it up

Reference: `references/Steps-of-AI-Adoption.md` (Boris Cherny, 2026-07-16). The ladder: 0 Gated →
1 Assisted (you + one agent, ~1) → 2 Parallel (one orchestrator, 5–10 agents, auto mode always on)
→ 3 Supervised autonomy (manager of managers, ~100 agents) → 4 AI-native (VP steering by intent,
~1,000+).

> ### ⚠️ Re-benchmark 2026-07-19 — the original assessment was made against a truncated reference
>
> The 2026-07-17 assessment below was written against a **mangled PDF extraction that cut off
> mid-step-2**. Steps 3 and 4 were not visible to it, so its "what separates us from step 3" list
> was inferred from trajectory, not read from criteria. `references/Steps-of-AI-Adoption.md` has
> since been replaced with the complete text.
>
> **The step-2 verdict holds** — everything in the evidence paragraph below is still accurate and
> still ours. Three things change once steps 3 and 4 are legible:
>
> **1. The browser-smoke gap is a *step-2* gap, not a step-3 move.** The seed's #1 item calls
> credentialed browser smoke "the single highest-leverage step-3 move." The full doc lists
> **"Claude powered end-to-end verification (e.g. using the Claude Chrome extension or iOS/Android
> simulator MCP)"** under **step 2 guardrails**. So the standing owed-smoke ledger isn't us
> reaching for the next rung — it's an unfinished guardrail on the rung we're already on. That
> raises its priority and lowers its glamour. Plan item 2 is unchanged in content; its framing was
> wrong.
>
> **2. We have more step-3 *equipment* installed than the original credited.** Step 3's product and
> guardrail lists name things we already run: **subagents with worktree isolation** ✅ · **routines
> to fan out repetitive work** ✅ (standup/weekly/PMO/ops-nightly/smoke-triage) · **automatic code
> review** ✅ (CI gate + fresh reviewer + cross-agent advisory) · **`CLAUDE.md` and Skills to encode
> standards** ✅ (the `ways-of-work` plugin *is* this) · **manage token use by breaking `CLAUDE.md`
> into lazy Skills** ✅ (the `process-token-diet` epic). The gap to step 3 is narrower than "several
> step-3 behaviors already real" implied — it's specific, not diffuse.
>
> **3. The genuine, now-legible step-3 gaps.** Against the actual criteria rather than the inferred
> ones:
>
> - **"Let Claude kick off Claude"** (the doc's own 2→3 instruction) is only *narrowly* true here.
>   The nightly smoke → `smoke-triage` routine is a real instance of it. But there is no
>   **Claude Tag monitoring a channel or data source and kicking off tasks proactively** — every
>   other loop starts on a cron or on Daniel. *(Evidence it matters: the 2026-07-19 grooming batch
>   found a prod smoke failing since at least that morning and an epic scaffolded but never
>   started — both would have been caught by a monitor that opens work rather than a human who
>   notices.)*
> - **Automatic *security* review** is listed separately from code review at both steps 2 and 3. We
>   have neither an automatic security review nor an equivalent. `cross-review.mjs` is explicitly
>   advisory and single-pass. This is the clearest unclaimed item on the list.
> - **Agent sandboxing** — a named step-3 product with no counterpart in this repo.
> - **Token/cost monitoring via OTel or Analytics** — step 3's second bottleneck. `process-token-diet`
>   addresses consumption but there is no telemetry export, so cost is managed by discipline rather
>   than measured. Step 1's guardrail list already names OTel export; like the browser smoke, this
>   is an *earlier*-rung guardrail we skipped.
>
> **Not a gap, by design:** step 3's "Claude writes all or nearly all of the code" is already true
> here, and the HIGH-tier human-merge rule on money paths stays. The original's point 2 — *widen
> what's provably LOW via better guards, don't loosen the rule* — survives the fuller reference
> intact and is the right reading of "trust in the loop."

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

## Plan addenda (2026-07-19, from the re-benchmark)

The four moves above stand. Three additions, all cheap to scope and each closing a *named* criterion
rather than a guessed one:

5. **Reframe move 2 as finishing step 2, not reaching step 3** — same work, higher priority. It is
   the one guardrail on our current rung that we don't have.
6. **Automatic security review** — the most clearly unclaimed item on the step-2/3 lists. Scope it
   as one story: does an existing product cover it, or is it a `scripts/` addition alongside
   `cross-review.mjs`? Research before building — **do not assume `cross-review.mjs` counts**; it is
   advisory by design and the doc lists security review as automatic and separate.
7. **One proactive monitor as the "let Claude kick off Claude" trial** — the smallest honest version:
   a monitor on the daily prod-smoke output that *opens the work* (a seed or a draft PR) instead of
   emailing Daniel. We already have the detector and the triage routine; the missing link is that
   nothing starts without a human reading a message. Deliberately narrow — one data source, one
   task type, kept advisory (draft only, never auto-merge) exactly as `smoke-triage` is.

## Out of scope
Model-tier changes (the Opus-plans/Sonnet-builds split memory stays authoritative — this session
validated Fable-orchestrates/Sonnet-builds as its successor shape for multi-epic batches).
