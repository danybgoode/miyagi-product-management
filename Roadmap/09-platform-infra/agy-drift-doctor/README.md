---
status: shipped
slug: agy-drift-doctor
---

# Epic · agy drift doctor — self-healing for the Antigravity CLI pin

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore

One-sprint chore (dev-tooling) — advisory cross-review plumbing that never gates a merge. Asked by
Daniel 2026-07-06 after the day's cross-reviews degraded to agy's fallback model twice.

**Status: ✅ shipped 2026-07-06** — 1 sprint, built + merged same day. Retro:
[`RETROSPECTIVE.md`](RETROSPECTIVE.md).

## Why
`agy` (the Antigravity CLI) is under constant development; its headless print contract has broken on a
minor bump before (1.0.10 silently shipped empty reviews for weeks). The shared rail
(`scripts/lib/cross-agent-cli.mjs`) therefore pins the version and **fail-louds** on mismatch — safe,
but every agy self-update stalls `--agent antigravity` cross-review until a human re-verifies the
contract by hand and bumps `AGY_PINNED`. That re-verification is mechanical → make it a script, and
**authorize the agent that hits the pin failure to clear it itself**.

## What shipped (1 sprint)
`scripts/agy-doctor.mjs` — diagnose (`version` vs pin · `--help` still shows the `-p`/`--model`
contract · both pinned models still in `agy models` · live print probes) and `--fix` (bumps
`AGY_PINNED` + a machine-managed "last verified" marker **only on a green live probe**, then runs the
scripts test suite). Model drift is **reported, never auto-swapped** (reviewer-model choice stays a
judgment call); a broken contract still fails loud — the 1.0.10 protection is preserved, only the
re-verification is automated. `checkAgyVersion`'s failure message now names the command, so the fix
reaches exactly the agent that hits the wall.

## Definition of Done (epic)
- [x] `scripts/agy-doctor.mjs` diagnoses (version vs pin, `--help` contract, both pinned models, live
      print probes) and `--fix`es (bumps `AGY_PINNED` + a "last verified" marker only on a green live
      probe, then runs the scripts test suite).
- [x] Model drift is reported, never auto-swapped; a broken contract still fails loud.
- [x] `checkAgyVersion`'s failure message names the command, so the fix reaches the agent that hits it.

## Deliberately out of scope
- **ops-nightly wiring** — a routine's cloud sandbox has no agy binary and agy has no headless auth
  (the same fact that keeps cross-review local-only, see LEARNINGS), so drift can only be observed and
  fixed on a machine where agy runs. The die-message distribution point covers that machine.
- **Auto-committing/pushing from the doctor** — a script pushing branches from arbitrary checkouts
  recreates the shared-worktree collision class; agents already own the commit/PR flow, so `--fix`
  edits + tests and prints the exact next step instead.
- Auto-upgrading the agy **binary**; auto-swapping reviewer **models**; anything codex-side (its quota
  is an account matter, not drift).
