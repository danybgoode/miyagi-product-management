# Cross-agent code review — Sprint 1: Thin second-opinion command (Codex + Antigravity)

**Status:** ✅ shipped 2026-06-10 — PR [#7](https://github.com/danybgoode/miyagi-product-management/pull/7)
(S1.1 `1dab2c7` · S1.2 `3a3b83a` · S1.3 `db5fb57` · S1.4 `7b44538` · hardening `d091da7`). Smoke walkthrough
run green against PR #7 (Codex + Antigravity advisory comments posted). **Note:** Antigravity ships as
`agy 1.0.7`, which has **no `--output-format json`** flag (the AC below assumed one) — the command uses
`agy -p` text output, pins 1.0.7, and warns on a version mismatch. AC updated in Story 1.3 accordingly.

> Dev tooling, not app code: this sprint touches `scripts/` + `Roadmap/` docs only — **no** `apps/*`,
> commerce, money, auth, DB, i18n, Vercel, or Cloud Run. The app deterministic gate (tsc/build/Playwright)
> does not apply; QA is "run the command against a real recent PR and read the output." All stories LOW.

## Stories

### Story 1.1 — Skateboard: Codex review to stdout
**As a** developer reviewing a PR, **I want** `node scripts/cross-review.mjs <PR#> --agent codex` to pipe
the PR diff into Codex and print its findings to my terminal, **so that** I get a different-model second
opinion in one command before deciding anything.
**Acceptance:**
- `node scripts/cross-review.mjs <PR#> --agent codex` runs `gh pr diff <PR#>`, pipes it as context into
  `codex exec` with the shared reviewer prompt, and prints coherent structured findings to stdout.
- Run against a real recent PR, the output reads like a real review (correctness + the five AGENTS rules), not an error dump.
- Missing/unauthed `codex`, or a bad/missing PR number, fails with a clear one-line message (no stack trace).
**Risk:** low

### Story 1.2 — Advisory PR comment
**As a** developer, **I want** the findings posted as a PR comment clearly marked non-authoritative,
**so that** the second opinion is visible on the PR without anyone mistaking it for a gate.
**Acceptance:**
- The command posts via `gh pr comment <PR#>` a comment headed `🔎 Cross-agent review (Codex)` with a
  banner: **"Advisory only — not a gate, does not authorize merge. CI + the Claude reviewer + the
  risk-tier rule remain authoritative."**
- A `--dry-run` (or `--no-comment`) flag prints instead of posting, so it's safe to trial.
- Re-running updates/adds a comment without corrupting prior ones (append is fine).
**Risk:** low

### Story 1.3 — Antigravity behind the flag
**As a** developer, **I want** `--agent antigravity` to do the same via Antigravity's headless mode,
**so that** I can A/B which model's review I trust on the same diff.
**Acceptance:**
- `--agent antigravity` runs `agy -p "<shared prompt + diff>"` (text — `agy 1.0.7` has **no**
  `--output-format json`; the diff is embedded in the prompt, agy has no stdin block) and posts a
  comparable comment labeled `🔎 Cross-agent review (Antigravity)`.
- Unknown `--agent` value, or missing/unauthed `agy`, fails with a clear message naming the fix.
- `agy` version is checked/pinned; an unexpected version warns (flags are new and may shift).
**Risk:** low

### Story 1.4 — Docs wiring (docs-only)
**As a** future agent or Daniel, **I want** the cross-agent pass documented as a suggested-on-HIGH /
optional-on-any, advisory step, **so that** it's used consistently and never mistaken for a gate.
**Acceptance:**
- The shared reviewer prompt lives in one durable doc (e.g. `scripts/cross-review.prompt.md` or a
  `Roadmap/` doc) that both the command and a human reviewer reference — single source, no drift.
- `WAYS-OF-WORKING.md` §"Review & merge", `SESSION-KICKOFFS.md` #4, and the PR template each gain a short
  line: cross-agent review is **suggested on HIGH-risk, optional on any PR, advisory only**.
- A fresh agent reading the docs can run the command and knows it never gates/auto-merges.
**Risk:** low

## Sprint QA
- **api spec(s):** none — not app code, no Playwright surface. QA = run the command against a real recent
  PR (Story 1.1/1.2 acceptance) and read the posted comment.
- **browser smoke owed:** no.
- **deterministic gate:** N/A (no tsc/build/Playwright surface). Lightweight self-check: the script runs
  without throwing on `--dry-run`, and `--help` lists the flags.
- **dependency check:** confirm `gh`, `codex`, and `agy` are installed + authed on the run machine before
  trialing; the script must degrade with a clear message if not.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local dev machine + GitHub (this is a repo CLI; pick any **recent, already-merged or open** PR number, `<PR#>`).

1. Run `node scripts/cross-review.mjs <PR#> --agent codex --dry-run`
   → Codex's findings print to the terminal (correctness + AGENTS-rule notes); no comment is posted.
2. Run `node scripts/cross-review.mjs <PR#> --agent codex`
   → A comment headed `🔎 Cross-agent review (Codex)` appears on PR #`<PR#>` with the "advisory only — not a gate" banner.
3. Run `node scripts/cross-review.mjs <PR#> --agent antigravity`
   → A comparable `🔎 Cross-agent review (Antigravity)` comment appears.
4. Run `node scripts/cross-review.mjs <PR#> --agent bogus`
   → It exits with a clear message (e.g. "unknown --agent 'bogus'; use codex|antigravity"), no stack trace.
5. Open `Roadmap/WAYS-OF-WORKING.md` §"Review & merge"
   → It mentions the cross-agent pass as suggested-on-HIGH / optional-on-any / advisory-only.

If any step fails, note the step number + what you saw — that's the bug report.
