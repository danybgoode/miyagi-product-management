# Session kickoffs — prompt cheat sheet

Quick-reference prompts for starting a new session. **Fill the `<VALUES>` and paste.**

The principle: a kickoff is a **thin pointer, not a content dump**. Context lives in the durable docs
(`AGENTS.md`, `WAYS-OF-WORKING.md`, `LEARNINGS.md`, the epic/sprint files, team memory) — so the prompt just
*points* at them. This keeps prompts cheap and consistent, and it's **vendor-neutral**: any agent (Claude,
CODEX, Antigravity) re-orients from the same docs. It also sidesteps the biggest hidden cost in multi-agent
dev — the "communication tax" of re-passing large context (see the research note in `LEARNINGS.md`).

> `AGENTS.md` "Start here" already chains to `WAYS-OF-WORKING.md` + `LEARNINGS.md` + team memory, so naming
> **AGENTS + the one sprint/scope doc** is usually all the orientation an agent needs.

## Fill-in values
- `<ask>` — the raw one-line request
- `<epic-slug>` — e.g. `discovery-polish`
- `<NN-macro>` — macro-section folder, e.g. `01-discovery-and-shopping`
- `<N>` — sprint number
- `<risk>` — **LOW** (reviewer may auto-merge on green CI) / **HIGH** (Daniel merges)

## Command shorthands
A small, fixed vocabulary so the *instruction* half of a message is unambiguous — each verb just **points**
at a numbered kickoff/action below (same thin-pointer principle; vendor-neutral). Pleasantries are fine and
cost nothing — the leverage is the defined verb, not trimming "great work."

| Say this | Expands to |
|---|---|
| **Groom: \<ask\>** | §1 — groom a raw ask |
| **Build S\<N\> of \<epic\>** | §2 — build a sprint |
| **Spike \<name\>** | §3 — run a spike |
| **Review PR #\<N\>** | §4 — fresh-reviewer single pass |
| **Cross-review PR #\<N\> [codex\|antigravity]** | §4 advisory line — `node scripts/cross-review.mjs` (never gates) |
| **Wrap S\<N\>** | tick the sprint doc status + emit the §7 sprint-wrap terminal summary |
| **Close epic \<slug\>** | §6 — full epic Definition of Done |
| **Clear to merge — LOW** / **Daniel-merge** | the risk-tier gate: reviewer auto-merges on green CI / Daniel merges |
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

## 2 · Build a sprint — Claude Code (plan on strong model → execute)
```
Read apps/miyagisanchez/AGENTS.md (Start here) + Roadmap/LEARNINGS.md, then
Roadmap/<NN-macro>/<epic-slug>/README.md + sprint-<N>.md.
Build Sprint <N> of "<epic-slug>" per WAYS-OF-WORKING, in your OWN git worktree off latest main on
feat/<epic-slug>. Plan mode → confirm stories with me → build one story at a time. Commit per story
PATH-SCOPED (git add <your files> && git commit -- <those paths>; never -A). App copy is es-MX. One api spec
per testable story. Keep the CI gate (tsc + build + Playwright) green; open a draft PR declaring risk <risk>.
Write the sprint smoke walkthrough into sprint-<N>.md before calling it done.
```
*HIGH-risk: add — "all stories HIGH → Daniel merges; the authed money-path browser smoke is owed to Daniel."*

## 3 · Run a spike — Claude Code (strong model)
```
Read apps/miyagisanchez/AGENTS.md (Start here) + Roadmap/LEARNINGS.md, then <brief path>.
Run the <name> spike: time-boxed, READ-ONLY investigation → a written DECISION appended to the brief. No
branch, no code. Answer the brief's questions against the live codebase; sort each capability into
already-possible / light-enhancement / genuinely-new; end with Go / No-go / Go-with-constraints.
I sign off the decision before anything gets groomed.
```

## 4 · Review a PR — fresh reviewer (NOT the builder)
```
Review PR #<N> as a fresh reviewer — you did NOT build it. Run gh pr diff <N> and read the changed files.
SINGLE PASS on a green CI gate — no iterative refine loop. Check correctness + the five AGENTS rules
(Medusa owns commerce · Supabase non-commerce only · UCP/MCP first-class · Clerk untouched · es-MX copy).
Do not use /code-review ultra. Post findings; <LOW: auto-merge on green CI / HIGH: hand to Daniel>.
Optional (suggested on HIGH): a different-model-family second opinion —
node scripts/cross-review.mjs <N> --agent codex|antigravity (advisory only, single-pass, never gates).
```

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
each sprint-N.md has its smoke walkthrough · README ✅ · RETROSPECTIVE.md written · product poster
(Roadmap/README.md) updated · team memory + MEMORY.md index updated · promote durable learnings into
LEARNINGS.md (dedupe — sharpen, don't append near-duplicates) · branch deleted.
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
