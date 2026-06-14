---
title: "Granular multi-channel notifications"
slug: granular-notifications
status: shipped
area: "05"
type: feature
priority: wave-2
risk: high
epic: "05-trust-offers-and-messaging/granular-notifications"
build_order: "#5"
updated: 2026-06-08
---

# Scope — Granular Multi-Channel Notifications (Email + Telegram) (BUILD-ORDER #5)

> **Status: SIGNED OFF (Daniel, 2026-06-06).** Gate passed. Scaffolded under
> `05-trust-offers-and-messaging/granular-notifications/` (epic README + sprint-1..3); kickoff prompts
> emitted. **Next action: Claude Code build — Sprints 1–2 can run in parallel with #3b; Sprint 3 is
> blocked-by #3b.** Follow-on **#5b** (buyer Telegram + buyer preference center) added to BUILD-ORDER
> on top of this.
> Groomed 2026-06-06 in a fresh Cowork session off BUILD-ORDER #5 + the #3a re-scope delta
> (`audits/results-refresh-2026-06/00-rescope-delta.md` "#5" section + the `05` refresh), pinned
> frontend `origin/main@ed447bd` / backend `origin/main@0980253`. **Class: Feature/epic.**
> **Stage-2.5 bucket: genuinely-new — but reuse-heavy** (email + push channels already ship; the
> net-new is a *Telegram user channel* + a *preference layer*). **Risk: HIGH — Daniel merges** (rides
> order/offer/payment dispatch). **Depends on #3b** for the durable `buyer_reported_paid` event
> (Sprint 3's canonical trigger).

## The ask (mirrored back)
*You want sellers to get the order/offer/payment events they care about on the channels they choose —
real-time **Telegram** in addition to the **email** that already fires — with **granular control** so
they can turn categories on/off per channel instead of being force-fed every email. Right?*

## Why / the job
**As** a seller (the audience drowning in order activity), **I want** to receive my important shop
events on Telegram and decide per-channel which categories reach me, **so that** I react fast to real
money events (a new order, a buyer reporting payment) without inbox noise — and never miss the one
notification that matters because it was buried with the ones that didn't. This is the projection
layer on top of #3b's durable state: the durable `buyer_reported_paid` event #3b creates is #5's
canonical "ping the seller now" trigger.

## What the #3a refresh + code read confirmed (current `main`)
The audit named #5's triggers as the manual-payment lifecycle events and made the dependency explicit.
The code read sharpens *what already exists vs. what's genuinely missing*:
1. **Email is already broad, not granular.** `lib/email.ts` (~1,360 lines) already sends buyer **and**
   seller transactional mail for offers (made/accepted/declined/countered/reminders), sale completed,
   order confirmed, new order to seller, shipped, delivered, returns (request/accept/decline), and all
   three manual / coordinated / pickup flows — dispatched from ~16 routes/libs. It **always fires**:
   there is **no preference layer anywhere** (no per-user opt-in/out, no settings, no unsubscribe).
2. **Web push already exists** for `new_message` + `offer` only — `lib/notify.ts` (`notify(userId,
   event)` over VAPID, subscriptions in Supabase `push_subscriptions` keyed by `clerk_user_id`).
3. **Telegram is admin-only.** `lib/telegram.ts` `tgNotify(text)` posts to **one fixed chat**
   (`TELEGRAM_CHAT_ID` = Daniel/@Don_Dany); the `tg.*` helpers are all admin alerts. Making Telegram a
   **seller** channel needs a per-user **chat-id linking flow** + a parameterized send — net-new.
4. **`buyer_reported_paid` is not yet a durable event** — `report-payment/route.ts:23` only admin-pings
   via `tgNotify`. #3b makes it durable; #5 Sprint 3 consumes it. *(Confirmed verbatim, audit + code.)*

## Scope decisions (Daniel, 2026-06-06)
1. **Audience — sellers first.** Sellers get the Telegram link + preference center in v1; buyers keep
   email/push only (buyer Telegram + buyer preference center → a later slice). Smallest blast radius;
   sellers feel the pain.
2. **Granularity — per-channel master + event-group toggles.** A master switch per channel
   (email / Telegram / push) plus a handful of **event-group** toggles (orders, offers, payments,
   returns) with safe defaults. Not a full per-event × per-channel matrix (deferred).
3. **Dispatch refactor — unify only in-scope events.** Introduce one dispatch seam and route **only the
   v1 seller events** through it; the other email call-sites keep working untouched and migrate later.
   Caps risk on the money path.
4. **Money-path event — include, blocked-by #3b.** `buyer_reported_paid → notify seller` is scoped in
   (Sprint 3) but blocked until #3b lands the durable event. #5 sequences right behind #3b.

## Medusa-first / reuse reframe — What already exists (reuse, don't rebuild)
Per LEARNINGS ("read the model first — it re-scopes the epic smaller"). Notification prefs + the
Telegram link are **per-user, non-commerce** data → **Supabase** (consistent with `push_subscriptions`,
keyed by `clerk_user_id`), **not** Medusa.
- **The email channel is done** — reuse every `lib/email.ts` sender as-is; the seam *calls* them, it
  doesn't reimplement them. New work is the preference gate in front, not new templates.
- **The push channel + its seam shape already exist** — `lib/notify.ts` `notify(userId, event)` is the
  pattern the new dispatcher generalizes (resolve subscriptions → fan out → fire-and-forget). Reuse the
  `push_subscriptions` table + `clerk_user_id` keying convention for the new tables.
- **The Telegram send primitive stays** — `lib/telegram.ts` `tgNotify`. **Generalize it** to
  `tgSend(chatId, text)` with the admin chat as the default (keep all existing `tg.*` admin calls
  working byte-for-byte); the new seller channel passes a linked `chat_id`.
- **Seller email lookup exists** — `getSellerEmail(clerkUserId)` (`lib/email.ts:26`, Clerk Management
  API) — reuse for the email channel's address resolution.
- **Settings home exists** — `app/shop/manage/settings` is where the preference center + "Conecta
  Telegram" live (no new shell).
- **Dispatch points are known** — the ~16 `@/lib/email` callers (esp. `orders/[id]/route.ts`,
  `ship/route.ts`, `ship-manual/route.ts`, `finalize-manual/route.ts`, `offers/route.ts`,
  `report-payment/route.ts`) are the exact seams to route through the new dispatcher for in-scope events.
- **Bot infra is half-present** — a Telegram bot token already exists (`TELEGRAM_BOT_TOKEN`); v1 adds a
  **`/start` deep-link + webhook** to capture the seller's `chat_id`, not a new bot.

AGENTS five-rule check: Medusa owns commerce — untouched (prefs are non-commerce → Supabase) ✅ ·
Supabase for the two new per-user tables ✅ · Clerk untouched (identity via `clerk_user_id`) ✅ ·
bilingual es-MX strings required for all new settings copy + Telegram message bodies ✅ · **Agent
surface:** reading/writing a seller's notification prefs over MCP is **deferred to OUT** (additive,
not core to v1) — note it so the agent epic can pick it up.

