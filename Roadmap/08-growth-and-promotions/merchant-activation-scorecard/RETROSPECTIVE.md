# Merchant activation scorecard — Retrospective

_Closed: 2026-07-24 — 6 stories in one PR (#307), LOW risk, read-only; +2 review rounds_

## What shipped

A weekly ADMIN operating view of founding-merchant activation, read-only and additive, with a versioned
metric contract that the UI, the CSV export and the read-only agent tool all share.

- **S1.1 versioned metric dictionary + fixtures** (`9a4b66d`) — `lib/scorecard/dictionary.ts`, versioned,
  imports `STAGES`/`STAGE_ORDINAL` by reference (identity spec) and threads the canonical
  `RETENTION_WINDOW_DAYS`/`THREE_PRODUCTS_THRESHOLD`; fixtures for zero/incomplete/corrected/retained/stale
  journeys + the read-failure cases.
- **S1.2 pure resolver + impure loader** (`7b13407`) — `resolver.ts` (network-free, unit-testable) + `loader.ts`
  (gathers inputs via the reused activation-ops seams). Opaque merchant id = the relationship id (activation-ops D1).
- **S1.3 authenticated read endpoint + degraded states** (`86d2119`) — `GET /api/admin/scorecard`, flag-then-admin
  gated, one resolver, per-metric health.
- **S2.1 operating view** (`d4722c6`) — `/admin/promoter/activacion`: funnel, aging (median/p90), overdue/missing
  actions, first-sale + retention, URL-stable filters, drill-through, and distinct empty/loading/error/degraded states.
- **S2.2 resolver-identical CSV** (`62781fe`) — same resolver + schema version + filters; freshness timestamps; PII excluded.
- **S2.3 read-only agent parity** (`16a5cab`) — an admin-gated MCP read tool over the same resolver, bounded/paginated, no mutation.
- **Review rounds** (`53db72c`, `dfc3072`) — see below.

**SD1–SD4** (locked in the README before build): derive from Miyagi's own canonical
`merchant_relationships` + `merchant_relationship_transitions` (Golden Beans is a freshness diagnostic only,
because Miyagi has no read path to its journey projection and the round-trip is empty pre-launch); no new flag
(reuse `authorizeRelationshipRequest`); the dictionary imports the stage contract, never restates it; and every
metric is `{ value, health: 'ok'|'stale'|'missing', source, asOf }` — a genuine zero is `{0,'ok'}`, a read
failure is `stale`/`missing`, never a silent zero.

Pre-launch reality at close: 29 backfilled relationships all at `scouted`, 0 transitions, 0 shops claimed — so
the scorecard renders mostly degraded/empty states, which is exactly what SD4 exists to make legible.

## What went well

- **Locking the architecture BEFORE the build paid off.** The README's SD1–SD4 section (written against the live
  `origin/main` code + live DB, citing exact exports) meant the builder implemented the contract, not a paraphrase
  of it — the exact failure class the two sibling founding-merchant epics paid four defects to learn. SD3's
  "import the stage list, don't restate it" was enforced by an identity spec, so a parallel hardcoded stage list
  is a build error, not a latent drift.
- **Assembly line held through a session-limit kill.** Opus architected + reviewed; a Sonnet builder delivered all
  6 stories in one clean PR; when the builder hit its session limit mid-review-fix, the "salvage the tree" pattern
  worked — the orchestrator re-derived worktree state (only the loader `.order` had landed), finished the four
  fixes, and had the cross-family reviewer re-review the self-authored fix commit before merge.
- **Both review layers earned their keep, and disagreed usefully.** The cross-agent (Antigravity, after Codex was
  weekly-capped) and the fresh `pr-reviewer` both independently caught the activation-time non-determinism; the
  fresh reviewer additionally caught a real untested degraded branch hiding behind a fixture docblock that falsely
  claimed to cover it.

## What we learned

<!-- Promote durable, generalizable items to Roadmap/LEARNINGS.md. Dedupe. -->

Promoted to `Roadmap/LEARNINGS.md`:

- **A scope doc's "reuse projection X" can name a seam with no consumable read path — verify the seam is real
  before designing on it, and derive from the canonical owned table instead.** (SD1: the reuse table named Golden
  Beans' journey projection; Miyagi had no read path to it and the round-trip was empty.) Sharpens the
  "cite the source, don't paraphrase" cluster from "don't restate the rule" to "confirm the reused thing exists."
- **A metric selected by `.find()` over an unordered DB read is non-deterministic when the entity can have
  multiple matching rows — order at the query AND pick deterministically (earliest/min) at the consumer.** The
  write-once/earliest discipline applies to READ-side metric selection too, not just to write-once emission.
- **A fixture's docblock is not the fixture.** A comment claiming a degraded branch is covered is not coverage —
  the independent `transitionsOk:false` branch was real, loader-reachable production code with zero tests while a
  docblock asserted otherwise. The "a confident comment is not evidence" rule, applied to test fixtures.

## Gaps / follow-ups

- **Admin-session browser smoke owed to Daniel** (Sprint 1/2 walkthroughs): the admin-200 / non-admin-403 branches
  and the real rendered view need a Clerk admin session, untestable in the `api` project. Descoped as pre-launch
  ceremony consistent with the sibling founding-merchant epics — re-run on demand.
- **Product-legibility judgment calls left as-is by design** (both reviewers agreed): `computeCommerceOutcome`
  returns `missing` (not `0/0`) on an empty eligible population, and a `stage=` filter collapses the funnel to that
  population. Both are internally consistent with the conversion-ratio treatment; flagged here in case a future
  UX pass wants to revisit the copy.
