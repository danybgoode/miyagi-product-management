# Roadmap doc-format consistency — Retrospective

_Closed: 2026-07-16_

## What shipped
- `scripts/doc-format.mjs` — a checker for epic README/sprint/retrospective format (headings,
  frontmatter shape, header blockquote fields) with report/`--check`/`--hook`/`--fix` modes, 38
  passing unit tests, and `.github/workflows/doc-format-guard.yml` (required).
- `.claude/settings.json`'s `PostToolUse` hook — every `Write`/`Edit` on `Roadmap/**/*.md` now gets
  checked live; drift surfaces to the acting agent on its next turn, exit 0/silent when clean.
- The `09-platform-infra` macro-section (41 epics, 165 files) hand-swept to canonical shape and
  gated in `ENFORCED_SWEPT_PATHS` — the verified pilot proving the approach works end-to-end.
- Root-cause fix upstream in the shared `dobby-foundation` plugin repo (PR #1, merged 2026-07-16):
  `scaffold-epic.mjs` now validates `--type` against the real 4-value enum and the `epic-README.md`
  template actually renders the `Class` field it always computed — so newly-scaffolded epics stop
  reproducing the exact drift this epic exists to fix.
- `Roadmap/WAYS-OF-WORKING.md`'s new "Doc conventions (Roadmap tree)" section — the rules themselves,
  written down once instead of living only in the checker's code.

## What went well
- Regenerating the audit from real docs (not memory) caught the checker's own rules being wrong
  twice before they shipped as truth — the retro `_Closed:` regex was too strict (many genuine
  retros have trailing content after the date) and `header-missing-scope-seed` fired for epics that
  predate the `seeds/` convention and have nothing real to link. Both fixed with regression tests
  before the sweep trusted them.
- The incremental-adoption `ENFORCED_SWEPT_PATHS` allow-list (same shape as the raw-color and emoji
  guards in `apps/miyagisanchez`) meant the guard could go REQUIRED immediately once one section was
  clean, without waiting on — or ever requiring — a fully-swept tree.
- Delegating the bulk hand-fix grind (41 epics' worth of header/Class/Risk reconstruction) to a
  background fork kept it out of the main conversation's context while still producing reviewable,
  path-limited commits with real judgment calls documented inline.

## What we learned
- **Mid-course descope is cheap when the mechanism is separable from the backlog.** The original
  scope was "sweep every macro-section, then wire the hook." Once the hook existed, the sweep
  stopped being a precondition for anything — new drift gets caught the moment a doc is touched,
  regardless of how much historical drift remains. Splitting "the automatic mechanism" from "the
  one-time cleanup" let the second one shrink to a single verified pilot without weakening the first.
- **A background fork resuming via a new message can race its own in-flight tool calls.** Sending a
  fork a follow-up instruction while it's still mid-turn produced two overlapping executions against
  the same working tree — one auto-committed content the other's final report didn't know about yet.
  Nothing broke (both were on the same task, both verified-correct), but it's a coordination gap
  worth remembering: a scope-change message to a running fork isn't guaranteed to land before the
  fork's current batch finishes and self-commits.
- **This repo's tier has no real GitHub branch-protection API** (`403` on `branches/main/protection`)
  — every "required" guard here (`yaml-guard`, `build-order-guard`, now `doc-format-guard`) is a
  comment-only convention, not an enforced merge gate. Worth remembering before promising a required
  check actually blocks a bad merge.

## Gaps / follow-ups
- 00–08 and 10 macro-sections remain advisory-only in `doc-format.mjs`'s report — swept
  opportunistically going forward (whenever an epic in that section is touched anyway), not as a
  dedicated pass. This is an accepted, permanent state, not a deferred TODO.
- 7 files inside `09-platform-infra` were deliberately left unswept: `neon-egress-and-db-isolation`
  (archived, frozen historical record) and 6 `status: scaffolded`-but-never-started epics' unfilled
  RETROSPECTIVE.md scaffold placeholders (fabricating a real close date/body would violate "never
  fabricate content").
- No real GitHub required-status-check enforcement exists on this repo tier — the guard is
  advisory-in-spirit-required-in-comment, same as every prior guard here. If the repo ever moves to
  a tier with branch protection, revisit actually wiring these guards into it.
