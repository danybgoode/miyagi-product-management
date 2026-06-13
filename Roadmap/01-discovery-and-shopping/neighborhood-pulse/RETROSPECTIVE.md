# Neighborhood Pulse — online community feed — Retrospective

_Closed: 2026-06-13 (code-complete; operational opt-in seed + live smoke owed to Daniel)_

## What shipped
A read-only **neighborhood feed** at `/vecindario` that surfaces the living pulse of the local community —
not a social network, just useful local awareness over signals we already collect.

- **S1 (PR #55 `48e9fc5`)** — the skateboard, backend-first:
  - **S1.1** an additive `web_visible BOOLEAN NOT NULL DEFAULT false` opt-in flag on the non-commerce
    `print_social_submissions` table + a "Mostrar en línea" toggle in the admin print queue (the one MED
    migration; approving for print never auto-publishes to web).
  - **S1.2** the public `/vecindario` feed (opted-in `approved`/`placed` items, newest first, null-safe).
  - **S1.3** a "Tendencias" trending-listings strip over existing `views` + favorites + recency
    (`lib/neighborhood-rank.ts`, pure).
  - **S1.4** entry points + the contribute loop to `/comunidad/nuevo`.
- **S2 (PR #56 squash `ee4de8b`)** — richer pulse + agents, all LOW-risk read-only:
  - **S2.1** a "Comercios que destacan" merchant-spotlight strip (shop-ranking branch of
    `lib/neighborhood-rank.ts`; raw ranking counters kept out of public/agent responses).
  - **S2.2** presentational colonia/zona grouping (un-zoned → "Tu comunidad"; no filtering engine).
  - **S2.3** a read-only UCP/MCP pulse view: `GET /api/ucp/neighborhood-pulse` + MCP `get_neighborhood_pulse`
    + manifest/capabilities (AGENTS rule #3 — agents see the same pulse buyers do).

Reuse held throughout: the community contribution pipeline, R2 photos, the admin moderation queue, the
ranking signals, and the UCP/MCP surface all already existed — this epic *exposed* and *ranked* them, adding
**one** schema column and **zero** new commerce persistence.

## What went well
- **Medusa-first / reuse-first scoping paid off** — the whole epic was one additive non-commerce column plus
  read/projection code; commerce stayed entirely in Medusa (rule #1/#2).
- **Pure `lib/` seams + pure-logic specs** — ranking, grouping, and the agent view are all next-free helpers
  with deterministic tie-breakers and null-safe fallbacks, unit-testable in the `api` project for free.
- **The doc/audit caught real drift before any work** — the README claimed the S1.1 migration was unrun; a
  live Supabase check showed the column already applied, so the "rollout" collapsed to an operational opt-in,
  not a deploy. (See Learnings.)
- **Clean S2 landing on a stale branch** — refreshing off `main` produced exactly one trivial import
  conflict; tsc + build + CI-vs-fresh-preview all green; codex cross-review found no blocking items.

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (one-liner + why + date). -->
- **A "rollout pending" doc can hide an already-done migration — verify live schema before believing it.**
  The README said the MED migration hadn't run; the live column existed. Audit the live DB/route before
  scoping (or re-opening) work the docs call pending. *(Promoted.)*
- **A two-step opt-in is invisible from approval state alone — trace the read query, not the status field.**
  Approving a submission (`status=approved`) does **not** surface it; the feed also requires `web_visible=true`
  (a separate admin toggle). The "why is the feed empty" answer was in the query gate, not the workflow.
- **A stale feature branch with a green-but-old CI must be refreshed before merge** — re-merge `main`, re-gate,
  let CI re-run against a **fresh** preview. The old green predated 16 `main` commits. *(Already in Learnings;
  reconfirmed.)*

## Gaps / follow-ups
- **Owed to Daniel (operational, not code):** the feed is **live-but-empty by design** — 0 items opted in and
  only 1 approved community submission exists. Lighting it up = approve items + flip "Mostrar en línea", then
  smoke the live feed with real content. Content-dependent (seed now vs. wait for more submissions).
- **Declined cross-review should-fix (noted):** the agent-facing `baseUrl` is built from the `Host` header —
  this is the **established convention across the whole UCP surface** (`manifest`, `mcp`, `checkout-session`),
  so it wasn't changed in isolation. If pursued, it's a cross-cutting UCP-origin hardening task, not this epic.
- **Future (out of v1 by design):** colonia as a real queryable location primitive; order-volume in the
  spotlight signal (excluded until a Medusa-derived aggregate exists); any social-graph / engagement loops.
