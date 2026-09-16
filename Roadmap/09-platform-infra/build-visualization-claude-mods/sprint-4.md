# The build view — Sprint 4: The Claude Mod

**Status:** ⬜ not started

**Epic:** [The build view](README.md) · **Risk: LOW**

**Independently droppable.** Function hooks are pre-release (enabled behind
`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`, with an API that can still move). If they haven't landed when
this sprint's boundary arrives, **Sprints 1–3 ship and this one waits** — the contract and the
resolver already pay on their own.

**The mod is a thin renderer (D3).** All logic lives in `build-state.mjs`. If the hook API changes,
one small file changes.

## Stories

### Story 4.1 — `hooks/hooks.json` + the renderer
**As the** product owner watching an agent work, **I want** the current epic, story and status in the
CLI, **so that** I can see what's happening without asking.
**Acceptance:** `plugins/ways-of-work/hooks/hooks.json` declares `./index.ts`; the module registers
`on('turn.start', …)` to refresh state via `$.store` and renders through `$.ui.status` in the shape
the epic README specifies — five lines, no box. **It calls `build-state.mjs`; it does not parse
markdown.** Styling is left to `$.ui.status` — a mod that draws its own frame is a mod that fights
the CLI.
**Risk:** low

### Story 4.2 — `claude plugin validate` in CI
**As the** maintainer, **I want** the mod validated offline on every PR,
**so that** a broken hook registration is caught before anyone installs it.
**Acceptance:** `claude plugin validate <plugin-dir>` runs in CI (it needs **no API key**) and lists
the registered hooks and their capabilities. A malformed `hooks.json` fails the build.
**Risk:** low

### Story 4.3 — The latency budget, measured
**As a** builder session, **I want** the mod to cost nothing perceptible,
**so that** a status line never slows the work it describes.
**Acceptance:** per **D4**, state is derived on `turn.start`, cached in `$.store`, and invalidated on
branch change or a `Roadmap/` write. **Never shells out to `gh` inside a hook.** Turn latency with
and without the mod is **measured and recorded in this file** — asserted numbers, not a claim.
**Risk:** low

## Sprint QA
- **api spec(s):** `claude plugin validate` in CI (the gate). A unit test asserts the renderer is a
  pure function of `build-state.mjs`'s output — given fixture JSON, it produces the exact five lines.
  A cache test asserts a second `turn.start` within the same branch does no filesystem or `gh` work.
- **browser smoke owed:** no — terminal only.
- **deterministic gate:** `node --test` + `claude plugin validate` green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: local · a Claude Code session in `medusa-bonsai`, on a feature branch mid-epic, with
`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`

1. Install the plugin and start a session on a feature branch.
   → The build view appears: Epic, Story with its user story, Progress, Status.
2. Compare each line against `node scripts/build-state.mjs --json`.
   → Identical. The mod invented nothing.
3. Commit a story and take another turn.
   → Progress advances **without being asked**.
4. Open a PR and take another turn.
   → Status becomes `In review`.
5. Take ten turns in a row without touching `Roadmap/` or the branch.
   → No repeated `gh` calls; the cache held.
6. Measure turn latency with the mod installed vs. removed.
   → **No measurable difference.** Record the numbers in this file.
7. Run `claude plugin validate plugins/ways-of-work`.
   → Passes, and lists the registered hooks.
8. Break `hooks.json` deliberately and re-run.
   → It fails clearly. *(Revert.)*
9. Remove the `hooks.json` entry entirely and start a session.
   → The mod is gone and **nothing else changed** — `doc-format`, `build-order`, `build-state` and
     every doc still work exactly as before.

If any step fails, note the step number + what you saw — that's the bug report.

**Steps 2 and 9 are the ones that matter.** A build view that disagrees with the docs becomes a
dashboard people stop trusting, and a mod that can't be cleanly uninstalled is a dependency rather
than a convenience.
