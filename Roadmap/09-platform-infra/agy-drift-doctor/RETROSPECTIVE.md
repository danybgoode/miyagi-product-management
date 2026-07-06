# Retrospective — agy drift doctor

**Macro-section:** 09 · Platform & Infra · **Class:** chore / dev-tooling · **Risk:** LOW ·
**Closed:** 2026-07-06 · **1 sprint, 2 stories**, same-day build+merge.

## What shipped
`scripts/agy-doctor.mjs` (diagnose + `--fix`) making the agy-pin re-verification executable, plus the
authorization wiring: `checkAgyVersion`'s failure message names the doctor, and WAYS-OF-WORKING /
LEARNINGS encode that agents may self-clear **version** drift (model swaps and failed probes still
escalate). Fail-loud is preserved — `--fix` blesses a new version only after a green live probe.

## What went well
- **The live smoke caught two real bugs the unit tests couldn't** — agy prints `--help` to **stderr**
  (the observe() read stdout only → false "contract BROKEN"), and the marker regex `[^\s.]+` couldn't
  match a dotted version string. Both fixed before the PR; the truth-table tests alone would have
  shipped them.
- **The end-to-end simulation was cheap and complete**: set the pin one patch back → the die path, the
  bump recommendation, `--fix`, and the healed round-trip all verified against the real agy in one
  command block.
- **Scope shrank at research time, not build time**: checking how ops-nightly actually runs revealed
  the routine sandbox can't run agy at all (no binary, no headless auth) — the planned nightly wiring
  was cut *before* any code, replaced by the die-message distribution point which sits exactly where
  drift is observable.

## What we learned
- **A young CLI's help/version/list output streams are part of its contract too** — agy sends
  `--help` to stderr; always read both streams when probing a foreign CLI programmatically. (Sharpened
  onto the existing LEARNINGS agy entry rather than added as a new one.)
- **"Authorize the agent" is mostly a docs+error-message problem**: the mechanism (a script) is the
  small half; putting the authorization *in the failure message itself* is what makes it reach the
  right actor with zero tribal knowledge.

## Gaps / owed
- First **real** (non-simulated) `--fix` run awaits agy's next actual self-update — the simulation is
  faithful (same code path), but watch the first live bump land.
- If agy ever renames a pinned model, the doctor reports it but a human/agent still picks the
  replacement — deliberate, revisit only if model churn becomes frequent.
