# Sprint 1 — Data foundation: COGS + append-only ledger + margin dashboard (dark)

> Epic: [profit-analyzer](README.md) · Risk: **HIGH** (US-2 migration; Daniel merges) · Backend-first;
> dark behind `ops.profit_enabled` (default OFF). **Prerequisite: Epic A (`ml-orders-native`) merged** and
> capturing fee/shipping payloads on ML orders.

## Stories

### US-1 · COGS per variant — med
**As a** seller, **I want** to record my unit cost on each variant — one at a time or in bulk, **so that**
margin math has my side of the equation.
Medusa-side field (metadata vs module field decided in plan mode); listing-editor input; bulk CSV rides the
existing import pipeline. MXN only (v1).
**Acceptance:** set COGS in the editor and via a 20-row CSV; values persist and read back over the internal
API; invalid rows report per-row errors, not a dead batch.

### US-2 · Financial-events ledger (append-only) — high
**As a** seller, **I want** every sale's financials frozen at sale time (revenue, fee, shipping, COGS
snapshot), **so that** historical margins stay true when fees or my costs change later.
Small Medusa module table, one row per order line financial event, ML + native sources; idempotent writes;
backfill for Epic-A-ingested orders; rows with missing pieces (label bought later) land partial and are
completed by follow-up events — never mutated.
**Acceptance:** a sandbox ML sale writes ledger rows with the *actual* ML fee; changing COGS afterward does
not alter existing rows (spec proves it); replaying the source event writes nothing new; migration clean.

### US-3 · Profit dashboard v1 — low
**As a** seller, **I want** a per-order and per-SKU margin table in my Analíticas section, **so that** I
see what I actually earn.
House tokens/components, standard `/shop/manage` patterns; partial rows render honestly ("envío
pendiente"); behind `ops.profit_enabled`.
**Acceptance:** with the flag ON, the table shows realized margin per order + aggregated per SKU matching
hand math on the smoke data; flag OFF → no profit UI anywhere; es-MX copy complete.

## Sprint QA

- Api specs: margin calc in pure `lib/profit.ts` (US-3 reads it), ledger append-only + idempotency
  decision fns (US-2), CSV row validation (US-1).
- **Owed to Daniel:** the COGS → sandbox ML sale → margin-row live walkthrough; prod migration confirm.

## Sprint 1 — Smoke walkthrough (do these in order)

_Placeholder — written by the building agent before sprint close (real URLs; money/auth steps flagged
**owed to Daniel**)._
