# Retrospective — Doc hygiene: LEARNINGS/README sweep + doc-hygiene skill

**Shipped:** 2026-07-02 · 1 sprint, 2 stories, both LOW risk · monorepo-root repo, docs/tooling only.

## What shipped
- **S1.1 — de-noise sweep of `Roadmap/LEARNINGS.md`.** 1,155 → 980 lines (−15%), 117,700 → 96,716 bytes
  (−18%). Three categories of change, none silent:
  1. Sharpened the Flagsmith-era flag-layer bullets (they described SDK internals for a backend that
     `feature-flags-inhouse` had already replaced with Supabase `platform_flags`) — kept every principle
     (fail-open, module-load client, bounded timeout, the two polarities, Node-only reader), added a
     "Superseded 2026-07-01" pointer.
  2. Removed one dead section (`## Adopted-next (not yet wired)`, which read only "none open") and
     trimmed one closed one-time operational note down to its durable shell gotcha.
  3. Tightened wording on ~20 dense multi-corollary bullets (the agy/codex CLI chain, the raw-color/
     anti-monolith guard chain, the cross-agent-review-adoption chain, the static-shell chain, the
     notifications/i18n chains, several Cloud Run/Vercel/Stripe gotchas) — cut restated narrative color
     and one-off specifics while keeping the rule, the mechanism, and the date+source citation on every
     retained line. Reviewed and confirmed by Daniel before merge.
- **S1.1 (poster)** — audited `Roadmap/README.md`'s Feature map for dead/wrong ✅ lines; found none.
  Left "Recent highlights" (a chronological changelog, not a status claim) untouched, as scoped.
- **S1.2 — the `doc-hygiene` skill.** `scripts/doc-hygiene.mjs` measures the always-read set (AGENTS.md,
  WAYS-OF-WORKING.md, LEARNINGS.md, the poster) and flags three kinds of candidate in LEARNINGS.md/the
  poster: near-duplicate bullets (word-overlap within a section), referenced file paths not found in
  either app root, and mentions of an epic whose README frontmatter is now `Archived`. It writes one new
  dated `Roadmap/00-ideas/DOC-HYGIENE-REPORT-<date>.md` and never edits an existing doc.
  `skills/doc-hygiene/SKILL.md` is the model-facing wrapper: run the script, verify every flagged
  candidate against source before reporting it as real (the heuristics are deliberately cheap and can
  false-positive — an app-repo path check needs both `apps/miyagisanchez/` and `apps/backend/`, and a
  bullet documenting a historical file swap will always flag its own "old" path), and never auto-edit.
  Wired into weekly **Routine C** (`scripts/routines/roadmap-hygiene.prompt.md` step 4) as a fourth
  section of its existing single PR, not a second PR.

## Went well
- The file's own "sharpen, don't append" discipline had already been followed by prior sessions — most
  bloat wasn't duplication, it was legitimate density (long, hard-won corollary chains). Recognizing that
  early avoided over-pruning; the size win came from tightening restated narrative color, not cutting
  facts.
- Building the flagging heuristics against the SAME extractor `build-order.mjs` already uses
  (`roadmap-to-notion.mjs --extract`) meant zero new frontmatter-parsing code.

## Learned
- **A first compression pass on an already-disciplined file can be a rounding error — ask before
  assuming "no real duplication" is the final answer.** The first pass (staleness fix + 2 trims) moved
  the file by ~50 bytes; surfacing that explicitly, rather than declaring the sweep done, let Daniel
  choose more aggressive tightening (accepting less narrative specificity) over stopping short or
  guessing at the right tradeoff.
- **A heuristic path-existence check across a monorepo needs every known app root, not just the repo
  root** — `apps/miyagisanchez` and `apps/backend` are separate, gitignored repos here; a path like
  `lib/flags.ts` in a LEARNINGS bullet is relative to one of *them*, not the root. Checking only the root
  produced ~50 false positives before the fix; checking against all known roots dropped it to ~4 genuine
  edge cases.

## Owed to Daniel
- None load-bearing — this was a docs/tooling-only chore with no money/auth/deploy surface. The
  `doc-hygiene` skill's first live run is committed as `DOC-HYGIENE-REPORT-2026-07-02.md`; nothing further
  to confirm beyond the sweep diff already reviewed.

## Gap for the next hygiene pass
The size reduction came almost entirely from `LEARNINGS.md`; the `README.md` poster's "Recent highlights"
section is now the larger of the two always-read files and was deliberately left untouched (it's a
changelog, not covered by this sweep's scope). If a future pass wants to shrink it, that's a distinct
decision — e.g. archiving entries older than N months to a separate file — not a "de-noise" edit.
