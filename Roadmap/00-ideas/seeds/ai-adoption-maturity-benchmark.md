---
title: "AI-adoption guardrails — close the step-1/2 gaps the ladder names (browser smoke · security review · proactive monitor · OTel)"
slug: ai-adoption-maturity-benchmark
status: ready
area: "09"
type: chore
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-20
---

# Scope — where this team sits on the AI-adoption ladder, and what moves it up

> ## 🔀 Rescoped 2026-07-20 — this seed split three ways (Daniel, golden-beans groom session)
>
> This document was three asks wearing one filename: a **benchmark**, a **plan of guardrail moves**,
> and a **trial log**. They have different correct homes, and grooming them as one thing was
> deferring the urgent part behind the interesting part.
>
> **A · Stays here — and it's the whole of this seed now.** The four guardrail moves below. These
> are guardrails on *our own rung*; they build on medusa-bonsai's own schedule and depend on
> nothing external. See "Part A — the scope, narrowed" for the actual list.
>
> **B · The benchmark went to golden-beans.** Not as its own epic — as **one LOW story (2.4) on the
> already-scaffolded E3 `pod-report`**, which already ships the `report_artifacts` primitive, the
> `roadmap-push` rail, the computation over *this repo's* 104-epic dataset, and the
> cite-external-benchmarks-never-republish posture. Scope doc:
> `~/dobby/golden-beans/Roadmap/00-ideas/seeds/ai-adoption-maturity-lens.md`.
> **medusa-bonsai becomes tenant #1 — the scored repo, not the building repo.** The reasoning: a
> maturity assessment that can only ever describe one repo is a retrospective; one that scores an
> arbitrary tenant is a product, and it's the interpretation layer E3's delivery metrics were
> missing ("how fast / how stable" → "why, and what's next").
>
> **C · Process distribution went to `dobby-foundation`** (this repo, area 09, scaffolded): the
> `prose-draft` port (old plan item 1) and the wakeup-resilient orchestration note (old item 3).
> Neither is product; both should reach every `~/dobby/` sibling from one versioned place.
>
> **Kept here as evidence, not work:** the 2026-07-17 benchmark, the 2026-07-19 re-benchmark, and
> the Codex/Sol controlled-trial log. They are the record that justifies part A's priorities. Old
> plan item 4 (golden-beans as the dogfood target) is now literally true in a stronger sense than
> written — gb doesn't just *run* the step-3 loop, it *scores* it.
>
> **The one dependency worth reading in both directions:** the OTel/analytics export below is a
> *step-1* guardrail we skipped, and it is also the only thing that flips golden-beans' lens rows
> from **"not instrumented"** to computed. Doing it here upgrades a product there, at zero cost to
> that product's contract.

---

## Part A — the scope, narrowed (what this seed now covers)

Four moves. All are named criteria on the ladder's own step-1/step-2 guardrail lists — not inferred
from trajectory, which was the 2026-07-17 assessment's error.

1. **Credentialed browser smoke in CI** — *highest priority.* The re-benchmark correctly reframed
   this: the full ladder lists Claude-powered end-to-end verification under **step-2 guardrails**,
   so the standing owed-smoke ledger isn't us reaching for the next rung, it's an unfinished
   guardrail on the rung we're already on. Revive `browser-smoke.yml` with `MS_TEST_BROWSER_AUTH=1`
   against the preview (the `browser-smoke-ci-gap` memory enumerates the wiring gap). Converts the
   largest human-owed verification category into gate coverage. One sprint, MED (test-credential
   handling).
2. **Automatic security review** — the clearest unclaimed item on the step-2/3 lists, verified
   repo-wide 2026-07-20: outside this seed and the reference, "security review" appears in this repo
   exactly once, as a *manual* requirement in one epic's cross-cutting risks
   (`07-agentic-and-federated-commerce/custom-domain-checkout`, for the open-redirect surface). That
   is an ad-hoc human step on one epic, not a gate. **Do not assume `cross-review.mjs` counts** — it
   is advisory and single-pass by design, and the ladder lists security review separately from code
   review at both step 2 and step 3. Research first: does an existing product cover it, or is it a
   `scripts/` addition alongside `cross-review.mjs`? One story.
3. **One proactive monitor** — the smallest honest version of the ladder's own 2→3 instruction, "let
   Claude kick off Claude." A monitor on the daily prod-smoke output that **opens the work** (a seed
   or a draft PR) instead of emailing Daniel. We already have the detector and the `smoke-triage`
   routine; the missing link is that nothing starts without a human reading a message. Deliberately
   narrow — one data source, one task type, **draft-only, never auto-merge**, exactly as
   `smoke-triage` is. *(Evidence it matters: the 2026-07-19 grooming batch found a prod smoke
   failing since that morning and an epic scaffolded but never started — both would have been caught
   by a monitor that opens work rather than a human who notices.)*
