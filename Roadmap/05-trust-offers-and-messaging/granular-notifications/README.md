# Epic — Granular Multi-Channel Notifications (Email + Telegram)

> **Macro-section:** [05 · Trust, Offers & Messaging](../README.md) · **BUILD-ORDER:** #5 ·
> **Risk: HIGH — Daniel merges every story** (rides order / offer / payment dispatch).
> **Status: 📋 Planned** (scaffolded 2026-06-06). Scope doc:
> [`00-ideas/2. readyforscope/granular-notifications.md`](../../00-ideas/2.%20readyforscope/granular-notifications.md).
> Groomed off BUILD-ORDER #5 + the #3a refresh
> ([`results-refresh-2026-06/`](../../00-ideas/2.%20readyforscope/ux-audit/results-refresh-2026-06/),
> pinned frontend `origin/main@ed447bd` / backend `origin/main@0980253`).
> **Depends on #3b** for the durable `buyer_reported_paid` event — Sprint 3 only; **Sprints 1–2 run in
> parallel with #3b.** Follow-on **#5b** (buyer Telegram + buyer preference center) builds on top of this.

## Why
Sellers are drowning in shop activity but have **no control** over how it reaches them. Today email
(`lib/email.ts`) fires for the whole order/offer/lifecycle from ~16 routes — **always on, no
preferences anywhere** — while the real-time channel sellers would actually want, **Telegram, is
admin-only** (`lib/telegram.ts` → Daniel's one chat). This epic adds a **real Telegram seller channel**
plus a **preference center** so sellers get the categories they care about on the channels they choose,
and react fast to money events (a new order, a buyer reporting payment) without inbox noise. It's the
projection layer on top of #3b: the durable `buyer_reported_paid` event #3b creates is this epic's
canonical "ping the seller now" trigger.

## Context

| Question | Answer |
|---|---|
| **Who** | Sellers (v1). Buyers keep email/push; buyer Telegram + buyer preference center = follow-on **#5b** |
| **Job** | Get the shop events I care about on the channels I choose — real-time Telegram + the email that already fires — without noise |
| **Outcome signal** | Seller links Telegram and gets order/offer/payment events there · per-channel + per-event-group toggles persist · turning a group off actually stops those sends · `buyer_reported_paid` reaches the seller on every enabled channel |
| **In v1** | One dispatch seam + pure-logic preference resolver · 2 Supabase tables (prefs + telegram link) · seller settings grid (channels × event-groups) · Telegram link/unlink/test + delivery · route **only in-scope** seller events through the seam · `buyer_reported_paid` (blocked-by #3b) |
| **Out** | Buyer Telegram + buyer preference center (**#5b**) · full per-event×per-channel matrix · migrating the other ~14 email call-sites · WhatsApp/SMS · agent (MCP) pref read/write · digest/quiet-hours · in-chat ledger (#3c) |
| **Risk tier** | HIGH (all stories) — Daniel merges each |

## Medusa-first / data note
Notification preferences + the Telegram link are **per-user, non-commerce** data → **Supabase**
(consistent with `push_subscriptions`, keyed by `clerk_user_id`), **not** Medusa. No commerce model
changes. Bilingual es-MX (+ en dictionary) for all new settings copy + Telegram message bodies. Clerk
untouched (identity via `clerk_user_id`). **Agent surface:** MCP read/write of prefs is **deferred
(OUT)** — additive, noted for the agent epic.

## What already exists (reuse, don't rebuild)
- **Email channel is done** — reuse every `lib/email.ts` sender as-is; the seam *calls* them behind a preference gate, it doesn't reimplement templates. `getSellerEmail(clerkUserId)` (`lib/email.ts:26`) resolves the address.
- **Push channel + seam shape** — `lib/notify.ts` `notify(userId, event)` (VAPID, `push_subscriptions` in Supabase keyed by `clerk_user_id`) is the pattern the new dispatcher generalizes; reuse the table + keying convention.
- **Telegram send primitive** — `lib/telegram.ts` `tgNotify` → **generalize to `tgSend(chatId, text)`** with the admin chat as the default (all existing `tg.*` admin calls unchanged); the seller channel passes a linked `chat_id`. Bot token already exists (`TELEGRAM_BOT_TOKEN`).
- **Settings home** — `app/shop/manage/settings` hosts the preference center + "Conecta Telegram" (no new shell).
- **Dispatch points are known** — the ~16 `@/lib/email` callers (esp. `orders/[id]/route.ts`, `ship/route.ts`, `ship-manual/route.ts`, `finalize-manual/route.ts`, `offers/route.ts`, `report-payment/route.ts`) are the seams to route in-scope events through.
- **#3b's state vocabulary** — Sprint 3 imports `lib/manual-payment-state.ts` for `buyer_reported_paid`; does **not** redefine it.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Prefs + seam + settings (email/push; TG stub)** | S1.1 `lib/notifications/dispatch.ts` `dispatchToSeller(userId, event)` — resolve prefs, fan out to enabled channels, fire-and-forget | HIGH |
| | S1.2 Supabase `notification_preferences` + `telegram_links` (RLS, default-on read, no backfill) | HIGH |
| | S1.3 Seller preference center — channels × event-groups grid at `/shop/manage/settings` (es-MX) | HIGH |
| | S1.4 Route in-scope already-durable seller events (new order, offer made) through the seam, default-on (parity, no regression) | HIGH |
| **S2 · Telegram seller channel** | S2.1 "Conecta Telegram" — `t.me/<bot>?start=<token>` deep-link + webhook captures `chat_id` | HIGH |
| | S2.2 `tgNotify`→`tgSend(chatId,…)`; wire Telegram into the dispatcher (linked seller, enabled groups) | HIGH |
| | S2.3 Unlink + "Enviar prueba" test message per linked channel | HIGH |
| **S3 · Money-path event + completeness** ⛔ blocked-by #3b | S3.1 Wire #3b's durable `buyer_reported_paid` → seller across email + Telegram + push (per prefs) | HIGH |
| | S3.2 Complete the Payments/Orders groups (`payment_confirmed`, ship/deliver) on the seam, one vocabulary with #3b | HIGH |
| | S3.3 Polish: finalize taxonomy, es-MX (+ en) for all TG bodies + copy, empty/"no channel linked" states | HIGH |

## Deploy order (two repos, async)
The seam + channel libs + routes + settings are **frontend** (`apps/miyagisanchez`); the prefs/link
tables ship via the **Supabase CLI**. Confirm whether any in-scope event fires from the **backend**
(Cloud Run) — if so, merge backend-first / degrade gracefully (LEARNINGS). Default-on prefs keep the
99% path byte-for-byte unchanged during any deploy-lag window. Rebase latest `main` before each PR
(parallel agents); **announce** the settings-page + shared-lib (`telegram.ts`) changes — shared surface
breaks sibling PRs.

## Definition of Done (epic close-out checklist)
- [ ] All 3 sprints' stories merged to `main` + smoke-tested (Telegram-link + money-path gaps stated, owed to Daniel).
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough with **real production URLs**; Telegram-link / money / auth steps flagged as owed to Daniel.
- [ ] This README marked ✅ complete; every `sprint-N.md` status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] **Product poster updated** (`Roadmap/README.md` — 05 line + Recent highlights: seller Telegram channel + preference center).
- [ ] Team memory updated (epic memory + `MEMORY.md` index).
- [ ] **`Roadmap/LEARNINGS.md` updated** — promote durable learnings (the dispatch-seam + preference-resolver pattern; `tgSend` parameterization; Telegram `/start` linking).
- [ ] Feature branch deleted; PRs merged.
