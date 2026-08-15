# Golden Frijoles integration — Retrospective

_Closed: 2026-08-14_

## What shipped

**S1 — one SDK, one name.** `sdk-v0.4.0` released from `danybgoode/golden-beans` under the renamed
package; both app repos migrated to `@golden-frijoles/sdk` (storefront #366, backend #153). Ten
files in the storefront and eleven in the backend, **module specifiers only**.
`e2e/golden-scenario-wire-contract.spec.ts` pins the seven wire literals that must never move.

**S2 — nothing to do, and proving that was the work.** Production was already at the target state.

**S3 — the paywall exposure, fixed.** Not the flip the sprint anticipated: the paywalls were already
ON, and five shops were locked out of subdomains they already had (#364). Backfilled, 30/30, verified
live. `custom_domain` and `ml_sync` deliberately left alone.

## What went well

**The locking pass paid for itself twice before any code was written.** Reading Golden's own repo
disproved the assumption that the rebrand renamed everything — the scenario handshake did not move —
and reading its admin route disproved a memory that had been sitting in the team's index since
2026-08-01 claiming the admin credential was read-only. Both would have cost real debugging time.

**"Verify the premise" caught the whole sprint.** S2 was scoped as a 38-flag sweep with a bulk
activation UI. One live snapshot read showed the work was already done — and, more usefully, that the
*right* assertion was `rules: []` rather than `value === true`. A sprint that ships nothing because
the outcome already holds is a good outcome, provided it is verified rather than assumed.

**The type system proofread the migration.** `ScenarioProvider.metadata.name` changed in 0.4.0 and
`tsc` caught the stale fixture immediately, which is exactly the boundary between "renamed identity"
and "signed wire material" that D3 exists to keep visible.

## What we learned

**A rename that is 90% mechanical is dangerous precisely because it is 90% mechanical.** Golden
renamed its package, its provider metadata and its prose — but not the seven strings that both ends
HMAC. A repo-wide find-and-replace would not have errored; it would have produced signatures that
silently fail to verify, on the path whose entire job is proving ownership. **Before a brand rename,
enumerate which occurrences are protocol and pin them with a spec.**

**"Absent" and "off" are different facts about a flag, and the difference is operational.**
`partners.recruiting_v3_enabled` reads `false` everywhere — but because it has no Golden definition
at all, not because someone turned it off. Enabling it is a *create*, not a *flip*. Any flag
inventory that renders both as "OFF" is hiding a task.

**A missing lockfile update is invisible in a workspace monorepo.** The root declares
`workspaces: ['apps/**']`, so `npm install` from inside an app resolves the ROOT lockfile — which had
been refreshed — while CI clones the app alone and reads the APP lockfile, which had not. The local
install succeeded against a file CI never reads. **After changing an app's `package.json`, regenerate
with `npm install --package-lock-only --workspaces=false`.**

## Gaps / follow-ups

- **`partners.recruiting_v3_enabled` needs its Golden definition created**, then its
  operator-versus-Promotor authorization smoke, then the flip. Three steps, and the smoke has never
  run. **Owed to Daniel.**
- **The `custom_domain` and `ml_sync` grandfather backfills are unapplied by decision**, not by
  oversight — 27 and 28 shops owed against 1 and 0 actually using the SKU. One command either way
  (`npm run paywall:backfill -- --sku custom_domain --apply`). **Daniel's call.**
- **Env vars are still `GOLDEN_BEANS_*`** (D4). Renaming them is a production secrets + Cloud Run
  change for a cosmetic gain; deliberately deferred.
- **Two disposable `breaker.*` proof flags** from a 2026-07-29 circuit-breaker test still sit in
  Golden's production snapshot. They are outside Miyagi's admin scope — a Golden-side cleanup.
- **Golden's four new capabilities are surveyed, not adopted** (D10): the visual rule builder,
  journey projections, experiment governance and scenario authoring, all default-OFF in Golden.
  Adopting any is its own epic.
