# Process iteration — UX rails at grooming + observed-red DoD — Retrospective

_Closed: 2026-07-12_

## What shipped
- **S1.1 — UX rails named at grooming** (commit `d7bd19b`): a "UX heuristics & rails check"
  checklist block in `skills/groom/templates/scope-seed.md` (CI guards / audits-lens findings /
  design-language debt), a pointer sentence in `skills/groom/SKILL.md` Stage 4, and a
  `Roadmap/WAYS-OF-WORKING.md` pointer.
- **S1.2 — Observed-red DoD line** (commit `a4ca168`): a new bullet in WAYS-OF-WORKING →
  Definition of Done (a story) requiring every new spec was observed failing (red) at least once;
  one dated LEARNINGS line under *Tooling gotchas* citing antoniel's agentic BDD article.

## What went well
- Stayed inside the ~20-line budget the seed set (22 insertions across 4 files) — no scope creep
  into Gherkin/.feature/Stryker, which the seed explicitly declined.
- The scaffolder `--dry-run` and `node scripts/build-order.mjs` both stayed green with zero doc
  edits needed elsewhere — confirms the change was additive, not structural.

## What we learned
- No new generalizable learning beyond what's already promoted to `Roadmap/LEARNINGS.md` (the
  observed-red/mutation-check line itself, under *Tooling gotchas*, dated 2026-07-12).
- Reconfirmed the existing stale-git-lock gotcha (`Roadmap/LEARNINGS.md` → *Git background
  auto-maintenance races a burst of commits...*): a `HEAD.lock` + `next-index-28.lock` appeared
  mid-session from a concurrent sibling session actively committing in this same shared root
  checkout (`panfleto-premium-shop` S3) — confirmed via `ps aux` (no stuck git process) and by the
  sibling's file transiently appearing/disappearing from `git status`. No new fix needed; the
  existing "commit only your own paths" discipline is what kept the two sessions' commits clean.

## Gaps / follow-ups
- None. No app code, no data, no agent surface — nothing owed to Daniel for a live/browser smoke.
  The repo-only smoke walkthrough in `sprint-1.md` is the full verification.
