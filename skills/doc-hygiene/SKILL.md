---
name: doc-hygiene
description: >
  Keeps the always-read session-start docs (apps/miyagisanchez/AGENTS.md,
  Roadmap/WAYS-OF-WORKING.md, Roadmap/LEARNINGS.md, Roadmap/README.md poster) from re-bloating after
  the one-time de-noise sweep. Use when Daniel asks to "check doc hygiene", "measure LEARNINGS size",
  "is LEARNINGS bloated again", "run the doc hygiene report", or as the weekly Routine C hygiene pass.
  Runs scripts/doc-hygiene.mjs, reviews its flagged candidates against the source docs, and emits a
  dated advisory report. Never edits Roadmap docs — proposals only, Daniel/the builder hand-merges.
---

# Doc hygiene — rolling maintenance for the always-read set (Cowork or Claude Code)

> **This skill never writes to `Roadmap/LEARNINGS.md` or `Roadmap/README.md`.** It measures, flags
> candidates, and writes ONE new dated report file (`Roadmap/00-ideas/DOC-HYGIENE-REPORT-<date>.md`).
> Any actual edit to the source docs is a separate, human-reviewed change — same discipline as the
> standing `HYGIENE-REPORT-*.md` convention from Routine C.

## When to run me
Daniel asks to check doc hygiene, measure the always-read set, or investigate whether `LEARNINGS.md`/
the poster are bloating again — or the weekly **Routine C** roadmap-hygiene pass invokes me as its
fourth step (`scripts/routines/roadmap-hygiene.prompt.md`).

## What already exists (reuse, don't rebuild)
- **`scripts/doc-hygiene.mjs`** — the mechanical part. Run it first, always:
  `node scripts/doc-hygiene.mjs` (writes the dated report) or `node scripts/doc-hygiene.mjs --check`
  (prints only, writes nothing — use this for a quick look or when just verifying the script itself).
- **`scripts/roadmap-to-notion.mjs --extract`** — the epic-status SSOT the script's "archived epic
  mention" check reads. Don't re-parse frontmatter yourself.
- **`Roadmap/00-ideas/HYGIENE-REPORT-*.md`** — the sibling dated-advisory-report format from Routine C
  (funnel/status drift). This skill's report is a **different concern** (doc size/dedupe, not
  funnel/epic status), hence the distinct `DOC-HYGIENE-REPORT-` filename — don't conflate the two.
- **The `doc-hygiene-learnings-sweep` epic** (`Roadmap/09-platform-infra/doc-hygiene-learnings-sweep/`)
  — the one-time sweep this skill exists to keep from being needed again. Its `RETROSPECTIVE.md` has
  the original before/after numbers if you need a size baseline.

## Stage 1 — Run the script
`node scripts/doc-hygiene.mjs` (or `--check` for a dry look). It prints:
- the always-read set's line/KB sizes (a table), so you can compare against the last known-good
  baseline (the sweep's before/after, or the previous `DOC-HYGIENE-REPORT-*.md`);
- **flagged candidates** in `LEARNINGS.md` and the `README.md` poster: possible near-duplicate bullets
  (same section, high word overlap), referenced file paths not found in any known app root, and
  bullets mentioning an epic whose README frontmatter is now `Archived`.

## Stage 2 — Verify every flagged candidate before reporting it as real (the script is deliberately dumb)
The script's heuristics are cheap word-overlap and path-existence checks — they exist to **narrow
where to look**, not to assert staleness. For each flagged item:
- **Near-duplicate bullets**: read both bullets in context. A shared topic with different why/date/
  source is *not* a duplicate — the LEARNINGS discipline (below) explicitly wants related lessons kept
  as separate bullets when they're separate incidents.
- **Dead path reference**: check both app roots (`apps/miyagisanchez/`, `apps/backend/`) before
  concluding a path is gone — this checkout is not authoritative for either app's own `main` (they're
  separate, gitignored repos here). A bullet describing a **swap** (e.g. "converted `app/robots.ts` →
  `app/robots.txt/route.ts`") will *always* flag the old path — that's the bullet correctly documenting
  history, not staleness.
- **Archived-epic mention**: read the bullet. Mentioning an archived epic isn't wrong by itself (a
  bullet can legitimately reference the epic that *caused* an archival, e.g. "supersedes the
  neon-egress spike's call") — only flag it onward if the *lesson itself*, not just the epic name, is
  now incorrect.

## Stage 3 — Emit the report, propose, don't touch
Write the dated report (the script does this automatically unless `--check`). If Stage 2 turned up a
genuine candidate worth acting on, **propose it in the report** (or, if invoked ad hoc by Daniel, describe
the specific edit you'd make) — do not edit `LEARNINGS.md`/`README.md` yourself as part of this skill.
An actual edit is a separate, explicit, human-reviewed change (same as the original sweep: reviewed diff
+ a "removed & why" note + before/after counts, no silent deletions).

## Stage 4 — Wire-in: weekly Routine C
`scripts/routines/roadmap-hygiene.prompt.md`'s step 4 runs this skill and folds its findings into the
same weekly `claude/` docs PR Routine C already opens — a fourth report section alongside funnel
grooming / status drift / board regeneration, not a second PR.

---

## Gotchas
- **The LEARNINGS discipline is the thing this skill exists to protect — internalize it before
  proposing any edit.** Every retained line keeps its **why + date/source**; dedupe by **sharpening the
  existing line**, never appending a near-duplicate; **no silent deletions** — anything removed is named
  in a "removed & why" note; a human confirms before merge. Over-pruning to hit a size target is exactly
  the failure mode the epic warns against — bias toward merging/tightening over deleting.
- **A word-overlap "near-duplicate" flag is not proof.** Two bullets about the same tool/file from two
  different incidents are supposed to stay separate if they have different why/date/source — the
  script cannot tell "same topic" from "same lesson," only a human/model read can.
  **A dead-path flag says nothing about "was this ever true"** — it only means the path isn't in this
  checkout right now, which can be because the app moved on (real staleness) or because this monorepo
  checkout of `apps/*` is stale relative to the app's own `main` (not staleness at all). Confirm against
  the app repo before concluding anything.
  **An archived-epic mention is often the DESIRED reference**, not staleness — several LEARNINGS bullets
  explicitly cite an archived epic as the thing they superseded. Read the bullet before flagging it as
  wrong.
- **Never auto-edit.** This skill's only write output is a new dated report file. If you find yourself
  about to run an `Edit` against `LEARNINGS.md` or `README.md` while "running doc-hygiene," stop — that's
  a separate, explicitly-requested sweep, not this skill's job.
- **Don't let the report collide with Routine C's own `HYGIENE-REPORT-*.md`.** This skill's output is
  `DOC-HYGIENE-REPORT-<date>.md` (doc size/dedupe) — a distinct file from Routine C's funnel/status-drift
  report, even though both land in `Roadmap/00-ideas/` on the same day.
