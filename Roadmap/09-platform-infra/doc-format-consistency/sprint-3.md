# Roadmap doc-format consistency — Sprint 3: Wire the automatic hook + flip required

**Status:** ✅ shipped — hook wired + guard flipped required, 2026-07-15.

Scope note: originally sequenced to start only after Sprint 2's sweep was fully clean across every
macro-section. Daniel descoped that mid-Sprint-2 — the historical backlog doesn't need to be 100%
swept; going forward, drift gets caught automatically as docs are touched. Sprint 2 closed with just
the `09-platform-infra` pilot section (165 files) enforced; this sprint proceeded on that basis.

## Stories

### Story 3.1 — `PostToolUse` hook + flip `doc-format-guard.yml` to required
**As** anyone editing a Roadmap doc (human or agent), **I want** drift flagged the moment I introduce
it, **so that** the tree can't silently re-drift the way it did before this epic.
**Acceptance:**
- `.claude/settings.json` (checked in, not `.local.json` — this is permanent stack, not per-user)
  gets a `PostToolUse` hook matching `Write|Edit` on `Roadmap/**/*.md`, running
  `node scripts/doc-format.mjs --hook`. On drift: exit 2, findings on stderr (Claude Code surfaces
  this to the acting agent — visibility, not a silent auto-rewrite, per Daniel's own framing:
  "agent sees and fixes if anything"). Clean file: exit 0, silent.
- `doc-format-guard.yml`'s advisory framing is dropped (flipped to REQUIRED, matching
  `yaml-guard.yml`'s own precedent — a comment-only flip since this repo tier has no real GitHub
  branch-protection API access). Safe regardless of full-tree sweep status: `--check` only ever fails
  for `ENFORCED_SWEPT_PATHS` paths, and those are clean.
**Risk:** Low
**Status:** ✅ shipped

## Sprint QA
- **api spec(s):** N/A.
- **browser smoke owed:** no.
- **deterministic gate:** hand-tested the hook live in-session (real `Write`/`Edit` tool calls, not just simulated stdin) — see walkthrough below; `node scripts/doc-format.mjs --check` exits 0.

## Sprint 3 — Smoke walkthrough (do these in order)
1. Edit any `Roadmap/**/*.md` file to introduce a deliberate drift (e.g. change a DoD heading's
   wording), save.
   → The hook fires; the acting agent sees the specific violation on the next tool-use turn.
   **Verified 2026-07-15:** edited this very file's Status line to a legacy blockquote form — the
   hook fired with `[sprint-status-blockquote] Status line is a blockquote...`, surfaced as a
   `PostToolUse:Edit hook blocking error` on the very next turn.
2. Fix the drift, save again.
   → Silent — no hook output.
   **Verified:** rewrote to a plain `**Status:** ...` line — no hook output on the following turn.
3. Confirm `doc-format-guard.yml` reads REQUIRED (comment-flip, not real branch protection — this
   repo tier returns 403 on the branch-protection API, same constraint every prior guard here hit).
   → Confirmed.

If any step fails, note the step number + what you saw — that's the bug report.
