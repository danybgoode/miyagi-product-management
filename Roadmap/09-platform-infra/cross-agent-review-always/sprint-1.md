# Sprint 1 — CI auto-run (the skateboard)

**Epic:** [Cross-agent review on every PR](README.md) · **Risk:** all LOW · **Repo:** app repos' `.github/workflows/`
**Goal:** every PR automatically gets the existing advisory cross-review comment, non-blocking, with auth
validated first and trivial diffs skipped.

> **S1.1 gates S1.2/S1.3.** Don't build the workflow until headless auth is confirmed. If it can't auth
> headlessly, stop and report — the epic falls back to Sprint 2 (policy "run cross-review locally on every PR").

## Stories

### S1.1 — Validate headless reviewer auth in CI · LOW *(load-bearing, do first)*
**As a** maintainer, **I want** to know whether `codex` (or `agy`) can authenticate non-interactively in a
GitHub runner, **so that** I build the CI auto-run on a real mechanism, not an assumption.
- Probe live: how does the `codex` CLI auth without `codex login` (API-key env var? config?). Confirm with
  `codex --help` / current docs — don't assume current flags (LEARNINGS: "drive a young foreign CLI").
- Try a minimal `codex exec` in a throwaway Actions job using the candidate credential as a repo secret.
- If codex can't, check whether `agy` can; if neither, **stop and report** — Sprint 2 still ships.
- **Acceptance:** a one-paragraph finding recorded here naming the chosen auth mechanism (or "not possible
  headlessly → policy-only"). **QA:** the throwaway Actions run is the proof.

### S1.2 — `cross-review.yml` non-blocking workflow · LOW
**As a** reviewer, **I want** a CI job that runs cross-review on every PR and posts the advisory comment,
**so that** the second opinion happens without anyone remembering to run it.
- New `cross-review.yml` on `pull_request` (`opened`, `synchronize`, `reopened` — or `opened` only, per the
  comment-noise open question). Checkout → setup-node 20 → install the reviewer CLI → `node
  scripts/cross-review.mjs ${{ github.event.pull_request.number }} --agent codex --repo <this repo>`.
- `continue-on-error: true`; **not** added to required checks. `permissions: { contents: read, pull-requests: write }`.
- Credential from a repo secret; if absent, log "cross-review skipped (no codex credential)" and exit 0
  (notify-telegram secret-skip idiom) — never red a PR.
- **Acceptance:** opening a PR auto-posts one "Cross-agent review" advisory comment; removing the secret makes
  the job skip cleanly and the PR is still mergeable; the job is never a required check.
- **QA:** Daniel opens a throwaway PR in each target repo and watches the comment appear (he holds the
  credential — **owed to Daniel**). The "secret absent → clean skip" path is checkable by temporarily unsetting it.

### S1.3 — Cost guard (skip trivial diffs) · LOW
**As a** maintainer, **I want** trivial PRs to skip the run, **so that** "every PR" doesn't mean paying for a
review on a typo fix.
- Skip when the diff is docs-only or under a small changed-line threshold (decide N at build); log the reason.
- **Acceptance:** a docs-only / tiny PR shows a logged skip and posts no review comment; a real code PR runs.
- **QA:** a docs-only throwaway PR shows the skip (Daniel-checkable in the Actions log).

## Sprint QA
- No app code, no money/auth/DB/preview surface — no Playwright spec applies; the gate is the workflow's own
  run on a real PR. Any extracted pure logic (e.g. the trivial-diff predicate, if factored into a script) gets
  a `node:test` for free coverage (LEARNINGS: "infra's deterministic gate is a pure `node:test`").
- The credentialed end-to-end (a real comment posting in CI) is **owed to Daniel** — he provisions the secret.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: GitHub Actions on the target repo(s). *(Fill real PR URLs once the workflow is merged.)*

1. Provision the reviewer credential (from S1.1) as a repo secret in each target repo.
   → The secret exists; the workflow file is on `main`.
2. Open a throwaway PR with a small **code** change (e.g. a comment in a `.ts` file).
   → Within a few minutes a single comment titled "🔎 Cross-agent review (Codex)" appears, carrying the
     "Advisory only — not a gate" banner. The PR's required checks are unaffected and it's mergeable.
3. Open a throwaway **docs-only** PR (edit a `.md`).
   → The cross-review job logs a skip ("trivial/docs-only"); **no** review comment is posted.
4. Temporarily remove the secret and push to the code PR.
   → The job logs "skipped (no codex credential)" and exits green; the PR is still mergeable.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S1.1 — _scaffolded_
- [ ] S1.2 — _scaffolded_
- [ ] S1.3 — _scaffolded_
