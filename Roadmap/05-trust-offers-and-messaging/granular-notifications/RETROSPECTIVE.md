# Retrospective — Granular Multi-Channel Notifications (Email + Telegram)

> Epic 05 · BUILD-ORDER #5 · Risk HIGH (all stories, Daniel-merged). **Shipped to prod 2026-06-07** across
> three PRs: S1 [#40](https://github.com/danybgoode/miyagisanchezcommerce/pull/40) `2557b42`, S2
> [#41](https://github.com/danybgoode/miyagisanchezcommerce/pull/41) `4ad14a2`, S3
> [#43](https://github.com/danybgoode/miyagisanchezcommerce/pull/43) `c5cf6c7`.

## What shipped
A seller-facing notification system layered on the existing email + push channels:
- **The seam (S1).** `lib/notifications/dispatch.ts` `dispatchToSeller(clerkUserId, {group, email?, push?, telegram?})`
  — fire-and-forget, never throws — over a pure, next-free resolver `lib/notifications/preferences.ts`
  (`EVENT_GROUPS` × `CHANNELS`, sparse store, absent row → default-on so the 164 existing sellers saw zero
  change). Two Supabase tables (`notification_preferences`, `telegram_links`), keyed by `clerk_user_id` like
  `push_subscriptions`. A settings grid (channels × event-groups) at `/shop/manage/settings`.
- **The Telegram channel (S2).** `tgNotify` generalized to `tgSend(chatId, text)` with the admin chat as the
  default (every existing `tg.*` admin alert byte-for-byte unchanged). `/start` deep-link → secret-token-validated
  webhook captures the chat into a single-use, short-TTL link token. Opt-in, default-off; unlink + "Enviar prueba".
- **The money path + completeness (S3).** #3b's durable `buyer_reported_paid` now fans out to the seller across
  email + push + linked Telegram under the **Pagos** group; the buyer's return request does the same under
  **Devoluciones**. All four settings groups map to a wired event. Copy finalized es-MX via a single
  `GROUP_COPY` source of truth.

## What went well
- **The seam paid for itself in S3.** Wiring a new event was: one line in `EVENT_GROUP`, one `dispatchToSeller`
  call at the route, done. S3 touched 6 files and re-used every email sender + the push + the Telegram channel
  built in S1/S2. The "extract the seam in S1, project onto it later" shape held exactly as designed.
- **Default-on / opt-in defaults made a HIGH-risk surface safe.** Email/push default-on = no regression for any
  existing seller during any deploy-lag window; Telegram default-off = a freshly-linked seller isn't flooded.
  The 99% path stayed unchanged while the money path got richer.
- **Pure resolver = real coverage for free.** `dispatchToSeller` is `server-only` and can't be imported by the
  Playwright `api` runner, but the pure resolver it trusts (`groupForEvent` + `resolvePrefs` + `isChannelEnabled`
  + `telegramTarget`) is fully unit-testable — 22 specs prove the pref-gating, the event→group map, and copy
  completeness with no server, no auth, no network.
- **One vocabulary with #3b.** S3 *imported* `lib/manual-payment-state.ts` (state names + the "Pago reportado —
  en verificación" badge copy) rather than re-deriving it, so the buyer view, seller view, and the new
  notification all read the same words. The dependency gate (verify the durable event exists + is emitted
  *before* planning S3) made this clean.

## What we learned (the transferable bits → promoted to LEARNINGS)
- **A buyer-authed route can still notify the seller — resolve the seller from the order, don't assume the
  actor is the recipient.** `report-payment` is hit by the *buyer*; the notification target is the *seller*. We
  resolved the seller from the order itself (Medusa: `GET /store/buyer/me/orders/:id` → embedded
  `marketplace_shops.clerk_user_id`; legacy: the `marketplace_orders` mirror join) — the same shape the
  return-request route already used. Best-effort: if resolution fails, the durable persist + admin nudge still
  happen.
- **"Complete the groups" ≠ "notify on every transition."** The instinct to wire `payment_confirmed` + ship +
  deliver would have notified a seller of *their own clicks* — noise. The valuable, genuinely buyer-/system-
  triggered seller events were `buyer_reported_paid` and `return_requested`; those make all four groups real
  without self-notification. Naming the *recipient* per event (not just the event) is the test.
- **Match the codebase's real i18n reality, not the plan's boilerplate.** The epic doc said "es-MX (+ en
  dictionary)", but the entire seller portal is hardcoded es-MX (the `locales/*.json` dictionary, 4 keys, feeds
  only a few public pages). Adding `en` keys would have been dead code. We kept copy es-MX (consistent with
  S1/S2 + every `lib/email`/`tg.*` body) and turned the "bilingual" gate into a **copy-completeness** spec.
  Check whether the dictionary is actually consumed before writing to it.
- **es-MX copy belongs fine in a next-free `lib/` module** — `GROUP_COPY` in `preferences.ts` is the single
  source the UI renders *and* the spec checks, so the per-group summary can't drift from what the seam sends.
  (`manual-payment-state.ts` set this precedent with its state badges.)

## Gaps / owed
- **Live money + refund smoke (owed to Daniel).** Real buyer "Ya hice el pago" → seller-receives across
  email + Telegram + push; buyer return-request → seller "Devoluciones"; the Telegram-off granularity check.
  Walkthrough in `sprint-3.md` (steps 1–4). Money/auth + real Telegram → can't be agent-automated.
- **The human Telegram link smoke (carried from S2)** — tap Conecta → `/start` → Conectado → Enviar prueba.
- **Deferred by scope (noted, not lost):** buyer Telegram + buyer preference center (**#5b**), the full
  per-event×per-channel matrix, migrating the other ~14 email call-sites, WhatsApp/SMS, agent (MCP) pref
  read/write, digest/quiet-hours, the in-chat ledger (#3c).
