# Pipeline throughput — Sprint 1: shard the frontend gate

**Status:** ⬜ not started

## Build contract (locked by the architect before the builder started)

Cite `README.md` D1, D2, D4.

- **Measured baseline: 323 spec files** in `apps/miyagisanchez/e2e/` (38 of them `*.browser.spec.ts`,
  which are the non-blocking project, not the gate). Confirm the count yourself first.
- `playwright.config.ts` already sets `fullyParallel: true` and defines three projects
  (`api`, `browser`, `staging`). **Only the `api` project is the gate** — do not shard `browser`
  (it is `continue-on-error` and installs Chromium; sharding it multiplies that cost for a
  non-blocking signal).
- **D1 is the load-bearing decision.** The existing "Resolve Vercel preview URL for this commit" step
  polls up to 10 minutes. It must run **once** in a `prep` job that publishes the URL as a job output;
  the matrix consumes it. A matrix that re-polls per shard is the wrong build.
- **Start at 4 shards (D2).** Do not tune further without the measured number in hand.
- **D4:** total spec count must be identical before and after; a failing shard must fail the gate.

## Stories

### Story 1.1 — `prep` job resolves the preview once ⬜
**As a** builder, **I want** the preview resolved a single time per PR, **so that** sharding adds
parallelism instead of multiplying a ten-minute wait.
**Acceptance:**
- The preview-resolution step moves into its own job exposing the URL as an output.
- The existing bypass-token handling is preserved exactly (previews are SSO-gated; without the token
  the suite is unreachable).
- Its timeout/error behaviour is unchanged — a failed resolution still fails the PR clearly, with the
  same `::error::` message.

### Story 1.2 — shard the `api` project across a matrix ⬜
**As a** builder, **I want** the gate to run in parallel, **so that** the long pole on every PR shrinks.
**Acceptance:**
- Matrix of 4 running `npm run test:e2e -- --shard=${{matrix.shard}}/4` against the prep job's URL.
- A failure in any shard fails the workflow.
- **Measured before/after wall-clock recorded in the PR body** — this is the deliverable, not the YAML.
- **Spec-count equality asserted** before vs after (D4).
- If the branch-protection required check is name-matched to the old job name, **say so explicitly in
  the PR** so updating it is a deliberate step, not a post-merge surprise.
- Blob/HTML report merging across shards handled, or its absence explicitly noted as acceptable.

## Definition of Done (sprint)
- [ ] CI green on the sharded shape; the whole suite still runs.
- [ ] Before/after numbers + spec-count equality in the PR body.
- [ ] Cross-agent review + fresh `pr-reviewer` (this edits the gate).
