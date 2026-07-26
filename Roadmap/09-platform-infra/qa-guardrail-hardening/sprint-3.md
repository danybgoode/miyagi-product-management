# QA guardrail hardening — Sprint 3: the owed ledger, generated

**Status:** ⬜ not started

> 71 files carry a scattered `owed to Daniel` comment. The audit counted 75 two days before we counted
> 71. Turn a hand-countable proxy into a generated, categorised number.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D5.

- **Measured 2026-07-26: 76 occurrences across 71 files** in `apps/miyagisanchez/e2e/`. The audit
  said 80/75 on 2026-07-24. **That drift in two days is the entire argument for this story** — put it
  in the PR body.
- **Follow the `build-order.mjs` pattern**, which is proven twice here: a generator + a `--check` mode
  + a CI guard that fails on staleness + the self-heal path (`build-order-sync.mjs`). Do not invent a
  new shape.
- **Re-derive the population mechanically (`LEARNINGS.md → guard the population, not the door you
  found`).** Enumerate by rule across the whole spec tree; never hardcode a file list, and never trust
  a comment that claims coverage. This is the exact failure that shipped a consent hole.
- The categoriser will be imperfect. **An uncategorised marker must land in an explicit `other`
  bucket, never be silently dropped** — a ledger that quietly loses items is worse than the comments.
- Keep the parse/format seam **pure** so categorisation is unit-tested without touching the spec tree.

## Stories

### Story 3.1 — `scripts/owed-ledger.mjs` ⬜
**As a** product owner, **I want** one command that tells me how much manual QA debt is outstanding,
**so that** I have a real number instead of a spec-count proxy.
**Acceptance:**
- Scans the frontend spec tree for `owed to Daniel` markers, capturing file, line, spec name and the
  surrounding comment.
- Categorises into **auth-path / money-path / admin-only / other** by rule (path + spec name +
  comment text). Rules are data, unit-tested, and easy to extend.
- Emits a markdown report (counts per category, then the itemised list) and supports `--json`.
- `--check` exits non-zero when the committed report is stale — the `build-order.mjs` contract.
- **Nothing is dropped:** a test asserts total input markers == total categorised output.
- Pure parse/categorise functions unit-tested with `node:test`; no dependency on the real tree.

### Story 3.2 — commit the report, wire the count where it is read ⬜
**As a** product owner, **I want** the number where I already look, **so that** it stops being
something I have to ask for.
**Acceptance:**
- The generated report is committed at a stable path and regenerating it is idempotent.
- The count is exposed for the standup's evidence pack (`exec-prose-rail` D4) via `--json`.
- **`exec-prose-rail` must degrade cleanly when this is absent** — verify the contract from this side
  too, so neither epic hard-depends on the other's merge order.
- A `## Gotchas` section documents the categoriser's known imperfection and the `other` bucket.

## Definition of Done (sprint)
- [ ] `node --test scripts/` green; every new spec observed red once.
- [ ] Real report committed; count reproducible; the 76→71 drift noted in the PR.
- [ ] `--check` proven to fail on a stale report.
- [ ] Cross-agent review run; findings resolved.
