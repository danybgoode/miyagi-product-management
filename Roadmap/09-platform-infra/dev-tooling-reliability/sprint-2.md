# Dev-tooling reliability — Sprint 2: Codex endurance (auto-fallback + clear message)

**Status:** ✅ **BUILT** — branch `chore/dev-tooling-reliability` (monorepo-root). S2.1 `01ca80b` · S2.2
`1ba8b02` · S2.3 `0f74b6a`. Pure `node:test` 8/8 green; the codex→antigravity fallback **verified live**
against the currently-revoked Codex token (dry-run + both-dead paths). Draft PR open. Codex-authed happy
path (header reads `(Codex)`) is owed to Daniel — needs `codex login`.

> Lands in the **monorepo-root** repo (`scripts/lib/cross-agent-cli.mjs`, `scripts/cross-review.mjs`, docs).
> Dev tooling, not app code — no `apps/*`, commerce, money, auth, DB, i18n, Vercel, or Cloud Run. QA = a
> pure `node:test` on the new logic + a real run with a (simulated) dead Codex token. All stories LOW.
> Applies the LEARNINGS rule: drive a young foreign CLI by **degrading, never assuming**.

## Resolved decisions

- **Open question 3 — the real Codex auth-failure shape (confirmed live, 2026-06-21).** Ran
  `codex exec "ping" </dev/null` against the actual revoked token: **stdout empty, exit code 1**, and the
  auth signal lands on **stderr** — `Failed to refresh token: 401 Unauthorized … refresh_token_invalidated`,
  `Your session has ended. Please log in again.`, `your refresh token was revoked. Please log out and sign
  in again.` So the fallback trigger is **exit≠0 AND stderr matches an auth pattern**
  (`isCodexAuthError`), *not* every non-zero exit — an empty diff or a non-auth break still fails clearly.
- **Trigger on the AUTH signal only (Daniel's directive).** A missing `codex` binary is left as the existing
  clear "install + `codex login`" failure (`ensureCmd`), **not** a fallback case — only a lapsed token falls
  back. Keeps the trigger narrow and predictable.
- **No fork — the fallback lives in the shared rail.** `runWithCodexFallback` + the pure
  `decideCodexFallback` sit in `scripts/lib/cross-agent-cli.mjs`; `cross-review.mjs` consumes it.
  `cross-panel.mjs` is **deliberately not wired this sprint** (its multi-lens + soft-synthesis flow is out of
  these stories) but inherits the rail functions for a later, free adoption.

## Stories

### Story 2.1 — Codex→Antigravity auto-fallback in the shared rail ✅ `01ca80b`
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

### Story 2.2 — Label + message the fallback ✅ `1ba8b02`
**As a** reviewer reading the PR, **I want** the comment and terminal to make the fallback obvious,
**so that** nobody mistakes an Antigravity review for a Codex one, and I know how to restore Codex.
**Acceptance:**
- The advisory PR comment header notes the fallback, e.g. `🔎 Cross-agent review (Antigravity — Codex
  unavailable)`, keeping the existing "advisory only — not a gate" banner.
- stderr prints why it fell back and how to restore Codex (`codex login`), in one or two plain lines.
- `--dry-run` shows the labeled body without posting.
**Risk:** low

### Story 2.3 — Re-auth runbook ✅ `0f74b6a`
**As a** future agent or Daniel, **I want** a short documented procedure for a lapsed Codex token,
**so that** restoring it doesn't require rediscovery.
**Acceptance:**
- One short paragraph (in `scripts/cross-review.prompt.md`'s sibling docs or `SESSION-KICKOFFS.md`):
  how to detect a dead token (`codex exec "ping" </dev/null` → auth error) and fix it (`codex login`),
  plus the note that the command auto-falls back to Antigravity meanwhile.
- A fresh agent can restore Codex from the doc alone.
**Risk:** low

## Sprint QA
- **deterministic gate:** ✅ pure `node:test` — `scripts/lib/cross-agent-cli.test.mjs`, **8/8 green**.
  Mocks both runners (no network): `isCodexAuthError` (real revoked stderr → true; empty-diff/agy-absent/
  generic → false), `decideCodexFallback` (exhaustive truth table), and `runWithCodexFallback` —
  (a) auth-error+agy → falls back (agy called once, `{fellBack:true,from:'codex',to:'antigravity'}`),
  (b) non-auth → does **not** (agy untouched, fails), (c) both-dead → clear failure naming both fixes,
  (d) healthy → uses codex. Run: `node --test scripts/lib/cross-agent-cli.test.mjs`.
  *(Note: `node --test scripts/lib/` with a trailing-slash dir is broken on this Node 24 — affects the
  existing infra test too; use the explicit file path or `node --test 'scripts/lib/*.test.mjs'`.)*
- **api spec(s):** none — not app code.
- **browser smoke owed:** no.
- **dependency check:** ✅ `gh` authed; `agy 1.0.7` present + authed (live fallback produced findings);
  Codex auth-failure string confirmed against the live revoked token (OQ3 — see *Resolved decisions*).
- **live fallback verified (token currently revoked):** dry-run vs PR #15 fell back to Antigravity with the
  labeled header + stderr restore hint; the codex-present/agy-absent path exits 1 with the both-fixes line.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: local dev machine + GitHub. Uses real PR `#15` (any recent PR with a diff works). Steps 1 & 5 below
are **owed to Daniel** — they need a live `codex login` (the token is revoked at build time, which is
exactly why steps 2–4 already pass). Steps 2–4 were run and verified during the build.

1. **[owed — needs `codex login`]** With Codex **authed**, run
   `node scripts/cross-review.mjs 15 --agent codex --dry-run`.
   → Codex findings print under a `### 🔎 Cross-agent review (Codex)` header; **no** fallback line on stderr.
2. With the Codex token **dead** (current state), run the same command.
   → stderr prints `⚠ Codex unavailable (token revoked) → falling back to Antigravity. Restore: codex login.`
     and Antigravity findings print. *(Verified: exit 0.)*
3. Run step 2 **without** `--dry-run` (posts a comment).
   → The posted comment is headed `### 🔎 Cross-agent review (Antigravity — Codex unavailable)` with the
     unchanged advisory banner.
4. Make `agy` unavailable too (codex still on PATH, token dead), run the command, e.g.:
   `TMP=$(mktemp -d); ln -s "$(command -v codex)" "$TMP/codex"; env PATH="$TMP:/opt/homebrew/bin:/usr/bin:/bin" node scripts/cross-review.mjs 15 --agent codex --dry-run`
   → Exits **1** with the single line
     `✗ Codex token revoked AND Antigravity unavailable — restore Codex with \`codex login\`, or install +
     authenticate the Antigravity CLI (agy).` — no stack trace. *(Verified.)*
5. **[restore]** Run `codex login`, then repeat step 1 → the header reads `(Codex)` again (the fallback is
   per-invocation, nothing to reset). The detect/restore procedure is in `scripts/README.md` →
   *"Restoring a lapsed Codex token"*.

If any step fails, note the step number + what you saw — that's the bug report.
