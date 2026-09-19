---
epic: agent-connection
sprint: 3
title: Playwright smoke harness (QA kickoff)
risk: high
phase: Shipped
stories_total: 2
stories:
  - id: S3.1
    title: Minimal Playwright harness
    as_a: the team
    i_want: repeatable smoke tests
    so_that: we stop hand-driving them and burning tokens
    risk: high
    status: done
  - id: S3.2
    title: "Seed specs for this epic's acceptance"
    as_a: the team
    i_want: the agent surface guarded
    so_that: "the bugs this epic fixed can't return"
    risk: high
    status: done
---
# Sprint 3 — Playwright smoke harness (QA kickoff)

Goal: stop hand-driving smoke tests. Stand up the platform's first automated test harness, seeded with the
specs that guard this epic's agent surface — per the refined Definition of Done (Roadmap/WAYS-OF-WORKING.md).

Status: ✅ shipped · 🚧 in progress · 📋 planned. **Shipped + green against prod 2026-06-03.**

---

## US-1 — Minimal Playwright harness ✅
**As the** team, **I want** repeatable smoke tests, **so that** we stop hand-driving them and burning tokens.
- [x] `@playwright/test` dev dependency, `playwright.config.ts` (baseURL from `PLAYWRIGHT_BASE_URL`, default
      production), and a `npm run test:e2e` script. No local stack / no browser binaries — specs are
      API-level (the `request` fixture) and hit public endpoints on the deploy.

## US-2 — Seed specs for this epic's acceptance ✅
**As the** team, **I want** the agent surface guarded, **so that** the bugs this epic fixed can't return.
- [x] `e2e/agent-discovery.spec.ts` (4 specs, all read-only): manifest advertises real capabilities + 11 MCP
      tools incl. seller tools; `/agent` uses the real MCP URL and contains no `/api/ucp/listings` or
      `/api/mcp`; `/.well-known/ucp` resolves to the manifest; MCP `tools/list` includes the seller tools and
      `get_store_configuration` rejects a call with no token.
- [x] **4 passed** against production (commit 464205d).

### How to run
`npm run test:e2e` (defaults to prod) · `PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app npm run test:e2e`.

### The pattern going forward
One spec per new browser/API-testable story, added during its QA stage — coverage grows with the work, and
each spec permanently replaces an equivalent hand-driven run.
