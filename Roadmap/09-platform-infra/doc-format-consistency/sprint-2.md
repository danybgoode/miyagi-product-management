# Roadmap doc-format consistency — Sprint 2: The sweep

**Status:** ⬜ not started — blocked on Sprint 1's checker + on [`dobby-foundation` PR #1](https://github.com/danybgoode/dobby-foundation/pull/1) merging (so new epics scaffolded mid-sweep don't re-drift)

## Stories

### Story 2.1 — Sweep active epics to canonical shape, per macro-section
**As** a reader of any Roadmap doc, **I want** every active epic's README/sprint/retro files in the
canonical shape, **so that** the docs are actually easy to scan and the checker's report goes to zero.
**Acceptance:**
- Per macro-section (00 → 10), one batch: run `doc-format.mjs --fix` for the mechanical rewrites
  (frontmatter annotation, DoD heading wording, retro `_Closed:_` italic, sprint `**Status:**` line);
  hand-fix the header blockquote where fields are missing/wrong (reconstructing `Area`/`Risk`/
  `Scope seed` from the epic's own seed where needed — not pure find-replace); add the section to
  `ENFORCED_SWEPT_PATHS`; re-run `--check` green; path-limited commit for just that section's files.
- Scope: `status: scaffolded | in-progress | shipped` epics only. `status: archived` epics are frozen
  historical record — visible in the advisory report, never added to `ENFORCED_SWEPT_PATHS`.
- Known judgment cases (not mechanical): `agent-connection/README.md`'s entirely different section
  set, `bulk-import-migration/RETROSPECTIVE.md`'s 3 non-standard extra sections — decide restructure
  vs. leave-as-shipped-historical case by case, note the call in the commit message.
**Risk:** Low

## Sprint QA
- **api spec(s):** N/A. `doc-format.mjs --check` going green per swept macro-section is this sprint's
  own regression proof.
- **browser smoke owed:** no.
- **deterministic gate:** `node scripts/doc-format.mjs --check` exits 0 with the full `ENFORCED_SWEPT_PATHS` set after the last batch; `doc-format-guard.yml` green.

## Sprint 2 — Smoke walkthrough (do these in order)
1. After the last macro-section batch, run `node scripts/doc-format.mjs`.
   → Report shows zero findings for every active (non-archived) epic.
2. Spot-check 3 swept docs by eye across different macro-sections.
   → Header blockquote, DoD heading, and (for retros) the 4-section shape all match the canonical
     rules in `WAYS-OF-WORKING.md`.

If any step fails, note the step number + what you saw — that's the bug report.
