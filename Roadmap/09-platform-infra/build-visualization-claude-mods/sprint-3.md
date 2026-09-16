# The build view — Sprint 3: `build-state.mjs` — one resolver

**Status:** ⬜ not started

**Epic:** [The build view](README.md) · **Risk: LOW**

**The sprint that makes Sprint 4 thin, and that pays even if Sprint 4 never ships.** `build-state.mjs`
is plain Node, testable, and immediately useful to `standup`, the Notion projection and `epic-dod` —
so the epic's value does not depend on a pre-release hook API (**D3**).

## Stories

### Story 3.1 — `build-state.mjs --json`
**As** any tool, **I want** one resolver that answers "what is being built right now",
**so that** nothing else ever parses markdown to find out.
**Acceptance:** `node scripts/build-state.mjs --json` on a checked-out feature branch returns the
epic (title, area, risk), the story (`id`, `as_a`, `i_want`, `so_that`), `Story X of Y`,
`Sprint N of M`, and one of the six statuses. It reads **frontmatter + git + `gh`** and nothing else.
**It reads existing artefacts only — it never becomes a second source of truth.** Off a feature
branch, it says so cleanly rather than guessing.
**Risk:** low

### Story 3.2 — Story-in-flight derivation
**As** the resolver, **I want** an honest answer to "which story is in flight",
**so that** the build view doesn't report confidently while being wrong.
**Acceptance:** per **D2**, derived from the last commit's `S<n>.<m>` prefix, **falling back to the
`session-note.mjs` intent journal** when the commit convention doesn't resolve — which is already the
doctrine (*journal intent, derive the rest*). When neither resolves, it returns `unknown` and says so.
**`unknown` is a correct answer; a confident wrong one is not.**
**Risk:** low

## Sprint QA
- **api spec(s):** `build-state.test.mjs` with fixtures for: a clean feature branch mid-sprint · a
  branch with no matching epic · a detached HEAD · an epic whose commit convention doesn't resolve
  (must return `unknown`, not a guess) · every one of the six statuses.
- **browser smoke owed:** no.
- **deterministic gate:** `node --test 'scripts/*.test.mjs'` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: local · `medusa-bonsai`, on a real feature branch mid-epic

1. Check out a feature branch with commits and run `node scripts/build-state.mjs --json`.
   → Correct epic title, area and risk; the right story with its full `as_a`/`i_want`/`so_that`;
     `Story X of Y`; `Sprint N of M`; one of the six statuses.
2. Compare every field against the sprint doc by eye.
   → They agree. **Nothing is invented.**
3. Commit a story and re-run.
   → `Story X of Y` advances by one.
4. Open a PR and re-run.
   → Status becomes `In review`.
5. Check out `main` and re-run.
   → It reports cleanly that no epic is in flight. It does not guess.
6. Check out a branch whose commits don't carry an `S<n>.<m>` prefix and have no journal entry.
   → Story is `unknown` — **not a wrong story.**
7. Add a `session-note.mjs` entry naming the story and re-run.
   → The fallback resolves it.
8. Time the command.
   → Fast enough to be called once per turn from a cache.

If any step fails, note the step number + what you saw — that's the bug report.

**Step 6 is the one that protects trust.** The moment the build view shows a wrong story, people stop
reading it.
