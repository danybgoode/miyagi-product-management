# Retrospective — Cross-agent review on every PR

_Closed: 2026-06-22_

**Shipped:** 2026-06-22 (1 working session) · **Outcome:** shipped **local-only, by decision** (CI auto-run descoped).

## What shipped
- **Cost guard (S1.3)** — pure `decideTrivialSkip({ files, minLines })` + `isDocFile` in
  `scripts/lib/cross-agent-cli.mjs` (7 `node:test` cases), wired into `cross-review.mjs` behind an opt-in
  `--skip-trivial` (+ `--min-lines`, default 10). Docs-only of any size, or `< minLines` changed lines → skip
  (exit 0, before codex is even installed); one real code file → review. Root PR
  [#29](https://github.com/danybgoode/miyagi-product-management/pull/29).
- **Policy flip (S2)** — `WAYS-OF-WORKING.md` §Review & merge, `.github/PULL_REQUEST_TEMPLATE.md`, and
  `SESSION-KICKOFFS.md` #4 now say cross-review **runs locally on every PR, advisory, never gates** (was
  "suggested on HIGH-risk, optional on any").
- **The CI workflow (S1.2)** — `cross-review.yml` (non-blocking, `opened`+`reopened`, PAT sparse-checkout of
  the canonical script, secret-skip idiom) was **built in both app repos and self-smoked green** (the
  no-credential clean-skip path, observed on the PRs themselves), but **not merged** — see the decision below.
  PRs `miyagisanchezcommerce#103` / `medusa-bonsai-backend#35` closed; branches kept.

## The load-bearing decision (S1.1 → descope CI)
S1.1 validated headless auth **live** before building (LEARNINGS "drive a young foreign CLI"):
- **codex CAN auth headlessly** — `codex login --with-api-key` reads a key from stdin — **but** the local
  auth is a ChatGPT-OAuth subscription login (`OPENAI_API_KEY: null`), **not portable to CI**. CI would need
  a **new, token-billed API key**.
- **agy CANNOT** — probed `agy --help`: no login/auth/api-key flag at all (browser-login under
  `~/.antigravity`). No headless path.
- Either CI path **also** needs a cross-repo **PAT**, because the canonical script lives only in the private
  root repo and the workflow runs in the app repos.

Daniel's call: a new billed key + a PAT is **not worth it for an advisory aid that never gates**. Keep
cross-review the **local command, run on every PR**. The value (every-PR second opinion) and the cost-guard
improvement still land; only the automation is dropped.

## What went well
- **Validate-first paid off twice.** Probing the CLIs *before* building surfaced the real blocker (auth
  portability + the cross-repo script boundary) early, so the descope was a clean decision, not a rabbit hole.
- **Pure-decision-in-lib + `node:test`** gave the cost guard real, free coverage and a live smoke against real
  `gh` data (docs-only PR #28 → skip; code PR #100 → review) without any credential.
- **The built-but-unmerged workflow self-smoked itself** — opening the app PRs proved the clean-skip path
  (guard green, downstream `if`-gated off) at zero cost, which is most of what S1.2 would have demonstrated.

## What we learned
- **A CLI authed by interactive/OAuth login is not CI-ready for free.** Confirm a non-interactive credential
  path (and its cost) before scoping "automate this CLI in CI." (→ LEARNINGS.)
- **Automating root-repo tooling from app-repo CI has an irreducible cross-repo cost** (a PAT or vendoring) —
  worth weighing against the payoff for a nice-to-have.

## Gaps / follow-ups
- **Pre-existing:** `build-order-guard` was red on `main` (stale `BUILD-ORDER.md` from sibling scaffolding);
  regenerated as part of this close.
- **Follow-up flagged (`task_c26bff67`):** root CI runs no workflow for `scripts/lib/*.test.mjs`, so the CLI
  `node:test` gate (now covering `decideTrivialSkip`) is local-only and can erode. A small workflow would fix it.
