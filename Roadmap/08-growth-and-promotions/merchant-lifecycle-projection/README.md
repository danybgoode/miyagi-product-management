---
status: in-progress
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
| State-derived milestones (3-products, 30d retention) | `lib/merchant-lifecycle-sweep.ts` |
| Daily sweep endpoint | `app/api/cron/merchant-lifecycle-sweep/route.ts` |
| Migration (applied to prod 2026-07-22) | `apps/miyagisanchez/supabase/migrations/20260722160000_merchant_lifecycle_projection.sql` |
| Shared fixtures — byte-identical copy in golden-beans | `e2e/_fixtures/merchant-lifecycle.fixtures.json` |

Emit call sites: `app/api/preview/[token]/decision/route.ts` (approval),
`app/api/claim/complete/route.ts` (claim), `lib/order-mirror.ts` (first sale).

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
- Emission is gated by the existing `growth.telemetry_enabled` flag.

## Status

See the PR and `sprint-3.md` in golden-beans. Delivery is **dark** until Daniel flips
`DESTINATION_DELIVERY_ENABLED` in Golden Beans — that flip is deliberately not part of this work.

## Definition of Done (epic)

Most of the epic-level DoD lives in the **golden-beans** repo, since that is where the epic is.
What must be true on the Miyagi side:

- [x] Migration applied to prod **before** the code that reads it merged, and verified across all
      four layers (schema → PostgREST → behaviour → nothing-persisted)
- [x] Endpoint verified by RUNNING it: real HMAC, real signed fixtures, real DB — accept, reject,
      replay-dedupe, ignore and dead-letter branches all exercised
- [x] Signature specs mutation-checked (a spec that passes against a broken verifier proves nothing)
- [x] Shared lifecycle fixtures with a pinned digest, so "identical in both repos" is a checked fact
- [ ] The golden-beans copy of `merchant-lifecycle.fixtures.json` added, with the same digest pinned
- [ ] `GOLDEN_BEANS_WEBHOOK_SECRET` set in the Cloud Run env, and the destination created + enabled
- [ ] Cloud Scheduler job registered for `/api/cron/merchant-lifecycle-sweep`
- [ ] The disposable-merchant end-to-end smoke (golden-beans `sprint-3.md`, steps 1–3) — Daniel
- [ ] `merchant.permission_granted` mapped to a real Miyagi moment (see the PR body — open question)
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md`; this README's `status: shipped`
