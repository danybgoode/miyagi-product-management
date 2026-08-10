# Miyagi Partners proposition and recruiting portal v3 — Retrospective

_Closed: 2026-08-10_ Product build retrospective updated with live-read proof; epic status remains in
progress only for the authenticated operator and Promotor production walkthrough.

## What shipped

Two HIGH-risk storefront sprints shipped in order. PR
[#342](https://github.com/danybgoode/miyagisanchezcommerce/pull/342) (`3aba592`) delivered the
English-first `/us` proposition, exact three-shop founding-operator application, one track-aware admin queue,
privacy-closed measurement, the additive identity/application migration and a disabled local fallback flag.
PR [#343](https://github.com/danybgoode/miyagisanchezcommerce/pull/343) (`1709226`) delivered atomic
operator approval, truthful provider-outcome recording, audited token rotation, verified-email activation,
the single Clerk-binding writer and a bilingual, grant-derived `/partner` workspace.

Storefront PR [#350](https://github.com/danybgoode/miyagisanchezcommerce/pull/350) (`5d4df0c`)
then repaired the runtime binding without disturbing the established flag catalog: only
`partners.recruiting_v3_enabled` uses the owner-visible `miyagisanchez` credential, while every other flag
continues through the primary provider and the project-relative scoped snapshot stays out of the shared
durable mirror.

The migration was applied and verified live without changing the population: zero applications, two
historical Promotor identities and zero grants. Both merge commits deployed successfully through Cloud Build
to Cloud Run. The first production smoke deliberately stayed dark and proved the prior invitation, neutral
activation 404 and generic `Unauthorized` MCP denial still held. After the scoped binding deployed and Golden
version 2 became the production default-ON definition at snapshot 4, a real Chromium smoke rendered the full
`/us` application at HTTP 200 with zero console errors. No operator, shop grant or merchant consent was
created during smoke testing.

## What went well

- The architecture lock paid for itself. Live row counts and privilege metadata made the additive
  `program_track` backfill, unique Clerk invariant and RLS closure reviewable before a builder touched code.
- The unavailable state survived repeated scrutiny. Reviews caught storage failure being collapsed into
  absence, incomplete grant-to-shop mirror coverage being shown as zero, and a dark MCP denial escaping the
  normal tool-result envelope.
- The stacked merge kept the migration/contract sprint separate from activation/auth behavior while still
  letting Sprint 2 run the complete Promotor continuity population.
- Exact-head review mattered. The final preview exposed an OFF-state regression that local tests did not;
  the repaired API shards then exercised the deployed preview rather than only source assertions.
- Comparing the Golden Beans Vibe setup improved the local review rail without copying its risky host-read
  approvals: tool-call-only output is now an explicit failed pass, and reviewer model attribution is honest.

## What we learned

- A disabled tool is not the same as a completed tool-less review. A model CLI may exit zero with a literal
  tool request as its only text; runners must classify that output as incomplete instead of posting it as
  findings.
- For asynchronous mirrors, known parent references with missing mirror rows are unavailable data, not an
  empty or partial collection. Coverage must be proven before rendering a zero state.
- Flag-first ordering and abuse control can coexist only when the OFF path has its own bounded preflight and
  still returns the route's established transport envelope. An early generic HTTP denial can be secure yet
  behaviorally incompatible.

These sharpen existing `Roadmap/LEARNINGS.md` entries rather than creating parallel rules.

## Gaps / follow-ups

- **Golden runtime binding resolved:** production snapshot 4 now serves `partners.recruiting_v3_enabled`
  version 2, default-ON, from the owner-visible `miyagisanchez` project. Version 1 remains the default-OFF
  rollback, and the legacy primary provider still serves its existing 43 active decisions unchanged.
- **Owed to Daniel:** with public recruiting now ON, run one disposable founding-operator application,
  admin review/approve or recoverable resend, wrong-email denial, verified-email activation, replay denial
  and zero-grant workspace walkthrough; then repeat the existing Promotor application/code/close/workspace
  path. Only after those pass may the epic move from `in-progress` to `shipped`.
- **Still out of scope:** merchant consent, shop creation/grants, US catalog, checkout, tax, shipping,
  operator economics and the `#US-3` commerce proof.
- Root tooling PR [#123](https://github.com/danybgoode/miyagi-product-management/pull/123) merged as
  `7f45179` after its green checks and cross-family reviews. Daniel explicitly authorized this documentation
  PR's post-gate merge; neither root merge changes product runtime or enables the recruiting flag.
