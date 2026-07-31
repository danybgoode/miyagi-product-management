# Owned-shop operating channel — make a shop sellable without marketplace admission — Sprint 1: The channel exists, and nothing depends on it yet

**Status:** ✅ merged (PR 128, squash `5bc83c0`) — deployed and verified inert. Provisioning + backfill
still owed (production mutations, D10 steps 2–5).

## Deployed-inert verification (2026-07-31, live production, read-only)

Cloud Build `3f3261c2` SUCCESS → revision `medusa-web-00028-dbs`. Confirmed against live prod:

| Check | Result |
|---|---|
| `GET /internal/operating-channel-backfill?market=mx` | **503**, `unavailable: true`, `apply_allowed: false` — names `MEDUSA_MX_OPERATING_CHANNEL_ID` as unset. No confident empty report. |
| … its second blocker | `link_plan could not be computed` — the round-3 guard firing **live**, confirming it was a real path, not a hypothetical. |
| `POST /internal/prune-sales-channels {dry_run:true}` | **503**, blocked on the same unset var. This is the deliberate availability change during the provisioning window: a prune that ran short-listed would delete the channel. Fail-closed, as designed. |
| `GET /internal/market-backfill?market=mx` (parent epic) | **200**, unchanged — 77 published, 77 linked, 0 missing. **No regression.** |

The channel does not exist yet; nothing reads it; the marketplace path is untouched. That is exactly
what Sprint 1 promised.

## Build contract (locked by the architect before the builder started)

Cite the epic README's decisions; do not re-derive them.

- **D1** gives you the live graph. There is nothing to discover: 2 channels, 1 publishable key with
  exactly 1 link row, 26 sellers all `operating_market: mx`, 77 published products all already linked to
  the marketplace channel. `would_link` for the *marketplace* backfill is empty — the parent epic's apply
  already ran.
- **D6** — the operating-channel backfill scans **every product status**, not just `published`, and
  reports the split. This is the one place this sprint deviates from the market-backfill sibling.
- **D5** — provisioning includes linking the operating channel to every stock location the marketplace
  channel is linked to, and the dry-run **reports that graph** before/after. Reuse
  `ensureSalesChannelLocationLink` from `store/_utils/inventory.ts`; do not write a second one.
- **D10** — allow-list deploys before the channel exists. Non-negotiable ordering.
- Story 1.1 is **already done** — it is the locking pass in the epic README. Do not redo it.

Reuse, do not reinvent: `/internal/market-backfill` is the shape (validate → claim → apply, capped-scan
refusal, per-seller market scoping, `describeScan`, `internalSecretOk` fail-closed). The new route is its
sibling, not a new pattern.

## Epic-mode boundary

Everything here is **inert by design**. At the end of this sprint the operating channel exists, is
protected, and holds every product — and not one line of code reads it. That is the whole point: the
backfill has to be verifiable *before* anything can break from it being incomplete (README E2).

## Stories

### Story 1.1 — Re-derive the live channel and publishable-key graph, and lock the plan ✅

**Done at the locking pass, 2026-07-31.** The report is the epic README's **D1**; the five E1 questions
are answered by **D3** (E1.1), **D1** (E1.2, E1.3), **D4** (E1.4) and **D11** (E1.5); the kill-switch is
settled in **D8**. Three scaffold premises were disproved — **D5**, **D6** and **D7** — and D7 added a
new story to Sprint 2.

**As the** architect, **I want** the live Sales Channel, publishable-key and product graph re-derived
before anything is created, **so that** the plan rests on measured facts rather than on this document.

**Acceptance:** all met — see README D1 (the measured graph, including the publishable-key link-row
**before** count of 1), D3/D4/D8/D11 (the E1 answers and the kill-switch), and D5/D6/D7 (the disproved
premises, corrected out loud rather than worked around).

**Risk:** high (every later decision inherits these numbers)

### Story 1.2 — Operating-channel seam in the market registry env layer

**As the** platform, **I want** a market's operating channel resolved through the same env seam as its
marketplace channel, **so that** the two are separate, testable concepts and neither is hard-coded.

**Acceptance:**

- `MARKET_MEDUSA_ENV_KEYS` gains an `operating_channel` entry for `mx`, backed by a new env var
  (e.g. `MEDUSA_MX_OPERATING_CHANNEL_ID`). `us` has none, in any environment.
- A `resolveOperatingChannelForMarket` resolution preserves the existing **three states**: resolved /
  `no_resource` (us — structural) / `unconfigured` (mx with the var missing — an operator fault).
