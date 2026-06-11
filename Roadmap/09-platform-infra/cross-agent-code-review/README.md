# Epic — Cross-agent code review (second-opinion command)

**Macro-section:** 09 · Platform & Infra
**Class:** Chore / dev-tooling (process improvement, Cowork track). No buyer/seller/agent-facing change.
**Scope doc:** [`Roadmap/00-ideas/seeds/cross-agent-code-review.md`](../../00-ideas/seeds/cross-agent-code-review.md) — APPROVED 2026-06-10.

## Why

Our review today is already cross-agent in spirit: a **fresh Claude Code reviewer** (not the builder)
re-derives intent from the diff, single-pass on a green CI gate (`WAYS-OF-WORKING.md` §"Review & merge",
`SESSION-KICKOFFS.md` #4). The one thing it can't give us is a **different model family's blind spots**.
This epic adds exactly that — a thin, **advisory** command that pipes a PR diff into Codex CLI or
Antigravity CLI for a single second-opinion pass — and nothing more. The full adversarial-*debate* loop
is deliberately **out**: our `LEARNINGS.md` pegs the iterative review loop as the #1 token sink (~59%),
which our single-pass discipline exists to avoid.

## Context

| | |
|---|---|
| **What it is** | A repo-local Node script (`scripts/cross-review.mjs`) — dev tooling, not app code |
| **Inputs** | `<PR#>` + `--agent codex\|antigravity`; the diff via `gh pr diff` |
| **Foreign CLIs** | Codex: `codex exec` (non-interactive, stdin=context, findings→stdout). Antigravity: `agy -p --output-format json` (headless) |
| **Output** | An **advisory** PR comment via `gh pr comment`, labeled by model, banner: "not a gate, does not authorize merge" |
| **Repos touched** | monorepo root (`scripts/`) + `Roadmap/` docs. No `apps/*`, no backend, no DB |

## Decisions (Daniel, 2026-06-10)

1. **Option B only** — thin command. Option A (do nothing) and Option C (full debate pipeline) rejected.
2. **Both agents, selectable** — `--agent codex|antigravity`, so we can A/B which reviewer we trust.
3. **Suggested on HIGH-risk, optional on any** — an option exactly like the reviewer is today; never
   auto-fired, never mandatory.
4. **Advisory only** — findings never gate, block, or merge. CI + the Claude reviewer + the risk-tier
   merge rule stay the sole source of truth.
5. **All low-risk tier** — additive dev tooling, read-only on the diff. Daniel self-tests by running it.

## Medusa-first note

N/A — zero backend, zero DB, zero Medusa/Supabase, zero commerce surface. AGENTS five-rule check:
rules 1–3 N/A (no commerce / no Supabase / no UCP-MCP surface touched), rule 4 (Clerk) untouched,
rule 5 (bilingual) N/A — no user-facing copy (the only strings are developer-facing CLI/comment text).

## What already exists (reuse, don't rebuild)

- **`gh` CLI** — `gh pr diff <N>` to fetch the diff, `gh pr comment <N> --body` to post. Already used across the workflow.
- **The reviewer prompt** — the five AGENTS rules + WAYS single-pass discipline already live in
  `SESSION-KICKOFFS.md` #4 and `WAYS-OF-WORKING.md`. Factor that into one durable prompt doc the command
  and human reviewers both read; do not author a new review rubric from scratch.
- **Risk-tier convention** — every PR body already declares LOW/HIGH; the "suggest on HIGH" hook reads
  that. Nothing new to model.

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **1** | US-1 Skateboard — Codex review to stdout (`--agent codex`, diff → `codex exec` → print findings) | low |
| **1** | US-2 Advisory PR comment (post labeled findings + "not a gate" banner via `gh pr comment`) | low |
| **1** | US-3 Antigravity behind the flag (`--agent antigravity` → `agy -p --output-format json`) | low |
| **1** | US-4 Docs wiring (shared prompt doc + WAYS/kickoff/PR-template "suggested-on-HIGH / optional-on-any" note) | low |

## Deploy order

No deploy — it's a repo script + docs, not an app surface. No Vercel/Cloud Run. "Shipping" = the script
merged to `main` and runnable. US-1→US-2 in order (the comment builds on stdout); US-3 and US-4 are
independent after US-2.

## Definition of Done (epic)
- [ ] `scripts/cross-review.mjs <PR#> --agent codex` posts an advisory, clearly-non-authoritative comment on a real PR.
- [ ] `--agent antigravity` produces a comparable comment; missing/unauthed CLI fails with a clear message.
- [ ] One shared reviewer-prompt doc exists; the command and the human kickoff both reference it.
- [ ] `WAYS-OF-WORKING.md` §Review & merge, `SESSION-KICKOFFS.md` #4, and the PR template note the
      cross-agent pass as **suggested on HIGH-risk, optional on any, advisory only**.
- [ ] No gating: nothing in CI or the merge path blocks on the foreign agent's output.
- [ ] Smoke walkthrough in `sprint-1.md` run green by Daniel against a real PR.
- [ ] This README marked ✅; sprint status ticked with commit refs; `RETROSPECTIVE.md` written.
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md`; seed frontmatter `status: shipped`.
