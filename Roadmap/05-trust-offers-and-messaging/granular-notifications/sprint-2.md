# Sprint 2 — Telegram as a seller channel (linking + delivery)

> Epic: [Granular Multi-Channel Notifications](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned.** Goal: a seller can link Telegram and actually receive their chosen
> event-groups there, in real time. Builds on Sprint 1's seam + tables. **Can build in parallel with #3b.**

## Stories

### S2.1 — Seller links Telegram (deep-link + webhook)
**As** a seller, **I want** to connect my Telegram in one tap, **so that** the platform can message me
there.
- "Conecta Telegram" generates a single-use linking token and a `t.me/<bot>?start=<token>` deep-link; a new webhook endpoint handles the bot's `/start <token>` update and writes `telegram_links(clerk_user_id, chat_id)`.
- **Security:** validate the bot secret on the webhook, scope the token single-use + short-TTL, rate-limit. (New inbound surface — treat as security-sensitive.)
- **Acceptance:** seller taps the link → sends `/start` in Telegram → settings flips to "Conectado ✓" with their handle/chat bound.
- **Risk: HIGH** (inbound webhook + per-user identity binding).
- **Research at build (cite):** confirm current Telegram **Bot API** `/setWebhook` + deep-link `?start=` payload rules (≤64 chars) against live docs — don't rely on memory.

### S2.2 — Send to a linked seller
**As** the system, **I want** to send a message to a specific seller's chat, **so that** the dispatcher
can deliver Telegram for linked sellers.
- Generalize `tgNotify` → **`tgSend(chatId, text)`** with the admin chat as the default (all existing `tg.*` admin calls unchanged, byte-for-byte). Wire the Telegram branch of `dispatchToSeller` to look up the link + send when the seller has that event-group enabled on Telegram.
- **Acceptance:** a linked seller with "Pedidos → Telegram" on gets a Telegram message on a new order; an **unlinked** seller (or group off) is a silent no-op (no error on the request path).
- **Risk: HIGH.**

### S2.3 — Unlink + test
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

## Sprint 2 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.

```
1. As a seller, open https://miyagisanchez.com/shop/manage/settings → "Notificaciones".
   → The Telegram column now shows a "Conecta Telegram" button (no longer just a hint).
2. (Telegram — owed to Daniel) Tap "Conecta Telegram".
   → Telegram opens to the bot with a /start link; sending it shows a "¡Conectado!" reply.
3. Return to settings and reload.
   → The Telegram column shows "Conectado ✓" and its toggles are now interactive.
4. Turn ON "Pedidos → Telegram". Click "Enviar prueba".
   → A test message arrives in your Telegram within ~2s.
5. (money/auth — owed to Daniel) Receive a new order.
   → The new-order notification arrives on Telegram (and on any other enabled channel).
6. Click "Desconectar", then trigger another event.
   → No more Telegram messages arrive.

If any step fails, note the step number + what you saw.
```
Steps 2–6 are the **Telegram / money / auth path** (real seller session + real Telegram account) — owed to Daniel.
