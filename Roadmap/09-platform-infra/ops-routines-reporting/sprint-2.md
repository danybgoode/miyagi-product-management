# Ops routines & reporting — Sprint 2: the nightly fixers + feed the standup

**Status:** ⬜ not started

> Adds the overnight chore-workers the standup reports on: regenerate the build-order board, report stale
> Vercel previews, babysit open PRs — then fold their outputs into the S1 standup and the one nightly ops
> routine. Two stories carry the epic's only real risk (destructive prune, PR writes) — kept dry-run /
> advisory.

## Stories

### Story 2.1 — `build-order-sync` skill (nightly regen → docs PR on drift)
**As a** product owner, **I want** the build-order board regenerated overnight, **so that** its CI guard
stops going red because someone forgot to run the generator.
**Acceptance:**
- `skills/build-order-sync/SKILL.md` wraps `node scripts/build-order.mjs`; on drift vs committed, opens a
  `claude/` **docs PR** with the regenerated `BUILD-ORDER.md`. **Never hand-edits** the board (SSOT = epic
  frontmatter). Mandatory `## Gotchas` (the "board is a derived view" rule).
- On no drift, no PR. Feeds a one-line drift status into the standup.
**Risk:** Low (docs PR only; auto-generated content).

### Story 2.2 — `vercel-prune` skill (scheduled dry-run report; apply gated)
**As a** product owner, **I want** stale preview deployments reported nightly, **so that** dead previews
don't pile up — without ever deleting something I still need.
**Acceptance:**
- `skills/vercel-prune/SKILL.md` wraps `scripts/vercel-prune-previews.mjs`; runs a **dry-run** on schedule and
  reports the stale-preview count/list into the standup. **`--apply` is human-confirmed** (never automatic);
  `--keep-branch` protects any open-PR preview. Mandatory `## Gotchas` (production deploys are rollback
  history — never touched; open-PR previews are the live review target).
**Risk:** **Medium** — destructive on `--apply`. Dry-run-first + Daniel confirms the first live apply.

### Story 2.3 — `babysit-pr` skill (advisory PR watch)
**As a** product owner, **I want** open PRs babysat overnight, **so that** flaky CI and merge conflicts are
retried/surfaced instead of silently stalling a PR.
**Acceptance:**
- `skills/babysit-pr/SKILL.md` + a helper script: for an open PR, read CI status (`gh`), retry a flaky run,
  and surface merge conflicts. **Advisory only** — posts status; **never auto-merges, never reports a
  commit-status check** (a comment structurally can't become a required check — keep it that way). Mandatory
  `## Gotchas`.
- Feeds "PRs needing attention" into the standup.
**Risk:** **Medium** — writes to PRs (re-run CI, comment). Daniel confirms the first live babysit action.

### Story 2.4 — Fold the fixers into the standup + the one nightly ops routine
**As a** product owner, **I want** all overnight work in one routine and one standup, **so that** I get a
single morning message and stay under the scheduled-run cap.
**Acceptance:**
- `scripts/routines/ops-nightly.prompt.md` (from S1) now invokes, in order: `build-order-sync`,
  `vercel-prune` (dry-run), `babysit-pr`, then `standup-post` (which reports their outputs).
- Still one scheduled routine (cap-safe); still advisory/non-gating.
**Risk:** Low.

## Sprint QA
- **api spec(s):** none. `node --check` each new/changed script; live-run each skill once and confirm its
  standup line.
- **browser smoke owed:** no.
- **deterministic gate:** `node --check` green; the risk-tier stories (2.2 apply, 2.3 writes) get an explicit
  first-live-run confirmation from Daniel before being left to run nightly.

## Sprint 2 — Verification walkthrough (do these in order)
Env: the repo scripts + Telegram + `claude.ai/code/routines` (process change; no app deploy).

1. With the board deliberately stale, run `build-order-sync`.
   → It opens a `claude/` docs PR with the regenerated `BUILD-ORDER.md`; it does **not** hand-edit the board.
2. Run `vercel-prune` on schedule (dry-run).
   → It reports stale previews into the standup and deletes **nothing**. Confirm an open-PR preview is in the
   `--keep-branch` protected set. **(money/infra-adjacent — the first `--apply` is owed to Daniel.)**
3. Point `babysit-pr` at an open PR with a flaky/failed check.
   → It retries/ surfaces status as an advisory comment; it does **not** merge and creates **no** required
   check. **(the first live babysit write is owed to Daniel.)**
4. Trigger the nightly ops routine.
   → One standup arrives folding in build-order drift, stale-preview count, and PRs-needing-attention.

If any step fails, note the step number + what you saw — that's the bug report.

## Kickoff prompt (paste into a fresh Claude Code session)
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/00-ideas/2. readyforscope/spike-skills-library-audit.md (binding conventions),
> Roadmap/09-platform-infra/ops-routines-reporting/README.md + sprint-2.md (S1 must be merged first).
>
> You're building Sprint 2 of "Ops routines & reporting" on feat/ops-routines-reporting. Enter plan mode,
> confirm with me. Follow the D-spike conventions (script-does-work / SKILL.md-wraps / routine-triggers;
> skills/<name>/; mandatory ## Gotchas; model-facing descriptions). Build: build-order-sync (wrap
> build-order.mjs → claude/ docs PR on drift, never hand-edit), vercel-prune (wrap vercel-prune-previews.mjs
> → scheduled DRY-RUN report; --apply HUMAN-CONFIRMED; --keep-branch open-PR previews), babysit-pr (advisory
> PR watch: retry flaky CI, surface conflicts; NEVER auto-merge, NEVER a required check), then fold all three
> plus standup-post into the single scripts/routines/ops-nightly.prompt.md. Stories 2.2 (--apply) and 2.3
> (PR writes) are MEDIUM risk — declare them; the first live apply/babysit action is owed to me before it
> runs unattended. Path-scoped commits. PR declares the risk tiers. Update sprint-2.md's smoke walkthrough
> before done. Nothing to tasks/. Escalate to Opus on any ambiguity or money/auth/destructive-path judgment
> instead of guessing.
