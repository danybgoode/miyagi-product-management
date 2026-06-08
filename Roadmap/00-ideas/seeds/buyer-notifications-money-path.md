---
title: "Buyer notifications — money-path addendum"
slug: buyer-notifications-money-path
status: shipped
area: "05"
type: feature
priority: wave-2
risk: high
epic: "05-trust-offers-and-messaging/buyer-notifications"
build_order: "#5b"
updated: 2026-06-08
---

# Idea — Buyer notifications: money-path + Medusa-order gating (follow-up to #5b)

**Status:** ready for scope. **Macro-section:** 05 · Trust, Offers & Messaging. **Risk: HIGH** (touches the
live Stripe/MP payment webhooks + a backend change). Follow-up to the completed 2-sprint epic
[Buyer Telegram channel + Buyer preference center (#5b)](../../05-trust-offers-and-messaging/buyer-notifications/).

## Why
#5b shipped the buyer preference center + buyer Telegram/Push, but two things were deliberately deferred to
keep both sprints frontend-only and **off the money-path**:

1. **Compras (order/payment confirmed) is still email-only and ungated.** Those buyer emails fire from the
   **Stripe/MP payment webhooks** (`app/api/webhooks/{stripe,mercadopago}/route.ts`) + `finalize-manual`, not
   from a seam call — so the buyer's `buyer.compras` Push/Telegram toggles are inert ("pronto" in the grid),
   and the receipt only ever arrives by email.
2. **Buyer pref gating doesn't bite on Medusa orders.** Seller-triggered ship/deliver/return routes notify
   the buyer, but the buyer's Clerk id is unrecoverable frontend-side for Medusa orders:
   `normalizeMedusaOrder` (`apps/backend/.../sellers/me/orders/route.ts`) returns `buyer_clerk_user_id: null`
   and `lib/order-mirror.ts` `upsertOrderMirror` doesn't persist it (and keys the Medusa id in
   `metadata->>medusa_order_id`, not the row `id`). So Envíos/Devoluciones gating works only for **offers +
   legacy orders**; Medusa orders fall through to email (no Push/TG, and the email can't be turned off).

Net effect today: for the **majority (Medusa) order type**, the buyer can toggle Envíos/Devoluciones but it
has no effect, and Compras never reaches Push/Telegram. This idea closes both gaps.

## Scope (proposed)
- **Persist the buyer's Clerk id on Medusa orders.** At order creation the webhooks already have
  `buyer_clerk_id` — pass it into `upsertOrderMirror` and store it; and/or have `normalizeMedusaOrder` resolve
  it. Then the seller-triggered routes resolve the buyer (mirror lookup by `medusa_order_id`, or the
  normalizer field) so `dispatchToBuyer` gates email/push/Telegram for Medusa orders too. **No backfill** for
  existing orders (or a one-time backfill if cheap).
- **Route Compras through `dispatchToBuyer`** in the Stripe + MP webhooks (and the manual order-placed path),
  group `buyer.compras`. **Email stays forced-on** (the resolver already guarantees the receipt); this only
  *adds* Push + Telegram. Flip the grid's Compras Push/Telegram cells from "pronto" to live.
- **UI polish:** consume the `{ rowDeleted }` the unlink endpoints already return so the buyer/seller center
  reflects a kept-vs-removed connection correctly on a per-audience disconnect (today it optimistically shows
  disconnected even when the shared row is kept for the other audience).

## Guardrails
- **Money-path:** webhook edits are HIGH-risk — Daniel merges; idempotency + the existing guest fall-through
  preserved; email behavior byte-for-byte (Compras email already always fires).
- Reuse the #5b seam + `buyer-messages.ts` copy; add `order_confirmed`/`payment_confirmed` builders.
- Deploy: backend-first (the id-persistence) or degrade gracefully, per LEARNINGS (two repos, async).

## Out
- New channels (WhatsApp/SMS); agent (MCP) pref read/write; digest/quiet-hours.
