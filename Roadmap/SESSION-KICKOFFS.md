# Session kickoffs — prompt cheat sheet

Quick-reference prompts for starting a new session. **Fill the `<VALUES>` and paste.**

The principle: a kickoff is a **thin pointer, not a content dump**. Context lives in the durable docs
(`AGENTS.md`, `WAYS-OF-WORKING.md`, `LEARNINGS.md`, the epic/sprint files, team memory) — so the prompt just
*points* at them. This keeps prompts cheap and consistent, and it's **vendor-neutral**: any agent (Claude,
CODEX, Antigravity) re-orients from the same docs. It also sidesteps the biggest hidden cost in multi-agent
dev — the "communication tax" of re-passing large context (see the research note in `LEARNINGS.md`).

> `AGENTS.md` "Start here" already chains to `WAYS-OF-WORKING.md` + `LEARNINGS.md` + team memory, so naming
> **AGENTS + the one sprint/scope doc** is usually all the orientation an agent needs.

## 0 · Before any kickoff — derive the state, don't remember it

```
node scripts/session-resume.mjs
```

Run this **first, every session**, and especially when resuming one that ended unexpectedly. It
re-derives across all three repos — current branch, dirty trees, worktrees, open PRs with CI and
mergeability, and migration drift in both directions — and leads with what is *surprising* rather than
dumping state. `--json` for machine use; `--all-migrations` to expand the collapsed orphan summary.

**Why derive rather than read a status file:** almost everything above changes between sessions, so a
stored snapshot is stale by the time anyone reads it — and a stale snapshot is worse than none, because
it reads as authoritative. The only thing that *can't* be derived is **intent**, which is what the
journal carries:

```
node scripts/session-note.mjs --kind decision "chose X over Y because Z" --refs PR#312,D4
```

Write a line at each locked decision and each sprint/PR boundary. It is append-only and fails soft, so
it can never break the work it is recording. **The one thing neither tool can recover is a decision
nobody journalled** — that is the honest boundary, and the reason to write the line.

*(This complements, and does not replace, the subagent-resume rule: when a **worker** dies, message the
same agent id and it resumes from its transcript. That covers a dead worker; this covers a dead
orchestrator. See `LEARNINGS.md` → salvage the tree.)*

## Fill-in values
- `<ask>` — the raw one-line request
- `<epic-slug>` — e.g. `discovery-polish`
- `<NN-macro>` — macro-section folder, e.g. `01-discovery-and-shopping`
- `<N>` — sprint number
- `<risk>` — **LOW** (an agent other than the builder may merge on green CI, once the cross-agent review is clean or answered) / **HIGH** (Daniel merges; the fresh-reviewer pass is mandatory)

## Command shorthands
A small, fixed vocabulary so the *instruction* half of a message is unambiguous — each verb just **points**
at a numbered kickoff/action below (same thin-pointer principle; vendor-neutral). Pleasantries are fine and
cost nothing — the leverage is the defined verb, not trimming "great work."

| Say this | Expands to |
|---|---|
| **Groom: \<ask\>** | §1 — groom a raw ask |
| **Build epic \<epic\>** | §2 — build a WHOLE epic in one orchestrated run (**the default**) |
| **Build S\<N\> of \<epic\>** | §2b — build a single sprint (the exception) |
| **Spike \<name\>** | §3 — run a spike |
| **Review PR #\<N\>** | §4 — route it: `node scripts/review-route.mjs --builder <who> <N>` → one external general pass, a security lens when the paths trigger it, and the fresh `pr-reviewer` subagent |
| **Cross-review PR #\<N\>** | §4 — synonym. **REQUIRED on every PR**, run locally. Always route it; hand-picking `--agent` is how a family ends up reviewing its own diff. Resolve every finding before merge; the run itself never authorizes one |
| **Refund \<tool\>** | a reviewer family is capped — Daniel tops up the quota so the external layer stays lit instead of being replaced by orchestrator subagents |
| **Panel: \<scope-doc \| ask\>** | advisory second opinion on a *plan* — `node scripts/cross-panel.mjs <doc> --lens both --agent codex\|antigravity` (single-pass, print-only, never gates; surfaced at groom Stage 2/4) |
| **Wrap S\<N\>** | tick the sprint doc status + emit the §7 sprint-wrap terminal summary |
| **Close epic \<slug\>** | §6 — full epic Definition of Done |
| **Clear to merge — LOW** / **Daniel-merge** | the risk-tier gate: an agent other than the builder merges on green CI (cross-agent review clean or answered) / Daniel merges |
| **Next** | proceed to the next story/sprint per the current `sprint-N.md` |

---

## 1 · Groom a raw ask — Cowork (strong model)
```
Groom: <ask>.
Read apps/miyagisanchez/AGENTS.md (Start here) + Roadmap/LEARNINGS.md; skim team memory + Roadmap/00-ideas/BUILD-ORDER.md.
Use the groom skill — planning only, no code. Orient → classify → "can we already do this?" → disambiguate
→ Medusa-first reframe → slice into sprints. Land the scope doc; on my approval, scaffold the epic + sprint
docs (commit path-scoped) and emit the per-sprint Claude Code kickoffs. Never assume — validate at each gate.
```

## 2 · Build a WHOLE epic — epic mode *(the default)*

**Generate this prompt; don't hand-compose it.** A hand-composed epic kickoff is where the
architecture-lock pass gets summarised away and the review policy reverts to memory:

```
node skills/groom/emit-epic-kickoff.mjs --epic <epic-slug>
```