## UX heuristics this epic is held to
- **Quiet by default, loud on money.** Safe defaults: money/order events on by default; chatty
  categories conservative. A seller should never have to *opt out of spam* to feel in control.
- **One link, obvious state.** "Conecta Telegram" → a deep-link → "Conectado ✓ / Desconectar". The
  seller always knows whether Telegram is linked and what it will send.
- **No silent drops.** If a channel is unlinked/unconfigured, the preference UI says so; the dispatcher
  no-ops gracefully (never throws on the request path — same contract as `tgNotify`/`notify` today).
- **Granularity that reads in one glance** — a small grid of channels × event-groups, not a wall of
  per-event switches.
- **Honest channel reach** — the settings copy states what each channel can/can't carry (e.g. Telegram
  is seller-only in v1).

## Proposed slices (skateboard → car) — 3 sprints, all HIGH-risk
> Reference end-state only; the building agent confirms the plan in plan mode. Each story names its QA.

**Sprint 1 — Preference model + dispatch seam + settings UI (email/push; Telegram stub).**
*The skateboard: granular control ships even before Telegram delivery does.*
- **S1.1** *As the system, I want one notification-dispatch seam* — `lib/notifications/dispatch.ts`
  `dispatchToSeller(clerkUserId, event)` that resolves the seller's prefs, fans out to enabled channels,
  reuses `lib/email.ts` senders + `lib/notify.ts` push, and is fire-and-forget (never throws on the
  request path). **Acceptance:** a unit call with prefs = {email:on, push:off} sends only email.
  **QA:** pure-logic spec on the resolver (`lib/notifications/preferences.ts` — event→group mapping +
  channel resolution); no network. **Risk: HIGH** (will carry money events).
