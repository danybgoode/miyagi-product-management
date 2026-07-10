---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: buyer-notifications-money-path
---

# Epic: Buyer notifications — money path (Compras dispatch + Medusa-order gating)

> **Area:** 05-trust-offers-and-messaging · **Risk:** HIGH — **Daniel merges every story** (live
> Stripe/MP payment webhooks + a backend change) · **BUILD-ORDER:** #5b (follow-up) ·
> **Scope seed:** [`00-ideas/seeds/buyer-notifications-money-path.md`](../../00-ideas/seeds/buyer-notifications-money-path.md) ·
> Follow-up to the shipped [Buyer Telegram channel + Buyer preference center (#5b)](../buyer-notifications/README.md).
> Groomed 2026-07-06; every "still open" claim re-verified against both app repos' `origin/main` that day.

## Why
#5b gave signed-in buyers a preference center and real Push/Telegram channels — but deliberately kept
both sprints off the money path. Two gaps remain: **Compras (order/payment confirmed) is email-only and
ungated** (the receipts fire straight from the Stripe/MP webhooks + `finalize-manual`, never through the
seam, so the grid's Compras × Push/Telegram cells sit locked "pronto"), and **buyer gating doesn't bite on
Medusa orders** (the buyer's Clerk id is never persisted, so Envíos/Devoluciones toggles are inert for the
majority order type — everything falls through to email). This epic closes both: the buyer's purchase
milestones reach the channels they chose, and the toggles they already have finally do something.

## Medusa-first note
No new Medusa primitive and no new table. The buyer's Clerk id already exists at order creation (webhook
`session.metadata.buyer_clerk_id`; `finalize-manual` is Clerk-authed) — the work is *persisting* it on the
existing Supabase order mirror and *resolving* it in `normalizeMedusaOrder`. Dispatch reuses the #5/#5b
seam wholesale (`dispatchToBuyer`, the pure resolver, `buyer.compras` group + `order_confirmed`/
`payment_confirmed` mappings — all already in `lib/notifications/preferences.ts`, waiting). Non-commerce
per-user data stays in Supabase; Clerk untouched; new copy es-MX.

## What already exists (reuse, don't rebuild)
- **The #5b plumbing is in place and waiting** — `buyer.compras` group + `order_confirmed`/
  `payment_confirmed` → `buyer.compras` mappings in `lib/notifications/preferences.ts` (verified on
  `origin/main` lines 171/205-206); `dispatchToBuyer` + the pure resolver in `lib/notifications/dispatch.ts`.
- **`buyer-messages.ts` copy patterns** — add `order_confirmed`/`payment_confirmed` builders in the same
  shape; don't fork.
- **`session.metadata.buyer_clerk_id` in the Stripe webhook** — already destructured (route.ts:208) and
  already used for `maybeRewardReferralOnOrder`; it just never reaches `upsertOrderMirror`.
- **`upsertOrderMirror` (`lib/order-mirror.ts`)** — the persistence seam; keys the Medusa id in
  `metadata->>medusa_order_id`, not the row `id` (lookup must match).
- **`normalizeMedusaOrder`** (`apps/backend/.../sellers/me/orders/route.ts`) — returns
  `buyer_clerk_user_id: null` today; the resolution point backend-side.
- **The buyer grid** — `app/(shell)/account/notificaciones/BuyerNotificationPreferences.tsx`; the Compras
  × Push/Telegram cells are hardcoded locked-"pronto" via `lockedS2`.
- **The unlink endpoints already return `{ rowDeleted }`** (`app/api/account/telegram/link/route.ts`,
  `app/api/sell/telegram/link/route.ts`) — the UI just doesn't consume it.
- **In-house flags** — `lib/flags.ts` `DEFAULT_FLAGS` + Supabase `platform_flags` (Flagsmith is
  decommissioned). Kill-switch taxonomy + polarity docs live in that file.
- **Seller-triggered dispatch sites** (ship/deliver/return routes) — already call `dispatchToBuyer` for
  offers + legacy orders; only the Medusa-order buyer resolution is missing.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Backend: `normalizeMedusaOrder` resolves + returns `buyer_clerk_user_id` | HIGH |
| 1 | 1.2 Frontend: webhooks pass `buyer_clerk_id` → `upsertOrderMirror` persists it; ship/deliver/return routes resolve the buyer for Medusa orders → Envíos/Devoluciones gating bites. No backfill. | HIGH |
| 1 | 1.3 Kill-switch: `notifications.buyer_moneypath_enabled` (default **true**, seeded ENABLED) gating both new paths | HIGH |
| 2 | 2.1 Stripe webhook: `order_confirmed`/`payment_confirmed` → `dispatchToBuyer` (`buyer.compras`); email byte-for-byte, additive Push+TG only | HIGH |
| 2 | 2.2 MP webhook + `finalize-manual`: same seam routing | HIGH |
| 2 | 2.3 Grid: Compras × Push/Telegram cells live (drop `lockedS2`) | low |
| 2 | 2.4 Pref centers consume `{ rowDeleted }` on per-audience disconnect | low |

## Kill-switch (Stage 6b decision — recorded at grooming)
**Yes — flagged.** Flag `notifications.buyer_moneypath_enabled` · polarity **kill-switch** (default
`true`, created **ENABLED** in `platform_flags` via a seed migration riding the PR — never a local flip;
Supabase local IS prod, see LEARNINGS) · seam: one `isEnabled()` check wrapping (a) the Medusa-order
buyer-resolution in the seller-triggered routes and (b) the webhook/finalize-manual Compras dispatch —
disabled ⇒ exactly today's behavior (email-only, gating inert) · mechanism: in-house `lib/flags.ts`
(node runtime; no Edge seam involved). Decided with Daniel 2026-07-06.

## Deploy order
Backend-first (1.1 merges + Cloud Run deploy confirmed rolled, ~12 min, no preview) **and** the frontend
degrades gracefully regardless: an unresolved buyer id is null-safe and falls through to today's
email-only behavior, so the deploy-lag window can't break prod. Frontend mirror-persistence (1.2) is
independent of 1.1 and may land in either order. Sprint 2 is frontend-only and follows Sprint 1.

## Guardrails
- **Money-path:** webhook edits are HIGH-risk — Daniel merges; idempotency + the existing guest
  fall-through preserved; **Compras email behavior byte-for-byte** (it already always fires; this epic
  only *adds* Push + Telegram behind the buyer's toggles).
- Reuse the #5b seam + `buyer-messages.ts` copy; extend, never fork, the resolver.

## Out of scope
New channels (WhatsApp/SMS) · agent (MCP) pref read/write · digest/quiet-hours · backfill of existing
orders' buyer ids (fall-through covers them).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated — 05 section: Compras reaches Push/Telegram; Envíos/Devoluciones gating bites on Medusa orders
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (planned at grooming — Stage 6b):** `notifications.buyer_moneypath_enabled` exists in `platform_flags`, default `true`, created ENABLED. *Verify-only — not a new gate.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
