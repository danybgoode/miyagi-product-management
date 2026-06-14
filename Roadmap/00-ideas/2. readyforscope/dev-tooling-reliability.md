# Dev-tooling reliability — backend CI + cross-agent review hardening

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **09 · Platform & Infra**. Slug: `dev-tooling-reliability`.
Class: **Chore / dev-tooling** (engineering-facing; no buyer/seller/agent surface).

One epic, three independent slices that all make the *ship loop* more reliable:
1. give the **backend a real pre-merge CI gate** (it currently has none),
2. make **cross-agent review survive a dead Codex token**, and
3. kill the **"ran it on the wrong branch, rerun" tax**.

Daniel's grooming calls (2026-06-13, all the recommended option): one infra epic / 3 sprints · cheap
backend gate (tsc + `medusa build` + unit tests) · codex→antigravity auto-fallback · auto-resolve the PR
from the current branch.

## Mirror-back
> You want the backend gated like the frontend, cross-agent review that doesn't die when Codex auth lapses,
> and the review command to stop running against the wrong/stale branch — all as **scripts/templates, not
> agent prose.** Right?

## Stage-2.5 bucket — **two light enhancements + one genuinely-new (but small) gate**
| Slice | Bucket | Why |
|---|---|---|
| Backend CI | **Genuinely new** | The backend repo's only workflow is `notify-telegram.yml` (a push ping). No `tsc`/build/test gate runs on a backend PR — even though the scripts already exist. |
| Codex endurance | **Light enhancement** | `scripts/cross-review.mjs` already ships `--agent antigravity` (a different model family). The "fix" is a small fallback + message, not a new tool. |
| Wrong-branch | **Light enhancement** | The script already fetches `gh pr diff <PR#>`; it just never ties the PR to the current branch or checks the head SHA. |

## What already exists (reuse, don't rebuild) — verified against the repo 2026-06-13
| Capability | Where | Reuse for |
|---|---|---|
| Frontend deterministic gate: `tsc --noEmit` + `next build` on `pull_request` | `apps/miyagisanchez/.github/workflows/ci.yml` (`typecheck-build` job) | **The template for the backend gate** — copy the job shape, swap the steps |
| Backend test + build scripts already present | `apps/backend/package.json`: `build` (`medusa build`), `test:unit`, `test:integration:http`, `test:integration:modules` | S1 wires these; no new test infra to author |
| Existing backend unit specs (DB-free) | `src/api/store/_utils/__tests__/*.unit.spec.ts` (support-seller-resolution, payment-methods-killswitch) | S1's `test:unit` already has real specs to run; future specs slot in |
| Backend workflow folder + secret-skip idiom | `apps/backend/.github/workflows/notify-telegram.yml` (skips cleanly when secrets absent) | S1's `ci.yml` lands beside it; reuse the "never hard-fail on missing optional secret" idiom |
| Shipped cross-agent review command | `scripts/cross-review.mjs` + shared plumbing `scripts/lib/cross-agent-cli.mjs` (`runCodex`/`runAntigravity`, `ensureCmd`, `checkAgyVersion`, a `soft` failure mode) | S2 + S3 edit these; `runCodex` already supports `opts.soft` for a non-fatal fallback |
| Reviewer prompt doc | `scripts/cross-review.prompt.md` | Unchanged — both slices keep it as the single rubric |
| LEARNINGS precedent: "drive a young foreign CLI — `--version`-check, pin, **degrade, never assume**" | `Roadmap/LEARNINGS.md` (cross-agent-review S1) | S2's fallback is exactly this rule applied to a dead token |
| LEARNINGS precedent: "infra's deterministic gate is a **pure `node:test`** asserting scripts vs config" | `Roadmap/LEARNINGS.md` | S2/S3 get free coverage via a `node:test` on the new pure logic |

## Medusa-first reframe (AGENTS five-rule check)
**N/A — zero commerce surface.** Rules 1–3 (Medusa / Supabase / UCP-MCP) untouched: no products, orders,
payments, DB tables, or agent endpoints. Rule 4 (Clerk) untouched. Rule 5 (bilingual) N/A — the only strings
are developer-facing (CI logs, CLI/PR-comment text), not user copy. This is `scripts/` + `.github/` + docs only.