- **S1.2** *As the system, I want a per-user preference + (later) Telegram-link store* — Supabase
  migration: `notification_preferences` (`clerk_user_id`, `channel`, `event_group`, `enabled`) +
  `telegram_links` (`clerk_user_id`, `chat_id`, `linked_at`) with RLS, defaults applied on read (absent
  row = safe default, no backfill). **Acceptance:** a seller with no rows gets the documented defaults;
  a written toggle persists across reload. **QA:** api spec asserting default-on read + persisted
  toggle. **Risk: HIGH** (new tables; additive).
- **S1.3** *As a seller, I can control notifications in settings* — a channels × event-groups grid at
  `app/shop/manage/settings` (email/push live; Telegram row shown as "Conecta para activar"), es-MX
  strings. **Acceptance:** toggling "Ofertas → email" off stops offer emails to that seller; toggle
  state survives reload. **QA:** browser smoke (rendered grid + persisted toggle) — anonymous-friendly
  where possible; authed seller smoke **owed to Daniel**. **Risk: HIGH** (gates real email dispatch).
- **S1.4** *As the platform, in-scope seller events flow through the seam* — route the already-durable
  v1 seller events (new order → seller; offer made → seller) through `dispatchToSeller` instead of the
  direct email call, **default-on so no regression**. **Acceptance:** with default prefs a new order
  still emails the seller exactly as today. **QA:** api spec asserting parity (event still emails on
  defaults); the other ~14 callers untouched. **Risk: HIGH** (touches order/offer dispatch).

**Sprint 2 — Telegram as a seller channel (linking + delivery).**
- **S2.1** *As a seller, I can link Telegram* — "Conecta Telegram" generates a `t.me/<bot>?start=<token>`
  deep-link; a new webhook endpoint captures the chat on `/start <token>` and writes `telegram_links`.
  **Acceptance:** seller taps the link, sends `/start`, settings flips to "Conectado ✓". **QA:** api
  spec on the token→chat_id binding; live Telegram link smoke **owed to Daniel** (needs a real TG
  account). **Risk: HIGH** (new inbound webhook + per-user identity binding).
- **S2.2** *As the system, I can send to a linked seller* — generalize `tgNotify` → `tgSend(chatId,
  text)` (admin chat as default; all existing `tg.*` admin calls unchanged) and wire Telegram into the
  dispatcher so a linked seller with Telegram-enabled groups receives them. **Acceptance:** a linked
  seller with "Pedidos → Telegram" on gets a Telegram message on a new order; an unlinked seller is a
  silent no-op. **QA:** pure-logic spec on `tgSend` targeting + the dispatcher's Telegram branch; live
  delivery smoke **owed to Daniel**. **Risk: HIGH.**
- **S2.3** *As a seller, I can unlink + test* — "Desconectar" clears the link; an "Enviar prueba" button
  fires a test message on each linked channel. **Acceptance:** unlink → Telegram stops; test button
  delivers on linked channels only. **QA:** api spec on unlink; browser smoke **owed to Daniel**.
  **Risk: MEDIUM→treat as HIGH** (settings on the notification path).

**Sprint 3 — The money-path event + completeness. ⛔ BLOCKED-BY #3b.**
- **S3.1** *As a seller, "buyer reported payment" reaches me on my chosen channels* — wire #3b's durable
  `buyer_reported_paid` event into `dispatchToSeller` (Payments group) across email + Telegram + push.
  **Acceptance:** on a manual order, buyer taps "ya pagué" → the seller gets it on every enabled
  channel; respects prefs. **QA:** api spec asserting dispatch on the event; live money-path smoke
  **owed to Daniel**. **Risk: HIGH** (money path). **Blocked until #3b merges the durable event.**
- **S3.2** *As a seller, the Payments group covers the manual lifecycle* — add `payment_confirmed` (and
  ship/deliver if not already routed) to the seam so the Payments/Orders groups are complete and
  consistent across channels. **Acceptance:** each manual-lifecycle transition notifies per prefs, one
  vocabulary with #3b's state names. **QA:** api spec per event. **Risk: HIGH.**
- **S3.3** *As a seller, the experience is polished + bilingual* — finalize the event-group taxonomy,
  es-MX (+ en dictionary) for all Telegram bodies + settings copy, "no channel linked" empty states,
  and a one-screen summary of what each group sends. **Acceptance:** no untranslated string; settings
  reads cleanly with zero linked channels. **QA:** string/snapshot spec; browser smoke **owed to
  Daniel**. **Risk: MEDIUM→treat as HIGH** (ships with the money-path stories).

