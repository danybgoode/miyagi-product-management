# Retrospective — Model split: Sonnet 5 builds · Opus 4.8 plans · escalate-don't-guess

**Shipped:** 2026-07-01 · 1 sprint · LOW risk · docs/process only, monorepo-root repo.
**PR:** [#47](https://github.com/danybgoode/miyagi-product-management/pull/47) (squash `3544073`).

## What shipped
The model-tier convention already existed informally ("strong model for the thinking… faster model
for execution… Planning in Cowork; building in Claude Code") but never named the actual models, and
had no guardrail for what a fast-execution session should do when it hits real judgment or
money-path risk. This story closed both gaps in one pass:

- **`Roadmap/WAYS-OF-WORKING.md` → Conventions → Model tiers.** Names **Opus 4.8** as the
  plan/groom/spike/plan-mode/review model and **Sonnet 5** as the per-story execution model. Adds
  the **escalate-don't-guess** trigger list: the same seven items as the existing high-risk tier
  (*Review & merge* above — payments / checkout / fulfillment / auth / DB migrations / shared infra /
  money) **plus** plan ambiguity, a decision the plan doesn't cover, or a repeated failed attempt
  (2+ tries at the same problem). Default: escalate when unsure.
- **`skills/groom/SKILL.md` Stage 8.** Mirrored the same guardrail into the actual per-sprint kickoff
  prompt template (the text every future build session gets pasted), and updated the "Model tiers"
  note below it to name the models and point back at WAYS-OF-WORKING as the one SSOT for the trigger
  list — not a second copy that can drift.
- Regenerated `Roadmap/00-ideas/BUILD-ORDER.md` (the epic status frontmatter flip made it stale;
  `build-order-guard.yml` caught it on the PR, fixed with `node scripts/build-order.mjs`).

## What went well
- **One SSOT, cross-referenced twice.** The high-risk-tier list already existed, worded identically,
  in both `WAYS-OF-WORKING.md` (*Review & merge*) and `skills/groom/SKILL.md` (Stage 6). The new
  escalation list restates that same wording once (in WAYS-OF-WORKING, for readability where the
  acceptance criterion needed it spelled out) and every other mention — the SKILL.md Model-tiers
  note, the kickoff template itself — links back to it instead of forking an independent copy.
- **CI caught a real staleness bug for free.** Flipping the epic README's `status:` frontmatter
  without regenerating `BUILD-ORDER.md` failed `build-order-guard.yml` on the PR — exactly the
  guard doing its job (a generated doc with an unmet freshness gate), not a false positive.

## What we learned / gaps
- **A status-frontmatter edit inside a PR is itself a `Roadmap/**` change that trips the build-order
  guard.** Any story that touches an epic README's `status:` (not just Roadmap prose) needs
  `node scripts/build-order.mjs` re-run and committed before the PR is CI-green — worth calling out
  explicitly in `skills/groom/SKILL.md` Stage 7/8 so a future low-risk docs PR doesn't get surprised
  by a red check on an otherwise-trivial change.
- **The acceptance signal is behavioral, not textual — and can't be self-certified by the session
  that wrote the docs.** Sprint-1's real test ("hand a fresh Sonnet-5 session an ambiguous/money-path
  story, confirm it escalates") requires an actual live session Daniel observes; this build session
  verified the doc text is correct and consistent but did not — and could not — run that test on
  itself. **Owed to Daniel:** the live escalation smoke (sprint-1.md step 3).
