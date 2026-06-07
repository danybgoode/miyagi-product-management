# Sprint 2 — Buyer Telegram channel (linking + delivery + polish)

> Epic: [Buyer Telegram channel + Buyer preference center](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned.** Goal: a signed-in buyer can link Telegram and actually receive their chosen
> event-groups there in real time, with unlink + test and a finished bilingual experience. Builds on
> Sprint 1's buyer seam + grid, **reusing #5's `/start` linking + `tgSend`**.

## Pre-req gate
Sprint 1 merged (the buyer seam + prefs + grid). #5's Telegram channel (the `/start` webhook + `tgSend`)
must be on `main`. This sprint **reuses** that linking flow for the buyer audience — it does not build a
new bot or a new webhook.

## Stories

### B2.1 — Buyer links Telegram (reuse #5's deep-link + webhook)
**As** a buyer, **I want** to connect my Telegram in one tap, **so that** the platform can message me
there.
- **Reuse #5's** `t.me/<bot>?start=<token>` deep-link + the `/start <token>` webhook; bind the
  single-use token to the **buyer's** `clerk_user_id` and write/confirm `telegram_links`. **If a row
  already exists** (the person linked Telegram as a seller), **reuse it** — reflect "Conectado ✓" with
  no second link.
- **Security:** the webhook already validates the bot secret + single-use/short-TTL token + rate-limit
  (from #5); confirm the buyer-initiated token path inherits all of it.
- **Acceptance:** buyer taps the link → sends `/start` → `account/notificaciones` flips to "Conectado
  ✓"; an already-(seller-)linked person shows connected with no second link.
- **Risk: HIGH** (identity binding on the shared inbound webhook).
- **Research at build (cite):** re-confirm Telegram Bot API `/setWebhook` + deep-link `?start=` payload
  rules (≤64 chars) against live docs — #5 established this; verify it still holds.

### B2.2 — Send buyer notifications to Telegram
**As** the system, **I want** to deliver a buyer's enabled groups to their chat, **so that** the buyer
dispatcher can reach Telegram.
- Wire the Telegram branch of `dispatchToBuyer` via **`tgSend(chatId, text)`** (reused from #5): look up
  the buyer's link + send when the buyer has that event-group enabled on Telegram (incl. **Compras as an
  opt-in extra** — Telegram can carry the receipt even though the email is the mandatory one). Unlinked
  buyer or group-off = silent no-op (no error on the request path).
- **Acceptance:** a linked buyer with "Envíos → Telegram" on gets a Telegram ping on shipped; a linked
  buyer with "Compras → Telegram" on also gets the order/payment ping; an unlinked buyer is a silent
  no-op.
- **Risk: HIGH.**

### B2.3 — Unlink + test + polish/bilingual (dual-audience safe)
**As** a buyer, **I want** to disconnect Telegram, send myself a test, and have it read cleanly in both
languages, **so that** I trust what's wired and can revoke it.
- **Reuse** "Desconectar" + "Enviar prueba" (fires a test on **each linked channel**). **Dual-audience
  safety:** unlink = stop the **buyer's** Telegram prefs; only delete the shared `telegram_links` row
  when **no audience still uses it** (define + spec this). Finalize the buyer taxonomy; es-MX (+ en) for
  all buyer settings copy + any buyer Telegram bodies; "no channel linked" empty states; a one-screen
  summary of what each group sends.
- **Acceptance:** unlink stops buyer Telegram immediately (and does **not** break the person's seller
  Telegram if they have one); test delivers only on linked channels; no untranslated string; settings
  reads cleanly with zero channels linked.
- **Risk: HIGH** (settings on the notification path + shared-row semantics).

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `next build` + Playwright `api`.
- **New specs:** pure-logic spec on the buyer dispatcher's Telegram branch (linked / unlinked / group-off
  resolution; Compras-as-opt-in-extra); api spec on the buyer token→`chat_id` binding + the
  already-linked reuse path + unlink **dual-audience row safety** (unlink doesn't clear a row another
  audience uses).
- **Live smoke (owed to Daniel):** the real `/start` link + a real delivered buyer Telegram message need
  a real Telegram account — **owed to Daniel**. The token-binding + dual-audience logic is covered by the
  api spec without Telegram.
- **Deploy:** frontend-only + Supabase reads. The bot webhook is already set (#5 ops step). Announce any
  `lib/telegram.ts` / `lib/notifications/` touch (shared surface).

## Sprint 2 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.

```
1. As a signed-in buyer, open https://miyagisanchez.com/account/notificaciones → "Notificaciones".
   → The Telegram column now shows a "Conecta Telegram" button (no longer just a hint).
2. (Telegram — owed to Daniel) Tap "Conecta Telegram".
   → Telegram opens to the bot with a /start link; sending it shows a "¡Conectado!" reply.
3. Return to the page and reload.
   → The Telegram column shows "Conectado ✓" and its toggles are now interactive.
4. Turn ON "Envíos → Telegram". Click "Enviar prueba".
   → A test message arrives in your Telegram within ~2s.
5. (money/auth — owed to Daniel) Have that buyer's order get marked shipped.
   → The "pedido enviado" notification arrives on Telegram (and on any other enabled channel).
6. (dual-audience — owed to Daniel, only if you're also a seller) Confirm your SELLER Telegram still works.
   → Clicking "Desconectar" here stops BUYER Telegram but your seller Telegram keeps delivering.
7. Click "Desconectar", then trigger another buyer event.
   → No more buyer Telegram messages arrive.

If any step fails, note the step number + what you saw.
```
Steps 2–7 are the **Telegram / money / auth path** (real buyer session + real Telegram account) — owed to Daniel.
