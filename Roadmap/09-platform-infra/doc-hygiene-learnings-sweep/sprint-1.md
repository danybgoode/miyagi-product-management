# Doc hygiene — Sprint 1: the sweep + the rolling skill

**Status:** ✅ SHIPPED 2026-07-02 (both stories; `chore/doc-hygiene-learnings-sweep` — commits `2fe5f9c`
S1.1, `3a80c6e` + `29124b9` S1.2)

## Stories

### Story 1.1 — One-time de-noise sweep of LEARNINGS.md + the README poster ✅
**As a** builder starting a fresh session, **I want** the always-read docs de-noised, **so that** each
session costs less context without losing any durable learning.
**Acceptance:**
- A pass over `Roadmap/LEARNINGS.md`: merge near-duplicate lines, prune stale/superseded entries, tighten
  wording. Every retained line keeps its **why + date/source**. Present as a **reviewed diff** plus a short
  **"what was removed and why"** note — no silent deletions. ✅ Done — see `RETROSPECTIVE.md` for the
  categorized list; Daniel reviewed the diff in-session and confirmed no durable learning was lost.
- The same lighter pass on `Roadmap/README.md` (poster): drop dead lines, keep the ✅=enforced-in-code
  accuracy. ✅ Audited the Feature map — no dead/wrong lines found; left "Recent highlights" untouched
  (out of scope, a changelog not a status claim).
- Report **before/after** line + KB counts for both files. ✅ `LEARNINGS.md`: 1,155→980 lines (−15%),
  117,700→96,716 bytes (−18%). `README.md`'s Feature map: audited, nothing to cut (322 lines / 115,248
  bytes at audit time); the poster's final count in this PR is 331 lines / 116,142 bytes because this
  same close adds one "Recent highlights" entry for this epic's own shipment — expected growth, not a
  missed sweep target.
- Daniel confirms no durable learning was dropped before merge. ✅ Confirmed in-session before Story 1.2.
**Risk:** Low (docs only; a reviewed diff, human-merged).

### Story 1.2 — The `doc-hygiene` skill (rolling maintenance) ✅
**As a** product owner, **I want** a repeatable skill that keeps the always-read docs from re-bloating,
**so that** hygiene is a standing, low-effort process not a one-off.
**Acceptance:**
- A committed skill (`skills/doc-hygiene/` — the D-spike convention decision hadn't landed yet, so used
  the kickoff's stated default) that measures the size of the always-read set, flags dedupe/staleness
  candidates in `LEARNINGS.md` + the poster, and emits an advisory report in the `HYGIENE-REPORT-*.md`
  format. ✅ `scripts/doc-hygiene.mjs` + `skills/doc-hygiene/SKILL.md`; first real report committed at
  `Roadmap/00-ideas/DOC-HYGIENE-REPORT-2026-07-02.md`.
- The weekly **Routine C** invokes it (or its prompt) as part of the hygiene pass. ✅
  `scripts/routines/roadmap-hygiene.prompt.md` step 4 + `scripts/routines/README.md` updated.
- It **never auto-edits** — proposals only, human merges (matches the standing HYGIENE-REPORT rule). ✅
  Verified live: `node scripts/doc-hygiene.mjs` touched zero existing docs, wrote only its own new report.
- Description written for the model (trigger words), with a Gotchas section (LEARNINGS' "keep why+date",
  "sharpen don't append" rules). ✅
**Risk:** Low (advisory tooling).

## Sprint QA
- **api spec(s):** none — no code surface.
- **browser smoke owed:** no.
- **deterministic gate:** N/A (docs/tooling). If the skill ships a script, `node --check` it; otherwise
  verify by running the skill once and reading its report. ✅ `node --check scripts/doc-hygiene.mjs` passes;
  live run confirmed (see Story 1.2).

## Sprint 1 — Verification walkthrough (do these in order)
Env: the repo docs + the new skill (process change, no app deploy — no production URL).

1. Open the A-1 PR diff for `Roadmap/LEARNINGS.md`.
   → You see only merges/tightening/stale-prunes; every kept line still has its why + date; the "removed &
   why" note lists what went and no durable learning is among it. Before/after KB counts are reported.
2. Check `Roadmap/README.md` poster in the same PR.
   → Dead lines gone; ✅ markers still mean enforced-in-code.
3. Run the `doc-hygiene` skill on demand (or trigger a Routine C run).
   → It emits a `HYGIENE-REPORT-*.md`-style advisory report with size measurements + flagged candidates, and
   makes **no** direct edits to the docs.
4. Start a fresh session afterward and spot-check the always-read set size.
   → Measurably smaller than before the sweep.

If any step fails, note the step number + what you saw — that's the bug report.

## Kickoff prompt (paste into a fresh Claude Code session)
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/00-ideas/2. readyforscope/doc-hygiene-learnings-sweep.md and
> Roadmap/09-platform-infra/doc-hygiene-learnings-sweep/README.md + sprint-1.md.
>
> You're building Sprint 1 of "Doc hygiene" — two LOW-risk docs/tooling stories, monorepo-root repo. Enter
> plan mode, confirm with me, then branch chore/doc-hygiene-learnings-sweep off latest main.
> Story 1.1: de-noise Roadmap/LEARNINGS.md (merge near-duplicates, prune stale/superseded, tighten) and do a
> lighter pass on Roadmap/README.md — KEEP every retained LEARNINGS line's why+date/source, dedupe by
> sharpening not appending, NO silent deletions. Produce the diff + a "removed & why" note + before/after
> line/KB counts, and WAIT for my confirmation that no durable learning was lost before merging.
> Story 1.2: build a doc-hygiene skill (home per the skills-library-audit spike's convention — default
> skills/doc-hygiene/) that measures the always-read set, flags dedupe/staleness in LEARNINGS + the poster,
> and emits a HYGIENE-REPORT-*.md-style advisory report; wire weekly Routine C to invoke it; it must NEVER
> auto-edit. Description-for-the-model + a Gotchas section (the LEARNINGS discipline). Path-scoped commits.
> Open a PR declaring LOW risk. Don't fight the generators (edit source docs; let build-order/notion re-derive).
> Note: do the sweep before we load more skills into session context. Write nothing to tasks/.
