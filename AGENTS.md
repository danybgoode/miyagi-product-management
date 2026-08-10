# Agent index — miyagi-product-management (the orchestration repo)

> **Read this before touching anything here.** It is auto-loaded by Codex and (via `CLAUDE.md`) by
> Claude. Keep it SHORT — a file long enough to skim is a file nobody reads twice.

## What is this?

The **root repo**: product docs, process, and the delivery toolchain. It ships no product code and has
no deploy rail — merging here deploys nothing.

```
medusa-bonsai/                 ← THIS repo (danybgoode/miyagi-product-management)
├── Roadmap/                   ← product source of truth: poster, epics, sprints, retros, LEARNINGS
├── scripts/                   ← the delivery toolchain (~30 node scripts + their tests)
├── tasks/                     ← engineering delivery log
└── apps/                      ← SEPARATE git repos, gitignored here. Never commit them from here.
    ├── backend/               ← Medusa v2 commerce engine
    └── miyagisanchez/         ← Next.js 16 storefront + admin
```

`apps/*` are **their own repositories** with their own remotes, CI and deploy triggers. Changing code
there is a different repo, a different branch, and a different PR.

## Start here

- **`Roadmap/WAYS-OF-WORKING.md`** — the cadence, gitflow, Definition of Done, the review stack, the
  prose rail, and the epic-mode SOP. This is the process contract; follow it. **Read its
  *Operating posture* section first** — the platform is pre-launch with one user, so we build the
  **final product** (no pilots, cohorts, proof phases or readiness gates unless asked), **add no new
  feature flags unless the product owner asks**, and review is the deterministic gate plus **one**
  cross-family pass on money-path PRs only. Builders merge their own PRs.
- **`Roadmap/LEARNINGS.md`** — distilled wisdom from every past epic. Read it. It is how a retro
  reaches you instead of dying in its folder.
- **`Roadmap/README.md`** — the product poster: every feature by domain, current status.
- **`Roadmap/SESSION-KICKOFFS.md`** — step 0 is `node scripts/session-resume.mjs`. Run it first.

---

## ⚠️ Rules that cannot be violated here

### 1. Commit PATH-LIMITED. Never `git add -A`, never `git add Roadmap/`.
Multiple agents share this checkout. A bare `add` stages a sibling agent's in-flight work and
corrupts their commit. Always `git add <specific files>` then `git commit -- <those same paths>`.
For parallel work, take your own `git worktree`.

### 2. Generated artifacts are NEVER hand-edited.
`Roadmap/00-ideas/BUILD-ORDER.md` and `Roadmap/00-ideas/OWED-LEDGER.{md,json}` are outputs.
Regenerate them (`node scripts/build-order.mjs`, `node scripts/owed-ledger.mjs`); editing them by hand
is a change that the next regeneration silently reverts. CI guards their staleness.

### 3. Epic status SSOT is the epic README's frontmatter `status:`.
`scaffolded | in-progress | shipped | archived`. `BUILD-ORDER.md` and the Notion board are **derived
views** — regenerated, never maintained. Never rename that key or its values.

### 4. `node:test` only. Zero new npm dependencies.
Every script here runs on Node's built-in runner with no external test framework, and the toolchain has
no runtime deps by design — it must work in a routine sandbox and on a fresh clone. Match the existing
~30 `scripts/*.test.mjs`.

### 5. A script that exits green having run nothing is worse than no script.
It reads as a passing gate. If a script cannot do its job — missing repo, unauthenticated `gh`,
unreachable database — it must **say so and fail**, or emit an explicit "unavailable", never a
confident empty result. We deleted two backend test scripts for exactly this.

### 6. Never `supabase db push`. Never apply a migration from a builder role.
Local migration files are unrecorded remotely, so `db push` would replay all of them. The orchestrator
applies migrations (Supabase MCP `apply_migration`), realigns `schema_migrations` by hand, and verifies
live. See `LEARNINGS.md`.

---

## How to write code that belongs here

**Keep a pure seam.** Every script splits into pure functions (parse, decide, format) and a thin I/O
shell (spawn, fetch, write). The pure half is what gets unit-tested — that is why the suite runs in
milliseconds with no network. If you find yourself needing `gh` or a database to test a decision, the
seam is in the wrong place.

**Inject dependencies for I/O.** `export function f(args, deps = { run = spawnSync })` — the existing
scripts all do this, and it is why their tests need no live services.

**Comments carry the WHY, especially for a rule that looks arbitrary.** Nearly every guard and constant
here records a measured failure. Preserve that reasoning when you touch it: the reason a rule exists is
the only thing that stops the next person deleting it as noise.

**Degrade, never die.** Per-repo, per-source. One unreachable repo must not kill a whole run — mark it
unavailable and carry on, naming the gap in the output.

**Three states, never two.** Known-present, known-absent, and *unavailable* are different facts.
Collapsing "I could not check" into "there is none" produces a confident falsehood.

---

## Traps — things that look right and are not

- **The pre-commit hook takes 3–6 minutes.** It runs `build-order --check`, `doc-format --check` and the
  full `node:test` suites. That is normal, not a hang — use a generous timeout (~420s) on commits.
- **`node --test scripts/` does NOT work** on the current Node. Use `node --test "scripts/**/*.test.mjs"`.
- **`scripts/lib/log-branch.mjs` builds a SINGLE-LEVEL git tree** — journal/log paths must be flat
  filenames, no directories.
- **`scripts/lib/gh-rest.mjs` is REST-only on purpose.** `gh pr list --json` hits GraphQL internally,
  which is blocked in at least one live routine sandbox. Do not "simplify" it back.
- **A guard that rejects *correct* output is worse than one that misses a rare fault** — it trains
  people to bypass it. Always allow the negation of what you ban. (`LEARNINGS.md`, shipped twice.)
- **A hand-counted number is stale on arrival.** Generate it or do not cite it.
- **`--dry-run` must stay FULLY read-only** in every reporting script — no log append, no git, no
  network write. It is the mode every agent tests with.

## The gate — how you know you are done

```bash
node --test "scripts/**/*.test.mjs"   # all green
node scripts/build-order.mjs --check  # board current
node scripts/doc-format.mjs --check   # doc conventions
```
Plus the story-level Definition of Done in `WAYS-OF-WORKING.md` — including **every new spec observed
failing at least once** via a deliberate break-the-implementation mutation. A spec never seen red is
not known to test anything.

## If you are a delegated subagent

You were dispatched by an orchestrator with a written contract. Two things override your instincts:

1. **Never push, open a PR, merge, or apply a migration.** Return a diff and a report; the orchestrator
   verifies and lands it.
2. **If the task rests on a false premise, STOP and say so.** Reporting that a premise is wrong is a
   successful outcome here — it has already saved a build this month. Working around it silently is the
   failure this codebase has been bitten by most.
