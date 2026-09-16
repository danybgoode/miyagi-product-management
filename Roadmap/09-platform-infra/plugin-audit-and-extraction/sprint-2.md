# Plugin audit + medusa extraction — Sprint 2: Extract the Tier-1 rails

**Status:** ⬜ not started

**Epic:** [Plugin audit + medusa extraction](README.md) · **Risk: LOW** (2.2 touches shared surface in consuming repos — **announce before merging**)

**Wave 2 of 3.** Five ports that encode process the plugin already claims. **Port, generalize the
names, add a config seam — nothing else.** Rewriting a ported script's logic is out of scope, and it
is how a proven rail arrives subtly broken.

## Stories

### Story 2.1 — Port `scripts/routines/` — the Step-3 rail
**As a** spawned project, **I want** the proven routine prompts, **so that** "routines and loops" is a
rail rather than an aspiration.
**Acceptance:** all seven prompts (ops-nightly, prod-smoke, smoke-triage, roadmap-hygiene, pmo-report,
weekly-recap, pr-review) plus the README land in `template/scripts/routines/`, replacing the single
`example-routine.prompt.md` stub. Repo names and destinations become `TEMPLATE FILL-IN` slots. **The
doctrine is kept verbatim** — especially *"a routine's assertions belong in a reviewable file, not in
a prompt in someone's account"*, which `prod-smoke.mjs`'s header records as a lesson that cost twice.
**This is the single biggest stranded asset in the workspace.**
**Risk:** low

### Story 2.2 — Port the three-stage hook budget
**As a** developer in any spawned project, **I want** commits to stay instant,
**so that** the hooks survive instead of being disabled.
**Acceptance:** both hooks land with the **budget doctrine in the header** — `pre-commit < 2s` (staged
files only) / `pre-push < 30s` (cheap whole-repo) / CI unbounded — and the rule that **cost decides
which stage a check belongs to, not importance.** Auto-enabled via `package.json`'s `prepare`
(`git config core.hooksPath .githooks`), so a fresh clone gets them with no manual step. The measured
story stays in the header: a commit once took **119.7 seconds**, >99% of which was one corpus walk
repeated eight times. **Port the budget, not just the scripts** — a ported hook that walks a corpus in
a bigger repo breaks the budget and someone sets `core.hooksPath` back.
**Risk:** low — but this is **shared surface** in consuming repos. Announce it.

### Story 2.3 — Port `session-note.mjs` + `session-resume.mjs`
**As a** resuming agent, **I want** the derive-state/journal-intent doctrine to be executable,
**so that** it stops being a wish.
**Acceptance:** both land in `template/scripts/`. `session-note` stays the **cheap** half (one
intent-only line appended to a dedicated journal branch — no `gh` calls, no derivation); `session-resume`
stays the **expensive** half (live git/gh/DB reads across the project's repos, leading with what is
surprising). `WAYS-OF-WORKING` → *Assume the orchestrator dies too* references them instead of merely
describing them.
**Risk:** low

### Story 2.4 — Port `doc-format.mjs`
**As the** plugin, **I want** to validate my own scaffolding templates,
**so that** the producer isn't validated by a file living in one consumer.
**Acceptance:** lands in `template/scripts/` and is declared by the skills that depend on it. **Run it
over `golden-beans` before shipping** and triage the results: a real finding is a fix, a medusa-ism is
a rule to relax. It was tuned against medusa's corpus and **will** fail on another project's docs;
that triage is part of this story, not a follow-up.
**Risk:** low

### Story 2.5 — Port `owed-ledger.mjs`
**As the** product owner, **I want** the manual-QA debt counted rather than grepped from memory,
**so that** "gaps stated explicitly" is measurable.
**Acceptance:** lands in `template/scripts/`, generalized so the "owed to <the product owner>" phrasing
is configurable. Produces one categorised number. The epic DoD's *"gaps stated"* line references it.
**Risk:** low

## Sprint QA
- **api spec(s):** the ported scripts' existing tests come with them (`session-note.test.mjs`,
  `session-resume.test.mjs`, `doc-format.test.mjs`, `owed-ledger.test.mjs`) and must pass **in the
  template**, not only in medusa. A new test asserts the pre-commit hook completes in under 2s against
  a synthetic staged change.
- **browser smoke owed:** no.
- **deterministic gate:** `node --test 'scripts/*.test.mjs'` + `check-skill-scripts.mjs` +
  `check-plugin-leaks.mjs` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: local · a freshly spawned project, plus `golden-beans`

1. `ls template/scripts/routines/` in `dobby-foundation`.
   → Seven real prompts plus the README. No lone `example-routine` stub.
2. Open any ported routine prompt.
   → Project-specific names are `TEMPLATE FILL-IN` slots; the "assertions live in a reviewable file"
     doctrine is intact.
3. In a spawned project, make a commit touching `Roadmap/` and `scripts/` and time it.
   → **Under 2 seconds.**
4. Push and time it.
   → **Under 30 seconds.**
5. Clone the spawned project fresh and run `npm install`, then make a commit.
   → The hooks ran. No manual `git config core.hooksPath` was needed.
6. Run `node scripts/session-note.mjs "locked D3, starting sprint 2"`, then `node scripts/session-resume.mjs`.
   → The note is on the journal branch; resume derives live state across the project's repos and
     leads with what is surprising — not with a stored snapshot.
7. Run `node scripts/doc-format.mjs --check` in `golden-beans`.
   → It runs. Findings are triaged in the PR as real-fix or rule-relax; it is not left permanently red.
8. Run `node scripts/owed-ledger.mjs`.
   → One categorised number, with the categories named.

If any step fails, note the step number + what you saw — that's the bug report.

**Steps 3 and 4 are the survival test.** A hook that breaks the budget is a hook that gets disabled,
and then none of this ported.
