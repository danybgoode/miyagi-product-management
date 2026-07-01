---
status: ready
slug: mercadolibre-sync
---

# Epic · Mercado Libre sync — connect, import, publish & two-way stock sync (Medusa-native)

> Scoped 2026-06-29 from [`00-ideas/2. readyforscope/mercadolibre-sync.md`](../../00-ideas/2.%20readyforscope/mercadolibre-sync.md).
> **Status: READY — scaffolded, not started.** **Reclassified spike → Feature** (Daniel dropped the
> estimate/time-box dependency; build for quality). Risk **HIGH** (the stock-sync core mutates inventory
> + writes to an external marketplace — oversell risk). Daniel merges HIGH stories. The despachobonsai
> code is a **reference** (OAuth + ML API shapes), not a drop-in.

**Tagline:** *Tu inventario de Mercado Libre y Miyagi, siempre sincronizado — sin vender de más.*

## Why
Many target merchants are already on Mercado Libre. Letting them **connect**, **import** their ML catalog
in one click, **publish** Miyagi listings out to ML, and keep **stock in sync both ways** is a strong,
day-one sale point for the promoter motion. The reference impl (despachobonsai) only publishes outward +
pulls orders on Supabase/Clerk — the "sync your inventory" value is **mostly unbuilt**, and in Miyagi it
must be **Medusa-native** (rule #1). This epic builds it for quality: idempotent, oversell-safe, with
reconciliation shipped alongside the live sync.

## Context
| | |
|---|---|
| **Role** | Seller (connect/import/publish/sync), admin (gating + kill-switch) |
| **Macro-section** | 03 · Selling & Shops |
| **Risk** | HIGH — stock-sync core mutates Medusa Inventory + writes to ML (oversell) |
| **Flag** | per-seller enable + a `ml.sync_enabled` kill-switch (fail-safe off) |
| **Reference** | `references/despachobonsai` — OAuth dance + ML API client + webhook shape |
| **No estimates** | quality-first per Daniel; risk tiers remain (they gate who merges) |

## Medusa-first note (AGENTS rule #1)
The integration is a **Medusa module** at `apps/backend/src/modules/mercadolibre/` owning the connection,
the **product ↔ ML-item linkage**, and the sync service. Stock sync hooks Medusa **Inventory** via a
**subscriber** (outbound: stock change → ML) and an **ML webhook** (inbound: ML sale/stock → Medusa) —
never a Supabase mirror of stock. **Import** writes **Medusa products** through the existing internal
route + supply pipeline. **OAuth tokens live encrypted (AES-256-GCM) in the Medusa module's Postgres,
keyed to the Medusa seller** — co-located with the linkage + Inventory (the sync core), so the backend
needs no Supabase dependency (decided 2026-06-29 with Daniel; supersedes the earlier "tokens in Supabase"
sketch — the intent, non-commerce credentials encrypted at rest, is preserved). SKU stays
agent-accessible (rule #3); seller copy es-MX (rule #5); Clerk untouched (#4).

## What already exists (reuse, don't rebuild)
- **OAuth + ML API client + webhook shape (reference)** — `references/despachobonsai/lib/mercadolibre.ts`
  (`getMlAuthUrl`/`exchangeCode`/`refreshMlToken`/`getMlUser`/`getTokenForUser` w/ 5-min refresh,
  `publishItem`, `MlItemPayload`/`MlItem`/`MlOrder`), `app/api/webhooks/mercadolibre`.
- **Catalog ingestion** — `lib/catalog-import.ts`, `lib/supply.ts`, `lib/image-ingest.ts`,
  `app/api/supply/*`, `SupplyClient.tsx`; epic `03-selling-and-shops/bulk-import-migration`. ML import is
  a new **source adapter** into this, not new plumbing.
- **Medusa product write path** — `apps/backend/src/api/internal/seller-products/route.ts` + `[id]`,
  `lib/seller-products.ts` (secret-gated, hosted images OK).
- **Module + subscriber conventions** — `apps/backend/src/modules/*`, `apps/backend/src/subscribers/`
  (e.g. `coupon-usage.ts`).
- **Inventory / Products / Orders** — Medusa modules (system of record).
- **Agent surface** — `app/api/ucp/*`. **Gating** — promoter-program + `lib/*-entitlement*` patterns.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1 Connect/disconnect ML (OAuth) as a Medusa module, encrypted tokens, refresh | med |
| 1 | US-2 Product ↔ ML-item linkage model (the sync join) | low |
| 1 | US-3 Connection status + health in `/shop/manage` | low |
| 2 | US-4 Import ML listings → supply pipeline → Medusa products (+ linkage) | med |
| 2 | US-5 Category / attribute / image mapping on import | med |
| 2 | US-6 Import review + confirm + dedupe UI | low |
| 3 | US-7 Publish a Miyagi product → ML (create) + persist linkage | med |
| 3 | US-8 Update / relist / close parity (Miyagi edits propagate to ML) | med |
| 3 | US-9 ML category predictor + manual override | med |
| 4 | US-10 Medusa inventory subscriber → push stock to ML (debounced, idempotent) | high |
| 4 | US-11 ML webhook → adjust Medusa inventory (replay-safe) | high |
| 4 | US-12 Oversell-safe source-of-truth + reconciliation job + drift alerts | high |
| 5 | US-13 Token-refresh recovery + re-auth surfaces + sync activity log | med |
| 5 | US-14 Paid/promoter-SKU entitlement gate (wiring) | med |

## Deploy order
**Backend-first throughout** (Medusa module + migrations before the frontend that needs them). S1
(connect + linkage) is the spine; S2 import and S3 publish ship independently on top. **S4 stock sync is
the HIGH-risk core — Daniel merges, behind a per-seller enable + `ml.sync_enabled` kill-switch** so it
can't oversell at scale before it's proven; the reconciliation job ships **with** the live sync, not
after. S5 hardens + gates. Announce shared-surface touches.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (sync-correctness smokes owed to Daniel, per sprint).
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs / real ML sandbox).
- [ ] This README marked ✅; every sprint status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`) updated (ML connect/import/publish/two-way sync).
- [ ] Team memory + `MEMORY.md` updated (ML module, linkage, sync topology, kill-switch).
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append).
- [ ] Feature branch deleted; scope-doc frontmatter `status: shipped`.

## Sprints
- ✅ [sprint-1.md](sprint-1.md) — Connect + linkage foundation (the spine). **Merged 2026-06-30** (be #44 · fe #139); `ml.connect_enabled` ON.
- ✅ [sprint-2.md](sprint-2.md) — Import ML catalog → Miyagi. **Merged 2026-06-30** (be #45 `36e241d` · fe #142 `66fb9b4`); behind `ml.import_enabled` (dark).
- ✅ [sprint-3.md](sprint-3.md) — Publish Miyagi → ML. **Merged 2026-06-30** (be #46 `bbf75a2` · fe #144 `e9b7420`); behind `ml.publish_enabled` (dark, flag id 220945). Explicit "Sincronizar" action over a reusable reconcile seam (S4-reusable); `domain_discovery` predictor + override.
- 🟨 [sprint-4.md](sprint-4.md) — Two-way stock sync (the oversell-safe core). **BUILT — draft PRs (HIGH →
  Daniel merges)**; be `b3c9c3b` · fe `19d9cfb`; ships dark behind `ml.sync_enabled` (default OFF /
  fail-closed) + per-seller enable. Outbound via `order.placed` + manual-edit → `pushStockToMl`; inbound via
  public `/webhooks/mercadolibre`; `reconcile-ml-inventory` job (`*/30`) heals drift + Telegram alerts.
- ⬜ [sprint-5.md](sprint-5.md) — Resilience, observability & paid-SKU gating.
