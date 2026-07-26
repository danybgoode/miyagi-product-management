---
status: scaffolded
slug: session-continuity
---

# Epic: Session continuity — surviving an orchestrator that dies mid-flight

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/delivery-rail-hardening.md`](../../00-ideas/seeds/delivery-rail-hardening.md)

## Why

Hitting a session limit mid-run is **normal**, not exceptional — `LEARNINGS.md` records a batch where
a shared cap killed all five agents twice in one session. We already handle one half of that well:
when a **subagent** dies, the orchestrator messages the same agent id and it resumes from its
transcript with context intact. Total loss across two mass kills was ~zero.

The other half has no answer. **When the orchestrator dies, nothing survives but the docs** — and the
docs record *decided* state, not *in-flight* state. The next session inherits: which builders were
running, which PRs are open but unreviewed, which migration was applied but not merged, which branch
a half-finished sprint sits on, and — most expensively — **what the architect had decided but not yet
written down**.

Evidence this is real and not hypothetical: at the moment this epic was scaffolded, `apps/backend`
was sitting on `feat/order-payment-capture-state`, left over from an earlier session, with nothing
anywhere recording why. Nobody re-derived it; it was simply found.

## The design decision that shapes everything

**Almost all run state is already derivable. Intent is not.**

Branches, dirty trees, open PRs, CI status, review state, mergeability, applied-vs-merged migrations —
all of it can be re-derived live from `git` and `gh` at resume time. A journal that *restated* those
facts would go stale between the write and the read, and a stale journal is worse than none: it reads
as authoritative and it lies. This is the same failure `Roadmap/00-ideas/BUILD-ORDER.md` avoids by
being generated rather than maintained, and the same one `LEARNINGS.md` names as "a merged migration
file is not an applied migration."

So the split is:

- **Derive everything derivable, at resume time, live.** Never store it.
- **Journal only what cannot be derived** — the architect's decisions, the current intent, the next
  intended action, and anything deliberately *not* done and why.

This also mechanically enforces the rule LEARNINGS already states: *"re-derive state before trusting
memory of what passed."* A resumed agent's first instinct is to trust its pre-kill memory; a tool that
opens with real `git status` output grounds it.

## Medusa-first note

**N/A — zero commerce surface.** No app code, no migration, no flag. Touch surface:
`scripts/session-resume.mjs`, `scripts/session-note.mjs`, `scripts/lib/log-branch.mjs` (reused
unchanged), `Roadmap/SESSION-KICKOFFS.md`, `Roadmap/WAYS-OF-WORKING.md`.

## What already exists (reuse, don't rebuild)

| Asset | Reuse as |
|---|---|
| `scripts/lib/log-branch.mjs` | **The whole persistence answer.** Appends a line to a dedicated `claude/` branch without touching the working tree — so parallel agents never collide on a shared index, and a routine's default push scope already covers it. Written and tested for `standup.mjs`; reused verbatim |
| `scripts/lib/gh-rest.mjs` | `listPulls`, `getPullMergeability`, `getStatusRollup` — the open-PR/CI/conflict read, already REST-only because GraphQL is blocked in at least one routine sandbox |
| `scripts/lib/cross-agent-cli.mjs` | `ensureGh`, `die`, `shortSha` |
| `standup.mjs`'s 3-repo constant | The same three repos, same reasoning |

**Nothing here needs a new dependency, a new branch convention, or a new auth path.**

## Architect's locked decisions (D1–D5)

**D1 · Two commands, deliberately asymmetric in cost.** `session-note.mjs` must be nearly free to
call (one line, append-only, no read) or agents won't call it under load. `session-resume.mjs` may be
expensive (many `gh` calls) because it runs once per session start.

**D2 · The journal is intent-only, and it is append-only.** Fields: timestamp, session label, kind
(`decision` | `doing` | `next` | `blocked` | `declined`), one line of text, optional refs. **No status
fields, no "done" markers** — a mutable journal invites an agent to update rather than append, and the
history is the point. Lives on `claude/session-journal` via `log-branch.mjs`.

**D3 · Resume output leads with what is surprising.** Not a data dump. Order: (1) anything *anomalous*
— a non-main branch with no open PR, a dirty tree, an open PR with red CI or a conflict, a migration
file merged but absent from `schema_migrations`; (2) the last N journal lines; (3) the full derived
state. An orchestrator reading this has limited attention at exactly the moment it matters.

**D4 · It must degrade, never die.** Every `gh` call already degrades to `available: false` per repo
in `standup.mjs`; keep that. An unauthenticated `gh`, a missing repo, or an empty journal must each
produce a *partial* brief with the gap named — never a stack trace. A resume tool that fails on a bad
day is a resume tool that fails on the only days it is needed.

**D5 · The migration check is a real cross-check, not a file listing.** Compare migration **files** in
the repo against `supabase_migrations.schema_migrations` live. This is the single most expensive
class of lost state we have (`LEARNINGS.md` and three separate memories record it), and resume time is
exactly when it should be surfaced. **Read-only** — it reports, it never applies.

## Model routing

Single sprint on **Sonnet 5** — mechanical over a fully locked contract, reusing four existing
modules. Fresh `pr-reviewer` on the PR.

## Risk tier

**LOW** — read-only tooling plus an append-only log on a `claude/` branch. No app code, no commerce
surface. The one place to be careful is D5's live DB read: it must use the read-only path and never
apply anything.

## Definition of Done (epic)

- [ ] S1 merged; `node --test scripts/` green.
- [ ] `session-resume.mjs` run for real in this repo and its output pasted in the PR — including the
      `apps/backend` stray-branch anomaly that motivated the epic.
- [ ] Degradation proven: run with `gh` unauthenticated and with an empty journal; both produce a
      partial brief, not a crash.
- [ ] `SESSION-KICKOFFS.md` opens with the resume step; `WAYS-OF-WORKING.md` records the journal habit.
- [ ] `RETROSPECTIVE.md`; poster + `LEARNINGS.md`; memory + `MEMORY.md` index.
