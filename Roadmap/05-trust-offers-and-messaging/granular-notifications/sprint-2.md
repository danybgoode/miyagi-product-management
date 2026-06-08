# Sprint 2 — Telegram as a seller channel (linking + delivery)

> Epic: [Granular Multi-Channel Notifications](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: ✅ SHIPPED to prod 2026-06-07 — [PR #41](https://github.com/danybgoode/miyagisanchezcommerce/pull/41)
> merged (`4ad14a2`, Daniel-authorized; self-reviewed in lieu of the gated `/code-review ultra`).**
> **The three ops steps ran 2026-06-07 — channel is LIVE:** migration applied (`telegram_link_tokens`),
> `TELEGRAM_WEBHOOK_SECRET` set in Vercel prod + redeployed (prod verified: correct secret → 200, wrong →
> 403), `setWebhook` registered (`url` set, `allowed_updates=[message]`, no errors). **Still owed to Daniel:**
> the human live smoke — tap "Conecta Telegram" → `/start` → "¡Conectado!" → "Enviar prueba" + a real
> new-order/offer landing on Telegram (needs a real seller session + Telegram account).
> Goal: a seller can link Telegram and actually receive their chosen event-groups there, in real time.
> Builds on Sprint 1's seam + tables. **Built in parallel with #3b.**
>
> **Product decision (confirmed with Daniel):** after linking, Telegram is **opt-in** — every group's
> Telegram toggle starts **OFF**; the seller turns on the groups they want (no surprise flood on a
> brand-new realtime channel). Email/Push stay default-on (zero S1 regression).
>
> **Telegram Bot API rules used (live docs, cited at build — not memory):**
> - `?start=` deep-link payload: *"A-Z, a-z, 0-9, _ and - are allowed … up to 64 characters long"*;
>   the bot receives it as `/start <payload>`. — https://core.telegram.org/bots/features#deep-linking
> - `setWebhook` `secret_token`: *"1-256 characters. Only A-Z, a-z, 0-9, _ and - are allowed"*; sent
>   back in the `X-Telegram-Bot-Api-Secret-Token` header on **every** webhook request, so the endpoint
>   can verify the call is ours. — https://core.telegram.org/bots/api#setwebhook

## Stories

### S2.1 — Seller links Telegram (deep-link + webhook) ✅ `92dbfba`
**As** a seller, **I want** to connect my Telegram in one tap, **so that** the platform can message me
there.
- "Conecta Telegram" generates a single-use linking token and a `t.me/<bot>?start=<token>` deep-link; a new webhook endpoint handles the bot's `/start <token>` update and writes `telegram_links(clerk_user_id, chat_id)`.
- **Security:** validate the bot secret on the webhook, scope the token single-use + short-TTL, rate-limit. (New inbound surface — treat as security-sensitive.)
- **Acceptance:** seller taps the link → sends `/start` in Telegram → settings flips to "Conectado ✓" with their handle/chat bound.
- **Risk: HIGH** (inbound webhook + per-user identity binding).
- **Research at build (cite):** confirm current Telegram **Bot API** `/setWebhook` + deep-link `?start=` payload rules (≤64 chars) against live docs — don't rely on memory.

### S2.2 — Send to a linked seller ✅ `2a8ea61`
**As** the system, **I want** to send a message to a specific seller's chat, **so that** the dispatcher
can deliver Telegram for linked sellers.
- Generalize `tgNotify` → **`tgSend(chatId, text)`** with the admin chat as the default (all existing `tg.*` admin calls unchanged, byte-for-byte). Wire the Telegram branch of `dispatchToSeller` to look up the link + send when the seller has that event-group enabled on Telegram.
- **Acceptance:** a linked seller with "Pedidos → Telegram" on gets a Telegram message on a new order; an **unlinked** seller (or group off) is a silent no-op (no error on the request path).
- **Risk: HIGH.**

### S2.3 — Unlink + test ✅ `f53883d`
**As** a seller, **I want** to disconnect Telegram and send myself a test, **so that** I trust what's
wired and can revoke it.
- "Desconectar" clears `telegram_links`; "Enviar prueba" fires a test message on **each linked channel**.
- **Acceptance:** unlink → Telegram delivery stops immediately; test button delivers only on linked channels.
- **Risk: HIGH** (settings on the notification path).

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `next build` + Playwright `api`.
- **New specs:** pure-logic spec on `tgSend` target selection (explicit chat vs. admin default) + the dispatcher's Telegram branch (linked/unlinked/group-off resolution); api spec on the token→chat_id binding + unlink clearing the row.
- **Live smoke (owed to Daniel):** the real `/start` link + a real delivered Telegram message need a real Telegram account — **owed to Daniel**. The webhook's token-binding logic is covered by the api spec without Telegram.
- **Deploy:** frontend-only + Supabase reads. Set the bot webhook once (ops step, documented in the PR). Announce the `lib/telegram.ts` change (shared surface).

## Ops steps (one-time, post-merge — required before Telegram delivers)
The frontend ships on merge; Telegram delivery additionally needs three one-time ops actions:
1. **Apply the migration** — `telegram_link_tokens` (Supabase CLI `supabase db push`, or paste
   `supabase/migrations/20260608000000_telegram_link_tokens.sql` into the SQL editor). `telegram_links`
   already shipped in S1.
2. **Set `TELEGRAM_WEBHOOK_SECRET`** in Vercel prod (random 32+ char `A-Za-z0-9_-` string) — via the
   REST API, not the CLI plugin (it stores empty — see LEARNINGS). The webhook 403s every call until set.
3. **Register the webhook once** (uses the same secret):
   ```
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://miyagisanchez.com/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>&allowed_updates=%5B%22message%22%5D"
   ```
   Verify with `…/getWebhookInfo` → `url` set, `pending_update_count` low, no `last_error_message`.

## Sprint 2 — Smoke walkthrough
Env: preview (pre-merge, SSO-gated — sign in with the Vercel/Clerk seller session)
`https://miyagisanchez-git-feat-granular-notifications-danybgoodes-projects.vercel.app/shop/manage/settings`
→ production `https://miyagisanchez.com/shop/manage/settings` after merge **+ the ops steps above**.

```
1. As a seller, open <preview-or-prod>/shop/manage/settings → "Notificaciones".
   → Below the grid, a "Telegram" panel shows a "Conecta Telegram" button; the grid's
     Telegram column header reads "Conecta para activar" and its switches are disabled.
2. (Telegram — owed to Daniel) Tap "Conecta Telegram".
   → A new tab opens t.me/<bot> with a /start link prefilled; sending it shows a
     "¡Conectado! ✅" reply from the bot in Telegram.
3. Switch back to the settings tab (no manual reload needed).
   → The panel now reads "Conectado ✓" with "Enviar prueba" + "Desconectar"; the grid's
     Telegram column switches are now interactive (and start OFF — opt-in).
4. Turn ON "Pedidos → Telegram". Click "Enviar prueba".
   → A "🔔 Prueba" message arrives in your Telegram within ~2s.
5. (money/auth — owed to Daniel) Receive a new (card) order on one of your listings.
   → A "🛒 ¡Vendiste!" message arrives on Telegram (plus the email/push you already had).
     Leave "Ofertas → Telegram" OFF and have a buyer make an offer → NO Telegram for that.
6. Click "Desconectar", then trigger another order.
   → No more Telegram messages arrive; the column goes inert again.

If any step fails, note the step number + what you saw.
```
**Agent-verified (pre-merge):** `tsc --noEmit` clean; `next build` clean (all 3 new routes registered);
24 pure-logic specs green (token format/parse/expiry, `resolveChatId` targeting, `telegramTarget`
linked/unlinked/off, telegram-opt-in defaults) + the api auth/secret guards (401 link/test/unlink, 403
webhook on missing/wrong secret); no regression in the existing suite (run in CI vs the preview).
**Steps 2–6 are the Telegram / money / auth path** (real seller session + real Telegram account +
the ops steps) — **owed to Daniel.** The webhook's valid-secret token→chat binding can't be exercised
without the real bot secret + a real chat, so the api spec asserts the secret gate instead.
