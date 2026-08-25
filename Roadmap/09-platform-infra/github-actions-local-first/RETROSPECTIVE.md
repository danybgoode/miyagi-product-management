# GitHub Actions minutes — local-first checks — Retrospective

_Closed: 2026-08-25 · `8990d28` + `6e72b7f` (2026-07-16) · 1 sprint, LOW_

## What shipped
- **S1 — the bleed stopped, and the guards collapsed.** `8990d28` removed `notion-sync.yml`'s
  `push` trigger (leaving nightly cron + `workflow_dispatch`), expanded `.githooks/pre-commit`
  into a blocking, path-gated local gate (build-order, doc-format, `scripts/`/`infra/` node:test),
  added an advisory `.githooks/pre-push` running the Notion sync locally, and auto-activated
  `core.hooksPath` from `package.json`'s `prepare` script so no clone needs a manual step.
  `6e72b7f` consolidated the five `*-guard.yml` workflows into one `guards.yml` job, demoted to
  PR-only. `4817089` (#99) then pushed the sync into the background so it never held a push.

## What went well
- **The premise was measured, not assumed.** The trigger was a "90% of included Actions minutes"
  email, which reads as "CI is too expensive". Real `gh api` data said something narrower: only 2
  of ~40 repos on the account cost anything at all, because **private** repos meter Actions minutes
  and public ones do not — so both app repos, the obvious suspects, were never the problem. The
  cost was this root repo's `notion-sync.yml` firing on nearly every `Roadmap/**` push at ~5–6
  billed minutes a run. Fixing the actual line item took one trigger change.
- **The work was reusable in the direction it came from.** The hook pattern originated in
  `dobby-foundation`'s template and was expanded here rather than reinvented.

## What we learned
- **An optimisation's premise can expire faster than the optimisation.** The repo became public on
  2026-07-18 — two days after this shipped — and hosted minutes stopped being metered, which
  removed the entire reason the `push` trigger had been deleted. `ce20b86` (#102) restored the
  path-gated push-to-main sync and retired the temporary pre-push full-sync. That reversal was
  correct, not waste: the local-first *hooks* were the durable half and stayed, while the billing
  workaround was discarded the moment its premise did. **Record why a change was made, so the next
  person can tell which half to keep when the world moves.**
- **A local hook is not equivalent to a hosted trigger, and the gap is silent.** The pre-push
  full-sync missed linked-worktree pushes entirely, so roadmap state could depend on which
  directory someone happened to push from. Keeping it beside the restored hosted trigger would
  also have produced duplicate concurrent Notion PATCHes. One writer, hosted, is the rule now.
  (The worktree trap is its own recorded lesson — `.git` is a *file* in a linked worktree, which
  has since killed the merge-report hook twice.)
- **A blocking local gate grows until someone budgets it.** Moving work out of CI moved it onto
  every commit, and pre-commit accreted the full test suite and two full-corpus walks until a
  commit took **119.7 seconds**. `965c78c` (2026-08-03) split it — staged-file checks stay on
  pre-commit (29ms), whole-repo checks moved to pre-push, and the corpus-walking `*.itest.mjs`
  went back to CI where it belongs. Local-first is a budget, not a destination.

## Gaps / follow-ups
- **Owed: the `dobby-foundation` template still does not carry this pattern.** The epic's last DoD
  item — propagate the local-first hooks *and* document the public-vs-private Actions-billing
  distinction explicitly, so future scaffolded repos start local-first and nobody re-derives the
  metering rule from a billing email. It lives in the `danybgoode/dobby-foundation` repo, which is
  not checked out here. Flagged by the 2026-07-20, 08-03, 08-10, 08-17 and 08-24 grooming audits;
  recorded here so it stops being invisible between them.
