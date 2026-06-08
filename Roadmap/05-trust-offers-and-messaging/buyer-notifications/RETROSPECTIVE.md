# Retrospective — Buyer Telegram channel + Buyer preference center (#5b)

**Shipped:** 2-sprint epic, both to `main` 2026-06-07 — S1 [PR #46](https://github.com/danybgoode/miyagisanchezcommerce/pull/46) `7fa9c4e`, S2 [PR #47](https://github.com/danybgoode/miyagisanchezcommerce/pull/47) `60281f1`. Risk: HIGH (Daniel merged each). Frontend-only, **zero migrations**.

## What shipped
- **S1 — buyer preference center (email-gated).** A sibling `dispatchToBuyer(recipient, event)` over the
  *same* pure resolver as #5, with a buyer namespace (`buyer.compras|envios|ofertas|devoluciones`) stored as
  audience-namespaced `event_group` values in #5's existing `notification_preferences` table — so a
  buyer+seller person keeps two independent grids with no new column. `/account/notificaciones` reuses a
  lifted shared grid component. The **purchase receipt (Compras × Email) is forced-on in the resolver**, and
  the **guest fall-through** (no `buyer_clerk_user_id` → today's transactional email, no prefs/push/TG) keeps
  the checkout path byte-for-byte unchanged. In-scope buyer emails (Envíos/Ofertas/Devoluciones) routed
  through the seam, guest-safe.
- **S2 — Telegram + Push channels.** Buyers link Telegram via `/api/account/telegram/{link,test}` reusing
  #5's clerk-scoped token mint + the shared `/start` webhook (its copy made audience-neutral); the
  `dispatchToBuyer` Telegram branch + a centralized `lib/notifications/buyer-messages.ts` (es-MX push +
  Telegram copy) light up Push + Telegram for the gateable groups. **Per-audience unlink** (a pure
  `audienceTelegramInUse` derived from prefs) deletes the one shared `telegram_links` row only when no
  audience still uses it — both buyer and seller unlink hardened symmetrically.

## Went well
- **Re-aiming an audience-agnostic seam at a second audience was cheap and safe.** #5's resolver/dispatch/
  tables/webhook were built per-person, not per-role, so most of S1/S2 was *projection*, not new machinery:
  a buyer namespace + a `dispatchToBuyer` sibling + a lifted grid. The #5 `/start` webhook needed **zero**
  logic change — only a copy tweak — because it already keyed `telegram_links` by `clerk_user_id`.
- **Pure, next-free helpers gave real coverage for free.** `resolveBuyerPrefs` (forced-on receipt),
  `audienceTelegramInUse` (unlink safety), and `buyer-messages` (copy completeness) are all unit-tested by
  the Playwright `api` runner with no auth/network. The deterministic gate (tsc + build + api) + CI stayed
  green every sprint.
- **The guest fall-through made a HIGH surface non-regressive.** Routing money-adjacent buyer emails through
  a new seam could only *add* (push/TG for signed-in buyers); the email path was preserved exactly whenever
  the buyer's Clerk id wasn't resolvable.
- **Scope discipline.** Two consequential forks were put to Daniel up front (keep S1/S2 off the money-path;
  per-audience unlink) — which kept both sprints frontend-only and migration-free.

## Learned / gotchas
- **The recipient's id has to be resolvable from the *data*, and here it often isn't for Medusa orders.**
  Seller-triggered routes (ship/deliver/return) notify the *buyer*, but the backend `normalizeMedusaOrder`
  returns `buyer_clerk_user_id: null` and `lib/order-mirror.ts` doesn't persist it (and keys the Medusa id
  in `metadata`, not the row `id`). So buyer pref gating (email/push/Telegram) only takes effect for
  **offers + legacy orders**; Medusa orders fall through to email. No regression, but the headline "turn off
  shipped emails" doesn't bite on current orders until a backend fix. **Read where the recipient id actually
  lives before assuming a seam can gate.**
- **CTRL-flow narrowing doesn't survive into a closure.** Wrapping `sendX({... carrier: body.carrier})` in
  `to => sendX(...)` re-widened `body.carrier` (narrowed by an earlier `if (!body.carrier) return`) back to
  `string | undefined`. Capture the narrowed value in a `const` before the closure.
- **"main moves under you" is the default, not the exception.** S1's first CI run went red on a *sibling*
  spec (`seller-acquisition-seo`) because `main` had advanced (PR #45 added `/vende/*/opengraph-image`) and
  the preview predated it. Merging `main` fixed it — don't debug your own diff (LEARNINGS confirmed again).
- **Stale `.git/*.lock` in the shared root repo.** Hit a 1-hour-old 0-byte `index.lock`/`HEAD.lock` from a
  crashed process; safe to remove when no git op is running. Commit docs by **pathspec** so a sibling agent's
  staged file isn't captured.
- **Loose "S3" labeling created a phantom sprint.** Calling the deferred work "S3" in wrap-ups implied a
  documented sprint that never existed (this was always a 2-sprint epic). Name deferred scope as *deferred /
  follow-up*, not as the next sprint number, unless it's actually scoped + scaffolded.

## Gaps / owed
- **Live smokes owed to Daniel** (agent can't): authed email-stops-on-toggle, guest parity, real Telegram
  `/start` + delivered message, dual-audience unlink. Walkthroughs in `sprint-1.md` / `sprint-2.md`.
- **Deferred (follow-up idea):** Compras via the Stripe/MP payment webhooks; the Medusa-order
  buyer-Clerk-id gating fix; the unlink `{ rowDeleted }` UI polish (the API already returns it). See
  `00-ideas/seeds/buyer-notifications-money-path.md`.
