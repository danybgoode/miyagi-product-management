---
title: "Cross-agent code review — second-opinion command (Codex / Antigravity)"
slug: cross-agent-code-review
status: scaffolded
area: "09"
type: chore
priority: null
risk: low
epic: "09-platform-infra/cross-agent-code-review"
build_order: null
updated: 2026-06-10
---

# Cross-agent code review — a thin second-opinion command

> **Class:** Chore (dev-tooling / process; no user-facing change). Process-improvement (Cowork track),
> **not** a marketplace feature — so no Medusa-first reframe; the reframe is against our own
> `WAYS-OF-WORKING.md`.
> **Stage-2.5 bucket:** **light enhancement.** Cross-agent review already exists in our process as a
> *concept* (fresh-reviewer pattern + the "optional adversarial second review of HIGH-risk PRs" lane,
> WAYS line ~203). This adds the one missing piece — **reviewer-model diversity** — via a thin,
> advisory wrapper. It does **not** introduce a multi-agent *debate loop* (Option C, explicitly out).

## Why / the ask
**As** the product owner running multi-agent dev, **I want** a one-command way to get a *second opinion*
on a PR diff from a **different model family** (Codex CLI and/or Antigravity CLI), posted as an advisory
PR comment, **so that** HIGH-risk (money / auth / checkout / migration) changes get checked by blind
spots my Claude reviewer doesn't share — **without** reintroducing the iterative review loop our process
was designed to avoid.

