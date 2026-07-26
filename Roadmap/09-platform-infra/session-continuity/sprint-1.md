# Session continuity — Sprint 1: derive the state, journal the intent

**Status:** ⬜ not started

## Build contract (locked by the architect before the builder started)

Cite `README.md` D1–D5.

- **`scripts/lib/log-branch.mjs` is the persistence answer — reuse it unchanged.** It already appends
  to a dedicated `claude/`-prefixed branch via `git mktree` without touching the working tree. Do not
  write files into the repo tree, do not commit to `main`, do not invent a second convention. Note its
  tree is **single-level**, so the journal path is a flat filename.
- **`scripts/lib/gh-rest.mjs` is REST-only on purpose** — `gh pr list --json` hits GraphQL internally,
  which is blocked in at least one live routine sandbox (confirmed 2026-07-02). Do not "simplify" it
  back to `gh pr list --json`.
- **The Supabase read (D5) is read-only.** Use the MCP `execute_sql` path or an equivalent read; never
  `apply_migration`, never `db push`, never a write. This script reports drift — a human or the
  orchestrator applies.
- **`node:test` only, zero new npm dependencies.** Keep the derive/format seam pure so the report
  shape is unit-tested without `gh` or a database.

## Stories

### Story 1.1 — `scripts/session-note.mjs`: the intent journal ⬜
**As an** orchestrating agent, **I want** to record a decision in one cheap call, **so that** my
intent survives a session that ends without warning.
**Acceptance:**
- `node scripts/session-note.mjs --kind decision "…" [--refs PR#312,D4]` appends one JSON line to
  `claude/session-journal` via `log-branch.mjs`.
- Kinds: `decision | doing | next | blocked | declined`. **Append-only — no update, no delete, no
  status field** (D2).
- `--session <label>` groups a run; defaults to a stable per-day label.
- Fails **soft**: a failed append prints a warning and exits 0. Losing a journal line must never break
  the work the agent was actually doing.
- Pure line-builder unit-tested separately from the I/O.

### Story 1.2 — `scripts/session-resume.mjs`: derive live, lead with the surprising ⬜
**As the** next agent, **I want** one command that tells me the true state, **so that** I never trust
stale memory or a stale doc.
**Acceptance:**
- Derives, across all 3 repos: current branch; ahead/behind `main`; uncommitted/untracked files;
  `git worktree list` and each worktree's dirty state; open PRs with CI rollup, review state and
  mergeability; recently merged PRs.
- Derives migration drift (D5): repo migration files vs live `schema_migrations`, both directions
  (a file never applied **and** an applied version with no file).
- **Anomalies first (D3).** Explicitly flags: a non-`main` branch with no open PR *(this is the
  `apps/backend` / `feat/order-payment-capture-state` case that motivated the epic — it must appear)*;
  a dirty tree; an open PR red or conflicted; any migration drift.
- Then the last N journal lines, then the full derived state.
- **Degrades, never dies (D4):** unauthenticated `gh`, unreachable repo, missing journal, or
  unavailable DB each yield a partial brief naming the gap. Proven by a test per degradation path.
- `--json` for machine consumption; default is human-readable.

### Story 1.3 — wire it into how sessions actually start ⬜
**As the** team, **I want** resume to be the default opening move, **so that** continuity doesn't
depend on remembering.
**Acceptance:**
- `SESSION-KICKOFFS.md` opens with the resume step, before every numbered kickoff.
- `WAYS-OF-WORKING.md` (*Epic-mode builds*, near the compaction note) records the habit: **journal a
  line at each locked decision and each sprint/PR boundary; resume by deriving, never by remembering.**
- The existing subagent-resume rule (message the same agent id) is cross-referenced, not duplicated —
  it solves the *other* half and both should be findable from one place.
- Documents the one thing the tool cannot recover: **an in-flight decision never journalled.** That is
  the honest boundary, and stating it is what makes agents write the line.

## Definition of Done (sprint)
- [ ] `node --test scripts/` green; every new spec observed red once.
- [ ] Real `session-resume.mjs` output pasted in the PR, including the stray-branch anomaly.
- [ ] Degradation proven live (unauthenticated `gh`, empty journal).
- [ ] Cross-agent review run; findings resolved.
