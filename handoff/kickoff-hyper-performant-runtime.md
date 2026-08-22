Read AGENTS.md, Roadmap/WAYS-OF-WORKING.md (especially *Epic-mode builds* and *Review & merge*) and
Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/09-platform-infra/hyper-performant-runtime/README.md and every sprint file: sprint-1.md, sprint-2.md, sprint-3.md.

You're building the ENTIRE "Hyper-performant runtime" epic in EPIC MODE, in one orchestrated run — not
3 independent sprint sessions. The sprint documents are integration, review and rollback
boundaries INSIDE this run; they are not separate engagements. Risk tier: HIGH.

## 1. Lock the architecture before any builder starts
This is the single highest-leverage act of the whole run, and it is yours alone. Before delegating
anything, read the epic + sprint docs AND the shipped code and live data they describe, then write into
Roadmap/09-platform-infra/hyper-performant-runtime/README.md:
- numbered decisions `D1…Dn` — each one verified against the live system, not inferred from the doc;
- a per-sprint **"Build contract (locked by the architect before the builder started)"** section.
Builders CITE those decisions. They never re-derive them, and a paraphrased contract drifts permissive.

The locking pass is not a summary of the sprint docs. It must:
- **Disprove scope.** Read the code before believing the doc. An acceptance criterion describing a guard,
  a table, a dependency or a flag state the live system doesn't have is fiction — correct the doc, with
  the reasoning, and say so out loud.
- **Query live data, not just migration files.** Row counts decide what is safe: a schema fork that is
  free while a table is empty is only free then, and that window is worth spending deliberately.
- **Name every deviation** in the README, decided — not discovered by a builder mid-build.
- **Say where each contract lives, once.** Import the shipped rule; never restate it.

## 2. Stack the branches
`feat/hyper-performant-runtime` → `-s2` → `-s3` …, each cut from the previous, one PR per sprint, merged in order.
Sprints in one epic share hot files by construction — siblings cut off one base pay a per-merge conflict
tax. Stack or pay. One PR for the whole epic is acceptable only when the sprints don't split along a
review boundary; prefer per-sprint PRs so the highest-risk sprint gets reviewed as one.

Work in your own isolated `git worktree`, not the shared root checkout. Commit per story PATH-SCOPED
(`git add <your files>` + `git commit -- <those paths>`, never `git add -A`).

## 3. Route the work, and invert it for review
Assign the sprint that defines the contract everything else imports — the authorization boundary, the
migration, the shared seam — to the stronger model; the sprints that are mechanical over a locked
contract go to the faster one. State the routing in the epic README so the choice is auditable.

Escalate rather than guess: stop and ask on payments / checkout / fulfillment / auth / DB migrations /
shared infra / money, plan ambiguity, a decision the plan doesn't cover, or 2+ failed attempts at the same
problem. Default to escalate when unsure. A scope that stops moving is a raised hand, not a reason for
more tokens.

## 4. Review: TWO external families per PR — you do NOT spawn your own reviewers by default
Run the router, don't pick a reviewer by hand:

```
node scripts/review-route.mjs --builder <who-wrote-it> --tier <low|high> <PR#>
```

It applies the policy and prints the exact commands: **two cross-family passes** from the families that
did NOT build the diff (a family never reviews its own work), and nothing else on a LOW-tier PR.

- **LOW tier — do not spawn reviewer subagents.** Two external passes plus the deterministic gate is the
  whole layer. This is a deliberate change: the old habit of running the external passes AND your own
  parallel subagent reviewers on every PR was paying twice for one read.
- **HIGH tier — the fresh reviewer subagent is still mandatory**, on top of the two external passes.
  Money, auth, migrations and shared infra are where context independence catches what every external
  family misses, and that layer stays.
- **If a family is quota-capped, STOP AND ASK ME FOR A REFUND** before substituting your own subagents.
  I can refund external quota in minutes; your subagent tokens come out of this epic's build budget.
  The router prints the exact ask. If I haven't answered within the stated window, proceed with subagents
  and record the downgrade in the PR body — a missing layer must never read like a clean one.

Every finding gets fixed, or answered on the PR with the reason it isn't a bug, before merge. You never
merge your own PR.

## 5. Merging: pre-authorized on green. Done means shipped.
For this epic you are **pre-authorized to merge on a green gate** — deterministic gate green, review
findings resolved, risk tier declared. Don't come back to me for a merge round-trip at each sprint
boundary. Pre-authorization removes the round-trip, not the layers: the gate, the two reviews and the
tier rule all still apply.

It does **not** extend to a new category of production mutation — TLS/IAM/secrets, money or entitlement
writes, a new external dependency or production secret. Name those in one focused question.

**Done means shipped.** A merged PR that hasn't deployed, a migration written but not applied, a flag
that exists in code but not in the flag provider — none of those are done. Apply migrations BEFORE
merging (merging deploys, and code reading a new column against an unmigrated table breaks a live path),
verify live, then merge, then confirm the deploy actually succeeded.

## 6. Assume you die mid-flight
Session limits kill whole agent trees. Derive what is derivable; journal only what isn't — the decided
state lives in the epic README's `D1…Dn` and the per-sprint build contracts, so re-entry is cheap. Never
trust a worker's own completion report: verify by re-deriving actual repo state.

## 7. Close it
Write each sprint's SMOKE WALKTHROUGH into its sprint file before calling that sprint done (numbered
steps, one action + one expected result, real URLs; money/auth steps flagged as owed to me by name).
At epic close, run the full epic Definition of Done in the README — retro, poster, memory, LEARNINGS,
`status: shipped`.

---

## The epic: "Hyper-performant runtime" (3 sprints, risk HIGH)

### Sprint 1: Origin — kill the cold start and the origin image encode
_(boundary: sprint-1.md)_

- Story 1.1 — Frontend Cloud Run runs warm (`min-instances=1`)
- Story 1.2 — Images transform at the edge, not on our CPU
- Story 1.3 — `scripts/perf-probe.mjs`, the measurement this epic reports against

### Sprint 2: Edge — make the public shell cacheable
_(boundary: sprint-2.md)_

- Story 2.1 — The public read subtree stops being dynamic
- Story 2.2 — Cloudflare caches the public read paths, proven MISS→HIT
- Story 2.3 — A guard so `revalidate` can never silently lie again

### Sprint 3: Client — the JavaScript diet
_(boundary: sprint-3.md)_

- Story 3.1 — Sentry stops recording session replays
- Story 3.2 — Heavy vendor deps load where they're used, not everywhere
- Story 3.3 — HTML does the work JavaScript was doing
- Story 3.4 — The diet is enforced, not remembered
