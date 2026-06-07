# Sprint 1 — Preference model + dispatch seam + settings UI (email/push; Telegram stub)

> Epic: [Granular Multi-Channel Notifications](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned.** Goal: granular control ships **before** Telegram delivery does — a seller can
> turn email/push categories on/off and the dispatch seam respects it, with the data model ready for
> the Telegram channel that Sprint 2 lights up. **Can build in parallel with #3b.**

## Stories

### S1.1 — One notification-dispatch seam
**As** the system, **I want** a single `dispatchToSeller(clerkUserId, event)` seam that resolves the
seller's preferences and fans out to enabled channels, **so that** every in-scope event goes through one
place that respects preferences instead of calling email directly.
- `lib/notifications/dispatch.ts` (fan-out, fire-and-forget — **never throws on the request path**, same contract as `tgNotify`/`notify`) + `lib/notifications/preferences.ts` (pure: event → event-group map, channel resolution, `DEFAULT_PREFS`).
- Reuse `lib/email.ts` senders + `lib/notify.ts` push; Telegram branch is a stub no-op until Sprint 2.
- **Acceptance:** a unit call with prefs `{email:on, push:off}` invokes only the email sender; an absent preference falls back to the documented default.
- **Risk: HIGH** (will carry money events).

### S1.2 — Per-user preference + Telegram-link store
**As** the system, **I want** preferences and the (future) Telegram link persisted per user, **so that**
a seller's choices survive across sessions and the dispatcher can resolve them.
- Supabase migration: `notification_preferences` (`clerk_user_id`, `channel`, `event_group`, `enabled`) + `telegram_links` (`clerk_user_id`, `chat_id`, `linked_at`), both with RLS, keyed by `clerk_user_id` (mirrors `push_subscriptions`).
- **Default-on read:** an absent row resolves to `DEFAULT_PREFS` — **no backfill** for the 164 existing sellers.
- **Acceptance:** a seller with zero rows gets the documented defaults; a written toggle persists across reload.
- **Risk: HIGH** (new tables; additive).

### S1.3 — Seller preference center in settings
**As** a seller, **I want** a clear grid of channels × event-groups in my settings, **so that** I control
what reaches me where, in one glance.
- Grid at `app/shop/manage/settings`: rows = event-groups (Pedidos, Ofertas, Pagos, Devoluciones), columns = channels (Email, Push, Telegram). Telegram column shown as "Conecta para activar" (links to the Sprint-2 flow). es-MX strings (+ en dictionary).
- **Acceptance:** toggling "Ofertas → Email" off stops offer emails to that seller; toggle state survives reload.
- **Risk: HIGH** (gates real email dispatch).

### S1.4 — Route in-scope already-durable events through the seam
**As** the platform, **I want** the v1 already-durable seller events to flow through `dispatchToSeller`
instead of the direct email call, **so that** preferences take effect with **no regression** to the
default experience.
- Route **new order → seller** and **offer made → seller** through the seam, **default-on**. The other ~14 `@/lib/email` callers stay untouched (migrate later).
- **Acceptance:** with default prefs, a new order still emails the seller exactly as today (parity); with "Pedidos → Email" off, it doesn't.
- **Risk: HIGH** (touches order/offer dispatch).

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `next build` + Playwright `api`.
- **New specs:** pure-logic spec on `lib/notifications/preferences.ts` (event→group map, channel resolution, default fallback — free coverage, no auth/network); api spec asserting default-on read + persisted toggle, and event-still-emails-on-defaults parity (S1.4).
- **Browser smoke (owed to Daniel):** authed seller toggles a group off → that email stops. Some rendered-grid + persisted-toggle assertions can run via a `*.browser.spec.ts` against the preview; the authed "email actually stops" check is **owed to Daniel**.
- **Deploy order:** Supabase migration first (CLI); frontend reads degrade gracefully if a table is briefly absent (`?? DEFAULT_PREFS`).

## Sprint 1 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.

```
1. As a seller, open https://miyagisanchez.com/shop/manage/settings
   → You see a "Notificaciones" section with a grid: rows Pedidos/Ofertas/Pagos/Devoluciones, columns Email/Push/Telegram.
2. The Telegram column reads "Conecta para activar" (not yet enabled — that's Sprint 2).
   → Email + Push toggles are interactive; Telegram is disabled with the connect hint.
3. Turn OFF "Ofertas → Email". Reload the page.
   → The toggle is STILL off after reload.   ← preferences persist
4. (money/auth — owed to Daniel) Have a buyer make an offer on one of your listings.
   → You do NOT receive an offer email (because you turned it off); turning it back on restores it.
5. (money/auth — owed to Daniel) With default prefs, receive a new order.
   → You still get the new-order email exactly as before (no regression).

If any step fails, note the step number + what you saw.
```
Steps 4–5 are the **money/auth path** (real seller/buyer sessions) — owed to Daniel.