## In scope (v1)
- A **backend `ci.yml`** on `pull_request`: `tsc --noEmit` (or `medusa build`'s compile) + `medusa build` +
  `npm run test:unit`. Mirrors the frontend `typecheck-build` job. Blocks merge on red.
- `cross-review.mjs` **auto-falls back to antigravity** when the Codex CLI is unauthenticated/errors, with a
  clear message and a comment label noting the fallback.
- `cross-review.mjs` **auto-resolves the PR from the current branch** (PR# becomes optional) and **asserts local
  `HEAD` == the PR's head SHA**, warning/refusing on a stale or wrong-branch diff.
- A short note in `WAYS-OF-WORKING.md` §Review&merge + `SESSION-KICKOFFS.md` reflecting the new behavior, and a
  one-line **operational runbook** for re-authing Codex (`codex login`) when it lapses.

## Out of scope (v1)
- **Backend integration tests in CI** (`test:integration:http/modules`) — they need a Postgres (+ Redis) service
  container; deferred to a follow-up. v1 runs DB-free unit specs only.
- **Gating the Cloud Build deploy** on green CI — Daniel chose the cheap gate; CI blocks the *merge* (via branch
  protection — see open question 1), it does **not** add a pre-deploy hook inside `cloudbuild.yaml`.
- **Playwright/browser e2e for the backend** — the backend has no per-branch preview (WAYS §40); not applicable.
- The full adversarial **debate** loop for cross-review (the #1 token sink) — stays out, as decided at the
  cross-agent-review epic.

## Slicing — skateboard → car (3 sprints, all independent)
Branch `chore/dev-tooling-reliability` per repo touched (S1 lands in the **backend** repo's `.github/`; S2/S3
land in the **monorepo-root** repo's `scripts/`). Dev-tooling QA = a pure `node:test` on any extracted logic
(free, no network) + a real-PR smoke owed to Daniel. No money/auth/DB path anywhere.

### Sprint 1 — Backend CI gate (the skateboard) · **risk: LOW**
Mirror the frontend `typecheck-build` job for `apps/backend`.
- **S1.1 — `ci.yml` on `pull_request`.** Steps: checkout → setup-node 20 → `npm install` → `npx tsc --noEmit`
  (or `medusa build` if a standalone tsc target is unclean) → `npm run build` (`medusa build`) → `npm run
  test:unit`. *Acceptance:* opening a backend PR runs the job; a deliberate type error or failing unit spec
  turns it red. *QA:* Daniel opens a throwaway backend PR (or pushes a red commit to a branch) and sees the
  check; the run is the smoke. *Note:* no preview, so no e2e step — that's correct, not a gap.
- **S1.2 — Make it the merge gate + doc it.** Add the job to branch protection's required checks (operational,
  owed to Daniel — open question 1) and correct `WAYS-OF-WORKING.md` §Review&merge, which currently implies the
  backend already has a tsc+build gate. *Acceptance:* WAYS reflects reality; the required-check toggle is noted
  as Daniel's one operational step. *QA:* doc diff.

### Sprint 2 — Codex endurance: auto-fallback + clear message · **risk: LOW**
- **S2.1 — Fallback in the shared rail.** In `scripts/lib/cross-agent-cli.mjs`, when `--agent codex` and
  `codex` is missing **or** `runCodex` fails on an auth/token error (use the existing `soft` mode), retry once
  with `runAntigravity` and return a flag saying a fallback happened. *Acceptance:* with Codex unauthenticated,
  `cross-review.mjs <PR#>` still posts a review via antigravity instead of dying. *QA:* `node:test` on the
  fallback-decision function (mock both runners — no network).
- **S2.2 — Label + message the fallback.** The advisory comment header notes "Codex unavailable → Antigravity
  fallback"; stderr tells the user why and how to restore Codex (`codex login`). Keep the "advisory only, not a
  gate" banner. *Acceptance:* the posted comment is unambiguously labeled as the fallback model. *QA:* dry-run
  (`--dry-run`) shows the labeled body; assert in the `node:test`.
- **S2.3 — Re-auth runbook.** One short paragraph (in `cross-review.prompt.md`'s sibling docs or
  `SESSION-KICKOFFS.md`) on detecting + fixing a lapsed Codex token. *Acceptance:* a fresh agent/Daniel can
  restore Codex from the doc alone. *QA:* doc diff.

### Sprint 3 — Wrong-branch tax: auto-resolve PR + HEAD assertion · **risk: LOW**
- **S3.1 — PR# becomes optional, resolved from the branch.** If no `<PR#>` is given, run
  `gh pr view --json number,headRefName,headRefOid` for the current branch; error clearly if the branch has no
  open PR. *Acceptance:* `node scripts/cross-review.mjs --agent codex` (no number) reviews the current branch's
  PR. *QA:* `node:test` on the arg-parse + resolve seam (mock `gh`).
- **S3.2 — Stale/wrong-branch guard.** Compare `git rev-parse HEAD` to the PR's `headRefOid`; if they differ,
  warn (unpushed commits / detached / wrong branch) and require `--force` (or an explicit `<PR#>`) to proceed —
  so the *first* run reviews the *right* diff. *Acceptance:* running with local commits not yet pushed prints a
  "your HEAD is ahead of the PR — push first or pass --force" message instead of silently reviewing a stale
  diff. *QA:* `node:test` on the comparison logic (mock SHAs).
- **S3.3 — Apply the same guard to `cross-panel.mjs` if it shares the path.** Reuse, don't fork — put the
  branch-resolve + HEAD-check in `scripts/lib/cross-agent-cli.mjs` so the planning panel benefits too.
  *Acceptance:* both commands share one resolver. *QA:* covered by the S3.1/S3.2 `node:test`.

## Risk tiers (WAYS §6 / groom Stage 6)
All three sprints → **LOW**: additive CI config + read-only dev tooling, no app code, no money/auth/DB/shared
runtime surface. The reviewer may auto-merge on a green gate. **Caveat:** S1 lands in the backend repo's
`.github/` — adjacent to deploy infra; it changes *no* deploy step (no `cloudbuild.yaml` edit), so it stays LOW,
but flag it in the PR body so Daniel eyeballs it.

## Open questions (validate before/at the sprint — don't assume)
1. **Branch protection (S1.2):** does the backend repo (`medusa-bonsai-backend`) currently have a required-status-
   checks rule? Making CI an actual *gate* (vs an informational run) needs that toggle — operational, Daniel owns
   it. If the backend merges direct-to-`main` without PRs today, confirm we want the PR flow there at all, or
   whether CI should also run `on: push` so it covers direct pushes.
2. **`tsc` target (S1.1):** confirm `npx tsc --noEmit` is clean against the backend `tsconfig` (Medusa apps
   sometimes only type-check via `medusa build`). If `tsc --noEmit` is noisy, the gate is `medusa build` +
   `test:unit` only — decide in plan mode against the live config.
3. **Codex auth shape (S2.1):** I can't inspect your local `codex login` state from here. Confirm the failure
   mode you actually hit (`codex exec` exits non-zero with an auth message vs. `codex` not on PATH) so the
   fallback triggers on the *right* signal, not on every error. Quick check on your machine:
   `codex exec "ping" </dev/null` — a clean line back = authed; an auth error = the token's gone.
4. **`gh pr view` without a number (S3.1):** confirm `gh` is authed and the working dir resolves to the right
   repo when you run cross-review from the monorepo root vs. an app subdir (the `--repo` flag already exists as
   the escape hatch).

## Research note
No present-day external standard is load-bearing here (no UCP/Stripe/Next.js version dependency). The only
"foreign" surfaces are the Codex and Antigravity CLIs, already pinned/handled in `scripts/lib/cross-agent-cli.mjs`
(`agy` pinned to 1.0.7; `codex exec` takes the diff on stdin). No web research required for the plan; verify the
two CLIs' current auth/flags at build time per the LEARNINGS "degrade, never assume" rule.

## Definition of Ready — checklist
- [x] "As a / I want / so that" clear; acceptance testable by Daniel (open a backend PR; run cross-review with a dead Codex token; run it with no PR# on a branch).
- [x] Stage-2.5 bucket named per slice (new / light / light).
- [x] v1 in/out boundary written (integration tests, deploy-gating, browser e2e all explicitly out).
- [x] Reuse list produced (frontend `ci.yml`, backend test scripts, shared CLI rail).
- [x] Each story risk-tiered (all LOW); QA stage named (pure `node:test` + real-PR smoke owed to Daniel).
- [ ] **Daniel approves this scope doc** → then scaffold the epic + 3 sprint docs and emit the kickoffs.
