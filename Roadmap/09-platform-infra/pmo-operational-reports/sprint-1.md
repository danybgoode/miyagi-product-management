# PMO operational reports — Sprint 1: Metrics lib + window log

**Status:** ⬜ not started

## Stories

### Story 1.1 — Pure metrics lib (`scripts/lib/pmo-metrics.mjs`)
**As** Daniel, **I want** collectors for throughput, cycle time, deploy frequency, change-fail proxy
and doc-ops breadth, **so that** every report draws from one tested source of numbers.
**Acceptance:** pure functions (I/O injected) computing: stories+epics shipped/week (epic frontmatter
flips via the pickaxe pattern + build-order extract), PR open→merge time and epic scaffold→shipped
lead time (gh-rest), merges-to-`main` counts per repo (deploys, per the WAYS-OF-WORKING convention),
revert/hotfix count, Roadmap docs touched per epic + LEARNINGS promotions + retro coverage.
`node:test` fixtures give exact expected numbers; `isMain`-guarded (LEARNINGS — a co-located test
file re-executes an unguarded `main()`).
**Risk:** low

### Story 1.2 — Window log + baseline guard
**As** the reporting routine, **I want** to know where the last report window ended, **so that**
back-to-back runs never double-count or gap (weekly-recap's window-tracking shape, NOT the standup
delta shape — LEARNINGS distinguishes them).
**Acceptance:** `pmo-reports.log` persisted via the log-branch plumbing (flat filename — mktree is
single-level); a missing baseline produces ONE bounded "baseline established" summary (counts only),
never full history; regression test on a large history fixture (the standup 120-PR lesson).
**Risk:** low

## Sprint QA
- **api spec(s):** n/a (root-repo scripts) — deterministic gate is the node test glob below.
- **browser smoke owed:** no.
- **deterministic gate:** `node --test 'scripts/lib/pmo-*.test.mjs'` green (glob form — Node 24 dropped bare-dir).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local repo checkout

1. Run `node scripts/pmo-report.mjs --dry-run`.
   → A plain-text metrics summary prints: this week's throughput, cycle time, deploys, doc-ops — no
     crash, no full-history enumeration.
2. Run it twice in a row.
   → Second run reports the same window boundaries (no double-count), visible in the output.
3. Run `node --test 'scripts/lib/pmo-*.test.mjs'`.
   → All green.

If any step fails, note the step number + what you saw — that's the bug report.
