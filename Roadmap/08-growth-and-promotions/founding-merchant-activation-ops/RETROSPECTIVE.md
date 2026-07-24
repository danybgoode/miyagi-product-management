# Founding merchant activation operations — Retrospective

_Closed: 2026-07-23 (code complete + in review; PRs merge on Daniel's HIGH-tier green-light)_

## What shipped

The canonical Miyagi merchant relationship — one operational record per founding merchant from first
scouting through 30-day retention — over the primitives three sibling epics had already shipped
(`/promotor/cerrar`, `partner_grants`, `merchant_previews`/consent, the Golden Beans lifecycle loop).

- **Sprint 1 — field record + consent-safe intake** (PR #303, `4df3d87`/`3fb1961`/`b18ae84` +
  `01349bc`/`fb80bd8` review fixes). `merchant_relationships` (the canonical record whose `id` is the
  opaque merchant subject — see D1), `merchant_relationship_field_audit`, a 29-shop backfill, the
  `promoter.activation_crm_enabled` flag (born OFF), a mobile intake step in `/promotor/cerrar` with
  resume + dedupe, and consent evidence bound to the shipped `readApprovalState` contract.
- **Sprint 2 — lifecycle + stewardship** (PR #304, `ff98cc5`/`fca9112`/`1581627` +
  `e2c8102`/`0379f13` review fixes). The pure 13-stage resolver (`lib/merchant-stage.ts`), immutable
  transition history with replay-is-a-no-op-by-constraint, interactions/tasks/owner-history, and the
  promoter + admin operating views. Audited admin corrections are the only non-derived writes.
- **Sprint 3 — commerce facts + event rail** (PR #305, `c83c51e`/`1c95abf`/`7a9651e` +
  `4011de8`/`f40e57f`). The Medusa commerce-fact adapter (reusing the sweep's hardened reads), the
  6→14 event vocabulary emitted PII-free under one relationship-id subject, the admin reconciliation
  view with guarded replay, and the resolver-hostage fix (E1) that made `first_sale`/`retained_30d`
  actually reachable.

Three additive migrations (`20260723100000`, `…110000` + `…115000`, `…120000`) applied and verified
live. `promoter.activation_crm_enabled` remains OFF; it now also gates the cron emission walk.

## What went well

- **Locking the three architecture forks (D1/D2/D3) against the live DB before any code.** Verifying
  live that `merchant_lifecycle*` held **0 rows** is what made D1 (unify the merchant subject id onto
  the relationship) a free, one-time move rather than a data migration. Deciding these up front kept
  three builders on a single coherent contract.
- **The assembly-line shape held under a pre-launch platform.** One branch, three stacked HIGH-tier
  PRs, Opus architecting + reviewing, Sonnet building the mechanical slices. Every builder produced
  high-quality work; the defects that surfaced were either contract gaps (mine) or the cross-cutting
  data-flow bugs review exists to catch.
- **Two independent review layers with near-zero overlap.** Codex caught data-flow and fail-open bugs
  (state leaks between merchants, dedupe failing open, audit writes swallowed); the fresh reviewer
  caught contract divergence and the emission-gate gap, and re-derived every live-DB claim itself. On
  the HIGH-tier PRs the two were never redundant.
- **Salvage-and-resume beat re-spawning.** Builders were killed mid-flight by shared session limits
  four times; every time, re-deriving `git status` and resuming the same agent id (or, once the weekly
  limit hit, the orchestrator finishing the last mile) lost ~zero work.

## What we learned

<!-- Promoted to Roadmap/LEARNINGS.md. -->

- **A paraphrased contract drifts from its shipped source — and it drifts permissive.** This happened
  **four times in one epic**, all in the planning docs the architect wrote: (1) the S1 consent clause
  restated the consent rule instead of pointing at `readApprovalState`, and the restatement missed
  invalidation + `verified_via`; (2) sprint-2 prose said `permission_received` where the shipped CHECK
  says `permission_granted`; (3) the same sprint-2 file kept BOTH forks in a paragraph a correction
  banner didn't reach; (4) the resolver contract said "furthest stage whose predicate holds," ambiguous
  between *highest satisfied* and *longest prefix*, and the prefix reading made commerce milestones
  unreachable. **Rule: when a decision already lives in a constraint, a shipped constant, or a shipped
  function, the doc must NAME that source, not restate it — and a correction banner does not correct
  the rest of the file; re-derive every instance.**
- **Citing a learning is not the same as satisfying it.** The S1→S2 steward-access fix cited the
  "deliberate human decisions win" learning and honored its *letter* (wrote no `partner_grants` row)
  while inverting its *spirit* — a read-side precedence silently escalated a deliberate `viewer` grant
  to `manager`. The banned *mechanism* was only the shape the old bug took; the *principle* was about
  whose deliberate decision wins. Check the principle against your design, not just the mechanism.
- **A resolver's ORDER and its REACHABILITY are two different contracts.** "The stages are ordered"
  says nothing about whether one unsatisfied stage blocks the rest — and the difference is invisible
  until some stage turns out to have no data source. A prefix-break resolver let a soft CRM fact hold a
  hard commerce fact hostage. Evaluate write-once milestones independently; an absent fact should
  decline its own stage, never veto later ones.
- **A flag that gates "the feature" must gate the IRREVERSIBLE side effect too, not just the UI.** The
  emission walk wrote write-once cross-repo milestones behind only `growth.telemetry_enabled` (ON in
  prod) while `activation_crm_enabled` gated the visible surfaces — so "flip to reveal the UI" would
  have silently been "emit permanent milestones across the whole population." When a kill-switch guards
  an unvalidated feature, enumerate every unwithdrawable write it performs and confirm each is behind
  the same flag.
- **Verify the sibling repo's contract by matching bytes, not by re-writing it.** The Golden Beans
  contract doc + fixture were already consistent (SHA `b53f300b…` identical across the Miyagi worktree,
  the GB doc pin, and the GB fixture), and the subject was correctly kept opaque — so the "owed" update
  was already satisfied. Checking the digest was cheaper and safer than editing another repo.

## Gaps / follow-ups

- **Owed to Daniel — merges:** #303 → #304 → #305 in order (each targets the prior branch), all HIGH
  tier.
- **Owed to Daniel — smokes:** the three sprint walkthroughs (phone intake/resume/dedupe/consent;
  two-promoter stewardship + admin correction + cross-partner 403; claim→payment→products→sale→
  PII-free payload→reconciliation replay).
- **Owed to Daniel — the flip:** `promoter.activation_crm_enabled` after the smokes. **This is the
  go-live for the Golden Beans emission rail, not just a UI reveal** (see the kill-switch note in the
  README).
- **Owed to Daniel — a tooling decision:** the `agy` pin bump (1.1.4→1.1.5) is coupled with a model
  swap (the pinned Gemini/Claude models were retired from `agy models`); the doctor deliberately
  escalates that combination rather than self-bumping. Both cross-family reviewers (Codex weekly-limit
  → Jul 29; agy → this) were unavailable for the final round, so the last commits leaned on the fresh
  `pr-reviewer` layer for independent review.
- **Deferred by design:** `sharedExternally`/`firstInquiry` are now state-derived, but a richer inquiry
  signal (offers, not just conversations) and unbounded admin-list paging are retro items, fine at
  founding-merchant scale (~168 rows). The exact-match dedupe 409 remains a cross-promoter existence
  oracle — accepted because dedupe must be global and the population is hand-approved.
