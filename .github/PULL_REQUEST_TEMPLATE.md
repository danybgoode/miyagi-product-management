<!-- Keep this short. The risk tier decides who may merge (see Roadmap/WAYS-OF-WORKING.md §Review & merge). -->

## Summary
<!-- What changed and why, in plain language. -->

## Risk tier
<!-- LOW → an agent other than the builder may merge on green CI, once the cross-agent review is clean
     or its findings are answered. HIGH → Daniel merges (payments / checkout / fulfillment / auth /
     DB migrations / shared infra / money) AND the fresh pr-reviewer pass is mandatory.
     When unsure, treat as HIGH. -->
- [ ] **LOW**
- [ ] **HIGH**

## Self-QA
<!-- Deterministic gate (tsc + build + Playwright) green? Smoke steps run? State any gap honestly
     (the authed browser money-path smoke is owed to Daniel). -->

## Cross-agent review — REQUIRED on every PR
<!-- A different-model-family second opinion. Resolve every finding before merge: fix it, or answer it
     on this PR with the reason it isn't a bug. It does not itself authorize a merge (CI + the risk-tier
     rule do). It runs LOCALLY, not in CI (a runner has no codex/agy auth), so nothing enforces it but
     you — an unrun cross-review is a blocked merge. -->
`node scripts/cross-review.mjs <PR#> --agent codex|antigravity`

## Fresh reviewer (`pr-reviewer` subagent)
<!-- Mandatory on HIGH. Optional on LOW — but say which you did and why. Run it on LOW anyway when:
     the diff is wider than its story, it touches a shared/lib seam other epics import, it's
     security-shaped, it makes an un-re-derived "everything else is fine" sweep claim, or you argued
     down a cross-agent finding. Skipping is a judgment call to state here, not a silent default. -->
- [ ] Ran it — findings below
- [ ] Skipped (LOW) — reason:
