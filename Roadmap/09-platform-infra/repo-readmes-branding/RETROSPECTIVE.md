# Repo cleanup + per-repo READMEs — value prop, engineering practice, product story — Retrospective

_Closed: 2026-07-10_

## What shipped
All four repos now carry a real README instead of scaffold boilerplate:
- **Root** (`miyagi-product-management`) — flagship: mission (lifted from the poster), a
  four-repo map, six engineering-practice highlights each linking their backing doc, and an
  honest quickstart. Committed locally (`9614024`); owed push to Daniel per root-repo convention.
- **Frontend** (`miyagisanchezcommerce`) — [PR #212](https://github.com/danybgoode/miyagisanchezcommerce/pull/212),
  merged `fd13ccec`. Replaced untouched `create-next-app` text.
- **Backend** (`medusa-bonsai-backend`) — [PR #79](https://github.com/danybgoode/medusa-bonsai-backend/pull/79),
  merged `42430bd`. Replaced Medusa's stock marketing README.
- **Zine** (`apps/zine`, local-only) — created from scratch (`023753b`), first time this repo has
  had a README.

## What went well
- **Reuse-first held.** Every practice claim in the root README links its backing doc
  (`WAYS-OF-WORKING.md`, `LEARNINGS.md`, `skills/groom`, `cross-review.mjs`/`cross-panel.mjs`) —
  none invented. The mission paragraph was lifted near-verbatim from `Roadmap/README.md` rather
  than re-paraphrased. The backend's module list was read directly off `src/modules/` on disk,
  not copied from `AGENTS.md`'s summary table — ground truth, not a doc's paraphrase of it.
- **Two independent `pr-reviewer` passes both approved with zero required changes** — every
  factual claim (deploy topology, quickstart commands, module lists, link targets) was checked
  against real `package.json` scripts, `cloudbuild.yaml`, and directory listings, not assumed.
- **The "four-repo" framing survived reviewer scrutiny once traced to source.** The frontend
  reviewer flagged "four-repo platform" as unsourced synthesis (its own read of `AGENTS.md` only
  shows a two-app monorepo). It's correct: the epic's own scope doc explicitly frames this as a
  four-repo chore (root + backend + frontend + zine) — the reviewer just didn't have that context.
  Worth noting for future single-repo-scoped reviews of a cross-repo initiative: the reviewer's
  read is locked to the one repo's diff and its own docs, so a claim can look unsourced to it even
  when it's grounded in the initiative's own scope doc.

## What we learned
- **`gh pr checks` / `gh pr merge` operate via the GitHub API and don't care what branch is
  locally checked out.** Mid-session, a concurrent agent switched the shared `apps/miyagisanchez`
  checkout to its own branch (`feat/seller-portal-rails-foundation-s2-5`) with uncommitted work in
  progress. Rather than checking out back to `feat/repo-readmes-branding` (which would have yanked
  that other session's tree), CI status and the merge itself were driven entirely through `gh`
  against the pushed remote branch — no local checkout touch needed. Promoted to `LEARNINGS.md` as
  a corollary to the existing "don't yank a shared branch" rule.
- **A retired-rail grep for a common English word needs care.** `grep -ri 'flagsmith|render'`
  false-positived on the verb "render" ("docs render on GitHub") in two of the four READMEs —
  not the Render.com hosting platform. Reworded both to avoid the word rather than special-case
  the grep; a real "retired Render.com rail" mention would still be caught, just not the verb.

## Gaps / follow-ups
- Root repo's README commit is local-only — Daniel pushes it per convention (root repo access
  pattern, not a risk gate).
- No money/auth path in this sprint; the real acceptance is Daniel reading all four READMEs
  ("would you send this link to a consultant?") — see `sprint-1.md`'s smoke walkthrough.
