---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: cross-agent-review-always
---

> **✅ SHIPPED 2026-06-22 (local-only, by decision).** The CI auto-run (S1.2) was **descoped**: a GitHub
> runner has no codex/agy auth — codex would need a **token-billed API key + a cross-repo PAT** and **agy has
> no headless auth at all** (probed live). Not worth it for an advisory aid, so cross-review stays the
> **local command, run on every PR** (the policy flip). What shipped: the **cost guard** (`--skip-trivial`,
> root PR [#29](https://github.com/danybgoode/miyagi-product-management/pull/29)) + the **policy** (WAYS / PR
> template / kickoffs now say "run locally on every PR, advisory"). The non-blocking `cross-review.yml` was
> built + self-smoked green (clean-skip path) but **not merged** — PRs `miyagisanchezcommerce#103` /
> `medusa-bonsai-backend#35` closed, branches kept if CI is ever wanted. See `RETROSPECTIVE.md`.

# Epic — Cross-agent review on every PR (CI auto-run + policy)

**Macro-section:** 09 · Platform & Infra
**Class:** Chore / dev-tooling + process (engineering-facing; no buyer/seller/agent surface).
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/cross-agent-review-always.md`](../../00-ideas/2.%20readyforscope/cross-agent-review-always.md) — APPROVED 2026-06-22.
**Sibling:** the other half of the same ask — [`spike-cross-agent-orchestration`](../../00-ideas/2.%20readyforscope/spike-cross-agent-orchestration.md) (build-time delegation; spike, not built here).

## Why

The cross-agent second opinion has "proven very valuable" and Daniel wants it on **every** PR, not just
HIGH-risk — and wants it to actually happen, not just be a policy line. The command already exists
(`scripts/cross-review.mjs`, runs on any PR, both model families, with fallback + branch-resolve). Two
things are missing: (1) it only runs when a human invokes it locally, and (2) the policy still says
"suggested on HIGH-risk, optional on any." This epic automates it (a non-blocking CI job posts the existing
advisory comment) and rewrites the policy to "every PR." It stays **advisory and never gates** — CI + the
Claude reviewer + the risk-tier merge rule remain the sole authorities (the iterative review loop is the #1
token sink per `LEARNINGS.md`, so a blocking/debate variant stays out).

## Context

| | |
|---|---|
| **What it is** | A non-blocking GitHub Actions workflow per repo + doc/policy edits |
| **Inputs** | The PR (`pull_request` event) → `gh pr diff` inside the existing script |
| **Foreign CLI** | Codex (default in CI; needs headless auth — see S1.1). Antigravity stays a local/manual option |
| **Output** | An advisory, clearly-non-authoritative "Cross-agent review" PR comment, auto-posted |
| **Repos touched** | App repos' `.github/workflows/` (one file each) + monorepo-root (`Roadmap/`, PR template) |

## Decisions (Daniel, 2026-06-22)

1. **Split from build-time orchestration** — that half is a separate spike; this ships on its own.
2. **Mechanism = both** — CI auto-runs it on every PR **and** the docs/kickoffs document the expectation.
3. **Advisory only, never gates** — non-blocking job (`continue-on-error`), never a required check.
4. **Validate headless auth first** — codex CI auth is unconfirmed; S1.1 checks it before building the job.
   If it can't auth headlessly, ship Sprint 2 (policy "run locally on every PR") only.
5. **All low-risk** — additive non-blocking CI + docs; the review can never block a merge.
6. **(2026-06-22, post-S1) Ship local-only — CI auto-run descoped.** S1.1 found codex *can* auth headlessly,
   but **only** via a token-billed API key (its local auth is a ChatGPT-OAuth login, not portable to CI) and
   the app-repo workflow also needs a cross-repo PAT; **agy has no headless auth path at all**. Daniel's call:
   a new billed key + PAT isn't worth it for an advisory aid — keep cross-review as the **local command, run
   on every PR**. The cost guard + policy still ship; the workflow is built but not merged.

## Medusa-first note

N/A — zero commerce surface. AGENTS five-rule check: rules 1–3 (Medusa / Supabase / UCP-MCP) untouched;
rule 4 (Clerk) untouched; rule 5 (bilingual) N/A — only developer-facing strings (CI logs, PR-comment text).
This is `.github/` + `Roadmap/` + the PR template.

## What already exists (reuse, don't rebuild)

- **`scripts/cross-review.mjs`** — runs on any PR, `--agent codex|antigravity`, posts the labeled
  "advisory only, not a gate" comment. The CI job only *invokes* it; no new review logic.
- **`scripts/lib/cross-agent-cli.mjs`** — codex→agy fallback, PR-resolve, stale-HEAD guard, agy size-cap.
  Inherited free (the CI job passes an explicit `<PR#>` + `--repo`).
- **`scripts/cross-review.prompt.md`** — the single shared rubric (five AGENTS rules + single-pass); the CI
  run reads the same prompt the human reviewer does.
- **`apps/miyagisanchez/.github/workflows/ci.yml`** → "Browser smokes vs preview (non-blocking)" — the
  `continue-on-error` **template** for a never-gating advisory job.
- **`apps/*/.github/workflows/notify-telegram.yml`** — the "skip cleanly when an optional secret is absent,
  never hard-fail" idiom, for the missing-credential path.
- **`.github/PULL_REQUEST_TEMPLATE.md`**, **`Roadmap/WAYS-OF-WORKING.md`** §Review & merge,
  **`Roadmap/SESSION-KICKOFFS.md`** #4 — the exact copy to flip from "suggested/optional" to "every PR."

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 Validate headless reviewer auth in CI (load-bearing; gates the rest) | low |
| **[S1](sprint-1.md)** | S1.2 `cross-review.yml` non-blocking workflow auto-posts the advisory comment | low |
| **[S1](sprint-1.md)** | S1.3 Cost guard — skip trivial/docs-only diffs | low |
| **[S2](sprint-2.md)** | S2.1 WAYS §Review & merge → "runs on every PR, advisory, never gates" | low |
| **[S2](sprint-2.md)** | S2.2 PR template + `SESSION-KICKOFFS.md` #4 + kickoff review line | low |

## Deploy order

No app deploy — `.github/` workflows + repo scripts + docs. "Shipping" = merged to `main` and the workflow
present in each repo. **S1.1 gates S1.2/S1.3** (don't build the job until auth is confirmed). Sprint 2 is
independent of Sprint 1 — the policy can land even if the CI auto-run is blocked on auth (it would then read
"run cross-review locally on every PR"). S1 workflow files land in the **app repos**; S2 docs + the PR
template in the **monorepo-root** repo.

## Definition of Done (epic)

- [x] ~~Opening any PR auto-posts one advisory comment~~ → **descoped (decision 6).** The non-blocking
      `cross-review.yml` was built + self-smoked green (clean-skip path), but local-only was chosen — not merged.
- [x] A trivial/docs-only PR skips the run with a logged reason — **`--skip-trivial`** cost guard (S1.3),
      live-smoked.
- [x] `WAYS-OF-WORKING.md` §Review & merge, the PR template, and `SESSION-KICKOFFS.md` #4 all say cross-review
      runs on **every PR, advisory, never gates** — reworded to "run **locally** on every PR" (S2).
- [x] No gating: nothing in CI or the merge path blocks on the foreign agent's output (it doesn't run in CI).
- [x] Each `sprint-N.md` has its smoke walkthrough + status ticked with commit refs.
- [x] This `README.md` marked ✅ (`status: shipped`); `RETROSPECTIVE.md` written; durable learnings promoted
      to `Roadmap/LEARNINGS.md`.
- [x] Poster: line added to `09-platform-infra/README.md`. Ran `node scripts/build-order.mjs`; staged `BUILD-ORDER.md`.
