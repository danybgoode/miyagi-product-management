# Owned-shop operating channel — make a shop sellable without marketplace admission — Sprint 1: The channel exists, and nothing depends on it yet

**Status:** ⬜ not started

## Epic-mode boundary

Everything here is **inert by design**. At the end of this sprint the operating channel exists, is
protected, and holds every product — and not one line of code reads it. That is the whole point: the
backfill has to be verifiable *before* anything can break from it being incomplete (README E2).

## Stories

### Story 1.1 — Re-derive the live channel and publishable-key graph, and lock the plan

**As the** architect, **I want** the live Sales Channel, publishable-key and product graph re-derived
before anything is created, **so that** the plan rests on measured facts rather than on this document.

**Acceptance:**

- A written report states, from the **live production database**: every Sales Channel (id, name), every
  publishable key and its channel link rows, the number of published products, the number of sellers with
  published products, and how many products are currently in **no** channel.
- The five open questions in README **E1** are answered in writing, each with the evidence that settled
  it — especially E1.1 (join both channels vs. cart picks by context), which determines Sprint 2's shape.
- The kill-switch decision in the epic README is settled and recorded.
- Any premise in this scaffold that the live data **disproves** is corrected here, out loud, rather than
  worked around. Reporting a wrong premise is a successful outcome.
- The publishable-key link-row count is recorded as a **before** number, so Sprint 2's change is a diff
  against a known baseline.

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

**Risk:** high (a deletable channel is a dark storefront)

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
