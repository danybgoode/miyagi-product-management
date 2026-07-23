# Founding merchant activation operations — Sprint 3: Commerce facts and event rail

**Status:** ⬜ not started

## Stories

### Story 3.1 — Medusa commerce-fact adapter and replay repair

**As an** operator, **I want** activation milestones derived from marketplace truth, **so that** the CRM never
lies about claim, payments, products or sales.

**Acceptance:** adapters read seller ownership, payment readiness, three public products, external share,
inquiry, first paid sale and 30-day retention from canonical facts/established mirrors; repeated evaluation is
idempotent; late facts repair the projection; manual CRM edits cannot overwrite commerce truth.

**Risk:** high — cross-system commerce projection; Daniel merges.

### Story 3.2 — PII-free Golden Beans lifecycle events

**As a** product operator, **I want** each lifecycle transition on the shared event rail, **so that** CRM and
analytics destinations can consume one reusable contract.

**Acceptance:** successful canonical transitions emit one event through `event-destination-router` using
`entity_type=merchant`, stable opaque subject id, transition id and schema version; payloads exclude names,
phones, emails, handles, notes and objections; delivery retry/replay does not duplicate the logical event.

**Risk:** high — cross-repo event and privacy contract; Daniel merges.

### Story 3.3 — Milestone mismatch and reconciliation view

**As an** admin, **I want** to see stale or mismatched commerce milestones, **so that** I can replay projection
without manually changing commerce facts.

**Acceptance:** admin sees source fact, projected stage, last evaluation and degraded/delivery state; authorized
replay uses the same idempotency key; reconciliation cannot edit Medusa ownership, products, orders or payments;
resolved mismatches retain their audit trail.

**Risk:** high — privileged replay and cross-system repair; Daniel merges.

## Build contract (locked by the architect before the builder started)

### 3.1 — the commerce-fact adapter

`lib/merchant-commerce-facts.ts` (server) → `loadCommerceFacts(relationship)` returns the `StageFacts`
subset Sprint 2's resolver consumes:

| Fact | Read from | Rule |
|---|---|---|
| `claimed` | `marketplace_shops.clerk_user_id` on the linked shop | ownership actually transferred |
| `paymentsReady` | the shipped payment-connection read for the shop's Medusa seller | connected **and** charges-enabled |
| `threeProductsLive` | count of Medusa products `status:'published'` for the seller | `>= 3`, derived from **state**, not from a publish hook |
| `firstSale` | order mirror rows | `isCapturedOrder()` — reuse it, do not re-derive |
| `retained30d` | first-sale timestamp + a captured order ≥ 30 days later | the shipped retention sweep's rule |
| `sharedExternally`, `firstInquiry` | CRM facts (an interaction of that kind) | not commerce — these two stay CRM-sourced |

**Most of this already exists — reuse it, do not rebuild it.** `lib/merchant-lifecycle-sweep.ts`
already derives `three_products_live` (Medusa `GET /store/sellers/{slug}/products`), `first_sale` and
`retained_30d` (Medusa `GET /internal/sellers/orders` + `isCapturedOrder`), with paging, fail-closed
reads and a per-read timeout budget already argued through six review rounds. The genuinely new fact
is `paymentsReady`, and it is a pure read of an existing helper:
`computeShopCompletion(shop).pagos` in `lib/setup-guide.ts` (Stripe `charges_enabled` OR MercadoPago
`connected` OR a bank-transfer CLABE — and note its recorded trap: `shop.mp_enabled` is an opt-OUT
column, never a connected-state flag).

Every one of these is **state-derived**, so the sweep is complete by construction and covers write
paths added later — and it doubles as the backfill safety net for the event-hooked milestones. No
adapter writes to Medusa; a spec asserts the module exports no mutation and the reconciliation route
holds no Medusa write client.

Idempotent by construction: the adapter is a pure read, `resolveStage` is pure, and the transition
insert dedupes on `(relationship_id, dedupe_key)`. Re-running the whole evaluation on unchanged facts
writes nothing. A late fact simply lets the next evaluation reach further — that IS the replay repair.

`/api/cron/merchant-lifecycle-sweep` gains the relationship evaluation. Per the sibling epic's lesson,
an incomplete run returns a retryable **5xx**, never a 2xx `207`, and "deliberately switched off"
(flag OFF) stays distinguishable from "broken".

### 3.2 — the event rail

`MERCHANT_LIFECYCLE_EVENTS` in `lib/merchant-lifecycle.ts` extends from 6 to 14 (README D2): the 13
stages as `merchant.<stage>` plus the shipped `merchant.preview_approved`.

Migration `20260723120000_activation_crm_s3.sql`:
- one nullable `<stage>_at` column per new stage on `merchant_lifecycle`
- the plpgsql vocabulary CHECK and the `LEAST()` upsert list extended in step
- **the D1 backfill's consequence:** `merchant_lifecycle.merchant_id` now means
  `merchant_relationships.id`. It holds 0 rows live, so this is a comment change plus a re-verified
  meaning, not a data migration.

`emitMerchantLifecycleForShop(event, { shopId, … })` is the new seam; the two existing call sites
(`app/api/claim/complete`, `app/api/preview/[token]/decision`) switch to it in the same PR, and
`resolveMerchantIdForSeller` is renamed to return a relationship id. A spec asserts that **no** call
site passes a raw shop id to `emitMerchantLifecycle` — the population, not the door.

Privacy: `buildLifecycleTrackPayload`'s `tags` stays an allow-list with nowhere to put a name. The
contract spec is extended to cover all 14 types and to assert the payload of a *stage* event carries no
`business_name`, `contact_name`, phone, email, Instagram handle, note or objection — asserted against
the real builder, from a relationship fixture that populates every one of those fields.

### 3.3 — reconciliation

`/admin/relaciones/conciliacion` — for each relationship: the source fact, the projected stage, the
last evaluation timestamp, and the delivery state of its emissions (`pending` / `delivered` /
`attempts` / `last_error`). `POST /api/admin/relationship/[id]/replay` re-runs the adapter + resolver
under the **same** `dedupe_key`, so a replay repairs without duplicating. Admin-only; a resolved
mismatch keeps its transition rows.

### Cross-repo note

Golden Beans needs no code change: `POST /api/v1/track` accepts the new event names, and its
delivery-back leg classifies an unknown type as `ignored` (accepted and dropped), not dead-lettered.
The contract doc
`golden-beans/Roadmap/01-growth-engine/event-destination-router/miyagi-lifecycle-contract.md` is
updated in the same session to name all 14 types and the relationship-id subject.

## Sprint QA

- **api specs:** fixture-driven commerce facts, late/replayed facts, event schema/privacy, router retry/idempotency,
  admin-only reconciliation and no-manual-commerce-write invariant.
- **browser smoke owed:** yes, to Daniel — authenticated claim/payment/product setup and admin reconciliation.
- **deterministic gate:** both repos' contract/build suites green; deployed event inspected with redacted payload.

## Sprint 3 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Claim the disposable merchant, connect a test payment account and publish three approved products.
   → The relationship advances from actual facts without a manual checkbox.
2. Record an external share/inquiry and complete one safe test purchase.
   → Exactly one transition appears for each satisfied milestone.
3. Replay the same facts and router delivery.
   → No duplicate transition or logical Golden Beans event appears.
4. Inspect the routed event payload.
   → It contains the opaque merchant id and transition metadata, with no contact or notes.
5. Open the admin mismatch view and replay one deliberately delayed fact.
   → The projection repairs and the audit trail explains the change.

If any step fails, note the step number + URL — that's the bug report.
