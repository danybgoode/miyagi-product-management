<!-- Keep this short. The risk tier decides who may merge (see Roadmap/WAYS-OF-WORKING.md §Review & merge). -->

## Summary
<!-- What changed and why, in plain language. -->

## Risk tier
<!-- LOW → the reviewer may auto-merge on green CI. HIGH → Daniel merges (payments / checkout /
     fulfillment / auth / DB migrations / shared infra / money). When unsure, treat as HIGH. -->
- [ ] **LOW**
- [ ] **HIGH**

## Self-QA
<!-- Deterministic gate (tsc + build + Playwright) green? Smoke steps run? State any gap honestly
     (the authed browser money-path smoke is owed to Daniel). -->

## Cross-agent review
<!-- A different-model-family second opinion. Run it LOCALLY on EVERY PR (advisory only — it never gates,
     blocks, or authorizes a merge). It runs locally, not in CI (a runner has no codex/agy auth). -->
`node scripts/cross-review.mjs <PR#> --agent codex|antigravity`
