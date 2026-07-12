# Process iteration — UX rails + observed-red — Sprint 1

**Status:** ✅ done — commits `d7bd19b` (S1.1), `a4ca168` (S1.2)

## Stories

### Story 1.1 — UX rails named at grooming
**As** Daniel, **I want** every scope seed to name which UX rails cover its surface, **so that** UX
quality is checked at planning, not discovered at review.
**How:** add a short "UX heuristics & rails check" block to `skills/groom/templates/scope-seed.md`
(three lines: which CI guards cover this surface (token guard / swept lists / none — say so) · which
audits-lens findings apply (`Roadmap/00-ideas/audits/results-refresh-2026-06/`) · the surface's
design-language debts if any). Add one matching sentence to `skills/groom/SKILL.md` Stage 4 (the
reuse list names the rails). Add a WAYS-OF-WORKING pointer. Keep it a checklist, not an essay.
**Acceptance:** template + SKILL.md updated; the next groomed seed (whichever it is) carries the
block; WAYS-OF-WORKING references it.
**Risk:** low
**Status:** ✅ done — commit `d7bd19b`

### Story 1.2 — Observed-red DoD line
**As** the team, **I want** proof every new spec can fail, **so that** agent-written tests can't pass
by accident (the article's mutation sanity check — the one piece we adopted).
**How:** add to WAYS-OF-WORKING → Definition of Done (a story): *"every new spec was observed failing
(red) at least once — via a deliberate break-the-implementation mutation check if the test was
written after the code."* Verification, NOT an ordering mandate (don't force test-first; agents often
do it anyway). One LEARNINGS line under Tooling gotchas citing the article + date. Explicitly out:
.feature files, Cucumber, Stryker, coverage scripts.
**Acceptance:** the DoD line reads as verification-only; LEARNINGS cites
dev.to/antoniel (2026-07-12); nothing else in the process changed.
**Risk:** low
**Status:** ✅ done — commit `a4ca168`

## Sprint QA
- **api spec(s):** n/a — doc/template edits. Gate: the groom template still renders (scaffold a
  `--dry-run` epic) + `node scripts/build-order.mjs` stays green.
- **browser smoke owed:** no.
- **deterministic gate:** build-order regen clean; doc links resolve (doc-hygiene script if available).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: repo

1. Open `skills/groom/templates/scope-seed.md`.
   → The "UX heuristics & rails check" block is present, ≤10 lines.
2. Open `Roadmap/WAYS-OF-WORKING.md` → Definition of Done (a story).
   → The observed-red line is there, phrased as verification, not ordering.
3. Grep LEARNINGS for "observed-red" or "mutation".
   → One dated line citing the article.

If any step fails, note the step number + what you saw — that's the bug report.