Reads the epic README + every `sprint-N.md` and prints the finished orchestrator prompt. Paste as-is.
SSOT for what it carries: WAYS-OF-WORKING → *Epic-mode builds* — lock `D1…Dn` against live code and the
live DB before delegating, stack the branches, two routed cross-family review passes per PR (no
orchestrator subagent reviewers on LOW), merges pre-authorized on green, **done means shipped**.

## 2b · Build a single sprint — *the exception*

Only for a one-sprint epic, or when a sprint's outcome genuinely changes the next sprint's scope. Say
which when you use it.
```
Read apps/miyagisanchez/AGENTS.md (Start here) + Roadmap/LEARNINGS.md, then
Roadmap/<NN-macro>/<epic-slug>/README.md + sprint-<N>.md.
Build Sprint <N> of "<epic-slug>" per WAYS-OF-WORKING, in your OWN git worktree off latest main on
feat/<epic-slug>. Plan mode → confirm stories with me → build one story at a time. Commit per story
PATH-SCOPED (git add <your files> && git commit -- <those paths>; never -A). App copy is es-MX. One api spec
per testable story. Keep the CI gate (tsc + build + Playwright) green; open a draft PR declaring risk <risk>.
Route the review with `node scripts/review-route.mjs --builder <you> <PR#>` — it prints one external
general pass, a security lens when the changed paths trigger it, and the fresh `pr-reviewer` subagent
(money/auth PRs only in this repo; see §4).

> **Mirrored to Notion.** This §2 prompt is generated per-sprint by `scripts/roadmap-to-notion.mjs`
> (`sprintKickoff()`) and synced into each Sprint card's **"Kickoff"** property — so opening a Grain=Sprint card
> gives you the ready-to-paste prompt (epic-slug · sprint doc · risk tier auto-filled; HIGH-risk addendum
> included). **If you change this template, update `sprintKickoff()` to match** (it's the SSOT for what lands in
> Notion). Values populate on the next `--sync` run.

## 3 · Run a spike — Claude Code (strong model)
```
Read apps/miyagisanchez/AGENTS.md (Start here) + Roadmap/LEARNINGS.md, then <brief path>.
Run the <name> spike: time-boxed, READ-ONLY investigation → a written DECISION appended to the brief. No
branch, no code. Answer the brief's questions against the live codebase; sort each capability into
already-possible / light-enhancement / genuinely-new; end with Go / No-go / Go-with-constraints.
I sign off the decision before anything gets groomed.
```

## 4 · Review a PR — one external pass (+ a security lens when triggered), routed (NOT the builder)

```
node scripts/review-route.mjs --builder <who-wrote-it> <N>
```

It prints the exact commands: the **general pass** by the highest-preference family that did not build
the diff, the **security lens** by the next family when a changed path matches `scripts/review-config.json`
→ `securityPaths` (or the body declares `risk: high`), and the **fresh `pr-reviewer` subagent** — family
independence and context independence, each covered once.

A capped family simply falls to the next in the order (`codex → agy → vibe → claude`); there is no refund
pause. If only one family can run it runs both prompts and you say so in the PR body; if none can, the
layer is DARK and you say that. **A reviewer that returns nothing is a FAILED run** — the script prints
its reply, exits non-zero and fails the PR's `cross-review/<lens>` status; it is never a clean review.
Health/pins: `node scripts/cross-agent-doctor.mjs [codex|agy] [--fix]`.

Findings are fixed, or answered on the PR. Neither pass authorizes a merge; the builder merges on a green
gate at any tier (`WAYS-OF-WORKING.md` → *Review & merge*).

## 5 · Strategy / process work — Cowork (strong model)
```
Read apps/miyagisanchez/AGENTS.md (Start here), Roadmap/WAYS-OF-WORKING.md, Roadmap/LEARNINGS.md; skim team
memory + Roadmap/00-ideas/BUILD-ORDER.md.
<task>. Docs/planning only. Never assume — validate before editing any canonical doc. No git commits (flag
the changed files for me to review + commit).
```

## 6 · Close an epic — Claude Code / Cowork
```
Close epic <epic-slug> per WAYS Definition of Done (epic): all sprints merged + smoke-tested (gaps stated) ·
each sprint-N.md has its smoke walkthrough · README ✅ AND its frontmatter `status: shipped` (the SSOT) ·
regenerate the board (`node scripts/build-order.mjs` — never hand-edit BUILD-ORDER.md) · RETROSPECTIVE.md
written · product poster (Roadmap/README.md) updated · team memory + MEMORY.md index updated · promote
durable learnings into LEARNINGS.md (dedupe — sharpen, don't append near-duplicates) · branch deleted.
```

## 7 · Sprint-wrap terminal summary — what an agent prints when a sprint lands
The on-screen handoff when a sprint wraps (triggered by the **"Wrap S\<N\>"** shorthand). This is the
*terminal* message, **not** a doc — the durable record is the `sprint-N.md` (+ `RETROSPECTIVE.md` at epic
close). Keep it a **thin pointer + the delta Daniel must act on**; do **not** re-narrate what the doc already
holds (that re-summary is the only "double work" here — the fix is to point, not repeat).
```
✅ S<N> "<epic>" wrapped — <one line: what shipped>
Merged:  PR #<N> (<commit>) · risk <LOW|HIGH>
Gate:    tsc + build + Playwright green (CI <run id/link>)
Owed to you (can't self-smoke): <money/auth/browser steps by name — or "none">
Next:    <next story/sprint — or DECISION needed from you>
Detail:  Roadmap/<NN-macro>/<epic>/sprint-<N>.md   ← source of truth, not repeated here
```

---

*These mirror what the `groom` skill emits (Stage 8) — keep the two in sync. Conventions baked in: own
worktree + path-scoped commits, es-MX copy, risk tier, single-pass review, strong-model planning.*
