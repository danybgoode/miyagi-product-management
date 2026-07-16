# Roadmap doc-format consistency — Sprint 3: Wire the automatic hook + flip required

**Status:** ⬜ not started — blocked on Sprint 2 (sweep must be clean before the hook is pleasant to live with)

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
- `doc-format-guard.yml`'s advisory framing (see its own header comment, matching `yaml-guard.yml`'s
  precedent) is dropped once Sprint 2's sweep is fully merged and one CI cycle on `main` is clean.
**Risk:** Low

## Sprint QA
- **api spec(s):** N/A.
- **browser smoke owed:** no.
- **deterministic gate:** hand-test the hook locally (edit a Roadmap doc to introduce a known drift, confirm the hook fires with a useful message; revert); `doc-format-guard.yml` green as a required check on `main`.

## Sprint 3 — Smoke walkthrough (do these in order)
1. Edit any `Roadmap/**/*.md` file to introduce a deliberate drift (e.g. change a DoD heading's
   wording), save.
   → The hook fires; the acting agent sees the specific violation on the next tool-use turn.
2. Fix the drift, save again.
   → Silent — no hook output.
3. Check the repo's branch-protection required-checks list for `main`.
   → `doc-format-guard` is now required, matching `yaml-guard`'s own flip precedent.

If any step fails, note the step number + what you saw — that's the bug report.
