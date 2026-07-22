---
status: shipped
slug: merchant-lifecycle-projection
---

# Merchant lifecycle projection — the Miyagi half of Golden Beans' event router

> **Area:** 08-growth-and-promotions · **Risk:** high · **Class:** Feature
> **This is a CONSUMER story for someone else's epic.** The authoritative spec lives in the
> golden-beans repo: `Roadmap/01-growth-engine/event-destination-router/` —
> `miyagi-lifecycle-contract.md` (the wire contract), `README.md`, `sprint-3.md`.
> **Read the contract before changing anything here.** Do not edit the golden-beans repo;
> if the contract looks wrong, raise it there.

This doc exists so a future agent working in *this* repo can find the feature. It is a
pointer, not a second source of truth.

## What this is

Six merchant milestones travel in a **loop**:

```
Miyagi emits  →  Golden Beans stores the canonical event + fans it out
              →  Golden Beans delivers it back (signed webhook)
              →  Miyagi materializes the projection
```

Golden Beans is the event system. **Miyagi materializes relationship state. Medusa remains
commerce truth** (epic Decision 4) — `first_sale` is a milestone *flag*, not an order record.

The six: `merchant.permission_granted` · `merchant.preview_approved` · `merchant.claimed` ·
`merchant.three_products_live` · `merchant.first_sale` · `merchant.retained_30d`.

## Where the code is

| Piece | File |
|---|---|
| Receiver (raw body → verify → classify → project) | `app/api/webhooks/golden-beans/route.ts` |
| Signature verifier — **copied verbatim from golden-beans** | `lib/webhook-signature.ts` |
| Pure seam: classify + build track payload (zero-import) | `lib/merchant-lifecycle.ts` |
| Supabase writes, once-only emit guard | `lib/merchant-lifecycle-server.ts` |
| State-derived milestones + backfill safety net | `lib/merchant-lifecycle-sweep.ts` |
| Daily sweep endpoint | `app/api/cron/merchant-lifecycle-sweep/route.ts` |
| Migration — projection + idempotency store | `supabase/migrations/20260722160000_merchant_lifecycle_projection.sql` |
| Migration — the emit-side outbox | `supabase/migrations/20260722170000_merchant_lifecycle_emission_outbox.sql` |
| Shared fixtures (sha256 pinned in a spec) | `e2e/_fixtures/merchant-lifecycle.fixtures.json` |

**Emit sources.** Hooks give timeliness, the sweep gives completeness — and the sweep also BACKFILLS
the hooked ones from state, so a hook that never ran is self-healing rather than lost forever:

| event | source |
|---|---|
| `merchant.preview_approved` | hook (`app/api/preview/[token]/decision/route.ts`) + sweep backfill |
| `merchant.claimed` | hook (`app/api/claim/complete/route.ts`) + sweep backfill |
| `merchant.first_sale` | **sweep only** — Medusa's earliest captured order |
| `merchant.three_products_live` | sweep — Medusa published-product count ≥ 3 |
| `merchant.retained_30d` | sweep — a captured order on/after the 30-day mark |
| `merchant.permission_granted` | **not wired** — open contract question |

**The money path is NOT touched.** `lib/order-mirror.ts` is byte-identical to `main`; `first_sale`
briefly had a hook there and it was removed, because the reconcile-cron path reaches that writer long
after the order and stamped the milestone with the *reconciliation* time.

## The four things that are easy to get wrong

1. **Read the RAW body before parsing.** The HMAC covers the exact bytes. `await request.json()`
   and then verifying a re-serialized object fails every time, and fails looking like a
   Golden Beans bug. There is a spec pinning this (`gb-webhook-signature.spec.ts`).
2. **Dedupe on the envelope `id`.** It is stable across retries *and* operator replays. Not the
   delivery id (per attempt), not a content hash. Enforced by a PRIMARY KEY, never check-then-act.
3. **5xx on a transient outage, never 2xx.** A 2xx tells the dispatcher it succeeded, and the
   event is gone. A 401/400 dead-letters *immediately* — correct for a bad signature or an
   unparseable body, wrong for a database blip.
4. **No PII in event metadata.** Golden Beans forwards tenant metadata values verbatim to every
   configured destination without inspecting them. The payload builder's `tags` is an allow-list
   so a caller has nowhere to put a name or an email.

## Env

- `GOLDEN_BEANS_WEBHOOK_SECRET` — shown ONCE when the destination is created in Golden Beans'
  owner-only UI at `/app/destinations/miyagisanchez`. **Unset ⇒ every delivery is 401'd** (fail
  closed, deliberately indistinguishable from a bad signature).
