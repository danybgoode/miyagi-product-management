---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Sprint 1 built (backend 473b632+22b797e, frontend 0c735b9), draft PRs open, HIGH risk — awaiting Daniel merge.
slug: ml-orders-native
archetype: Builder
---

# Epic · ML orders, native — Mercado Libre sales land as real Medusa orders

> Scoped 2026-07-02 from [`00-ideas/2. readyforscope/ml-orders-native.md`](../../00-ideas/2.%20readyforscope/ml-orders-native.md)
> (Epic A of the Merchant Ops PRD; approved by Daniel 2026-07-02).
> **Status: Sprint 1 built, draft PRs open.** Risk **HIGH** (order/fulfillment core + inventory
> interaction with the live S4 stock sync). Daniel merges HIGH stories.
> **Companion:** [`profit-analyzer`](../profit-analyzer/README.md) (Epic B) builds on this epic's order
> data — **this epic ships first.**

**Tagline:** *Todas tus ventas — Mercado Libre y Miyagi — en una sola bandeja de pedidos.*

## Why

The live `mercadolibre-sync` epic already sees every ML order (webhook `orders_v2` + `*/30` reconcile
poll) but only decrements stock; its groom explicitly cut "order import into Miyagi." Merchants still run
two back-offices. Materializing ML sales as **real, source-tagged Medusa orders** puts one fulfillment
workflow, one notification rail, and one agent surface behind everything they sell — and lands the
realized fee/shipping data Epic B's profit ledger needs.

## Context

| | |
|---|---|
| **Role** | Seller (unified order workflow); admin (flags) |
| **Macro-section** | 03 · Selling & Shops |
| **Risk** | HIGH — Medusa order creation + inventory coordination with live S4 delta sync |
| **Flag** | `ml.orders_enabled` (enablement, default OFF, fail-closed) + per-seller enable |
| **Entitlement** | Rides the existing `ml_sync` SKU — zero new money infra |
| **Design** | Project conventions only — house tokens/components, like any `/shop/manage` section |
| **No estimates** | quality-first; risk tiers gate who merges |

## Medusa-first note (AGENTS rule #1)

Extends the existing Medusa module `apps/backend/src/modules/mercadolibre/` — no new pipeline, no Docker
worker layer (PRD over-spec, rejected at groom). Orders are **Medusa orders on a dedicated "Mercado
Libre" sales channel**; states map onto the native fulfillment machine; nothing order-shaped touches
Supabase (rule #2). ML buyers get no Clerk accounts (rule #4); seller copy es-MX, not on the bilingual
allow-list (rule #5); agent parity via existing seller MCP order reads (rule #3).

**The named core risk:** creating a Medusa order wants an inventory effect, and the S4 delta sync already
decrements on the same ML sale — one ML order must produce **exactly one** inventory effect, flag on or
off. US-0's durable idempotency table (absorbing ml-sync's deferred US-15) is the proving mechanism; the
exact seam is decided in sprint-1 plan mode **reading S4 code on fresh `origin/main`** (local backend
checkout is stale on `feat/subdomain-pricing-s3`).

## What already exists (reuse, don't rebuild)

- **ML module** — OAuth connection (encrypted tokens, refresh, `needs_reauth`), `product-ml-link`,
  ML API client, unit-test harness (`apps/backend/src/modules/mercadolibre/`).
- **Order visibility rail** — `orders_v2` webhook (replay-safe, paid-only, order-id idempotent) +
  per-seller reconcile poll (ml-sync S4).
- **Medusa Orders / Sales Channels / Inventory** — system of record; `backfill-sales-channel` +
  `prune-sales-channels` show the sales-channel pattern.
- **Seller order screen** `/shop/manage/pedidos` + granular multi-channel notifications.
- **Entitlement gate** — `lib/ml-sync-entitlement*` + `ml.sync_paywall_enabled` + promoter comp-grants.
- **Activity log** — `ml_sync_event` per-seller module log.
- **Agent surface** — seller MCP order tools; UCP manifest.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | US-0 Durable idempotency table (absorbs ml-sync S5 US-15) — `unique(link_id, ml_order_id)`, transactional with inventory/order effects | high |
| 1 | US-1 Materialize a paid ML order as a Medusa order on the "Mercado Libre" sales channel (items via linkage; ML buyer + order/pack ids + fee/shipping payloads in metadata), idempotent, coordinated with S4 stock path | high |
| 1 | US-2 ML → Medusa state mapping (paid → shipped → delivered) on webhook + reconcile | high |
| 1 | US-3 Source badge + ML metadata on `/shop/manage/pedidos` list + detail | low |
| 2 | US-4 Cancellation / refund mapping (restock coordinated with sync) | high |
| 2 | US-5 Seller notifications for ML orders via existing granular channels | med |
| 2 | US-6 Entitlement + kill-switch wiring (`ml_sync` grant + `ml.orders_enabled`) | med |
| 3 | US-7 Order tags: manual CRUD + automatic source tag on ingest | low |
| 3 | US-8 Bulk select + bulk fulfillment-status actions on the order list | med |
| 3 | US-9 Agent-surface parity: ML orders in seller MCP order reads; manifest accurate | low |

**Out (v1):** IF/THEN rule builder, merge/split, batch label printing (v2 seeds); ML buyer comms from
Miyagi; label purchase for ML orders; non-ML external channels; profit math (Epic B).

## Deploy order

**Backend-first throughout.** S1 is the spine (idempotency + materialization + states) — everything HIGH,
Daniel merges, dark behind `ml.orders_enabled`. S2 completes the lifecycle (cancel/refund) + gating before
any flag flip. S3 is workflow polish (tags/bulk/agent), mostly frontend. Signature regression smoke at
every sprint: **an ML sale moves stock exactly once, flag ON and flag OFF.** Announce shared-surface
touches.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (ML-sandbox order walkthroughs owed to Daniel, per sprint).
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs / real ML sandbox).
- [ ] This README marked ✅; every sprint status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`) updated (unified ML order workflow).
- [ ] Team memory + `MEMORY.md` updated (order materialization seam, channel, flag).
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append).
- [ ] Kill-switch verified: `ml.orders_enabled` exists, default OFF, per scope doc polarity.
- [ ] Feature branch deleted; scope-doc frontmatter `status: shipped`.

## Sprints

- [sprint-1.md](sprint-1.md) — ✅ built. The spine: idempotency table + order materialization + state mapping + badge (backend `473b632`+`22b797e`, frontend `0c735b9`). Draft PRs open — awaiting Daniel merge (HIGH).
- [sprint-2.md](sprint-2.md) — Full lifecycle: cancel/refund, notifications, entitlement + kill-switch.
- [sprint-3.md](sprint-3.md) — Workflow: tags, bulk actions, agent parity.
