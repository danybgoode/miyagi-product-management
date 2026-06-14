# Dev-tooling reliability — Sprint 2: Codex endurance (auto-fallback + clear message)

**Status:** 📋 scaffolded — not started.

> Lands in the **monorepo-root** repo (`scripts/lib/cross-agent-cli.mjs`, `scripts/cross-review.mjs`, docs).
> Dev tooling, not app code — no `apps/*`, commerce, money, auth, DB, i18n, Vercel, or Cloud Run. QA = a
> pure `node:test` on the new logic + a real run with a (simulated) dead Codex token. All stories LOW.
> Applies the LEARNINGS rule: drive a young foreign CLI by **degrading, never assuming**.

## Stories

### Story 2.1 — Codex→Antigravity auto-fallback in the shared rail
**As a** developer running a cross-agent review, **I want** the command to fall back to Antigravity when
the Codex token is dead, **so that** I still get a second opinion instead of an error.
**Acceptance:**
- In `scripts/lib/cross-agent-cli.mjs`: when `--agent codex` and `codex` is missing **or** `runCodex`
  fails on an **auth/token** error (use the existing `soft` mode), the rail retries once with
  `runAntigravity` and returns a `{ fellBack: true, from: 'codex', to: 'antigravity' }`-shaped signal.
- The fallback triggers on the **auth signal specifically**, not on every error (a genuine agy-absent or
  empty-diff case still fails clearly — open question 3 confirms the real Codex failure string).
- If **both** Codex and Antigravity are unavailable, it fails with a clear one-line message naming both fixes.
**Risk:** low

### Story 2.2 — Label + message the fallback
**As a** reviewer reading the PR, **I want** the comment and terminal to make the fallback obvious,
**so that** nobody mistakes an Antigravity review for a Codex one, and I know how to restore Codex.
**Acceptance:**
- The advisory PR comment header notes the fallback, e.g. `🔎 Cross-agent review (Antigravity — Codex
  unavailable)`, keeping the existing "advisory only — not a gate" banner.
- stderr prints why it fell back and how to restore Codex (`codex login`), in one or two plain lines.
- `--dry-run` shows the labeled body without posting.
**Risk:** low

### Story 2.3 — Re-auth runbook
**As a** future agent or Daniel, **I want** a short documented procedure for a lapsed Codex token,
**so that** restoring it doesn't require rediscovery.
**Acceptance:**
- One short paragraph (in `scripts/cross-review.prompt.md`'s sibling docs or `SESSION-KICKOFFS.md`):
  how to detect a dead token (`codex exec "ping" </dev/null` → auth error) and fix it (`codex login`),
  plus the note that the command auto-falls back to Antigravity meanwhile.
- A fresh agent can restore Codex from the doc alone.
**Risk:** low

## Sprint QA
- **deterministic gate:** a pure `node:test` on the fallback-decision function — mock `runCodex`/
  `runAntigravity` (no network): asserts (a) auth-error → falls back, (b) non-auth error → does not,
  (c) both-dead → clear failure, (d) the comment body is labeled. Free coverage, per LEARNINGS.
- **api spec(s):** none — not app code.
- **browser smoke owed:** no.
- **dependency check:** `gh` authed; `agy 1.0.7` present for the live fallback path; confirm the exact
  Codex auth-failure string (open question 3) so the trigger matches reality.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: local dev machine + GitHub. Pick any recent PR number `<PR#>`.

1. With Codex **authed**, run `node scripts/cross-review.mjs <PR#> --agent codex --dry-run`.
   → Codex findings print; no fallback message.
2. Simulate a dead token (e.g. log out of Codex, or point it at a bad config), run the same command.
   → It prints a "Codex unavailable → falling back to Antigravity" line and produces Antigravity findings.
3. Run step 2 without `--dry-run`.
   → The posted comment is headed `🔎 Cross-agent review (Antigravity — Codex unavailable)` with the advisory banner.
4. Make **both** Codex and `agy` unavailable, run the command.
   → It exits with a clear one-line message naming how to fix each — no stack trace.
5. Open the re-auth runbook doc.
   → It tells you exactly how to detect and restore a dead Codex token.

If any step fails, note the step number + what you saw — that's the bug report.
