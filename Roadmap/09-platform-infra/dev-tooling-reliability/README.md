---
status: scaffolded
slug: dev-tooling-reliability
---

# Epic — Dev-tooling reliability (backend CI + cross-agent review hardening)

**Macro-section:** 09 · Platform & Infra
**Class:** Chore / dev-tooling (engineering-facing process improvement; no buyer/seller/agent change).
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/dev-tooling-reliability.md`](../../00-ideas/2.%20readyforscope/dev-tooling-reliability.md) — APPROVED 2026-06-13.

## Why

Three small frictions slow the ship loop. (1) The **backend has no pre-merge CI** — its only workflow is a
Telegram push ping, so `tsc` / `medusa build` / unit tests never run on a backend PR, even though those
scripts already exist. The frontend has a full `ci.yml`; the backend is the blind spot. (2) **Cross-agent
review dies when the Codex token lapses** — `scripts/cross-review.mjs` hard-fails instead of using the
already-built Antigravity fallback. (3) The review command is regularly run on the **wrong or stale branch
the first time**, then rerun — because it takes an explicit `<PR#>` and never ties it to the current branch
or checks the head SHA. This epic fixes all three as **scripts/templates, not agent prose**, each an
independent LOW-risk slice.

## Context

| | |
|---|---|
| **What it is** | A backend GitHub Actions workflow + two enhancements to existing repo-local Node scripts |
| **Repos touched** | **backend** repo (`apps/backend/.github/`) for S1 · monorepo-root (`scripts/`, `Roadmap/`) for S2–S3. No `apps/miyagisanchez`, no DB, no commerce |
| **Reuse spine** | frontend `ci.yml` `typecheck-build` job · backend `package.json` test/build scripts · `scripts/lib/cross-agent-cli.mjs` shared CLI rail |
| **Output** | A red/green backend PR check; a cross-review command that survives a dead Codex token and always reviews the right diff |

## Decisions (Daniel, 2026-06-13)

1. **One infra epic, 3 sprints** — backend CI · codex endurance · wrong-branch fix; independent, ship in any order.
2. **Cheap backend gate** — `tsc --noEmit` + `medusa build` + `npm run test:unit`. Integration tests (need Postgres) and gating the Cloud Build deploy are **out** of v1.
3. **Codex → Antigravity auto-fallback** — on a dead/missing Codex token, retry with antigravity + a clear, labeled message.
4. **Auto-resolve the PR from the current branch** — PR# optional; assert local `HEAD` == the PR's head SHA so the *first* run reviews the right diff.

## Medusa-first note

N/A — zero backend-commerce surface (the "backend" here is the CI *for* the Medusa app, not a commerce
feature). AGENTS five-rule check: rules 1–3 (Medusa / Supabase / UCP-MCP) untouched; rule 4 (Clerk)
untouched; rule 5 (bilingual) N/A — strings are developer-facing CI/CLI/PR-comment text, not user copy.

## What already exists (reuse, don't rebuild)

- **`apps/miyagisanchez/.github/workflows/ci.yml`** — the `typecheck-build` job (checkout → setup-node 20 →
  `npm install` → `tsc --noEmit` → `npm run build`) is the **template** for the backend gate. Copy the shape.
- **`apps/backend/package.json`** — `build` (`medusa build`), `test:unit`, `test:integration:http/modules`
  already exist; S1 just wires `build` + `test:unit` into CI. No test infra to author.
- **`apps/backend/src/api/store/_utils/__tests__/*.unit.spec.ts`** — real DB-free unit specs S1's gate runs.
- **`apps/backend/.github/workflows/notify-telegram.yml`** — the backend workflow folder + the "skip cleanly
  when an optional secret is absent, never hard-fail" idiom. S1's `ci.yml` lands beside it.
- **`scripts/cross-review.mjs` + `scripts/lib/cross-agent-cli.mjs`** — `runCodex`/`runAntigravity` (with a
  `soft` non-fatal mode), `ensureCmd`, `checkAgyVersion`. S2 adds the fallback in the shared rail; S3 adds the
  branch-resolve there too, so `cross-panel.mjs` inherits both.
- **`scripts/cross-review.prompt.md`** — the single reviewer rubric; unchanged by this epic.
- **LEARNINGS:** "drive a young foreign CLI — `--version`-check, pin, **degrade, never assume**" (S2 is this
  rule applied to a dead token) and "infra's deterministic gate is a **pure `node:test`**" (S2/S3 get free
  coverage that way).

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 Backend `ci.yml` on `pull_request` (tsc + `medusa build` + `test:unit`) | low |
| **[S1](sprint-1.md)** | S1.2 Make it the merge gate (required check — operational) + correct WAYS | low |
| **[S2](sprint-2.md)** | S2.1 Codex→Antigravity auto-fallback in the shared rail | low |
| **[S2](sprint-2.md)** | S2.2 Label + message the fallback (comment header + stderr restore hint) | low |
| **[S2](sprint-2.md)** | S2.3 Re-auth runbook (`codex login`) doc | low |
| **[S3](sprint-3.md)** | S3.1 PR# optional — resolve from current branch via `gh pr view` | low |
| **[S3](sprint-3.md)** | S3.2 Stale/wrong-branch guard (`HEAD` vs PR head SHA → warn / require `--force`) | low |
| **[S3](sprint-3.md)** | S3.3 Share the resolver so `cross-panel.mjs` inherits it | low |

## Deploy order

No app deploy — CI config + repo scripts + docs. "Shipping" = merged to `main` (and, for S1, the workflow
file present in the backend repo). All three sprints are **independent**; S1 is the highest-value, build it
first. Within S2 and S3, the stories are sequential (label builds on the fallback; the guard builds on the
resolve). S1 lands in the **backend** repo; S2/S3 in the **monorepo-root** repo.

## Definition of Done (epic)

- [x] Opening a backend PR runs `tsc` + `medusa build` + `test:unit` (S1, PR #29 squash `21b1e16`); the gate is a **required status check** on `main`. *(Green proven on PR #29; the deliberate-red smoke steps 2–4 owed to Daniel — throwaway backend PR.)*
- [x] `WAYS-OF-WORKING.md` §Review&merge corrected to reflect the real backend gate; required-status-check **configured** (branch protection, 2026-06-14) — was Daniel's operational step, done with his authorization.
- [ ] With Codex unauthenticated, `cross-review.mjs <PR#>` still posts a review via Antigravity, clearly labeled as the fallback; stderr says how to restore Codex.
- [ ] `cross-review.mjs` with no PR# reviews the current branch's PR; running with local HEAD ahead of the PR warns instead of silently reviewing a stale diff.
- [ ] `cross-panel.mjs` shares the branch resolver (no fork).
- [ ] Each `sprint-N.md` has its smoke walkthrough + status ticked with commit refs.
- [ ] This `README.md` marked ✅; `RETROSPECTIVE.md` written; durable learnings promoted to `Roadmap/LEARNINGS.md`.
- [ ] Poster: add a line to `09-platform-infra/README.md` (infra epic — not the product poster). Run `node scripts/build-order.mjs` and stage `BUILD-ORDER.md`.
