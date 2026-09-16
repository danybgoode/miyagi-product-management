# The build view — Sprint 2: Enforcement and backfill

**Status:** ⬜ not started

**Epic:** [The build view](README.md) · **Risk: LOW**

**A contract that isn't checked drifts.** `doc-format.mjs` exists precisely because hand-edited epic
READMEs drift away from the templates they were scaffolded from — the zero-drift `00-ideas/seeds/`
control group (one authoring path, 81 files, identical shape) is the proof. This sprint makes the new
contract enforced, then brings 80+ existing epics onto it.

## Stories

### Story 2.1 — `doc-format.mjs` enforces the contract
**As the** maintainer, **I want** the frontmatter contract checked in CI,
**so that** it holds for hand-edited docs, not just freshly scaffolded ones.
**Acceptance:** `doc-format.mjs --check` fails on an epic missing a required field, on an invalid
`status` value, and on a `sprint-N.md` with no frontmatter; it passes on a compliant epic. Runs in
`guards.yml`. Follows the established discipline: **green on today's known state, red on anything
new** — a permanently-red check is worse than no check.
**Risk:** low

### Story 2.2 — Backfill `medusa-bonsai` (~54 epics)
**As a** tool reading this repo, **I want** existing epics to carry the new frontmatter,
**so that** the build view works on real history rather than only on new work.
**Acceptance:** **scripted, then spot-checked** — never hand-edited across 54 epics. Per **D5**, the
backfill emits a **report listing every doc it could not resolve, with a reason** (prose status
disagreeing with frontmatter, sprints with no clean story boundaries, pre-template epics). Those are
**findings, recorded in this file** — fixing them all is outside the appetite and would be a
different epic.
**Risk:** low

### Story 2.3 — Backfill `golden-beans` (~28 epics)
**As a** tool reading the second consumer, **I want** the same,
**so that** the contract is a workspace property, not a medusa one.
**Acceptance:** same script, same report, same triage. `check-template-drift.mjs` stays green.
**Risk:** low

## Sprint QA
- **api spec(s):** `doc-format.test.mjs` extended with fixtures for each failure mode (missing field ·
  bad status value · sprint file with no frontmatter · compliant epic). A backfill test asserts the
  script is **idempotent** — running it twice changes nothing.
- **browser smoke owed:** no.
- **deterministic gate:** `node --test` + `doc-format.mjs --check` + `build-order.mjs --check` +
  `check-template-drift.mjs` (golden-beans) green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: local · `medusa-bonsai` and `golden-beans`

1. Run `node scripts/doc-format.mjs --check`.
   → Green across the backfilled corpus.
2. Delete a required field from one epic README and re-run.
   → It **fails**, naming the file and the field. *(Then revert.)*
3. Set a sprint's `status` to an invalid value and re-run.
   → Fails.
4. Strip the frontmatter from one `sprint-N.md` and re-run.
   → Fails. *(Revert.)*
5. Open the backfill report.
   → Every unresolved doc is listed **with a reason**. Nothing was silently skipped.
6. Run the backfill script a second time.
   → `git status` is clean. It is idempotent.
7. Spot-check three epics of different vintages — a recent one, one from mid-2026, and a pre-template one.
   → Frontmatter matches what the prose says. Where it can't, the report says why.
8. Run `node scripts/build-order.mjs` and open `BUILD-ORDER.md`.
   → The board still renders correctly; nothing regressed.

If any step fails, note the step number + what you saw — that's the bug report.

**Step 5 is the honesty check.** A backfill that silently skips what it couldn't parse produces a
contract that looks complete and isn't.