Today (works great, keep it): a PR opens → I ask the agent to spawn a **fresh Claude Code reviewer**
(not the builder) → single pass on a green CI gate → low-risk auto-merge / high-risk I merge
(`WAYS-OF-WORKING.md` §"Review & merge", `SESSION-KICKOFFS.md` #4). That fresh-eyes property already
delivers most of the value of "adversarial collaboration." The only thing it lacks is a *different model*.

## The honest assessment (is this a good idea / am I overthinking it?)
- **The "multi-agent debate" framing is overthinking it.** Our own `LEARNINGS.md` is explicit: code
  review is the single biggest token sink (~59%) via **iterative refine loops**, and our deliberate
  countermeasure is **single-pass review on a green deterministic gate**. A back-and-forth debate
  pipeline (Option C) re-creates exactly that cost sink. **Out of scope.**
- **The valuable, cheap kernel is *model diversity*, single-pass, advisory.** A second model reviewing
  the same diff once, posting findings as a comment that **never gates and never auto-merges**. That's
  Option B — this scope.
- **ROI is real but modest.** The marginal gain over the existing fresh-Claude reviewer is *only* the
  different-model blind-spot coverage — most valuable on HIGH-risk money-path diffs, low value on
  routine ones. So: **suggested on HIGH-risk, available on any PR on demand** (an option, like today),
  never forced, never a gate.

## Decisions locked (from grooming Q&A, 2026-06-10)
- **Path:** Option B — thin command. (A = do nothing; C = full debate pipeline — both rejected.)
- **Agents:** **Codex CLI and Antigravity CLI**, behind a **selectable `--agent` flag** (A/B which
  reviewer we trust).
- **Trigger:** **suggested on HIGH-risk PRs, available on any PR on demand** — an option, exactly like
  the reviewer is today. Never auto-fired, never mandatory.
- **Authority:** **Advisory only.** Findings post as a labeled PR comment. CI + the Claude reviewer +
  the risk-tier merge rule remain the sole source of truth. The foreign agent never blocks or merges.

## Feasibility — researched present-day facts (2026-06)
- **Codex CLI** — `codex exec "<prompt>"` runs non-interactively: piped stdin becomes context, the final
  agent message prints to stdout (progress to stderr), supports JSON output; also ships a built-in
  `codex review --uncommitted`. Ideal for `gh pr diff | codex exec`. (developers.openai.com/codex/noninteractive)
- **Antigravity CLI (`agy`)** — headless `agy -p "<prompt>" --output-format json`; Go-based; it is the
  **official replacement for Gemini CLI, which sunsets for AI Pro/Ultra on 2026-06-18** — so building on
  `agy` is the forward-compatible choice. (antigravity.google/docs/cli-overview)
- **Environmental dependency (note for builder):** both `codex` and `agy` must be **installed + authed**
  on whatever machine runs the command. `agy` is brand new — pin/version-check its flags, since they may
  still shift.

## What already exists (reuse, don't rebuild)
- **`gh` CLI** — `gh pr diff <N>` (get the diff) and `gh pr comment <N> --body` (post advisory comment).
  Already used across the workflow.
- **The reviewer prompt** — the five AGENTS rules + WAYS single-pass discipline already live in
  `SESSION-KICKOFFS.md` #4 and `WAYS-OF-WORKING.md`. The command reuses that text; we factor it into one
  durable prompt doc the command and human reviewers both read.
- **Risk-tier convention** — every PR already declares LOW/HIGH in its body; the "suggest on HIGH" hook
  reads that, nothing new to model.

## Scope — in / out (v1)
**In:**
- A repo-local script (`scripts/cross-review.mjs`, run via `node`) taking a PR number + `--agent codex|antigravity`.
- Pulls the diff (`gh pr diff`), pipes it with the shared reviewer prompt into the chosen CLI, captures findings.
- Posts findings as a PR comment, **labeled by model**, with a clear **"Advisory only — not a gate, does not authorize merge"** banner.
- One shared reviewer-prompt doc both the command and humans use.
- Docs wiring: WAYS §Review & merge + kickoff #4 + PR-template line note it as a suggested-on-HIGH / optional-on-any step.

**Out (v1):**
- Any **debate / iterate-to-convergence loop** (Option C).
- The foreign agent **gating, blocking, or performing merges** (advisory only, always).
- **Auto-firing** in CI / on every PR (it is an on-demand option; CI stays the deterministic gate).
- Aggregating/diffing the two agents' opinions against each other (run one at a time via the flag).
- Anything touching the Next.js/Medusa app, commerce, money, auth, or i18n.

## Slices (skateboard → car) — proposed, 1 sprint
> Independently runnable; each is testable by Daniel running the command against a real recent PR.

1. **Skateboard — Codex review to stdout.** `node scripts/cross-review.mjs <PR#> --agent codex` →
   `gh pr diff` piped into `codex exec` with the shared prompt → **prints** structured findings to the
   terminal (no posting yet). *Acceptance:* run it against a real recent PR, see a coherent Codex review.
   *Risk: low.*
2. **Advisory PR comment.** Post the findings via `gh pr comment`, labeled `🔎 Cross-agent review (Codex)`
   with the "advisory only — not a gate" banner. *Acceptance:* the comment appears on the PR, clearly
   marked non-authoritative. *Risk: low.*
3. **Antigravity behind the flag.** `--agent antigravity` → `agy -p --output-format json`, same prompt,
   same comment shape labeled for the model. *Acceptance:* `--agent antigravity` yields a comparable
   comment; bad/missing CLI fails with a clear message. *Risk: low.*
4. **Docs wiring (docs-only).** Factor the shared reviewer prompt into one durable doc; add the
   "suggested on HIGH-risk, optional on any" note to `WAYS-OF-WORKING.md` §Review & merge, kickoff #4,
   and the PR template. *Acceptance:* a fresh agent reading the docs knows when and how to offer the
   cross-agent pass. *Risk: low.*

## QA / smoke (this is dev tooling — not the app gate)
No tsc/build/Playwright/preview/es-MX involvement (it's a repo script, not app code). QA = **run the
command against a real recent PR and eyeball the output**. Per-story acceptance above doubles as the
smoke. The sprint-end smoke walkthrough (written at scaffold time) will name a real PR number + the exact
commands + expected comment.

## Risk tier
**Low** across all stories — additive dev tooling, read-only on the diff, advisory output, no commerce /
money / auth / migration / shared-app-infra surface. Daniel self-tests by running it; no Daniel-merge
gate needed beyond normal.

## Open risks / watch-items
- **`agy` is brand new** — flags may change; pin a version and fail loudly on mismatch.
- **Auth/runtime dependency** — `codex`/`agy` must be installed + authed wherever the command runs
  (Daniel's machine, or the Claude Code session). Document the prereq; degrade with a clear error.
- **Don't let it creep into a loop** — if findings tempt a "fix → re-review → re-fix" cycle, that's
  Option C and out of scope; the builder addresses findings once, normally, no automated loop.
- **Cost** — each run spends foreign-agent tokens; keeping it on-demand / HIGH-risk-suggested bounds it.

## Definition of Ready — checklist
- [x] As-a / I-want / so-that clear; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (light enhancement).
- [x] v1 in/out boundary written (debate loop + gating explicitly out).
- [x] Reuse list produced (`gh`, existing reviewer prompt, risk-tier convention).
- [x] Research cited (Codex `exec`, Antigravity `agy`, Gemini-CLI sunset date).
- [x] Each story risk-tiered (all low); QA/smoke named; owner = Daniel (self-run).
- [ ] **Daniel approves this scope doc** → then scaffold the epic + sprint + emit the Claude Code kickoff.
