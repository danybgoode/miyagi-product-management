# Epic — Buyer Telegram channel + Buyer preference center

> **Macro-section:** [05 · Trust, Offers & Messaging](../README.md) · **BUILD-ORDER:** #5b ·
> **Risk: HIGH — Daniel merges every story** (rides buyer order / payment / ship / return dispatch).
> **Status: 📋 Planned** (scaffolded 2026-06-06). Scope doc:
> [`00-ideas/seeds/buyer-notifications.md`](../../00-ideas/seeds/buyer-notifications.md).
> **A pure EXTENSION of [#5 · Granular Multi-Channel Notifications](../granular-notifications/README.md)
> to the buyer audience.** **Hard dependency: #5** must have merged (the seam, the two Supabase tables,
> `tgSend`, the `/start` linking webhook, the settings-grid component). **No hard #3b dependency** —
> buyer money events are already-firing emails; align `payment_confirmed` with #3b's vocabulary only if
> it has landed (soft).

## Why
Signed-in buyers have **no control** over how purchase events reach them — `lib/email.ts` fires order
confirmation, payment confirmed, shipped, delivered, offer responses and return updates to the order
email, **always on, no preferences** (the same gap #5 closed for sellers). #5 built all the machinery
(the `dispatchToSeller` seam + a pure preference resolver, two `clerk_user_id`-keyed Supabase tables,
`tgSend`, the `/start` Telegram linking webhook, and the settings grid). This epic **re-aims that
machinery at buyers**: a sibling `dispatchToBuyer`, the *same* resolver/tables/`tgSend`/webhook/grid,
surfaced in the buyer's account — so a buyer gets the milestones they care about on the channels they
choose (incl. real-time Telegram), while their purchase + payment **receipt email stays mandatory**.

## Context

| Question | Answer |
|---|---|
| **Who** | **Signed-in buyers only** (prefs + Telegram are `clerk_user_id`-keyed, like #5 + `app/account/*`). Guests keep today's transactional emails to their order email, unchanged |
| **Job** | Get my purchase milestones (order/payment confirmed, shipped, delivered, offer responses, returns) on the channels I choose — real-time Telegram + the email that already fires — without noise, and never lose my receipt |
| **Outcome signal** | Buyer links Telegram and gets purchase events there · per-channel + per-event-group toggles persist · turning a group off stops those sends · **Compras email can never be turned off** · a guest order still emails exactly as today |
| **In v1** | `dispatchToBuyer` reusing #5's pure resolver (buyer event→group map + defaults; **Compras email forced-on**) · **reuse** #5's 2 Supabase tables (audience-namespaced keys, no new table) · buyer settings grid at `app/account/notificaciones` (4 groups × 3 channels) · buyer Telegram link/unlink/test + delivery · route in-scope buyer events through the seam **guest-safe** |
| **Event-groups** | **Compras** (order + payment confirmed — email mandatory) · **Envíos** (shipped + delivered) · **Ofertas** (offer accepted/countered/declined) · **Devoluciones** (return requested/accepted/declined) — *Devoluciones folded in at sign-off* |
| **Out** | Guest / email-keyed prefs + unsubscribe-token "manage" links · full per-event×per-channel matrix · WhatsApp/SMS · agent (MCP) pref read/write · digest/quiet-hours · buyer email call-sites beyond the in-scope set |
| **Risk tier** | HIGH (all stories) — Daniel merges each |

## Medusa-first / data note
Buyer preferences + the Telegram link are **per-user, non-commerce** data → **Supabase, reusing #5's two
tables** keyed by `clerk_user_id` (no new table, no Medusa change). The one new design wrinkle:
**namespace buyer event-group keys** (e.g. `buyer.compras`/`buyer.envios`/`buyer.ofertas`/
`buyer.devoluciones`) so a person who is **both buyer and seller** keeps independent prefs. Bilingual
es-MX (+ en) for all new buyer copy + any buyer Telegram bodies. Clerk untouched (identity via
`clerk_user_id`; guests excluded by design). **Agent surface:** MCP read/write of buyer prefs **deferred
(OUT)** — additive, noted for the agent epic (same as #5).

## What already exists (reuse, don't rebuild)
- **The dispatch seam + pure resolver (#5)** — `lib/notifications/dispatch.ts` +
  `lib/notifications/preferences.ts`. Add a sibling `dispatchToBuyer(clerkUserId, event)` that **reuses
  the same resolver** (buyer event→group map + buyer `DEFAULT_PREFS`, Compras-email forced-on). Don't
  fork the resolver — extend its tables.
- **The two Supabase tables (#5)** — `notification_preferences` + `telegram_links`, already keyed by
  person not role. **Reuse both**; add audience-namespaced buyer event-group keys (or an `audience`
  column). Default-on read, **no backfill**.
- **`tgSend(chatId, text)` (#5)** — reuse verbatim for buyer Telegram delivery.
- **The `/start` deep-link + linking webhook (#5)** — a buyer links the same way (token → buyer's
  `clerk_user_id`); **if already linked as a seller, reuse the existing row — no re-link** (one chat per
  person).
- **Push (`lib/notify.ts`)** — `notify(userId, event)` over `push_subscriptions`, audience-agnostic;
  the buyer branch reuses it.
- **Every buyer email sender (`lib/email.ts`)** — `sendOrderConfirmedToBuyer`, `sendOrderShipped`,
  `sendOrderDelivered`, `sendOfferAccepted/Declined/Countered`, `sendReturnRequestConfirmedToBuyer` /
  `sendReturnAcceptedToBuyer` / `sendReturnDeclinedToBuyer`. The seam *calls* them behind the gate; no
  new templates. Recipient is `ctx.buyerEmail`, already resolved at each dispatch site.
- **The settings-grid component (#5 S1.3)** — reuse for the buyer page; only the rows, the locked
  Compras×Email cell, and the host page differ.
- **The buyer account shell + Clerk gating** — `app/account/*` (`currentUser()`); add one page
  (`app/account/notificaciones`) + a nav link, no new auth.
- **Dispatch sites are known** — `orders/route.ts`, `orders/finalize-manual/route.ts`,
  `orders/[id]/ship[-manual]/route.ts`, `orders/[id]/confirm-delivery/route.ts`,
  `offers/[id]/buyer-respond/route.ts` + `offers/route.ts`, `orders/[id]/return-request/route.ts` +
  `orders/[id]/return-request/[requestId]/route.ts` — the seams to route in-scope buyer events through.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Buyer prefs + seam + grid (email/push; TG stub)** | B1.1 `dispatchToBuyer(userId, event)` — reuse the #5 resolver w/ buyer event→group map (Compras/Envíos/Ofertas/Devoluciones) + buyer defaults; **Compras email forced-on**; fire-and-forget | HIGH |
| | B1.2 **Reuse** #5's `notification_preferences` + `telegram_links`; audience-namespaced buyer keys (no new table); default-on read, no backfill; buyer/seller isolation | HIGH |
| | B1.3 Buyer preference center at `app/account/notificaciones` — reuse the #5 grid (4 groups × 3 channels, Compras×Email locked "Siempre", TG col stub) + nav link (es-MX/en) | HIGH |
| | B1.4 Route in-scope buyer events through the seam **guest-safe** (order/payment confirmed, shipped, delivered, offer responses, returns), default-on parity; guest → today's email exactly | HIGH |
| **S2 · Buyer Telegram channel** | B2.1 Buyer links Telegram — reuse #5's `/start` deep-link + webhook (bind to buyer `clerk_user_id`); reuse existing row if already linked as seller | HIGH |
| | B2.2 Wire the Telegram branch of `dispatchToBuyer` via `tgSend` (linked buyer + group-on → deliver; unlinked/off → silent no-op) | HIGH |
| | B2.3 Unlink + "Enviar prueba" + polish/bilingual; **dual-audience unlink safety** on the shared `telegram_links` row | HIGH |

## Deploy order (two repos, async)
The seam + buyer dispatch + routing + the settings page are **frontend** (`apps/miyagisanchez`); any
schema delta ships via the **Supabase CLI**. Confirm whether any in-scope buyer event fires from the
**backend** (Cloud Run) — if so, merge backend-first / degrade gracefully (LEARNINGS). **Default-on +
the guest fall-through keep the 99% path byte-for-byte unchanged** during any deploy-lag window. Rebase
latest `main` before each PR (parallel agents); **announce** the shared changes (`lib/notifications/`
seam, the grid component, `app/account` nav) — shared surface breaks sibling PRs. **Build only after #5
has merged.**

## Definition of Done (epic close-out checklist)
- [ ] Both sprints' stories merged to `main` + smoke-tested (Telegram-link + guest/money-path gaps stated, owed to Daniel).
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough with **real production URLs**; Telegram-link / money / auth steps flagged as owed to Daniel.
- [ ] This README marked ✅ complete; every `sprint-N.md` status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] **Product poster updated** (`Roadmap/README.md` — 05 line + Recent highlights: buyer Telegram channel + buyer preference center).
- [ ] Team memory updated (epic memory + `MEMORY.md` index).
- [ ] **`Roadmap/LEARNINGS.md` updated** — promote durable learnings (re-aiming an audience-agnostic dispatch seam at a second audience; the guest fall-through pattern; dual-audience shared-row semantics).
- [ ] Feature branch deleted; PRs merged.
