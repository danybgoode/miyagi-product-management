# Build-order CI self-heal — Retrospective

_Closed: 2026-07-17 · PR #93 (squash `29796c2`) · 1 sprint, LOW_

## What shipped
- **S1 — the derived board heals at both layers instead of failing.** `.githooks/pre-commit`
  regenerates a stale `Roadmap/00-ideas/BUILD-ORDER.md` and stages it into the in-flight commit
  (path-scoped `git add`; only a regen *error* still blocks). `.github/workflows/guards.yml`
  covers hookless clones / `--no-verify` on PRs: bot commit touching only the board, pushed back
  to the PR branch (`contents: write`, PR-head checkout); fork PRs fail loud with the fix command;
  a byte-identical regen after a failed `--check` fails loud (codex catch, `4d4d6ce`).

## What went well
- **Re-grooming at build time.** The groomed story targeted `build-order-guard.yml`, which the
  2026-07-16 local-first consolidation had already deleted — validated against reality before
  building, the fix landed in the two files that exist now, and the obsolete "hard-fail on `main`
  pushes" acceptance was documented as superseded (no `push` trigger exists; pre-commit heals
  *before* the commit lands, strictly stronger).
- **The PR was its own rehearsal.** Its first commit exercised the local heal live (the hook
  staged the healed board into the commit); a deliberate `--no-verify` stale-board commit
  exercised the CI heal (bot commit `d0d6657`, only the board touched). Both acceptance paths
  observed for real before merge.
- **GITHUB_TOKEN pushes don't retrigger workflows** — recursion is structurally impossible, and
  the healing run's own green is the verdict.
- The fresh reviewer independently re-derived the load-bearing claims (single `writeFileSync` in
  the generator; injection-safe env-var quoting; fork token is read-only under `pull_request`)
  and approved with zero required changes.

## What we learned
- **A guard on a DERIVED artifact should self-heal, not fail.** Promoted to LEARNINGS.md.
- A consolidated, path-gated workflow can carry latent lint debt: the first PR to touch
  `.github/workflows/` after the consolidation ate a pre-existing SC2129 shellcheck finding,
  because the actionlint step had simply never run before. Fixed in `fc3ea61`; not promoted (a
  one-time consolidation artifact, not a recurring pattern).

## Gaps / follow-ups
- None owed. (The fork-PR loud-red is designed behavior, not a gap — this repo takes no fork PRs.)
