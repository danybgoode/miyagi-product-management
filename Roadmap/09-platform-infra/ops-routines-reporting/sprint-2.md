# Ops routines & reporting — Sprint 2: the nightly fixers + feed the standup

**Status:** 🟦 In review — merged (#52); first live `--apply` (2.2) confirmed by Daniel (see below);
first live babysit action (2.3) still owed before it runs unattended

> Adds the overnight chore-workers the standup reports on: regenerate the build-order board, report stale
> Vercel previews, babysit open PRs — then fold their outputs into the S1 standup and the one nightly ops
> routine. Two stories carry the epic's only real risk (destructive prune, PR writes) — kept dry-run /
> advisory.

## Stories

### Story 2.1 — `build-order-sync` skill (nightly regen → docs PR on drift) ✅ built
**As a** product owner, **I want** the build-order board regenerated overnight, **so that** its CI guard
stops going red because someone forgot to run the generator.
**Acceptance:**
- ✅ `skills/build-order-sync/SKILL.md` wraps `node scripts/build-order-sync.mjs` (which itself wraps
  `scripts/build-order.mjs`'s `--check`/regen); on drift vs committed, opens a `claude/` **docs PR** with
  the regenerated `BUILD-ORDER.md`. **Never hand-edits** the board (SSOT = epic frontmatter). Mandatory
  `## Gotchas` (the "board is a derived view" rule + the `claude/`-prefix push-scope note).
- ✅ On no drift, no PR — confirmed live (see walkthrough).
- ⚠️ **Not** a separate standup feed this sprint — the standup's own `buildOrderDrifted` signal (S1)
  already reads `build-order.mjs --check` directly and independently; this skill's job is the fix
  (opening the PR), not a second read of the same fact.
**Risk:** Low (docs PR only; auto-generated content).

### Story 2.2 — `vercel-prune` skill (scheduled dry-run report; apply gated) ✅ built
**As a** product owner, **I want** stale preview deployments reported nightly, **so that** dead previews
don't pile up — without ever deleting something I still need.
**Acceptance:**
- ✅ `skills/vercel-prune/SKILL.md` wraps `scripts/vercel-prune-previews.mjs` (no new script — it already
  supported everything needed) — a two-command recipe (compute the open-PR keep-branch list via `gh pr
  list`, then run the existing script `--age 7 --keep-branch <list>`, dry-run). **`--apply` is
  human-confirmed** (Stage 3 — only on an explicit, in-conversation ask, never automatic, never invoked
  by the routine); `--keep-branch` protects any open-PR preview. Mandatory `## Gotchas` (production
  deploys are never touched regardless of flags; open-PR previews are the live review target; the
  underlying script's own bare default is `--age 0`, not the `--age 7` this skill always passes).
**Risk:** **Medium** — destructive on `--apply`. Dry-run-first + **first live apply confirmed by
Daniel, 2026-07-02** — he supplied `VERCEL_API_TOKEN`; `--age 7 --keep-branch <open-PR branches>
--apply` ran for real against the live `miyagisanchez` project (417 deployments scanned). Result: 0
stale (everything non-production was under 7 days old — 36 previews existed at `--age 0`, all from
recently-merged branches the 7-day grace window is designed to protect, so correctly NOT deleted).
**The code path up through "decide what to delete" is now live-confirmed; the actual DELETE-API call
branch has not yet fired for real** (nothing met the bar this run) — that remains to be observed the
next time a genuinely stale preview exists.

### Story 2.3 — `babysit-pr` skill (advisory PR watch) ✅ built
**As a** product owner, **I want** open PRs babysat overnight, **so that** flaky CI and merge conflicts are
retried/surfaced instead of silently stalling a PR.
**Acceptance:**
- ✅ `skills/babysit-pr/SKILL.md` + `scripts/babysit-pr.mjs`: for an open PR, reads CI status + `mergeable`
  (`gh pr view`), retries any genuinely `FAILURE`/`ERROR`/`TIMED_OUT` check — **or** a legacy/external
  status context in `state: 'FAILURE'` (a cross-agent review caught this shape being missed initially) —
  by rerunning ONLY the Actions run(s) parsed from each failing check's own `detailsUrl` (never a
  branch-wide "list the last 20 runs and retry whatever's red" sweep, which could retry a stale,
  unrelated run and report a misleading "retried" comment), and surfaces a merge conflict. **Advisory
  only** — posts one comment; **never auto-merges, never reports a commit-status check** (a comment
  structurally can't become a required check — keep it that way). Mandatory `## Gotchas`. The classification logic
  (`decideBabysitActions`) is a pure, tested function (`scripts/babysit-pr.test.mjs`, 6 cases).
- ✅ A **clean** PR (no conflict, no failing checks) gets **no comment** — confirmed live against 6 real
  open PRs across the frontend and backend repos (see walkthrough); only a genuinely actionable PR
  produces one.
- "PRs needing attention" folds into the standup via `standup.mjs`'s own new `conflictingOpenNumbers`
  signal (S2.4) plus its existing CI-red line, which now reflects state *after* babysit-pr's retry
  attempt (babysit-pr runs earlier in the same routine).
**Risk:** **Medium** — writes to PRs (re-run CI, comment). **Daniel confirms the first live babysit
action** (not yet run for real — every live check in this sprint used `--dry-run`; see walkthrough).

### Story 2.4 — Fold the fixers into the standup + the one nightly ops routine ✅ built
**As a** product owner, **I want** all overnight work in one routine and one standup, **so that** I get a
single morning message and stay under the scheduled-run cap.
**Acceptance:**
- ✅ `scripts/routines/ops-nightly.prompt.md` (from S1) now invokes, in order: `build-order-sync`,
  `vercel-prune` (dry-run), `babysit-pr` (once per open PR, across all 3 repos), then `standup-post`
  (which reports the new merge-conflict signal, plus its existing signals which now reflect
  post-fixer-step state).
- ✅ Still one scheduled routine (cap-safe); still advisory/non-gating. `scripts/routines/README.md`
  updated with the new env/scope requirements (see below).
- ✅ `scripts/routines.test.mjs` now also covers `ops-nightly.prompt.md`'s advisory-only framing (it was
  the one prompt missing from that guard's list since S1 — closed as part of this sprint's rewrite).
**Risk:** Low.

## Incident during this sprint's build (recorded for the retro)
An early version of `build-order-sync.mjs` called its `main()` unconditionally at module scope (no
entry-point guard). Importing it from `build-order-sync.test.mjs` to test its two pure helpers — via
`node --test 'scripts/*.test.mjs'` — executed `main()` for real against the live repo. The board was
genuinely drifted (a pre-existing, correct drift: the `agent-discovery-and-indexing` epic's status had
already been flipped to shipped, with an untracked `RETROSPECTIVE.md` sitting in the working tree from
before this session started), so the script did exactly what it's designed to do on real drift: pushed
branch `claude/build-order-sync-2026-07-02` and opened a real PR (#51) on `miyagi-product-management`
— before the story was reviewed or the human was asked. The regenerated content itself was correct
(verified by diff), so at Daniel's direction the PR was merged and the branch cleaned up rather than
discarded. **Fix applied to both new scripts** (`build-order-sync.mjs`, `babysit-pr.mjs`): the standard
`isMain` entry-point guard already used by `scripts/roadmap-to-notion.mjs`
(`process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])`) — a script with a
co-located pure-logic test **must** guard its `main()` call, or importing it for the pure helpers
re-executes the whole script for real. Promoted to `LEARNINGS.md` at epic close.

## Sprint QA
- **api spec(s):** none — no app surface. `node --check` on every new/changed script (green).
  `node --test 'scripts/*.test.mjs' 'scripts/lib/*.test.mjs'` — 64 pass, 0 fail (the new pure-logic
  test files plus every pre-existing one, incl. the now-covered `ops-nightly.prompt.md`).
- **browser smoke owed:** no — no app/browser surface.
- **deterministic gate:** `node --check` + the full `node --test` suite green (this is exactly what
  `scripts-guard.yml` runs). `node scripts/build-order.mjs --check` confirmed clean before and after —
  no story here touches epic frontmatter status. The risk-tier stories (2.2 apply, 2.3 writes) still
  get an explicit first-live-run confirmation from Daniel before being left to run nightly — see below.
- **Cross-agent review** (`node scripts/cross-review.mjs 52 --repo danybgoode/miyagi-product-management
  --agent codex`, PR #52) — 0 blocking, 2 should-fix, 1 nit, all applied: `decideBabysitActions` now
  also catches a legacy/external status context (`state: 'FAILURE'`, no `conclusion`) that it initially
  missed; retries are now scoped to the exact Actions run backing each failing check (parsed from its
  `detailsUrl`) instead of a coarse branch-wide "retry the last 20 red runs" sweep; `build-order-sync
  --dry-run`'s docs were misleading about mutating the working tree — fixed by actually restoring the
  file after the diff, not just the wording.

## Sprint 2 — Verification walkthrough (do these in order)
Env: the repo scripts + Telegram + `claude.ai/code/routines` (process change; no app deploy).

1. ✅ **Ran live** — `node scripts/build-order-sync.mjs --dry-run` against the real (clean, post-incident)
   board: printed `BUILD-ORDER.md is up to date — no PR needed.` and touched nothing. The
   drift→PR path was exercised for real (unintentionally — see the incident note above) when the
   pre-existing drift produced PR #51, which Daniel reviewed and merged; that IS the intended live
   behavior, just triggered ahead of schedule. **Confirmed:** on a clean board, no PR; on real drift, a
   correct `claude/` docs PR with only the regenerated file, never a hand-edit.
2. ✅ **Ran live, incl. the real `--apply`** (2026-07-02, after this sprint's PR merged — Daniel supplied
   `VERCEL_API_TOKEN`). Computed the open-PR keep-branch list (`gh pr list --repo
   danybgoode/miyagisanchezcommerce --state open --json headRefName` → two open PRs at the time) and ran
   `node scripts/vercel-prune-previews.mjs --age 7 --keep-branch <list>` (dry-run), then the same command
   `--apply`. Both agreed: 0 stale previews (417 deployments scanned; the 36 non-production previews that
   exist at `--age 0` were all under 7 days old — recently-merged branches the grace window protects —
   correctly not touched). **Confirmed:** dry-run and apply agree, production is never scanned as a
   candidate, an open-PR branch is excluded. Not yet observed live: the actual DELETE call firing on a
   genuinely stale preview (none existed at the time of this run).
3. ✅ **Ran live (dry-run)** — `node scripts/babysit-pr.mjs <PR#> --repo <repo> --dry-run` against 7 real
   open PRs (1 frontend, 6 backend/dependabot). 6 were clean → correctly printed "no comment posted",
   nothing else happened. 1 (backend #23) had a genuinely failed check → correctly printed "would
   rerun failed run #28542370519" and a preview comment reading "Would retry failing CI run(s):
   #28542370519" (an initial version of this preview said "no retry needed" while also printing "would
   rerun" — inconsistent; fixed so the dry-run preview and the printed action agree). **The first LIVE
   (non-dry-run) babysit action — an actual retry + a real posted comment — is owed to Daniel** before
   this runs unattended nightly.
4. ⬜ **Owed to Daniel** — trigger the nightly ops routine for real (once the account-side routine prompt
   is updated to this sprint's 4-step version) and confirm one standup arrives folding in build-order
   drift, the stale-preview count, and PRs-needing-attention (conflicts + still-red CI). Not
   achievable in this session (no routine account access).

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
