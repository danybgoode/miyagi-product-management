# QA guardrail hardening — Sprint 2: delete the false gates, measure what we have

**Status:** ⬜ not started

> Two backend scripts currently exit green having run nothing. Removing them is worth more than
> anything they could be made to do in this epic's mandate.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D3 and D4.

- **Verified 2026-07-26:** `apps/backend/integration-tests/` contains only `setup.js`. The
  `test:integration:http` glob (`**/integration-tests/http/*.spec.[jt]s`) matches nothing and Jest
  exits 0. `test:integration:modules` matches `src/modules/*/__tests__/` — the same 7 files already
  counted in the 48-file unit suite.
- **Delete, do not repair (D3).** Writing an HTTP integration tier is not in this epic's mandate and
  would need a Postgres service in CI. An honest absence beats a green lie.
- **Coverage is a number, not a gate (D4).** No threshold. No failing build. If you find yourself
  picking a percentage, stop — that decision needs the number first.
- Neither script runs in CI today, so removing them **cannot** break CI. Confirm that before you
  delete, and say so in the PR.

## Stories

### Story 2.1 — remove the two false-green integration scripts ⬜
**As a** builder, **I want** `npm run` to contain no script that passes by doing nothing, **so that** a
green result means something.
**Acceptance:**
- `test:integration:http` and `test:integration:modules` removed from `apps/backend/package.json`.
- `integration-tests/setup.js` and any now-dead Jest config branches removed **or** kept with a
  comment saying exactly what would need to exist for a real integration tier — decide, and say which
  in the PR.
- Verified: no workflow, script, doc or skill referenced them (grep all three repos, including
  `Roadmap/` and `skills/`, and report what you found).
- `npm run test:unit` unaffected.
- The absence is recorded for the retro: **we have no integration tier, and that is now visible
  instead of disguised.**

### Story 2.2 — a coverage number in CI output, both repos ⬜
**As a** builder, **I want** to know what fraction of the code the suites touch, **so that** we argue
about coverage from data instead of file counts.
**Acceptance:**
- Backend: `--coverage` on the Jest unit run; summary printed in CI output.
- Frontend: V8 coverage on the Playwright `api` project; summary printed in CI output.
- **No threshold, no gate, no failing build** (D4).
- The first measured numbers are recorded in the PR body and carried into the retrospective — that is
  the deliverable, more than the wiring.
- Coverage artifacts are git-ignored, not committed.

## Definition of Done (sprint)
- [ ] Both repos' CI green; the two dead scripts gone.
- [ ] First real coverage numbers recorded in the PR body.
- [ ] Grep evidence that nothing referenced the removed scripts.
- [ ] Cross-agent review run; findings resolved.
