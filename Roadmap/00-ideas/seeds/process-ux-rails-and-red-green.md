---
title: "Process iteration — UX rails enforced at grooming + the observed-red (mutation) DoD line"
slug: process-ux-rails-and-red-green
status: scaffolded
area: "09"
type: chore                          # process/doc/skill edits only; no app surface
priority: tbd
risk: low
epic: "09-platform-infra/process-ux-rails-and-red-green"
build_order: null
updated: 2026-07-12
---

# Process iteration — UX rails at grooming + red-green DoD

**Origin:** Daniel's ask 2026-07-12 — (a) "we have many rails for UX and I'm not sure they are being
enforced… evaluate what we need: another skill, an addition to the DoD or groom skill?"; (b) explore
incorporating TDD/BDD per
[antoniel's agentic BDD article](https://dev.to/antoniel/my-agentic-engineering-process-from-vibe-code-to-bdd-2ne)
— "don't force it; agents may already be doing it." Child initiative in the
`process-iteration-portfolio` vein (2. readyforscope). Grooming decisions (2026-07-12, confirmed):
one chore epic, two stories; no new skill; no Gherkin/Stryker adoption.

## Stage-2.5 bucket — **light enhancement** (process docs + skill template, no new machinery)

## Findings (audit, code-verified 2026-07-12)
**UX rails that exist and ARE CI-enforced:** the design-token guard
(`e2e/design-token-foundation.spec.ts`: WCAG AA token pairs + raw-hex ban on customer-facing source)
and the seller-portal `enforcedSweptPaths` lint. **Gaps:** (1) admin surfaces are deliberately
excluded from the token guard (being closed incrementally — cms-contenido S3.4); (2) **grooming
drift:** groom SKILL.md Stage 7 promises a "UX heuristics" section in every scope seed, but
`skills/groom/templates/scope-seed.md` has no such block — so UX review is ad-hoc per session and the
audits lens (`Roadmap/00-ideas/audits/results-refresh-2026-06/`) isn't systematically consulted;
(3) no DoD line guards against agent-written tests that never went red.

**BDD article mapping:** his Spec → .feature → tests pipeline ≈ our seed → stories-with-acceptance →
one-api-spec-per-story; acceptance criteria are our Gherkin. Genuinely missing piece adopted: the
**mutation sanity check** (observed-red). Explicitly NOT adopted: .feature files, Cucumber ceremony,
Stryker mutation tooling, enforcing test-first ordering (agents often do it anyway — record the norm,
don't police the sequence).

## Stories (one sprint)
| # | Story | Risk |
|---|---|---|
| 1.1 | **UX rails at grooming** — add a "UX heuristics & rails check" block to `skills/groom/templates/scope-seed.md` (which guards cover this surface — token guard / swept lists / audits lens — and if none, say so); one matching line in `skills/groom/SKILL.md` Stage 4 (rails named in every reuse list); pointer from WAYS-OF-WORKING | low |
| 1.2 | **Observed-red DoD line** — WAYS-OF-WORKING story DoD gains: *"every new spec was observed failing (red) at least once — via a deliberate mutation check if written after the implementation"*; LEARNINGS one-liner citing the article + date | low |

## Scope boundary
**In:** the seed-template block, the SKILL.md line, the DoD line, the LEARNINGS note.
**Out:** new skills · Gherkin/.feature layer · Stryker/mutation tooling · scenario-coverage script
(revisit if the observed-red line proves insufficient) · retrofitting old seeds/epics.

## Open risks
- Template/skill edits touch every future groom — keep the block short (a checklist, not an essay);
  the doc-hygiene rolling skill catches drift later.
- The observed-red line must stay a *verification*, not an ordering mandate — wording matters.