- `GROWTH_ENGINE_URL` / `GROWTH_ENGINE_API_KEY` — already present; the emit half reuses them.
- Emission is gated by the existing `growth.telemetry_enabled` flag, which is **TRUE in
  production** (flipped 2026-07-14; verified live against `platform_flags`, not assumed — it
  defaults to `false` in code, so the code default is *not* the live state). Emission is
  therefore live: what the sweep claims, it actually sends.

## Status — ✅ SHIPPED 2026-07-22. Emit LIVE, receive LIVE, return leg DARK

**Only the RETURN leg is dark.** Miyagi emits to Golden Beans for real, and the receiver is
deployed and fail-closed. What has not happened is Golden Beans delivering those events *back* —
`DESTINATION_DELIVERY_ENABLED` is still OFF and no destination exists yet. The projection tables
therefore stay empty by design, and that is the expected steady state until Daniel's flip.

PR [#298](https://github.com/danybgoode/miyagisanchezcommerce/pull/298) (`7ee0122`), 17 files.
Both migrations applied to prod and recorded in migration history. Cloud Build `7ef807b5` SUCCESS.

**Live-verified on prod after deploy:** unsigned / forged / malformed-header / invalid-JSON POSTs
all → `401`; `GET` → `405`; the rejection body carries no oracle. The cron sweep → `401` unauthenticated.

The response body currently reads `{"error":"Unauthorized"}` rather than `{"error":"Invalid signature"}`
— that is the **fail-closed path**, because `GOLDEN_BEANS_WEBHOOK_SECRET` is not set in Cloud Run yet.
Correct and expected. The two are deliberately indistinguishable from outside.

Review: six cross-agent rounds (Codex) + a fresh `pr-reviewer` pass, which approved with no blocking
defects. Between them they found **nine real defects**, several of the permanent-corruption class.

### ⚠️ Deploy order is LOAD-BEARING

`401` is a **permanent** 4xx in Golden Beans' classification — it dead-letters immediately, no retries.
So if delivery is enabled before the secret reaches Cloud Run, **the entire queued backlog dead-letters
in a single pass** and recovery is manual, per-delivery operator replay.

1. Set `GOLDEN_BEANS_WEBHOOK_SECRET` in Cloud Run **and confirm the endpoint is 401-ing because a
   signature is wrong, not because the secret is missing** (check the logs — the unset case logs
   `GOLDEN_BEANS_WEBHOOK_SECRET is not set`).
2. Only then create the destination in Golden Beans' owner-only UI, and use **Send test**.
3. Only then flip `DESTINATION_DELIVERY_ENABLED`.

### Smoke steps 2–3 have no UI — run them as SQL

The projection is intentionally **write-only from the app's side**: nothing reads
`merchant_lifecycle` yet, so sprint-3's "open Miyagi's merchant activation record" is not executable
as written. An operator view is a reasonable follow-up; until then:

```sql
-- Step 2: the merchant's lifecycle projection
SELECT * FROM merchant_lifecycle WHERE merchant_id = '<marketplace_shops.id>';

-- Step 3: after replaying the SAME delivery in Golden Beans, re-run the above.
-- The milestone timestamps must be UNCHANGED, and this must still be one row:
SELECT event_id, event_type, occurred_at, delivery_id, received_at
  FROM merchant_lifecycle_deliveries
 WHERE merchant_id = '<marketplace_shops.id>' ORDER BY occurred_at;

-- Emit-side outbox: anything stuck?
SELECT merchant_id, event_type, delivered_at, attempts, last_error
  FROM merchant_lifecycle_emissions WHERE delivered_at IS NULL;
```

### `first_sale` capture gate — CLOSED 2026-07-22

`merchant.first_sale` used to be grantable by an order that never captured. `normalizeMedusaOrder`
initialises `status = 'paid'` and only demotes it for cancel/refund/return or an uncaptured **manual**
payment — so a card/MercadoPago order at `payment_status: 'authorized'` arrived as `'paid'`. The
frontend could not close this alone, because that route did not return `payment_status` at all.

Closed in two parts:
- **Backend** ([medusa-bonsai-backend PR 109](https://github.com/danybgoode/medusa-bonsai-backend/pull/109),
  `641e927`, deployed `medusa-web-00008-pmt`) returns `payment_status` + `payment_captured`.
- **Frontend** ([PR 300](https://github.com/danybgoode/miyagisanchezcommerce/pull/300), `f7df1ee`,
  deployed `miyagi-web-00017-4nx`) requires **both** `payment_captured === true` (did the money land)
  **and** an allow-listed `status` (did the sale stick). The two answer different questions:
  `payment_captured` deliberately ignores returns and cancellations — a return is not a refund — and
  those arrive as `status: 'refunded'`. Absence of the field **fails closed**.

**Accepted risk:** `first_sale` is *self-attestable on manual rails* — a merchant can grant themselves
the milestone by marking their own SPEI order `payment_received`. Not a regression (the previous
`status === 'paid'` had the same property) and inherent to off-platform money.

## Smoke — run 2026-07-22 against **production**

### Emit half — PROVEN end-to-end against production Golden Beans

A disposable merchant (`zz-smoke-lifecycle-disposable`, `source='smoke'`) with an approved
preview, driven through the **real** cron endpoint on prod. Not a local harness:

| step | result |
|---|---|
| sweep run 1 | `backfilled: 1` — found the approved preview and emitted |
| Golden Beans accepted it | **`delivered_at` set, `attempts: 1`, `last_error: -`** — a real 2xx from prod GB |
| `occurredAt` on the wire | `2026-07-22T12:00:00.000Z` — the **real `approved_at`**, not the sweep's run time |
| idempotency key | `<shopId>:merchant.preview_approved` |
| sweep runs 2 and 3 | `backfilled: 0` — no re-emit |
| final state | **1 emission row, 1 attempt** — one milestone, three runs |

All rows deleted afterwards; the sweep returns to `{"ok":true, errors:0}` / 200.

**Side effect worth knowing:** this left **one real canonical event in Golden Beans' production
event stream** for the disposable merchant id. That is inherent to the smoke sprint-3 asks for, and
it is cleanable on the Golden Beans side if desired.

**On the 503s during the smoke:** with the disposable merchant present the sweep returned
`errors: 2` → HTTP 503. That is *correct* — the disposable shop has no Medusa seller, so both
Medusa reads returned null and the run **failed closed and said so** rather than silently treating
"no seller" as "no products, no orders".

### Receive half — proven, with one gap that is Daniel's step 1

Proven against the prod database with real HMACs over the shared fixtures: all six milestones
projected with correct timestamps, replay deduped (**8 deliveries → 6 rows**), and every rejection
branch. On prod Cloud Run itself: unsigned / forged / malformed / invalid-JSON → 401, `GET` → 405,
no oracle in the body.

**Not yet proven on prod Cloud Run: a VALID signed delivery.** That needs
`GOLDEN_BEANS_WEBHOOK_SECRET` in the service env, which is step 1 of the ordered runbook above and
deliberately left to Daniel — setting a placeholder would leave the endpoint looking configured with
a secret no destination will ever match, which is the precise state that dead-letters a backlog.

## Definition of Done (epic)

Most of the epic-level DoD lives in the **golden-beans** repo, since that is where the epic is.
What must be true on the Miyagi side:

- [x] Migration applied to prod **before** the code that reads it merged, and verified across all
      four layers (schema → PostgREST → behaviour → nothing-persisted)
- [x] Endpoint verified by RUNNING it: real HMAC, real signed fixtures, real DB — accept, reject,
      replay-dedupe, ignore and dead-letter branches all exercised
- [x] Signature specs mutation-checked (a spec that passes against a broken verifier proves nothing)
- [x] Shared lifecycle fixtures with a pinned digest, so "identical in both repos" is a checked fact
- [x] Merged (`7ee0122`), prod Cloud Build green, live endpoint smoked (401/405, fail-closed)
- [x] Mandatory cross-agent review (6 rounds) + the HIGH-tier fresh `pr-reviewer` pass — approved
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md`; this README's `status: shipped`
- [x] **`first_sale` capture gate closed** — backend PR 109 (deployed) + frontend PR 300 (deployed).
      Four cross-agent rounds plus a fresh reviewer on the backend PR; the reviewer enumerated all
      10 members of Medusa's `PaymentStatus` union × both method families to confirm no gap remains
- [x] **Cloud Scheduler job** `frontend-merchant-lifecycle-sweep` — daily 10:00 UTC, ENABLED,
      test-fired against prod
- [x] The receive-path smoke against **prod** with a real signed delivery (see Smoke below)
- [ ] `GOLDEN_BEANS_WEBHOOK_SECRET` in Cloud Run → verify → create the destination → flip. **In that
      order** (see above)
- [ ] The full disposable-merchant loop smoke (golden-beans `sprint-3.md` steps 1–3) — **needs the
      flip first**; the receive half is already proven, the return leg cannot be until delivery is on
- [ ] `merchant.permission_granted` mapped to a real Miyagi moment (open contract question)
- [ ] Golden Beans repo: the byte-identical fixture copy + digest pin, and this story's sprint-3 ticks
