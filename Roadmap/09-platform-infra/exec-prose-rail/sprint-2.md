# Executive prose rail — Sprint 2: the daily standup, written by the routine

**Status:** ⬜ not started

> The first scheduled surface. `standup.mjs` gains a two-phase mode so the routine's own model writes
> the prose in-context and the same pure guard checks it. Prose leads; the actionable signals stay.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D2, D4, D7, D8 — and S1's modules as **given**, not to be re-litigated.

- **Do not touch the gather/diff/log/send stages.** `gatherRepoPrs`, `buildSnapshot`,
  `diffSnapshots`, `appendRunAndPush`, `sendTelegram` and the deck/registry calls are correct and
  under test. This sprint changes **what goes in the message body**, plus two new CLI modes. A diff
  that rewrites the gather stage is out of contract.
- **`--dry-run` must stay fully read-only.** It already refuses to append to the log, touch git,
  Telegram, or the report registry (`upgradeArtifactLinks(..., { dryRun: true })`). The new modes
  must preserve that exactly — it is the mode every agent uses to test.
- **The 4096-char Telegram limit is a live, previously-fatal constraint.** A missing baseline once
  enumerated 100+ PRs and crashed before posting *or* persisting the log, so the next run re-derived
  the same crash. Prose is now competing for that budget. `appendStandupArtifactsToMessage` already
  takes the cap — the prose block must be budgeted **before** it, not trimmed after.
- **Reuse the `status:`-flip parser in `weekly-recap.mjs`.** Do not write a second one (D4).

## Stories

### Story 2.1 — `--brief`: the deterministic evidence pack ⬜
**As the** nightly routine, **I want** one command that hands me everything I need to write, **so that**
I never guess at repo state.
**Acceptance:**
- `node scripts/standup.mjs --brief` prints, to stdout: the CPO persona, the standup task block, the
  accumulated lessons, then the evidence pack in D4's order — **roadmap deltas first**, then owed,
  then repo signals, then areas touched.
- **Writes nothing, sends nothing, touches no git.** Same read-only guarantee as `--dry-run`.
- Roadmap deltas come from epic README `status:` frontmatter flips and sprint `**Status:**` changes in
  the window, via the existing parser.
- Emits the evidence flags the guard will use — `allowsFixClaim`, `allowsBeneficiary`, `liveFlags`,
  `maxWords` — **derived from the window**, never assumed. `liveFlags` reads the flag registry so
  D6's `flag-state-claim` rule has real input.
- **Empty window (D7):** emits an explicit "quiet night — do NOT write prose" instruction instead of
  an evidence pack. Unit-tested: an empty window must never produce a writable brief.

### Story 2.2 — `--post --prose-file`: guard, then post ⬜
**As the** nightly routine, **I want** my draft mechanically checked before it posts, **so that** a
falsehood doesn't reach the channel as status.
**Acceptance:**
- `node scripts/standup.mjs --post --prose-file <path>` reads the draft, runs `checkProse` with the
  same derived evidence, and on findings **exits non-zero printing the numbered revision note** —
  posting nothing.
- `--force-post` posts a flagged draft anyway, labelled `⚠ flagged draft`. D3: a labelled imperfect
  report beats a missing one. The routine's second attempt uses it.
- A clean draft posts and **then** appends + pushes the log snapshot — unchanged ordering, so a failed
  post never advances the baseline.
- Message shape per D8: header → prose → trimmed actionable signals (CI red, conflicts, owed count) →
  deck link. Prose is HTML-escaped through the existing helper.
- `--post --prose-file` composes with `--dry-run` (guard + print, post nothing) — the mode agents test with.

### Story 2.3 — `ops-nightly.prompt.md` teaches the loop ⬜
**As the** routine, **I want** the write→guard→revise loop written down, **so that** it runs the same
way every night.
**Acceptance:**
- Step 4 becomes: run `--brief` → write the prose in-context as the CPO persona → save to a temp file →
  `--post --prose-file` → **on a non-zero exit, revise once against the printed findings and re-run
  with `--force-post`**.
- States plainly: **the routine writes the prose itself; it must not call devin/agy** (neither is
  authenticated in the routine sandbox — D1). This is the single most important line in the file.
- The quiet-night path (D7) is explicit: a quiet night is a **successful** run; do not manufacture an update.
- The existing failure-ping and "advisory only, never a gate" guarantees are preserved verbatim.

## Definition of Done (sprint)
- [ ] `node --test scripts/` green; new modes covered including the empty-window and over-budget cases.
- [ ] Every new spec observed red once.
- [ ] A real `--brief` output **and** a real guarded `--post --dry-run` round trip pasted in the PR.
- [ ] Cross-agent review run; findings resolved.
