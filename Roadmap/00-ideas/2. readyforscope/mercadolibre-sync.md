---
title: "Mercado Libre sync — connect, import, publish & two-way stock sync (Medusa-native)"
slug: mercadolibre-sync
status: awaiting-approval
area: "03"
type: feature
risk: high
relates_to: "03-selling-and-shops/bulk-import-migration · 03-selling-and-shops/gem-claim-loop · 08-growth-and-promotions/promoter-program · references/despachobonsai (reference impl)"
reclassified_from: "spike (ml-sync-port) — Daniel dropped the estimate/time-box dependency; build it for quality"
updated: 2026-06-29
---

# Mercado Libre sync — connect, import, publish & two-way stock sync (Medusa-native)

**Status: awaiting Daniel approval — no code yet.** **Reclassified from a spike to a Feature** at Daniel's
direction: drop the estimate/time-box gating, build it well. Class: **Feature** (multi-sprint). Risk
**HIGH** — the stock-sync core mutates inventory and writes to an external marketplace (oversell risk).
The despachobonsai code is a **reference for OAuth + the ML API shapes**, not a drop-in: it does
publish + order-pull on Supabase/Clerk; the valuable "sync your inventory" capability is **mostly
unbuilt**, and in Miyagi it must be **Medusa-native** (rule #1).

## Mirror-back
> You want Mercado Libre to be a first-class, quality-built integration: a merchant **connects** their ML
> account, can **import** their existing ML catalog into Miyagi (one-click onboarding for the many
> merchants already on ML), can **publish** Miyagi listings out to ML, and — the core — keeps **stock in
> sync both ways** so selling on either platform never oversells. No estimate/time-box gating; build it
> right. Right?

## Decisions (Daniel, 2026-06-29)
1. **Must-have capabilities (all three):** **two-way stock sync**, **import ML catalog → Miyagi**, and
   **publish Miyagi → ML**. (Order import into Miyagi was **not** selected → out of scope for now.)
2. **No estimate/time-box dependency** — this is committed quality work, sliced for correctness, not
   speed. (So this doc carries **no estimates**; risk tiers remain — they gate who merges, per
   WAYS-OF-WORKING.)

## Stage 2.5 — orientation: what the reference gives us vs what's genuinely new
- **Ports cleanly from despachobonsai (reference):** the OAuth dance (`getMlAuthUrl`, `exchangeCode`,
  `refreshMlToken`, `getMlUser`, `getTokenForUser` with 5-min refresh), encrypted token storage, the ML
  API client types (`MlItemPayload`/`MlItem`/`MlOrder`), `publishItem` (create), and the webhook receiver
  shape.
- **Reuses Miyagi primitives (big reframe):** **import** rides the **existing bulk-import/supply
  pipeline** (`lib/catalog-import.ts`, `lib/supply.ts`, `app/api/supply/import`, `SupplyClient.tsx`) and
  the secret-gated **`internal/seller-products`** Medusa write path — *not* new ingestion plumbing.
- **Genuinely new (the real work):** (a) a **Medusa product ↔ ML-item linkage** model — the join the
  reference lacks, without which nothing can stay in sync; (b) **two-way stock sync** — a Medusa
  **inventory subscriber** (stock change → push to ML) + an **ML webhook** (ML sale/stock change → adjust
  Medusa inventory), with idempotency, rate-limit handling, oversell prevention, and **reconciliation**;
  (c) **ML category mapping** (ML requires a valid `category_id` — needs the ML category predictor);
  (d) item **update/relist/close** parity (the reference only creates).

## What already exists (reuse, don't rebuild)
| Need | Reuse | Where |
|---|---|---|
| OAuth connect/refresh, ML API client, webhook shape | despacho reference | `references/despachobonsai/lib/mercadolibre.ts`, `app/api/.../ml/*`, `app/api/webhooks/mercadolibre` |
| Catalog ingestion (staging, normalization, image ingest) | Bulk-import/supply pipeline | `lib/catalog-import.ts`, `lib/supply.ts`, `lib/image-ingest.ts`, `app/api/supply/*`, `SupplyClient.tsx`; epic `03-selling-and-shops/bulk-import-migration` |
| Create/update Medusa products (secret-gated, hosted images) | Internal product write path | `apps/backend/src/api/internal/seller-products/route.ts` + `[id]/route.ts`, `lib/seller-products.ts` |
| Backend module + subscriber conventions | Medusa module/subscriber patterns | `apps/backend/src/modules/*`, `apps/backend/src/subscribers/` (e.g. `coupon-usage.ts`) |
| Inventory / Products / Orders system of record | Medusa modules (rule #1) | Medusa Inventory + Products + Orders |
| Seller connection storage (non-commerce tokens) | Supabase (rule #2), keyed to the Medusa seller | new `commerce_ml_connections`-style table |
| Agent surface | UCP/MCP | `app/api/ucp/*` |
| Paid-SKU / promoter gating hook | promoter-program + subscription/entitlement patterns | `08-growth-and-promotions/promoter-program`, `lib/*-entitlement*` |

**Medusa-first note (rule #1):** the integration is a **Medusa module** at
`apps/backend/src/modules/mercadolibre/` owning the connection, the linkage, and the sync service. Stock
sync hooks Medusa **Inventory** via a **subscriber** (outbound) and an **ML webhook** (inbound) — never a
Supabase mirror of stock. Import writes **Medusa products** through the existing internal route. Only the
**OAuth tokens** (non-commerce) live in Supabase, keyed to the Medusa seller. SKU stays agent-accessible
(rule #3); seller copy es-MX (rule #5); Clerk untouched (rule #4).

## v1 scope — IN
1. **Connect**: seller links/unlinks their ML account (OAuth), encrypted tokens, connection health.
2. **Linkage**: a durable Medusa product ↔ ML-item mapping — the sync join.
3. **Import**: pull a connected seller's ML listings → existing supply pipeline → Medusa products (with
   category/attribute/image mapping + a review/confirm + dedupe step).
4. **Publish**: push a Miyagi product to ML (create + update/relist/close) with ML category prediction.
5. **Two-way stock sync**: Medusa inventory change → ML; ML sale/stock change → Medusa; idempotent,
   rate-limit aware, **oversell-safe**, with reconciliation + drift alerts.
6. **Resilience/observability**: token-refresh recovery, re-auth prompts, a per-seller sync activity log.
7. **Gating hook**: ML sync can be turned into a paid/promoter SKU (entitlement check) — wiring only.

## v1 scope — OUT
- **ML order import into Miyagi** (not selected; despacho's order-pull can be a later add).
- ML **questions/messages**, ML **shipping (Mercado Envíos)** integration, ML **Ads** — later.
- Multi-account-per-seller, non-MX ML sites — later (model allows it; not a v1 target).
- Bidirectional **price** authority wars — define a single price source per linked item (see risks).

## Slices — skateboard → car (quality-first; each story independently shippable + testable)

### Sprint 1 — Connect + linkage foundation (the spine)
- **US-1** *As a seller, I connect/disconnect my ML account.* Port the OAuth dance into a Medusa module
  `apps/backend/src/modules/mercadolibre/`; encrypted token storage keyed to the Medusa seller; refresh-
  on-expiry. **Risk: MED** (third-party auth, no money). QA: api spec on connect/refresh/disconnect.
- **US-2** *As the system, I persist a Medusa product ↔ ML-item linkage* (the missing primitive) so any
  later sync has a join. **Risk: LOW** (additive). QA: api spec on link/unlink/lookup.
- **US-3** *As a seller, I see my ML connection status + health in `/shop/manage`.* **Risk: LOW.** QA:
  build + visual; api spec on status.

### Sprint 2 — Import ML catalog → Miyagi
- **US-4** *As a seller, I import my existing ML listings into Miyagi.* New ML **source adapter** feeding
  the supply/catalog-import pipeline → Medusa products via `internal/seller-products`, recording the
  linkage. **Risk: MED.** QA: api spec on adapter → staged → product + linkage.
- **US-5** *As a seller, imported listings keep their category, attributes, images & description.* ML
  attribute/category/image mapping into the Miyagi product shape. **Risk: MED.** QA: api spec on mapping.
- **US-6** *As a seller, I review & confirm what imports (with dedupe against existing products).* Import
  review UI on the supply tooling. **Risk: LOW.** QA: build + visual; api spec on dedupe.

### Sprint 3 — Publish Miyagi → ML
- **US-7** *As a seller, I publish a Miyagi product to ML.* Reuse `publishItem`; persist the linkage;
  map to a valid ML `category_id`. **Risk: MED.** QA: api spec on publish + linkage.
- **US-8** *As a seller, edits to my Miyagi product propagate to the ML item* (update/relist/close —
  title/price/images/status). **Risk: MED.** QA: api spec on update/close parity.
- **US-9** *As the system, publish picks a valid ML category automatically.* ML category-predictor
  integration with a manual override. **Risk: MED.** QA: api spec on predictor + override.

### Sprint 4 — Two-way stock sync (the core)
- **US-10** *As the system, a Medusa stock change pushes to ML for a linked item* — debounced,
  idempotent, rate-limit aware. Medusa **inventory subscriber**. **Risk: HIGH** (external write; oversell).
  QA: api spec on the subscriber → ML update (mocked ML); idempotency.
- **US-11** *As the system, an ML sale/stock change adjusts Medusa inventory for the linked item.* ML
  **webhook** (reuse the receiver shape) → Medusa inventory adjustment. **Risk: HIGH** (inventory
  mutation; oversell). QA: api spec on webhook → inventory adjust; replay-safe.
- **US-12** *As a seller, stock never oversells and drift self-heals.* Source-of-truth rules, a periodic
  **reconciliation** job, and drift alerts. **Risk: HIGH.** QA: api spec on reconcile + conflict rules.

### Sprint 5 — Resilience, observability & gating
- **US-13** *As a seller, I'm told when my ML connection needs re-auth, and I can see a sync activity
  log.* Token-refresh recovery + error surfaces + per-seller sync log. **Risk: MED.** QA: api spec on
  failure surfaces.
- **US-14** *As Daniel, ML sync can be a paid/promoter SKU.* Entitlement gate wiring (reuse the
  subscription/entitlement + promoter-SKU patterns) — turns sync on only for entitled sellers. **Risk:
  MED.** QA: api spec on the gate.

## Deploy order
**Backend-first throughout** (Medusa module + migrations before the frontend that needs them). S1 (connect
+ linkage) is the spine; S2 import and S3 publish are independently shippable on top; **S4 stock sync is
the HIGH-risk core — Daniel merges, behind a per-seller enable + a kill-switch flag** so it can't oversell
at scale before it's proven. S5 hardens + gates. Announce any shared-surface touch.

## Open risks / to validate (the spike-style questions, answered inside the build)
- **Oversell safety** is the whole game: define the **source-of-truth** per linked item, make every
  inventory write **idempotent + replay-safe**, and ship the **reconciliation** job *with* (not after)
  the live sync. Stage behind a per-seller flag + kill-switch.
- **ML rate limits & token lifecycle** — back-off + refresh recovery; surface re-auth to the seller.
- **Category mapping fidelity** — ML's required `category_id` + attributes are the most error-prone part;
  predictor + manual override + a safe default.
- **Price authority** — decide whether Miyagi or ML is price-authoritative per item to avoid ping-pong.
- **Connection identity** — key the ML connection to the **Medusa seller**, not just Clerk (the reference
  keyed Clerk only), so it survives the seller model.
- **Partial-import & dedupe** — importing must not duplicate products a seller already has.

## Definition of Ready — checklist
- [x] "As a / I want / so that" per story; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (reference port + pipeline reuse + genuinely-new sync core).
- [x] v1 in/out boundary written (order-import explicitly out).
- [x] Reuse list produced (Medusa-first reframe done — module + subscriber + supply pipeline).
- [x] Each story risk-tiered; QA stage named; the HIGH stock-sync core flagged for Daniel + kill-switch.
- [x] Reclassification (spike → feature) recorded; no estimates per Daniel.
- [ ] **Daniel approves this scope doc** → scaffold epic + 5 sprint docs (commit path-scoped) + emit
      per-sprint Claude Code kickoffs.
