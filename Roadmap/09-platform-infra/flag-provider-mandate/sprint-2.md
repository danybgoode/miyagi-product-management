# Golden Frijoles is the flag provider — Sprint 2: Medusa cutover — `platform_flags` to Golden Frijoles

**Status:** ⬜ not started

**Epic:** [Golden Frijoles is the flag provider](README.md) · **Risk: HIGH — the product owner merges** (these flags gate checkout in two apps)

**Lands in `medusa-bonsai`.** ⛔ **Does not start until the CLI epic's Sprint 2 has shipped.**

**This is a data migration on a live money path.** Two apps — the Next.js frontend and the Medusa
backend — read the **same** `platform_flags` rows, so one flip governs both. That is a strength
during dual-read and a single point of failure during contraction. Expand/contract, verified on real
traffic, never a big-bang switch.

## Stories

### Story 2.1 — Generate and sync the flag catalog
**As the** operator, **I want** medusa's existing flags registered in Golden Frijoles without
hand-creating each one, **so that** the cutover doesn't spend its appetite on data entry.
**Acceptance:** per **D4**, a generated catalog is produced from the **live `platform_flags` rows**
(read live — row counts and actual polarity decide what is safe, not the migration files) and synced
with `gf flags sync`. Every flag arrives with its **current polarity and per-env state preserved**.
Nothing reads Golden Frijoles yet — this story is dark. An identical definition reports
`created: false`; any semantic drift surfaces as a 409 for a human to resolve.
**Risk:** high

### Story 2.2 — Dual-read, parity verified on real traffic
**As the** product owner, **I want** both providers read side by side before anything switches,
**so that** a disagreement is discovered by a log line rather than by a broken checkout.
**Acceptance:** `flag-provider-mode.ts`'s **existing** resolver (do not write a second one) reads both
providers and serves the **outgoing** one, recording any disagreement. Runs on real production
traffic until parity holds across every flag and env. The parity evidence — flags compared, duration,
disagreements found and explained — is written into this file before 2.3 starts.
**Risk:** high

### Story 2.3 — Contract, and delete the Flagsmith wrapper
**As the** maintainer, **I want** exactly one flag provider, **so that** the three-provider situation
this epic exists to end actually ends.
**Acceptance:** `platform.golden_frijoles_flags_enabled` is flipped **on** in the outgoing provider,
Golden Frijoles becomes the only reader, and the dual-read path is removed. **`scripts/flags.mjs` —
the Flagsmith Admin-API wrapper for a provider we left months ago — is deleted in the same PR**, along
with any now-dead cutover scaffolding. `platform_flags` is left in place, unread, for one wave as the
rollback, then dropped by a follow-up chore. **Rollback is the flag, not a revert.**
**Risk:** high

## Sprint QA
- **api spec(s):** a parity spec asserting both providers return identical resolutions for every flag
  × env; a fail-open spec asserting an unreachable Golden Frijoles falls back to `DEFAULT_FLAGS`
  behaviour and **never throws on the checkout path**; regression specs for the two highest-risk
  gated paths (`checkout-options` catalog and the `start-checkout` guard).
- **browser smoke owed:** **yes, to the product owner by name** — the money path. An automated smoke
  cannot fully cover a real checkout.
- **deterministic gate:** `tsc --noEmit` + `npm run build` (both apps) + `medusa build` + unit +
  Playwright `api` green before merge. **Migrations applied before merge, not after** — merging deploys.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · the live storefront and admin

1. Run `gf flags ls --project miyagi` and compare against `/admin/flags`.
   → Same flags, same per-env state, same polarity. Count matches.
2. With dual-read enabled and the switch still **off**, watch the disagreement log for a full traffic day.
   → Zero unexplained disagreements. *(Any disagreement is a stop, not a note.)*
3. Flip `platform.golden_frijoles_flags_enabled` **on** in `/admin/flags`.
   → The apps serve flags from Golden Frijoles. No error rate change.
4. Kill a non-money flag with `gf flags kill <key> --env production`.
   → The storefront reflects it within the snapshot TTL. **Both** the frontend and the backend agree.
5. Simulate a Golden Frijoles outage (block the host at the edge, or revoke the key briefly).
   → The site **stays up**. Flags resolve to their safe defaults. **Checkout does not error.**
   *(Restore immediately.)*
6. (money path — **owed to the product owner by name**) Complete a real test-mode checkout end to end.
   → Order completes. The coordinated-delivery and payment-rail guards behave exactly as before.
7. Flip the switch **off** again.
   → The apps fall back to `platform_flags` cleanly. *(This is the rollback rehearsal — do it before
     trusting the cutover, not after needing it.)* Then flip it back on.
8. Run `git grep -n flagsmith -- ':!Roadmap' ':!references'`.
   → No hits in live code. `scripts/flags.mjs` is gone.
9. Open https://golden-beans-gamma.vercel.app/app/flag-audit/miyagi.
   → Recent flips are attributed, with the CLI and the console distinguishable.

If any step fails, note the step number + what you saw — that's the bug report.

**Steps 5 and 7 are the ones that decide whether this merges.** A flag provider that can take the
storefront down, or a cutover whose rollback has never been rehearsed, is not ready for a money path.
