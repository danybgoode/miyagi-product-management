# Sprint 1 — Data foundation: COGS + append-only ledger + margin dashboard (dark)

> Epic: [profit-analyzer](README.md) · Risk: **HIGH** (US-2 migration; Daniel merges) · Backend-first;
> dark behind `ops.profit_enabled` (default OFF). **Prerequisite: Epic A (`ml-orders-native`) merged** and
> capturing fee/shipping payloads on ML orders.
>
> **Prerequisite verified 2026-07-06** (Daniel chose "proceed"): Epic A S1+S2 merged — the raw
> fee/shipping capture (`ml_raw_order`/`ml_raw_shipment`) is live on backend `main`; S3 draft PRs
> (#59/#174) are orthogonal. `ml.orders_enabled` has never been ON in prod → zero ML orders exist yet,
> and ML field semantics stay defensively parsed until the sandbox eyeball (owed below).

## Status

Built 2026-07-06 · draft PRs open, risk **HIGH — Daniel merges, backend first**:
backend [medusa-bonsai-backend#61](https://github.com/danybgoode/medusa-bonsai-backend/pull/61) ·
frontend [miyagisanchezcommerce#178](https://github.com/danybgoode/miyagisanchezcommerce/pull/178)

Plan-mode decisions (Daniel, 2026-07-06): COGS lives on `variant.metadata.unit_cost_cents`; free
dashboard for all sellers with ML-fee analytics riding the `ml_sync` entitlement; Envia label cost
persisted at ship time (Stripe/MP processor-fee capture = named follow-up); append-only enforced by a
Postgres trigger + specs.

## Stories

### US-1 · COGS per variant — med ✅ (BE `f726c20`, FE `67b2410`)
**As a** seller, **I want** to record my unit cost on each variant — one at a time or in bulk, **so that**
margin math has my side of the equation.
Stored on `variant.metadata.unit_cost_cents` (integer centavos, MXN, seller-private — never on public
listing/price-grid reads; a new seller-scoped `GET /store/sellers/me/products/:id` serves the editor).
Editor: flat input (single-variant) + per-combination `CostEditor` (Opciones). Bulk CSV rides the catalog
importer (`unit_cost` + es-MX aliases; digit-required so "gratis" can't coerce to $0).
**Acceptance:** set COGS in the editor and via a 20-row CSV; values persist and read back over the internal
API; invalid rows report per-row errors, not a dead batch. ✅ 9 api specs (`e2e/profit-cogs.spec.ts`);
live editor/CSV walkthrough owed to Daniel (below).

### US-2 · Financial-events ledger (append-only) — high ✅ (BE `e36d4f3`)
**As a** seller, **I want** every sale's financials frozen at sale time (revenue, fee, shipping, COGS
snapshot), **so that** historical margins stay true when fees or my costs change later.
New `profit` module: `financial_event` rows (revenue / ml_fee / shipping_cost / cogs_snapshot; integer
centavos; deterministic `dedupe_key` unique index). **Append-only enforced in the DB** — the migration
installs a `BEFORE UPDATE OR DELETE` trigger that raises; a config unit spec guards the trigger SQL.
Write points (flag-gated, best-effort, idempotent): `order.placed` subscriber (native), post-materialize
hook (ML), ship route (persists the Envia label cost — previously discarded), `POST
/internal/profit/backfill` (replay-safe heal). ML amounts parsed defensively with provenance metadata.
**Acceptance:** a sandbox ML sale writes ledger rows with the *actual* ML fee (owed — live sandbox);
changing COGS afterward does not alter existing rows (✅ spec-proven: replay regenerates identical dedupe
keys → zero new rows; the snapshot amount is a frozen input); replaying the source event writes nothing
new (✅ spec); migration clean (✅ discovery verified; prod apply owed). 20 unit specs
(`profit-ledger.unit.spec.ts` + migration guard).

### US-3 · Profit dashboard v1 — low ✅ (BE `9e3d36a`, FE `723130f`)
**As a** seller, **I want** a per-order and per-SKU margin table in my Analíticas section, **so that** I
see what I actually earn.
`/shop/manage/profit` ("Ganancias" nav entry): flag → `notFound()` before auth; pure `lib/profit.ts`
margin math; partial rows render honestly ("envío pendiente" / "costo pendiente" / "comisión ML
pendiente"); ML-fee columns gated on the `ml_sync` entitlement; house tokens; es-MX.
**Acceptance:** with the flag ON, the table shows realized margin per order + aggregated per SKU matching
hand math on the smoke data (✅ spec-proven hand math; live check owed); flag OFF → no profit UI anywhere
(✅ verified live against local `next dev`: profit page 404, control page 307); es-MX copy complete. ✅
9 api specs (`e2e/profit.spec.ts`).

## Sprint QA

- ✅ Api specs: margin calc in pure `lib/profit.ts` (9), ledger append-only + idempotency decision fns
  (20 backend unit specs incl. the migration trigger guard), CSV row validation (9).
- ✅ Deterministic gate: backend `medusa build` + `tsc` + `test:unit` (166) green; frontend `tsc` +
  `next build` + api suite green (4 pre-existing prod-environmental fails: WAF 403 / rate-limit 429 —
  documented in LEARNINGS; CI-vs-preview is the authoritative gate).
- Cross-review (antigravity, advisory): ran on both PRs; all claims triaged against real source —
  2 "blocking" claims refuted with code evidence (array graph filters precedented; ML currency already
  stamped at materialization; Rule-1/Rule-5 misreads), no code changes warranted.
- **Owed to Daniel:** the COGS → sandbox ML sale → margin-row live walkthrough; prod migration confirm.

## Sprint 1 — Smoke walkthrough (do these in order)

_Steps marked **[owed to Daniel]** need his live sessions / prod access (money/auth); the agent cannot
run them. Prod URLs assume both PRs merged (backend first) and the Cloud Run deploy finished (~12 min)._

1. **[owed to Daniel] Prod migration confirm.** After the backend deploy finishes, run against prod DB:
   `SELECT tgname FROM pg_trigger WHERE tgname = 'financial_event_no_mutation';`
   → **one row** (the append-only trigger is live; the `financial_event` table exists).
2. **[owed to Daniel] Append-only proof at the DB.** Run `UPDATE financial_event SET amount_cents = 1
   WHERE false;` on prod → statement OK (matches nothing); then insert a throwaway row and try to UPDATE
   it → **error: "financial_event is append-only — UPDATE is not allowed"**; DELETE → same error. Remove
   nothing (the row is inert; no seller_id).
3. **Flag still OFF.** Open https://miyagisanchez.com/shop/manage/profit signed in as a seller →
   **404** (the surface is dark; "Ganancias" nav entry leads to the 404 page).
4. **[owed to Daniel] Set COGS in the editor.** In https://miyagisanchez.com/sell (your test shop), edit
   a single-variant listing → "Costo unitario (MXN) — privado" input → enter `45.50`, save → **"Cambios
   guardados"**; reload → the input shows `45.5` (persisted + read back).
5. **[owed to Daniel] Per-combination COGS.** Edit a multi-variant (Opciones) listing → expand a
   combination card → "Costo unitario" → save → **"✓ Costo guardado."**
6. **[owed to Daniel] Bulk CSV.** In https://miyagisanchez.com/shop/manage/import upload a ~20-row CSV
   with a `costo_unitario` column, one row with `-5` and one with `gratis` → those **two rows report
   per-row errors**; the rest import; spot-check one imported listing's editor shows its cost.
7. **Public reads stay clean.** Anonymous `curl https://miyagisanchez.com/api/... /store/listings/<id>`
   (or view the PDP) for a listing with COGS set → response contains **no `unit_cost_cents`** anywhere.
8. **[owed to Daniel] Flag flip.** In https://miyagisanchez.com/admin/flags flip `ops.profit_enabled`
   ON → https://miyagisanchez.com/shop/manage/profit now renders the **Ganancias** dashboard (empty
   state if no ledger rows yet).
9. **[owed to Daniel] Native sale → ledger row.** Place a small real/test purchase of the COGS'd listing
   (money path) → within a minute the Ganancias per-order table shows the sale: revenue = paid amount,
   costo = COGS × qty, **"envío pendiente"** chip, margin matching hand math.
10. **[owed to Daniel] Label buys → shipping completes the row.** Generate the Envia label for that
    order (Pedidos → Enviar) → refresh Ganancias → the **envío column fills** with the label cost and the
    pending chip clears (follow-up event, no row rewritten).
11. **[owed to Daniel] COGS edit never rewrites history.** Change the listing's COGS to a different
    value → refresh Ganancias → **the existing sale's costo/margin are unchanged** (frozen snapshot).
12. **[owed to Daniel] Sandbox ML sale → actual fee.** With `ml.orders_enabled` ON (Epic A's own owed
    smoke), place a sandbox ML purchase of a linked, COGS'd product → the materialized order appears in
    Ganancias with **comisión ML** populated from the real `sale_fee` — and eyeball
    `ml_raw_order`/`ml_raw_shipment` on the order metadata to confirm the parser's field assumptions
    (`sale_fee` per-unit; shipment cost field recorded in the event's `source_field` metadata).
13. **[owed to Daniel] Backfill heal.** `curl -X POST https://<cloud-run-url>/internal/profit/backfill
    -H "x-internal-secret: $SECRET" -H "Content-Type: application/json" -d '{}'` → JSON
    `{ scanned, appended, skipped, failed }`; re-run → **`appended: 0`** (replay-safe no-op).

_If step 12's eyeball contradicts a parse assumption (fee not per-unit; different shipment-cost field),
the fix is a parser change in `src/lib/profit-ledger.ts` + spec update — no stored rows need rewriting
(none exist before the flag flip)._
