---
epic: agy-drift-doctor
sprint: 1
title: the doctor script + agent authorization
risk: low
phase: Shipped
stories_total: 2
stories:
  - id: S1.1
    title: "the doctor: executable re-verification of the agy contract"
    as_a: an agent whose cross-review died on the agy version pin
    i_want: "a script that re-verifies the live print contract and bumps the pin only when it's green"
    so_that: I can clear the drift myself instead of stalling on a human
    risk: low
    status: done
  - id: S1.2
    title: "distribution: the failure site names the fix, and the docs authorize it"
    as_a: "any future agent hitting `agy X != pinned Y`"
    i_want: "the error itself to tell me I'm authorized to run the doctor"
    so_that: the fix needs no tribal knowledge
    risk: low
    status: done
---
# agy drift doctor — Sprint 1: the doctor script + agent authorization

Epic: [agy drift doctor](README.md) · **Risk: LOW** (advisory dev-tooling, never gates) ·
**Status:** ✅ merged 2026-07-06 (root repo, single PR with this scaffold).

## Stories

### S1.1 — the doctor: executable re-verification of the agy contract ✅
**As** an agent whose cross-review died on the agy version pin, **I want** a script that re-verifies
the live print contract and bumps the pin only when it's green, **so that** I can clear the drift
myself instead of stalling on a human.
- `scripts/agy-doctor.mjs`: observe (`agy --version` / `--help` / `models` / live `-p`+`--model`
  probes on both pinned models) → pure `decideDoctorAction()` → one of
  `ok | quota-warn | bump | model-drift | contract-broken` (most severe wins).
- `--fix` acts on `bump` only: rewrites `AGY_PINNED` + the doctor-managed
  `// agy-doctor: last verified <date> against <ver>.` marker via anchored `bumpPinnedSource()`
  (throws rather than half-writes), then runs the full scripts test suite.
- **Acceptance:** live diagnose exits 0 on a healthy install (quota-warn included); a simulated stale
  pin walks `die → diagnose(bump) → --fix → pin healed + suite green` end-to-end. ✅ (run log in the
  PR self-QA; the fallback-probe economy: the fallback model is only probed when the primary wasn't
  `ok` or a bump decision needs it.)
- **QA:** `scripts/agy-doctor.test.mjs` — 11 pure tests: the decision truth table (each real incident
  shape: the 1.0.10 contract break, a model rename, a clean self-update, the 2026-07-06 quota blank)
  + anchored-rewrite round-trip against the REAL lib source. `isMain`-guarded per LEARNINGS.

### S1.2 — distribution: the failure site names the fix, and the docs authorize it ✅
**As** any future agent hitting `agy X != pinned Y`, **I want** the error itself to tell me I'm
authorized to run the doctor, **so that** the fix needs no tribal knowledge.
- `checkAgyVersion`'s die message now says: run `node scripts/agy-doctor.mjs --fix` (authorized for
  agents), with the manual path preserved.
- WAYS-OF-WORKING cross-review bullet + the LEARNINGS agy-pin entry updated to encode the
  authorization (agents self-clear version drift via the doctor; model swaps and failed probes still
  escalate to Daniel).

## Smoke walkthrough (do these in order)
1. `node scripts/agy-doctor.mjs` → expect the 3 status lines + `✓ no drift` (or quota-warn), exit 0.
2. Temporarily set `AGY_PINNED` one patch back in `scripts/lib/cross-agent-cli.mjs`.
3. `node -e "import('./scripts/lib/cross-agent-cli.mjs').then(m => m.checkAgyVersion())"` → expect the
   die message naming the doctor.
4. `node scripts/agy-doctor.mjs --fix` → expect `✓ AGY_PINNED bumped … ✓ scripts test suite green` and
   the pin + marker restored to the installed version (verify with `git diff`).
5. `node --test 'scripts/agy-doctor.test.mjs'` → 11/11 pass.
