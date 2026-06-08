# Sprint 2 — Buyer Telegram channel (linking + delivery + polish)

> Epic: [Buyer Telegram channel + Buyer preference center](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: ✅ SHIPPED to `main` 2026-06-07 — [PR #47](https://github.com/danybgoode/miyagisanchezcommerce/pull/47),
> merge `60281f1`.** Gate green (tsc + build + Playwright `api`) + CI green; self-reviewed clean (Daniel
> green-light, HIGH). Goal met: a signed-in buyer links Telegram and receives their chosen event-groups in
> real time (Telegram + Push), with per-audience unlink + test. Built on `feat/buyer-notifications-s2` off
> `main` (S1 merged, `7fa9c4e`), reusing #5's `/start` linking + `tgSend`. **Live Telegram/auth smoke owed
> to Daniel** (steps 3–8 below). Self-review noted one minor fast-follow: on a per-audience unlink that
> keeps the shared row, the UI optimistically shows disconnected but a reload reflects the still-linked
> chat — wire the returned `{ rowDeleted }` into the UI (S3 polish); delivery gating is correct meanwhile.
>
> **Scope landed (vs. plan), confirmed with Daniel — channels-only, OFF the money-path:**
> - **Telegram + Push both go live** for Envíos / Ofertas / Devoluciones. Email + Push toggle freely;
>   Telegram toggles activate once a chat is linked. The existing (ungated) offer push is **folded into
>   the seam** so it's now gated by `buyer.ofertas`.
> - **Compras stays email-only** (its row's Push/Telegram show "pronto") — order/payment-confirmed fire
>   from the live payment webhooks → **deferred to S3** with the Medusa-order gating fix.
> - **Buyer-pref gating still applies only where the buyer's Clerk id is resolvable** (offers + legacy
>   orders). **Medusa orders fall through to email** (no Telegram/Push) until the S3 backend fix — same
>   limitation as S1, no regression (guest fall-through).
> - **Per-audience unlink:** disconnecting from the buyer center stops the buyer's Telegram and removes the
>   shared `telegram_links` row **only when the seller side doesn't still use it** (derived from prefs, no
>   migration); the seller unlink is hardened symmetrically.

## Pre-req gate
Sprint 1 merged (the buyer seam + prefs + grid). #5's Telegram channel (the `/start` webhook + `tgSend`)
must be on `main`. This sprint **reuses** that linking flow for the buyer audience — it does not build a
new bot or a new webhook.

## Stories

### B2.1 — Buyer links Telegram (reuse #5's deep-link + webhook) ✅ `b35670b`
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

### B2.2 — Send buyer notifications to Telegram (+ Push) ✅ `dcbf94d`
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

### B2.3 — Unlink + test + grid go-live (dual-audience safe) ✅ `80a0145`
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

## Sprint QA — what shipped
- **Deterministic gate — GREEN before merge:** `tsc --noEmit` clean · `next build` passed (new routes
  `/api/account/telegram/link` + `/api/account/telegram/test` compiled) · Playwright `api` green.
- **New specs:**
  - `e2e/buyer-messages.spec.ts` — pure copy-completeness: every wired buyer event builds non-empty
    push + Telegram, partial-vs-full refund copy differs, the Telegram body HTML-escapes the listing title.
  - `audienceTelegramInUse` cases in `e2e/buyer-notification-prefs.spec.ts` — the per-audience keep-vs-delete
    unlink decision (seller-only / buyer-only / enabled-only). The linked/unlinked/group-off Telegram
    resolution is already covered by `buyerTelegramTarget` (S1).
  - `e2e/buyer-telegram-api.spec.ts` — the buyer Telegram link (GET/POST/DELETE) + test endpoints reject
    anonymous (401); runs live vs the SSO-gated preview.
- **Live smoke (owed to Daniel — Telegram/auth):** the real `/start` link, a delivered buyer Telegram
  message, and the dual-audience unlink with a real seller link need a real Telegram account. The pure
  unlink decision + copy + auth gates are covered above.
- **Deploy:** frontend-only + Supabase reads — **NO migration** (per-audience unlink derives from existing
  prefs; reuses `telegram_links`). Bot webhook already set (#5 ops). **No money-path** (webhooks untouched).
  Announce shared-surface touches: `app/api/telegram/webhook` copy, `app/api/sell/telegram/link` DELETE
  hardening, `lib/notifications/{dispatch,preferences}.ts`, the buyer center component.

## Sprint 2 — Smoke walkthrough
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com`
after merge. Steps 1–2 are auth-only (anyone signed in); steps 3–8 are the **Telegram / money / auth path**
(real buyer session + a real Telegram account) — **owed to Daniel**.

```
1. As a signed-in buyer, open https://miyagisanchez.com/account/notificaciones (Mi cuenta → "Notificaciones").
   → The grid's PUSH column is now interactive for Envíos/Ofertas/Devoluciones (toggles + persist on reload).
     Below the grid is a "Telegram" section with a "Conecta Telegram" button.
2. Look at the Telegram column and the Compras row.
   → Telegram cells read "Conecta para activar" (disabled until linked). Compras × Email = "Siempre";
     Compras × Push and × Telegram read "pronto" (those arrive in Sprint 3).
3. (owed to Daniel) Click "Conecta Telegram".
   → Telegram opens to the bot with a /start link; sending it shows a "¡Conectado!" reply.
4. Return to the page (it refetches on focus).
   → The Telegram section shows "Conectado ✓" with "Enviar prueba" + "Desconectar"; the grid's Telegram
     toggles (Envíos/Ofertas/Devoluciones) are now interactive.
5. Turn ON "Envíos → Telegram", then click "Enviar prueba".
   → A test message arrives in your Telegram within ~2s.
6. (money/auth — owed to Daniel) On a LEGACY order, have the seller mark it shipped.
   → The "Tu pedido va en camino" notification arrives on Telegram (and on Push if enabled).
     NOTE: for Medusa orders (order_*) this won't fire on Telegram/Push yet — email only (S3 backend fix).
7. (dual-audience — owed to Daniel, only if you're also a seller with Telegram on) Click "Desconectar" here.
   → Your BUYER Telegram stops, but your SELLER Telegram keeps delivering (shared chat row preserved).
8. (owed to Daniel) If you are NOT also a seller, click "Desconectar".
   → The chat fully disconnects; triggering another buyer event sends no Telegram.

If any step fails, note the step number + what you saw.
```