- `unconfigured` **never** falls back to the marketplace channel. A missing operating channel is an
  outage; silently selling through the marketplace channel would erase the distinction this epic exists
  to create.
- **No id enters `markets.ts`** (parent D2). The pure registry stays environment-independent, and its
  golden spec stays green in both repos.
- Unit specs cover all three states with an injected env object — no ambient `process.env`, no container.

**Risk:** med (pure seam, no live effect)

### Story 1.3 — Provision the MX operating channel and protect it from the destructive scripts

**As the** platform, **I want** the operating channel created and added to the protected allow-list,
**so that** the two destructive setup scripts cannot delete the channel every product depends on.

**Acceptance:**

- `protectedSalesChannelIds` includes every market's **operating** channel alongside its marketplace
  channel and the store default. A spec asserts the operating channel is protected.
- **Ordering, non-negotiable:** the allow-list change is deployed **before** the channel is created in
  production. A channel that exists but is not yet protected is one `cleanup-default-data.ts` run from
  deletion.
- The dry-run of both destructive paths (`setup-mexico` step 6, `cleanup-default-data`) shows the
  operating channel in the **keep** set, with its keep-reason named.
- Channel creation is a **production mutation performed by Daniel**, from a command the builder wrote and
  dry-ran. The builder never creates it.
- The created channel's id and name are recorded in the sprint doc and set as the env var on both
  services that need it.
- **D5 — the stock-location link.** Provisioning also links the operating channel to **every stock
  location the marketplace channel is linked to**, via the existing `ensureSalesChannelLocationLink`
  (`store/_utils/inventory.ts`). Without it, every managed-inventory purchase fails at order completion
  the moment Sprint 2 moves the cart onto this channel. The command reports the location↔channel graph
  before and after.

**Risk:** high (a deletable channel is a dark storefront; an unlinked location is a dead checkout)

### Story 1.4 — Idempotent operating-channel backfill, dry-run reported first

**As the** operator, **I want** every existing product moved into the operating channel by one
reviewed, idempotent backfill, **so that** membership is complete before anything reads it.

**Acceptance:**

- `GET` is a **fully read-only** dry-run: per-seller and per-product, what would join the operating
  channel, what already has, and an explicit count of products that would be left out **and why**.
- `POST` applies idempotently, and **validates before it writes**: channel configured, channel actually
  present in the database, both scans complete, no unclassifiable seller. A half-applied backfill is the
  worst outcome, so every precondition is checked before the first write (the market-backfill route's
  own hard-won rule — reuse its shape).
- **A capped scan is not a complete scan.** If a read fills its window, the counts are not authoritative
  and nothing may be applied against them.
- A product joins the operating channel of **its owning seller's market** only — never a blanket link of
  every product to MX.
- **D6 — every status, not only `published`.** The scan covers draft products too, and the report gives
  the published/draft split. A draft left out becomes unbuyable the day it is published, which is a bug
  that would surface long after this epic closed. Linking a draft is inert: `/store/products` filters
  `status` independently.
- Re-running the apply changes nothing and reports zero deltas.
- The backfill is run by **Daniel**, after reviewing the dry-run. The builder hands over the exact command.
- Post-apply verification: the number of products in the operating channel equals the expected
  population, and the products in **no** channel is zero (or the remainder is named and explained).

**Risk:** high (production data mutation across the whole catalog)

## Sprint QA

- **api specs:** the three-state operating-channel resolver; `markets.ts` golden spec unchanged (both
  repos); protected-allow-list includes the operating channel; backfill planner purity — validate-before-
  apply ordering, capped-scan refusal, per-seller market scoping, idempotency.
- **browser smoke owed:** none — nothing user-visible changes this sprint. That is the design.
- **deterministic gate:** backend `tsc` + build + full test suite green; both repos' registry golden
  specs green.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production, after Daniel applies the provisioning + backfill.

1. Run the backfill dry-run (`GET /internal/market-backfill`-shaped operating-channel report).
   → Read-only; reports the population and the would-join counts. **Nothing changed.**
2. Apply the backfill, then re-run the dry-run.
   → Second run reports **zero** deltas (idempotent).
3. Open `https://miyagisanchez.com/mx/l` and any shop page.
   → **Byte-for-byte the same as before.** The catalog is still 72; nothing reads the new channel yet.
4. Open a product PDP and complete an existing Mexico checkout.
   → Unchanged. Products are now in two channels; the marketplace path behaves identically.
5. Dry-run `cleanup-default-data.ts`.
   → The operating channel appears in the **keep** set with its reason named — never in the delete set.

If any step fails, note the step number + what you saw — that's the bug report.