## In / Out of scope (v1)
**In:** one notification-dispatch seam (`lib/notifications/`) with a pure-logic preference resolver;
two Supabase tables (`notification_preferences`, `telegram_links`, RLS, default-on read); a
**seller** preference center (channels × event-groups grid) at `app/shop/manage/settings`; **Telegram
as a seller channel** — `/start` deep-link + webhook linking, generalized `tgSend`, unlink + test;
routing **only the in-scope seller events** (new order, offer made, payment lifecycle incl. #3b's
`buyer_reported_paid`) through the seam; reuse of every existing email template + push; bilingual es-MX
(+ en) strings; one api/pure-logic spec per testable story.
**Out (later slices / other epics):** **buyer** Telegram channel + **buyer** preference center;
**full per-event × per-channel matrix** (v1 is event-*group* granularity); **migrating the other ~14
email call-sites** through the seam (they keep working untouched, migrate opportunistically);
**WhatsApp / SMS** channels; **agent (MCP) read/write of notification prefs** (additive — note for the
agent epic); **digest/batching/quiet-hours**; **the in-chat shared transaction ledger** (#3c — it
consumes #3b state, separate from channel fan-out). **Hard dependency:** Sprint 3 is **blocked-by #3b**.

## Open risks / questions
- **High-risk seam touched repeatedly.** Routing dispatch through a new seam sits in front of real
  money emails. Mitigation (per LEARNINGS): **default-on** so the 99% path is byte-for-byte unchanged;
  migrate **only in-scope events** in v1; extract the pure resolver to a `lib/` seam for free
  deterministic coverage; **Daniel merges each story.**
- **`#3b` dependency is real and gating for Sprint 3 only.** Sprints 1–2 (the seam, prefs, settings,
  Telegram linking + delivery on already-durable events) can build **in parallel with #3b**; only S3.1
  needs the durable `buyer_reported_paid`. State-name vocabulary must match #3b's
  `lib/manual-payment-state.ts` — import, don't redefine.
- **Telegram inbound webhook is new surface.** A `/start` webhook accepts external POSTs — validate the
  bot secret / token, scope the binding to a single-use linking token, rate-limit. Treat as security-
  sensitive (HIGH).
- **Two repos, async deploy.** Dispatch + routing are largely **frontend** (`apps/miyagisanchez` —
  email/push/telegram libs + routes live there); the Supabase migration ships via the Supabase CLI.
  Confirm whether any in-scope event fires from the **backend** (Cloud Run) — if so, merge
  backend-first / degrade gracefully (LEARNINGS).
- **Research present-day facts before build (cite in epic doc).** Telegram **Bot API** `/setWebhook`
  + deep-linking (`?start=` payload, ≤64 chars) and **Resend** scheduling/limits should be confirmed
  against current docs at build time — both are external and change. Web-search at Stage-3 of the build
  plan, not from memory.
- **No backfill.** Absent preference rows = documented safe defaults; never write rows for 164 existing
  sellers. Defaults live in code (a `DEFAULT_PREFS` map), mirroring the Flagsmith fail-open pattern.
- **`main` moves under the build** (parallel agents) — rebase latest `main` before each PR; announce
  the settings-page + any shared-lib change (LEARNINGS: shared surface breaks sibling PRs).

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance checks Daniel-runnable.
- [x] Class = Feature/epic; Stage-2.5 bucket = genuinely-new but reuse-heavy (email + push exist;
      net-new = Telegram user channel + preference layer).
- [x] v1 in/out boundary written; Daniel's 4 scope decisions captured (audience · granularity ·
      dispatch refactor · money-path event).
- [x] Medusa-first/reuse list produced (email senders · `notify`/`push_subscriptions` pattern ·
      `tgNotify`→`tgSend` · `getSellerEmail` · settings home · the ~16 dispatch points).
- [x] Each story risk-tiered (all HIGH); QA stage named per story; browser/live smokes' owner (Daniel)
      identified; Sprint 3 marked **blocked-by #3b**.
- [x] **Daniel approved this scope doc (2026-06-06)** ← gate passed. Scaffolded
      `05-trust-offers-and-messaging/granular-notifications/` (epic README + sprint-1..3) + committed
      `plan(granular-notifications): scaffold epic + sprints` + 3 kickoff prompts emitted + #5 ticked
      in BUILD-ORDER. Follow-on **#5b** (buyer Telegram + buyer preference center) added to BUILD-ORDER
      on top of this, and set as the next-session groom target.
