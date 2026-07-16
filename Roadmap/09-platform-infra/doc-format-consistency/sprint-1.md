# Roadmap doc-format consistency — Sprint 1: Define + build the checker (advisory, zero doc edits)

**Status:** ⬜ not started

## Stories

### Story 1.1 — `scripts/doc-format.mjs` + the WAYS-OF-WORKING conventions section
**As** an agent working on any Roadmap doc, **I want** a written, checkable spec for epic-README /
sprint / retrospective format, **so that** "correct shape" isn't tribal knowledge and a script can
verify it.
**Acceptance:**
- `Roadmap/WAYS-OF-WORKING.md` gets a new `## Doc conventions (Roadmap tree)` subsection stating the
  canonical rules (header field set, section names/order, sprint Status-line format, retro header +
  4-section shape) and pointing at the `groom` plugin templates as the SSOT.
- `scripts/doc-format.mjs` — pure node, zero npm deps, mirrors `build-order.mjs`'s shape exactly:
  - `node scripts/doc-format.mjs` — full-tree report, findings grouped by doc type + macro-section.
  - `node scripts/doc-format.mjs --check` — CI mode, exits non-zero only for paths in
    `ENFORCED_SWEPT_PATHS` (empty at this sprint's end — the report is 100% advisory until Sprint 2
    starts populating it).
  - `node scripts/doc-format.mjs --hook` — single-file mode, reads a file path from stdin JSON
    (`tool_input.file_path`), checks just that file, exit 2 with findings on stderr if it drifts.
  - `--fix` deferred to Sprint 2 (the mechanical rewriter is only useful once there's something to
    sweep).
- Rules checked: epic-README frontmatter (`status`/`slug` keys, valid `status` enum — read-only,
  never rewritten, per the existing Notion `Lifecycle ?? Status` fallback in `roadmap-to-notion.mjs`);
  header blockquote field set/order/wording; DoD heading wording; sprint `**Status:**` line format;
  retrospective header style (`_Closed: YYYY-MM-DD_`) + the 4-section set.
- `scripts/doc-format.test.mjs` (`node:test`) — picked up automatically by the existing
  `scripts-guard.yml` glob, no new CI wiring needed for the unit tests themselves.
**Risk:** Low

### Story 1.2 — `doc-format-guard.yml`, advisory
**As the** team, **I want** the checker running in CI on every `Roadmap/**` change, **so that** the
drift-report stays current without anyone remembering to run it by hand.
**Acceptance:**
- New dedicated `.github/workflows/doc-format-guard.yml` (not folded into `build-order-guard.yml` —
  one guard, one concern, matching the `scripts-guard`/`infra-guard`/`yaml-guard` split).
- Triggers on `push`(main)/`pull_request` with `paths: ['Roadmap/**', 'scripts/doc-format.mjs', '.github/workflows/doc-format-guard.yml']`.
- Runs `node scripts/doc-format.mjs --check` — passes trivially this sprint (empty
  `ENFORCED_SWEPT_PATHS`), proving the workflow plumbing works before Sprint 2 puts real teeth in it.
**Risk:** Low

## Sprint QA
- **api spec(s):** N/A — root repo, no Playwright/app-CI surface. `scripts/doc-format.test.mjs`
  (`node:test`) is this sprint's deterministic gate, riding the existing `scripts-guard.yml` glob.
- **browser smoke owed:** no — pure docs/tooling, no rendered UI.
- **deterministic gate:** `node --test 'scripts/doc-format.test.mjs'` green + `node scripts/doc-format.mjs --check` exits 0 (trivially, empty allow-list) + `doc-format-guard.yml` passes on its own PR.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: this repo, local — no deployed surface to hit.

1. Run `node scripts/doc-format.mjs` (no flags) from the repo root.
   → Prints a full-tree drift report grouped by doc type — this is the real deliverable to eyeball:
     does it correctly flag the known drift examples from the epic's own research (e.g.
     `emoji-to-iconoir-sweep/README.md`'s `Scope doc → 2. readyforscope/` link as non-canonical)?
2. Run `node scripts/doc-format.mjs --check`.
   → Exits 0 (empty `ENFORCED_SWEPT_PATHS` this sprint — nothing hard-gates yet).
3. Open the PR for this sprint on GitHub.
   → `doc-format-guard` shows as a check and passes.
4. Confirm `dobby-foundation` PR #1 status.
   → Flagged as owed to Daniel (a separate repo) — Sprint 2's sweep depends on it being merged so
     newly-scaffolded epics during the sweep don't immediately re-drift.

If any step fails, note the step number + what you saw — that's the bug report.