4. **Token/cost telemetry export (OTel or the Analytics API)** — a **step-1** guardrail we skipped,
   and step 3's second named bottleneck. `process-token-diet` addresses consumption but there is no
   export, so cost is managed by discipline rather than measured. Dual value: see the dependency
   note above.

**Explicitly not in this seed any more:** building, rendering, or productising the maturity
assessment itself (that's golden-beans E3 story 2.4), and the `prose-draft`/orchestration-note
distribution work (that's `dobby-foundation`).

**Unchanged by the split:** the HIGH-tier human-merge rule on money paths stays. Step 3 for us means
widening what's *provably* LOW via better guards, never loosening the rule — the fuller reference
left that reading intact.

---

## Evidence — the assessments that justify Part A (record, not work)

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

## The plan — ⚠️ SUPERSEDED 2026-07-20 by "Part A" above

> Kept verbatim for provenance. Routing of the seven items after the split:
> **1** → `dobby-foundation` (part C) · **2** → Part A move 1 (unchanged content, higher priority) ·
> **3** → `dobby-foundation` (part C) · **4** → now true in a stronger sense: golden-beans doesn't
> just run the step-3 loop, its E3 story 2.4 *scores* it, with this repo as tenant #1 ·
> **5** → absorbed into Part A move 1 · **6** → Part A move 2 · **7** → Part A move 3.
> The OTel gap, named only in passing below, is promoted to Part A move 4.

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

## Controlled trial — Codex/Sol orchestrates OpenAI workers (2026-07-19)

This three-epic batch tested the same pre-authorized, merge-on-green operating shape with
**GPT-5.6 Sol as top-level architect** and risk/type-based OpenAI delegation:

- **Terra/medium:** bounded codebase audits, frontend overlay work, and the test-only catalog
  invariant.
- **Sol/high:** live overlap adjudication, Medusa nested-relation semantics, order authorization,
  production deploy sequencing, and final reviewer agents.
- **Deterministic rail:** isolated worktrees → local red/green → GitHub CI → fresh independent
  reviewer → risk-authorized merge → Cloud Build/Cloud Run → production smoke.

### Result

- Three groomed epics became **three app PRs**, but not the three implementations originally
  described. Validation proved the catalog “orphan” was already linked and was only *presented* as
  ownerless by the null-slot epic’s read failure. That deleted one HIGH production-data mutation
  story and avoided unpublishing a valid live listing.
- The planned two-PR backend split became one HIGH PR because the active production incident lived
  in the nominally LOW half and shared the same helper/deploy. Story commits preserved review
  boundaries. Final backend gate: 44 suites / 450 tests.
- Fresh review found material issues twice: a body-portalled mobile filter broke after crossing its
  CSS breakpoint, and ticket/order historical ownership was not fully fail-closed. Both were fixed
  before merge and gained regressions.
- Production outcome: zero catalog writes, backend `medusa-web-00003-jgv`, repaired slug
  `andrea-shops`, 71/71 catalog items valid, and real Chromium lightbox/resize smokes green.

### What was different from the Fable trial

- OpenAI model routing was effective when expressed as **risk + boundedness**, not a blanket
  “cheaper model builds” rule. Terra handled local, reversible work; Sol retained cross-epic
  deletion decisions, commerce authorization, and release orchestration.
- Codex’s external-data boundary blocked `prose-draft` from sending Roadmap contents to its
  configured different-family service, so retros were written locally from the completed evidence.
- The Antigravity cross-review wrapper could not pass its local `gh auth status` preflight even
  though the same session could create, edit, inspect, and merge PRs. The advisory layer was
  attempted and recorded but, correctly, did not block CI + fresh-reviewer approval.
- A Vercel Git-hook miss on a review-fix commit exposed a worktree footgun: `vercel deploy` from an
  unlinked worktree infers a new project. The command was stopped, the unintended project removed,
  and the existing project explicitly linked before creating the exact-SHA preview.

### Recommendation for the next Codex/Sol batch

1. Keep **validation agents first** and delay builder fan-out until overlap is adjudicated; deleted
   work was the largest value in this run.
2. Keep Sol/high on Medusa, auth/money, production state, and scope-merging decisions; use
   Terra/medium for narrow UI/tests/audits with explicit file ownership.
3. Repair the local GitHub CLI authentication state before starting so the advisory cross-family
   rail can run normally; do not weaken or bypass its auth preflight.
4. Decide whether Roadmap prose may be sent to the configured draft model. If not, make the Codex
   path explicitly local rather than discovering the export boundary at close-out.
5. Persist/reuse the existing Vercel project link in worktrees or wait for the Git integration;
   never run `vercel deploy` from an unlinked worktree.

## Out of scope

Changing the standing Claude-family Opus/Sonnet policy from this single trial. The Codex result is
recorded as an additional proven orchestration shape, not a replacement policy.
