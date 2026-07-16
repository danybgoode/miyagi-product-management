# Roadmap doc-format consistency — Sprint 2: The sweep

**Status:** ✅ shipped (descoped) — `09-platform-infra` pilot section swept + enforced, 2026-07-15. Full-tree sweep intentionally NOT pursued — see scope note below.

**Scope note (Daniel, 2026-07-15):** "we definitely don't need all docs fixed, its ok if going forward
this gets applied." The original acceptance (every macro-section, 00 → 10) is descoped to just the
pilot section already in flight. Sprint 3's hook is what makes "going forward" true — new drift gets
caught the moment a doc is touched, so a fully-swept historical tree is no longer a precondition for
anything. The remaining macro-sections stay visible-but-advisory in `doc-format.mjs`'s report
indefinitely, swept opportunistically (e.g. whenever an epic in that section is touched anyway) rather
than as a dedicated pass.

## Stories

### Story 2.1 — Sweep active epics to canonical shape, per macro-section
**As** a reader of any Roadmap doc, **I want** every active epic's README/sprint/retro files in the
canonical shape, **so that** the docs are actually easy to scan and the checker's report goes to zero.
**Acceptance (as descoped):**
- Piloted on ONE macro-section (`09-platform-infra`, 41 epics) as a verified proof of the approach:
  `doc-format.mjs --fix` for the mechanical rewrites (DoD heading wording, retro `_Closed:_` italic,
  sprint `**Status:**` line); hand-fixed the header blockquote where fields were missing/wrong
  (reconstructing `Area`/`Risk`/`Class`/`Scope seed` from each epic's own content); added 165 clean
  paths to `ENFORCED_SWEPT_PATHS`; `--check` green; path-limited commits.
- Scope: `status: scaffolded | in-progress | shipped` epics only. `status: archived` epics
  (`neon-egress-and-db-isolation`) are frozen historical record — visible in the advisory report,
  never added to `ENFORCED_SWEPT_PATHS`. 6 `status: scaffolded`-but-never-started epics' RETROSPECTIVE
  scaffold placeholders (`build-order-ci-self-heal`, `dobby-foundation`, `hyper-performant-website`,
  `process-token-diet`, `reporthub-as-notion`, `ui-refresh-launch`) also deliberately left unswept —
  fabricating a real close date/body for an unshipped epic would violate "never fabricate content."
- Other macro-sections (00–08, 10): NOT swept. Remain fully advisory, no `ENFORCED_SWEPT_PATHS` entries.
**Risk:** Low

## Sprint QA
- **api spec(s):** N/A. `doc-format.mjs --check` exits 0 (165 enforced, clean) is this sprint's own regression proof.
- **browser smoke owed:** no.
- **deterministic gate:** `node scripts/doc-format.mjs --check` exits 0; `node --test scripts/doc-format.test.mjs` 38/38 pass.

## Sprint 2 — Smoke walkthrough (do these in order)
1. Run `node scripts/doc-format.mjs --check`.
   → Exits 0: `165 path(s) enforced, 241 advisory finding(s) elsewhere`.
2. Spot-check 3 swept docs by eye within `09-platform-infra`.
   → Header blockquote, DoD heading, and (for retros) the 4-section shape all match the canonical
     rules in `WAYS-OF-WORKING.md`.
3. Run `node scripts/doc-format.mjs` (full report, no flags).
   → `09-platform-infra` no longer appears among the findings except the 7 deliberately-excluded files
     noted above.

If any step fails, note the step number + what you saw — that's the bug report.
