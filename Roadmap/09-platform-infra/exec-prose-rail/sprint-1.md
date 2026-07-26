# Executive prose rail — Sprint 1: the shared guard, the CPO persona, the local writer rail

**Status:** ⬜ not started

> The foundation both other sprints import: a pure guard, a devin→agy writer with guard-and-retry,
> the persona/task files, and the accumulating lessons file. Ends by proving the rail on a real
> surface — `prose-draft.mjs`.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D1–D8. Do not re-derive them. Specifically:

- **Port, don't invent.** `~/dobby/golden-beans/scripts/lib/prose-guard.mjs` and `prose-writer.mjs`
  are the reference implementations. Read them first. Their comments record *measured* failures —
  preserve that reasoning in the ported comments; it is why the rules exist.
- **Reuse our own primitives.** `scripts/lib/cross-agent-cli.mjs` already exports `hasCmd`,
  `loadPromptBody`, `runAntigravity` (honours `opts.models`), and `runDevin` (already `--prompt-file`).
  **Do not add a second devin/agy spawn path** — golden-beans has its own copies because it is a
  separate repo, not because two are wanted.
- **Signature difference to watch:** our `runDevin(prompt, opts, deps)` returns a *string* (or calls
  `fail()`), while golden-beans' returns `{ ok, text, error }`. Adapt at the boundary — pass
  `{ soft: true }` and treat a falsy return as failure. Getting this wrong makes every failure look
  like success.
- **`node:test` only.** Zero new npm dependencies. Matches all 27 existing `scripts/*.test.mjs`.

## Stories

### Story 1.1 — `scripts/lib/prose-guard.mjs`: the pure mechanical check ⬜
**As a** product owner, **I want** every machine-drafted report checked before I read it, **so that**
a confident falsehood never reaches me as status.
**Acceptance:**
- Exports `checkProse(draft, evidence)` → `{ ok, findings[] }` and `findingsToRevisionNote(findings)`.
- **Pure** — no I/O, no spawn, no clock. Every rule unit-tested.
- Rules ported from golden-beans: `empty`, `too-long`/`too-short`, `unfinished`, `marketing-language`,
  `names-implementation`, `unsupported-fix-claim`, `invented-commitment`, `invented-beneficiary`.
- Evidence flags `allowsFixClaim` / `allowsBeneficiary` gate the last two; `invented-commitment` is
  **unconditional** (D6 — no evidence could legitimately unlock a fabricated date).
- **New rule `flag-state-claim` (D6):** flags a draft asserting a capability is live/enabled/available
  when `evidence.liveFlags` does not list it. Ships with a test proving a flag-OFF epic cannot be
  reported as live.
- `BANNED_TOOL_NAMES` adapted to our stack (add `medusa`, `clerk`, `cloud run`, `mercado ?libre`;
  keep golden-beans' deliberate omission of bare `react`/`next` and **carry its comment explaining
  why** — a guard that rejects correct English teaches people to bypass it).
- Each finding's `note` is written to be handed straight back to a writer as an instruction.

### Story 1.2 — `scripts/lib/prose-writer.mjs`: devin → agy, guard-and-retry ⬜
**As an** agent drafting internal prose, **I want** one rail with a fallback and a retry, **so that**
a capped writer or a flawed draft doesn't cost the artifact.
**Acceptance:**
- Exports `writeProse({ prompt, evidence, preferred })` → `{ ok, text, writer, model, guard, attempts }`,
  `planWriters(...)` (pure, so the routing policy is pinned by a test), `buildWriterPrompt(...)`,
  `loadLessons()`.
- **Order is the policy: devin first, agy fallback** — devin was installed as a third review seat and
  sits idle, while codex/agy quota is the scarce resource the builders lean on. Division of labour,
  not a ranking. Put that reasoning in a header comment.
- Two passes per writer: draft → guard → revise-once with findings. **Keep the LATEST draft as the
  fallback, not the first** — golden-beans' cross-review caught exactly this bug (`if (!best)` pinned
  the pass-0 draft and threw away the revision written to address the findings).
- Retry once on an **empty response** before demoting a writer (a measured transient, 2026-07-25).
  Empty output on exit 0 is **failure**, never silently absorbed.
- `PROSE_MODEL` for the agy path = **`gpt-oss-120b-medium`, single, no Gemini fallback**. Our current
  `prose-draft.mjs` default is `gemini-3.5-flash-high` — *the exact constant golden-beans identified as
  having silently destroyed the register of every report.* Record that in a comment so nobody
  "helpfully" restores a Gemini fallback.
- Unit tests drive both writers through injected `deps` — no real CLI, no network, no temp files.

### Story 1.3 — the CPO persona + task files + lessons file ⬜
**As a** reader, **I want** the reports written in one deliberate voice, **so that** quality is
consistent instead of per-run luck.
**Acceptance:**
- `scripts/prose/cpo-persona.md` — the shared register (D5). Header above the first `---` is
  notes-to-humans and is stripped by `loadPromptBody`; **never put instructions to the model there.**
- `scripts/prose/{standup,weekly,internal}.task.md` — per-surface task blocks (audience, altitude,
  length budget, what "done" looks like for that surface).
- `scripts/prose-lessons.md` — accumulating corrections, injected into **every** writer prompt on both
  backends. Seeded with golden-beans' five measured lessons (**quoting the actual bad sentences** — an
  abstract rule changes nothing; a verbatim failure is what a model pattern-matches against) plus a
  house rule for `flag-state-claim`.
- The file documents its own contract: quote the real sentence; if mechanically detectable, **also**
  add a guard rule + test. A lesson reduces a mistake; a guard catches it. Prefer both.

### Story 1.4 — `prose-draft.mjs` rides the shared rail ⬜
**As the** coordinating agent, **I want** retro/poster/sprint-wrap drafts guarded too, **so that** the
rail is proven on a real surface before the routines depend on it.
**Acceptance:**
- `prose-draft.mjs` calls `writeProse` instead of `runAntigravity` directly. Its three `--kind` task
  blocks stay; the style prompt now composes persona + `internal.task.md` + lessons.
- Gains devin-first routing, the guard, and the retry it has never had.
- The advisory banner names **the writer and the model that actually ran**, and says whether the guard
  passed clean — a paste-without-reading stays self-identifying in review.
- Existing `scripts/prose-draft.test.mjs` still passes (adapt where the seam moved; do not delete
  coverage).
- **Verify by running, not by existence** (LEARNINGS): execute it for real against a shipped epic dir
  and paste the output in the PR.

## Definition of Done (sprint)
- [ ] `node --test scripts/` green, including new guard + writer suites.
- [ ] Every new spec observed failing at least once (deliberate mutation) — stated in the PR.
- [ ] A real `prose-draft.mjs` run pasted in the PR body.
- [ ] Cross-agent review run; findings resolved. Fresh `pr-reviewer` (Opus 5) — this sprint defines the
      contract S2/S3 import.
