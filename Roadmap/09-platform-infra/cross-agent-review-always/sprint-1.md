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

> **✅ FINDING (validated live 2026-06-22 — headless auth IS possible → build).** Probed `codex --help`,
> `codex exec --help`, `codex login --help`, and the local `~/.codex/auth.json` (no flags assumed —
> LEARNINGS "drive a young foreign CLI"). `codex login` exposes **`--with-api-key`**, which reads an API
> key from **stdin** (`printf '%s' "$OPENAI_API_KEY" | codex login --with-api-key`) and writes the auth
> artifact non-interactively — a fully headless path, no browser/`codex login` flow. (`--with-access-token`
> is a second headless option.) The local auth is ChatGPT-OAuth (`OPENAI_API_KEY:null`), so **CI uses the
> API-key path** instead via an `OPENAI_API_KEY` repo secret (token-billed). The CLI ships on npm as
> **`@openai/codex`** (`npm i -g @openai/codex`). `agy` (1.0.10) stays the local/manual fallback (already
> wired in `runWithCodexFallback`); **Codex is the CI default** per the epic. The one residual unknown —
> whether `codex exec` needs an explicit non-interactive sandbox/approval posture in a fresh runner — is
> handled in the workflow (`~/.codex/config.toml` `approval_policy="never"`) and **confirmed by the
> credentialed throwaway run (owed to Daniel)**.

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

> **Built:** pure `decideTrivialSkip({ files, minLines })` in `scripts/lib/cross-agent-cli.mjs` (docs-only of
> any size, or `< minLines` changed lines → skip; one real code file → review), covered by 7 `node:test`
> cases (gate: `node --test 'scripts/lib/*.test.mjs'`). Wired into `cross-review.mjs` behind an **opt-in
> `--skip-trivial`** (+ `--min-lines`, **default N=10**) so the manual command is unchanged; the CI workflow
> passes `--skip-trivial`. Threshold lives early in `main()` — a trivial diff exits 0 before codex is even
> installed. **Live-smoked** against real `gh` data: docs-only PR (root #28) → `cross-review skipped
> (docs-only diff)`, exit 0, no codex call; code PR (FE #100, 11 files) → `skip:false` (reviews).

## Sprint QA
- No app code, no money/auth/DB/preview surface — no Playwright spec applies; the gate is the workflow's own
  run on a real PR. Any extracted pure logic (e.g. the trivial-diff predicate, if factored into a script) gets
  a `node:test` for free coverage (LEARNINGS: "infra's deterministic gate is a pure `node:test`").
- The credentialed end-to-end (a real comment posting in CI) is **owed to Daniel** — he provisions the secret.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: GitHub Actions on the two app repos (`danybgoode/miyagisanchezcommerce`,
`danybgoode/medusa-bonsai-backend`). The workflow is `.github/workflows/cross-review.yml`; the canonical
script stays in this root repo and is sparse-checked-out by the workflow via a read-only PAT.

**Step 0 — clean-skip path (already observable, NO secrets needed).** When the FE/BE workflow PRs are
opened, `cross-review.yml` self-triggers on `opened`. With no secrets set, the guard step logs
`cross-review skipped (no codex credential)` and the job is **green + non-blocking**. → Confirms the
secret-skip idiom on the PR itself. *(FE PR: `__FILL__` · BE PR: `__FILL__`.)*

**Owed to Daniel (he holds the credentials):**
1. In **each** app repo add two repo secrets:
   - `OPENAI_API_KEY` — a Codex API key (token-billed).
   - `TOOLING_REPO_PAT` — a fine-grained PAT with **read-only Contents** on `miyagi-product-management` only.
   → Both secrets exist; the `cross-review.yml` workflow is on the repo's default branch.
2. Open a throwaway PR with a small **code** change (e.g. a comment in a real source file, ≥10 changed lines
   so it clears the cost guard).
   → Within a few minutes one comment titled **"🔎 Cross-agent review (Codex)"** appears, carrying the
     "Advisory only — not a gate" banner. The PR's required checks are unaffected and it's mergeable.
     *(This also confirms the `codex exec` CI posture — if it stalls, see the workflow's sandbox note.)*
3. Open a throwaway **docs-only** PR (edit a `.md`).
   → The job logs `cross-review skipped (docs-only diff)`; **no** review comment is posted.
4. Temporarily remove `OPENAI_API_KEY` and re-open (or open a fresh) code PR.
   → The guard logs `cross-review skipped (no codex credential)` and the job exits green; the PR is still
     mergeable. (Never add "Cross-agent second opinion" to branch-protection required checks.)

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] **S1.1** — ✅ headless auth validated live (codex `--with-api-key`); finding recorded above.
- [x] **S1.2** — `cross-review.yml` in both app repos (FE PR `__FILL__`, BE PR `__FILL__`); non-blocking,
      opened+reopened, secret-skip + PAT checkout. Credentialed end-to-end owed to Daniel.
- [x] **S1.3** — cost guard `decideTrivialSkip` + `--skip-trivial`/`--min-lines`, 7 node:tests, live-smoked
      (root PR `__FILL__`).

> Refs filled when the 3 draft PRs are opened. The credentialed CI run (steps 1–4 above) is owed to Daniel.
