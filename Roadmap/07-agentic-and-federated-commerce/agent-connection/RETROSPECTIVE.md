# Retrospective — Agent Connection & Discoverability (Epic)

**Shipped:** 2026-06-03 · all 3 sprints live · live-QA'd (Playwright + curl + browser).

First epic in 07, and the first to run under the refined Definition of Done (smoke test mandatory; every
plan names its QA stage). Picked up right after the Bulk-Import S4 seller MCP write-tools to make that work
discoverable, usable, and guarded.

## What shipped
S1 corrected the public agent docs and killed the root cause of their drift (a shared
`lib/ucp/capabilities.ts` now feeds `/agent` + the manifest). S2 added a copy-paste "Conecta tu agente"
helper so sellers can wire their token into an MCP client. S3 stood up the platform's first automated tests —
a tiny Playwright harness whose specs guard the agent surface.

## What went well
- **Fixing the root cause, not just the symptom.** The bug was three hand-copied endpoint lists. Rather than
  edit each, we introduced one source of truth and pointed the docs at it — the drift can't recur.
- **The smoke test paid for itself immediately.** The first Playwright/curl run caught a stale
  `/api/ucp/listings` link in the `/agent` "External References" section that the manual edit had missed.
  That's the entire argument for automating QA, demonstrated on day one.
- **Tiny, API-level harness.** No browser binaries, no local stack, no auth setup — the `request` fixture
  hits public endpoints on the deploy. 4 specs, 2.4s, runs anywhere. The harness was cheap enough to seed
  without it becoming its own project.

## What we learned
- **Docs are code and drift like code.** Anything an agent reads (manifest, `/agent`, MCP discovery) must be
  derived from one source, or it rots silently. Treat agent-facing metadata as a single typed module.
- **"Claimed" ≠ "built".** The 07 README advertised an embeddable widget that has no code behind it. Worth a
  pass over the other "✅ current features" to confirm they're real before an agent (or a seller) relies on
  them.

## Deferred (07 backlog)
- Richer seller agent capabilities (manage listings / respond to offers via MCP).
- Agent activity analytics + surfacing the S4 `ucp_agent_audit` log to sellers.
- The embeddable widget — build it for real, as its own epic.

## Process note
This validated the new QA-in-the-plan cadence end-to-end: the plan named the QA stage per sprint, S3 *was*
the QA kickoff, and the harness now replaces the hand-driven runs for this surface on every future change.
