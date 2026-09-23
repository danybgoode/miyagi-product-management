---
title: "Flag lane cleanup — drop the parked platform_flags + legacy mirror, retire dead env vars"
slug: flag-lane-cleanup
status: raw
area: "09"
type: chore
priority: null
risk: medium
epic: null
build_order: null
updated: 2026-09-23
---

# Raw seed — Flag lane cleanup

## Opportunity

flag-provider-mandate (shipped 2026-09-23) made Golden Frijoles project `miyagisanchez` the only flag
authority. It deliberately **parked** rather than dropped the second lane, for one wave, as the
rollback. After one wave with no rollback needed:

- **Drop tables** (in the shared Supabase DB, via the orchestrator's migration path):
  - `platform_flags`, and its seed/polish migrations' data.
  - `golden_flag_snapshot_mirror` and `persist_golden_flag_snapshot`, the legacy primary lane.
  - The `partners-recruiting-v3` row of `golden_flag_scoped_snapshot_mirror`.
- **Remove unread env vars** from the `miyagi-web` / `medusa-web` Cloud Run services and the
  Secret Manager entry: `GOLDEN_BEANS_FLAG_CUTOVER`, `GOLDEN_BEANS_PARTNERS_RECRUITING_V3_FLAG_READ_KEY`.
- **Decide the deferred link update.** `product_variant_inventory_item.required_quantity` is still
  `integer`; Medusa 2.21 declares it `numeric`. The widening is lossless and only needed for fractional
  required quantities. The entrypoint's `--execute-safe-links` skips it by design; applying it is an
  operator step (`medusa db:sync-links --execute-all` from inside the VPC, or a pre-deploy job).
- **Automate read-key rotation, or get a longer-lived key.** Golden mints 30-day `flag_read` keys.
  `session-resume` warns 7 days out, but a rotation still needs a human. Evaluate a scheduled rotation
  (mint → Secret Manager version → roll both services), or ask Golden for a service-credential class.

## Not in scope

Anything that changes which project decides, or re-adds a writer to `/admin/flags`.
