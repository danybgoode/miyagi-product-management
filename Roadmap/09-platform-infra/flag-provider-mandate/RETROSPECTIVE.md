# Golden Frijoles is the only flag surface — Retrospective

_Closed: 2026-09-23_

## What shipped

- **Sprint 1: measure, then activate, in Golden, with no code.**
  - S1.1 measured both Cloud Run services. The production read key had **expired**, so both apps had
    served every flag from the durable mirror since about 2026-08-27. They were reading a **legacy
    catalog** that nobody managed.
  - The product owner chose `miyagisanchez`, the project they manage in, as the one that decides.
  - All 42 flags were activated there in every environment, at the value production served: 41 on,
    `shipping.envia_enabled` off. That took the console from 39 "never" cells to 0.
  - A new production read key was stored as Secret Manager `GOLDEN_BEANS_FLAG_READ_KEY` v5.
  - `miyagi-web` logged `source: golden` at snapshot v44, the first live Golden decision in four weeks.
- **Sprint 2: the second lane is gone.**
  - Frontend [#423](https://github.com/danybgoode/miyagisanchezcommerce/pull/423) and backend
    [#194](https://github.com/danybgoode/medusa-bonsai-backend/pull/194) collapse `isEnabled()` to one
    authority: live snapshot → durable mirror → bounded initial fetch → compile default.
  - Deleted: `local`/`shadow`, the cutover manifest, the `platform_flags` read, the expired
    partners-recruiting scoped key, and the shadow observer.
  - The mirror moved to a `miyagisanchez` lane.
  - `/admin/flags` became a read-only mirror, and its write route now returns 405.
  - Root: `scripts/flags.mjs` (Flagsmith) is deleted. The standup reads Golden through
    `golden-flags-on.mjs`. `session-resume` warns 7 days before a production read key expires.

## What went well

- **Measuring before touching anything (D1) paid for the whole epic.** The groomed premise was
  "activations are missing." The measurement found an expired credential and two projects. Acting on the
  premise would have activated flags in a project production could not read.
- **D3/D4 ordering held.** Activations went in before any fallback was removed, at measured effective
  values. The one flag deliberately OFF, `shipping.envia_enabled`, stayed off even under a "nothing is
  dark" brief, because flipping it points checkout at an unfunded account.
- **Both fresh reviewers independently found the same real risk**: the empty mirror lane on a cold
  deploy. It was fixed with a backend recovery rung, deploy order, and a lane check, all before merge.

## What we learned

- **A resilient fallback converts an outage into silence.** It needs a "who decided" signal, and a
  credential with a known expiry needs a reminder before that date (promoted to LEARNINGS).
- **A monotonic last-known-good store cannot be pointed at a new source.** It needs a new lane, and a
  cold-start wait covers the empty-lane window (promoted to LEARNINGS).
- **Deviation, stated:** the epic said to delete `flag-authority-observation.ts`. It was *replaced* by
  `flag-decision-observation.ts`, because that record was the only thing that exposed the outage.
- **The agent/operator split was real friction.** The auto-mode classifier refused Golden flag writes,
  Secret Manager writes, and at times plain reads, even with the product owner's grant in chat. The
  mutations ran as one reviewed script from the product owner's shell (`! bash …`). It was safe and
  auditable, but it put the product owner in the loop twice.

## Gaps / follow-ups

- **Owed to the product owner:**
  - A live flip-in-Golden → behaviour-change smoke (S1.4's acceptance step; the agent is blocked from
    Golden writes).
  - A real test-mode checkout on the collapsed evaluator.
- **Read-key rotation before 2026-10-22.** `session-resume` will flag it from 2026-10-15.
- **Follow-up chore:** drop the parked `platform_flags` table and the legacy `golden_flag_snapshot_mirror`
  table after one wave, and retire `GOLDEN_BEANS_FLAG_CUTOVER`/`GOLDEN_BEANS_PARTNERS_RECRUITING_V3_FLAG_READ_KEY`
  from the Cloud Run env, since nothing reads them now.
- **The build view** (`dobby-foundation` build-visualization mod) did not render in this session:
  `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` was not in the process environment when the session started.
  `build-state.mjs` itself resolved the epic, story and phase correctly throughout.
