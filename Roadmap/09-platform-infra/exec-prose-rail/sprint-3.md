# Executive prose rail — Sprint 3: the weekly recap at exec altitude, and the lessons loop

**Status:** ⬜ not started

> The second scheduled surface, at a higher altitude — themes, not events. Then the loop that makes
> the rail improve rather than merely exist.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D2–D7 and S2's `--brief`/`--post` shape as **given** — this sprint mirrors it, it
does not redesign it.

- **A weekly is not a long standup.** The standup answers "what moved since yesterday"; the weekly
  answers "what is now possible that was not on Monday, and what is still owed." Group by **theme**,
  never by commit or by repo. A list of merges is not a report, and the length budget is not
  permission to enumerate.
- **`weekly-recap.mjs` already owns a WINDOW tracker**, deliberately different from the standup's
  delta-snapshot diffing: next run's `since` = last logged `windowEnd`, so cadence drift never
  double-counts. **Do not "unify" the two log strategies** — a week either happened or it didn't;
  there is no diff to take. This asymmetry is correct and documented in the script header.
- Its `--since` / `--until` backfill flags must keep working.
- Reuse S2's evidence-pack builder; the difference is window, altitude and budget, not machinery.

## Stories

### Story 3.1 — `--brief` / `--post --prose-file` on `weekly-recap.mjs` ⬜
**As a** product owner, **I want** the weekly recap to read like a CPO wrote it, **so that** I get the
week's through-line instead of a merge tally.
**Acceptance:**
- Same two-phase contract as S2, same pure guard, same persona — with `weekly.task.md` and a longer
  budget than the standup's.
- Evidence pack leads with **shipped/closed epics** (the `status:` frontmatter flips it already
  detects) and their retro digests — the highest-altitude product input we own — then merged-PR
  volume as corroboration.
- **Explicitly instructs the writer to group by theme and to name what is still owed.** The owed
  ledger is sacred (house voice); a weekly that omits a known gap is the one unforgivable error.
- Empty window → the existing one-line "quiet week" message. **No writer call** (D7).
- `--dry-run` stays fully read-only; `--since`/`--until` still work.

### Story 3.2 — `weekly-recap.prompt.md` teaches the same loop ⬜
**As the** weekly routine, **I want** the identical write→guard→revise loop, **so that** both scheduled
surfaces behave the same way.
**Acceptance:**
- Mirrors S2's step-4 rewrite, including the **"the routine writes it itself; do not call devin/agy"**
  line and the `--force-post` second attempt.
- Preserves the existing failure-ping and advisory-only guarantees verbatim.

### Story 3.3 — the lessons loop, wired and documented ⬜
**As the** team, **I want** each caught mistake to protect every future report, **so that** the rail
improves instead of repeating itself.
**Acceptance:**
- `scripts/prose-lessons.md` is injected into **every** writer prompt on **both** backends — verified
  by a test asserting a lessons line reaches the composed prompt for the routine brief *and* the local
  `writeProse` path. (A shared file that only one backend actually reads is the silent-failure shape
  this epic exists to prevent.)
- `WAYS-OF-WORKING.md` gains a short **"Prose rail"** subsection: the two backends and why they
  differ (D1), the two-phase loop, and the **rule that a caught mistake is added as a lessons line
  and, when mechanically detectable, as a guard rule + test**.
- The `## Gotchas` section required by our skill conventions is present wherever a skill wraps this.

## Definition of Done (sprint)
- [ ] `node --test scripts/` green.
- [ ] Every new spec observed red once.
- [ ] A real weekly `--brief` + guarded round trip pasted in the PR.
- [ ] `WAYS-OF-WORKING.md` updated.
- [ ] Cross-agent review run; findings resolved.
