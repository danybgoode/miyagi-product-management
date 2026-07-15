# ReportHub as the Notion replacement — Sprint 3: Parallel-run gate + Notion decommission

**Status:** ⬜ not started

> **Gate:** Sprint 3 does not start until 2–4 weeks of parallel running after Sprint 2 ships, and
> Story 3.1's checkpoint gets an explicit in-conversation YES from Daniel (LEARNINGS: re-confirm a
> gate at the start of the sprint even when the repo records it met — this deprecates a daily-used tool).

## Stories

### Story 3.1 — Parallel-run checkpoint (the gate)
**As** Daniel, **I want** a short written comparison of hub vs Notion over the parallel-run window —
what was consulted where, anything the hub can't answer, **so that** the decommission decision is
evidence, not vibes.
**Acceptance:** checkpoint note appended to this sprint doc; explicit go/no-go recorded. No code.
**Risk:** low

### Story 3.2 — Notion decommission
**As** the team, **I want** the Notion sync fully retired, **so that** one derived view (the hub)
remains and no CI minutes/PAT scope serve a dead board.
Scope (LEARNINGS: decommission is bigger than the package line): `.github/workflows/notion-sync.yml` +
`notion-pr-sync.yml` removed; `roadmap-to-notion.mjs` + test retired **except** the `--extract`
projection — extract it to `scripts/lib/roadmap-projection.mjs` first (Sprint 2 depends on it);
WAYS-OF-WORKING / 00-ideas README / BUILD-ORDER banner comments updated; Notion API secrets revoked.
**Acceptance:** `grep -ri notion` across root repo returns only historical docs (retros/LEARNINGS);
workflows gone; hub views still green after removal (proves no hidden dependency); board banner no
longer references the Notion DB.
**Risk:** low (docs/tooling; the gate above carries the judgment)

## Sprint QA
- **api spec(s):** existing hub view tests stay green post-removal; grep-clean check scripted into the PR
- **browser smoke owed:** no (Daniel's judgment IS story 3.1)
- **deterministic gate:** root `scripts-guard` green after the removal

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production

1. Read the Story 3.1 checkpoint in this doc and reply go/no-go in session.
   → Explicit YES recorded before any removal lands.
2. After 3.2 merges: open the hub /reports and the weekly Telegram links.
   → Everything renders; nothing referenced Notion.
3. Try the old Notion board.
   → Clearly stale/archived; no workflow has written to it since the merge.

If any step fails, note the step number + what you saw — that's the bug report.
