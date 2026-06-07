# Scope — Buyer Telegram channel + Buyer preference center (BUILD-ORDER #5b)

> **Status: SIGNED OFF (Daniel, 2026-06-06).** Gate passed. Scaffolded under
> `05-trust-offers-and-messaging/buyer-notifications/` (epic README + sprint-1..2); kickoff prompts
> emitted; #5b ticked in BUILD-ORDER. **Sign-off note:** Daniel folded **Devoluciones/refunds** into
> v1 as a 4th buyer event-group (was OUT in the draft). **Next action: Claude Code build — Sprint 1
> first, after #5 has merged** (#5 is the hard dependency). Groomed 2026-06-06 in a fresh Cowork
> session off BUILD-ORDER #5b, on top of the
> signed-off #5 (`2. readyforscope/granular-notifications.md` + the scaffolded epic
> `05-trust-offers-and-messaging/granular-notifications/`). Pinned to the same baseline as #5
> (frontend `origin/main@ed447bd` / backend `origin/main@0980253`).
> **Class: Feature/epic — a pure EXTENSION of #5 to the buyer audience.**
> **Stage-2.5 bucket: genuinely-new-but-reuse-heavy** — and *much* lighter than #5: #5 builds the
> machinery (seam, resolver, two tables, `tgSend`, `/start` linking, settings grid); #5b mostly
> **points that machinery at buyers**. **Risk: HIGH — Daniel merges** (rides buyer order/payment/ship
> transactional dispatch). **Hard dependency: #5** (the seam + tables + `tgSend` + linking webhook +
> grid must exist). **No hard #3b dependency** (the buyer-side money events are already-firing emails —
> see below).

## The ask (mirrored back)
*You want signed-in buyers to get the purchase events they care about — order confirmed, payment
confirmed, shipped, delivered, responses to their offers, and return/refund updates — on the channels
they choose, including real-time **Telegram**, with the same granular preference center #5 gave
sellers. Right?*

## Why / the job
**As** a signed-in buyer, **I want** to receive my purchase milestones on the channels I choose
(real-time Telegram + the email that already fires) and switch off the chatty ones, **so that** I know
where my order is without inbox noise — and never miss "tu pago fue confirmado" or "tu pedido va en
camino" because it was buried. This is the **buyer projection** of the exact same dispatch + preference
layer #5 built for sellers: same seam, same resolver, same tables, same `tgSend`, same linking webhook,
same grid component — re-aimed at the buyer audience and surfaced in the buyer's account area.

## What the code read confirmed (current `main`, same baseline as #5)
1. **Buyers can be guests.** Orders/offers carry both `buyer_email` and a **nullable**
   `buyer_clerk_user_id` (`?? null` for guests — e.g. `subscriptions/spei/route.ts:100`,
   `conversations/start/route.ts`). The whole #5 preference/Telegram/push stack is keyed by
   `clerk_user_id` (`push_subscriptions`, and #5's `notification_preferences` + `telegram_links`).
   → **A preference center + Telegram can only attach to a signed-in (Clerk) buyer.** Guests have no
   durable identity to hang prefs on. *(Daniel's call below: signed-in buyers only.)*
2. **Every buyer-facing email sender already exists** in `lib/email.ts`: `sendOrderConfirmedToBuyer`
   (608), `sendOrderShipped` (691), `sendOrderDelivered` (725), `sendOfferAccepted/Declined/Countered`
   (341/372/390), plus `sendManualOrderToBuyer` / `sendReturn*ToBuyer`. They address `ctx.buyerEmail`
   (the order email) and **always fire** — no preference layer (same gap #5 named for sellers).
3. **Their dispatch sites are known**: `orders/route.ts` (confirmed), `orders/finalize-manual/route.ts`
   (manual payment confirmed), `orders/[id]/ship[-manual]/route.ts` (shipped),
   `orders/[id]/confirm-delivery/route.ts` (delivered), `offers/[id]/buyer-respond/route.ts` +
   `offers/route.ts` (offer responses to the buyer) — the exact seams to route through `dispatchToBuyer`.
4. **The buyer account area exists and is already Clerk-gated** — `app/account/{orders,favorites,
   referrals,subscriptions,print-ads}` all use `currentUser()`. **There is no buyer settings page yet**
   (sellers reused `app/shop/manage/settings`; buyers have no equivalent) → #5b adds one small page.
5. **Buyer money events are already-firing emails, not new durable events.** "Order confirmed" fires on
   placement; "payment confirmed" already emails the buyer from `finalize-manual`. So unlike #5 Sprint 3,
   #5b is **not hard-blocked by #3b** — it routes existing buyer emails through the seam. (It should
   still adopt #3b's `payment_confirmed` state vocabulary *if* #3b has landed by build time — a soft
   alignment, not a gate.)

## Scope decisions (Daniel, 2026-06-06)
1. **Audience reach — signed-in buyers only.** Prefs + Telegram are `clerk_user_id`-keyed, exactly like
   #5 and `app/account/*`. **Guests keep today's transactional emails to their order email, unchanged**
   (no prefs, no opt-out beyond a future unsubscribe link — out of scope). Smallest blast radius; reuses
   the #5 identity model verbatim.
2. **What's toggleable — transactional stays mandatory.** **Order-confirmed + payment-confirmed email
   always sends** (trust/receipt — a buyer must always get proof of purchase + payment). Buyers can
   toggle the chattier groups (Envíos, Ofertas) on any channel, and may **add Telegram/push as extra
   channels even for the mandatory Compras group** (opt-in *more*, never opt-out of the email receipt).
3. **Event-groups (v1) — Compras · Envíos · Ofertas · Devoluciones.** `Compras` = order confirmed +
   payment confirmed (email mandatory; push/Telegram opt-in). `Envíos` = shipped + delivered
   (toggleable, all channels). `Ofertas` = offer accepted / countered / declined (toggleable, all
   channels). `Devoluciones` = return requested-confirmed / accepted / declined (toggleable, all
   channels). *(Folded in at sign-off, 2026-06-06 — Daniel; the buyer return senders already exist, so
   it's the same wiring as Envíos/Ofertas.)*
4. **Settings home — new `app/account/notificaciones`.** A new page in the existing Clerk-gated
   `app/account` area (next to orders/favorites/referrals), **reusing the #5 settings-grid component**.
   Add a nav entry from the account home.

## Medusa-first / reuse reframe — What already exists (reuse, don't rebuild)
Per LEARNINGS ("read the model first — it re-scopes the epic smaller"). #5b adds **almost no new
primitives** — it parameterizes #5's by audience. Buyer prefs + Telegram link are the same per-user,
non-commerce data → **Supabase, keyed by `clerk_user_id`** (no Medusa change).
- **The dispatch seam exists (#5)** — `lib/notifications/dispatch.ts`. #5b adds a sibling
  **`dispatchToBuyer(clerkUserId, event)`** that reuses the **same pure resolver**
  `lib/notifications/preferences.ts` (just a **buyer** event→group map + a **buyer** `DEFAULT_PREFS`
  section) and the same fire-and-forget contract. *Do not fork the resolver — extend its tables.*
- **The two Supabase tables exist (#5)** — `notification_preferences(clerk_user_id, channel,
  event_group, enabled)` + `telegram_links(clerk_user_id, chat_id, linked_at)`, both already
  audience-agnostic (keyed by person, not role). **Reuse both as-is.** ⚠️ The one real design note:
  **namespace buyer event-group keys** (e.g. `buyer.compras` / `buyer.envios` / `buyer.ofertas` vs the
  seller's `pedidos/ofertas/…`) — or add an `audience` discriminator — so a person who is **both buyer
  and seller** gets independent prefs and "Ofertas" doesn't conflate the two sides. No new table.
- **`tgSend(chatId, text)` exists (#5)** — reuse verbatim for buyer Telegram delivery.
- **The `/start` deep-link + linking webhook exists (#5)** — a buyer links **the same way**; it binds
  the token to the buyer's `clerk_user_id`. **If the person already linked Telegram as a seller, the
  `telegram_links` row is already there — the buyer side reuses it, no re-link** (one chat per person).
- **Push exists** — `lib/notify.ts` `notify(userId, event)` over `push_subscriptions` keyed by
  `clerk_user_id` — already audience-agnostic; the buyer branch reuses it.
- **Every buyer email sender exists** — `lib/email.ts` `sendOrderConfirmedToBuyer`, `sendOrderShipped`,
  `sendOrderDelivered`, `sendOfferAccepted/Declined/Countered`, and the returns
  `sendReturnRequestConfirmedToBuyer` (789) / `sendReturnAcceptedToBuyer` (814) /
  `sendReturnDeclinedToBuyer` (847). The seam *calls* them behind the gate; no new templates. Recipient
  is `ctx.buyerEmail` (already resolved at each dispatch site). Return dispatch sites:
  `orders/[id]/return-request/route.ts` + `orders/[id]/return-request/[requestId]/route.ts`.
- **The settings-grid component exists (#5 S1.3)** — reuse it for the buyer page; only the rows
  (Compras/Envíos/Ofertas), the locked "siempre" cell (Compras×Email), and the host page differ.
- **The buyer account shell + Clerk gating exist** — `app/account/*` (`currentUser()`); #5b adds one
  page + a nav link, no new auth.

AGENTS five-rule check: Medusa owns commerce — untouched (prefs non-commerce → Supabase) ✅ · Supabase
reuses #5's two tables, no new table ✅ · Clerk untouched (identity via `clerk_user_id`; guests excluded
by design) ✅ · bilingual es-MX (+ en) for all new buyer copy + any buyer Telegram bodies ✅ · **Agent
surface:** MCP read/write of *buyer* notification prefs **deferred to OUT** (additive; note for the
agent epic, same as #5).

## UX heuristics this epic is held to
- **Quiet by default, loud on money** — Envíos/Ofertas default-on but toggleable; **Compras email is
  never toggleable** (you always get your receipt). Telegram/push are opt-*in* extras.
- **Never silence a receipt.** The grid renders Compras×Email as a locked "Siempre" cell with a short
  why ("recibos de compra y pago") — a buyer can't accidentally turn off proof of purchase.
- **One link, obvious state** — "Conecta Telegram" → deep-link → "Conectado ✓ / Desconectar", reusing
  #5's flow. If the person linked Telegram as a seller, the buyer page shows it already connected.
- **No silent drops** — guests and unlinked/unconfigured channels no-op gracefully (same contract as
  #5); the UI says what each channel can carry (Telegram = signed-in buyers only).
- **Reads in one glance** — the same small channels × event-groups grid as sellers (four rows:
  Compras/Envíos/Ofertas/Devoluciones), in the buyer's account, in es-MX.

## Proposed slices (skateboard → car) — 2 sprints, all HIGH-risk
> Reference end-state only; the building agent confirms the plan in plan mode. Each story names its QA.
> **#5 must have merged** (seam + tables + `tgSend` + linking webhook + grid component) before B-stories start.

**Sprint 1 — Buyer preference center + buyer dispatch (email/push; Telegram stub).**
*The skateboard: a signed-in buyer gets granular control over Envíos/Ofertas on email+push, with Compras
email mandatory — before Telegram delivery lights up.*
- **B1.1** *As the system, I want a `dispatchToBuyer(clerkUserId, event)` seam* — reuse
  `lib/notifications/preferences.ts` with a **buyer** event→group map
  (Compras/Envíos/Ofertas/Devoluciones) + **buyer** `DEFAULT_PREFS`; **Compras email is forced-on** (the
  gate can't disable it); fan out to enabled channels, fire-and-forget. Telegram branch = stub no-op
  until Sprint 2. **Acceptance:** a unit call with buyer prefs `{envios.email:off}` skips the shipped
  email but a `compras` order-confirmed email always sends; a `devoluciones` event respects its toggle.
  **QA:** pure-logic spec on the buyer resolver (event→group incl. Devoluciones, forced-on Compras
  email, channel resolution, default fallback) — no network. **Risk: HIGH** (carries money/transactional).
- **B1.2** *As the system, I want buyer prefs persisted in the existing tables* — **reuse #5's
  `notification_preferences` + `telegram_links`**; add **audience-namespaced** buyer event-group keys
  (or an `audience` column) so buyer/seller prefs for the same person don't collide. RLS already by
  `clerk_user_id`; **default-on read, no backfill.** **Acceptance:** a buyer with zero rows gets the
  documented buyer defaults; a written toggle persists across reload; a user who is also a seller keeps
  independent buyer/seller prefs. **QA:** api spec on default-on buyer read + persisted toggle +
  audience isolation. **Risk: HIGH** (shared tables; additive).
- **B1.3** *As a buyer, I can control notifications in my account* — new page
  `app/account/notificaciones` **reusing the #5 grid component**: rows
  Compras/Envíos/Ofertas/Devoluciones, columns Email/Push/Telegram; **Compras×Email = locked "Siempre"**;
  Telegram column shown "Conecta para activar" (Sprint 2). Add a nav link from `app/account`. es-MX
  (+ en). **Acceptance:** toggling "Envíos → Email" off stops shipped/delivered emails to that buyer;
  Compras×Email can't be toggled; state survives reload. **QA:** browser smoke (rendered grid + locked
  cell + persisted toggle), anonymous-friendly where possible; authed "email actually stops" **owed to
  Daniel**. **Risk: HIGH** (gates real buyer email).
- **B1.4** *As the platform, in-scope buyer events flow through the seam (guest-safe)* — route
  order-confirmed, payment-confirmed (finalize-manual), shipped, delivered, offer
  accepted/countered/declined, **and the return events** (return requested-confirmed / accepted /
  declined, from the `return-request` routes) through `dispatchToBuyer`, **default-on parity**.
  **Guard:** if the order has **no `buyer_clerk_user_id` (guest)**, the seam degrades to *exactly
  today* — send the transactional email to `buyer_email`, no prefs/push/Telegram. Buyer email
  call-sites outside the in-scope set stay untouched. **Acceptance:** signed-in buyer with default prefs
  gets every event's email exactly as today; a **guest** order still emails confirmation/shipped/return
  exactly as today; turning "Envíos → Email" off stops a signed-in buyer's shipped email; turning
  "Devoluciones → Email" off stops the return-update email. **QA:** api spec asserting parity for
  signed-in + guest, and suppression-on-toggle (incl. Devoluciones). **Risk: HIGH** (buyer
  order/payment/ship/return dispatch).

**Sprint 2 — Buyer Telegram channel (linking + delivery + polish).**
- **B2.1** *As a buyer, I can link Telegram* — **reuse #5's `/start` deep-link + webhook**, binding the
  token to the **buyer's** `clerk_user_id`; if a `telegram_links` row already exists (linked as a
  seller), reuse it and just reflect "Conectado ✓". **Acceptance:** buyer taps the link → `/start` →
  account page flips to "Conectado ✓"; an already-(seller-)linked person shows connected with no second
  link. **QA:** api spec on the buyer token→chat binding + the already-linked reuse path; live Telegram
  link smoke **owed to Daniel** (real TG account). **Risk: HIGH** (identity binding on the shared
  webhook). **Research at build:** re-confirm Telegram Bot API `/setWebhook` + `?start=` payload rules
  (≤64 chars) against live docs — though #5 already established this; verify it still holds.
- **B2.2** *As the system, I can send buyer notifications to Telegram* — wire the Telegram branch of
  `dispatchToBuyer` via **`tgSend`**: a linked buyer with a group enabled on Telegram receives it
  (incl. Compras as an opt-in extra); unlinked / group-off = silent no-op. **Acceptance:** a linked
  buyer with "Envíos → Telegram" on gets a Telegram ping on shipped; an unlinked buyer is a silent
  no-op. **QA:** pure-logic spec on the buyer dispatcher's Telegram branch (linked/unlinked/group-off);
  live delivery smoke **owed to Daniel**. **Risk: HIGH.**
- **B2.3** *As a buyer, I can unlink + test, and it's polished + bilingual* — reuse "Desconectar" +
  "Enviar prueba" (per linked channel); finalize the buyer taxonomy; es-MX (+ en) for all buyer
  settings copy + any buyer Telegram bodies; "no channel linked" empty states; a one-screen summary of
  what each group sends. **Note:** if the person is also a seller, "Desconectar" semantics on the shared
  `telegram_links` row must be intentional — **unlink = stop *buyer* Telegram prefs**, and only clear
  the shared row if no audience still uses it (define + spec this). **Acceptance:** unlink stops buyer
  Telegram; test delivers only on linked channels; no untranslated string; settings reads cleanly with
  zero channels linked. **QA:** api spec on unlink (incl. dual-audience row safety); browser smoke
  **owed to Daniel**. **Risk: HIGH** (settings on the notification path + shared-row semantics).

## In / Out of scope (v1)
**In:** a `dispatchToBuyer` seam reusing #5's pure resolver (buyer event→group map + buyer defaults,
Compras-email forced-on); **reuse of #5's two Supabase tables** with audience-namespaced buyer
event-groups (no new table); a **signed-in-buyer** preference center at `app/account/notificaciones`
reusing the #5 grid (Compras/Envíos/Ofertas/Devoluciones × Email/Push/Telegram, Compras×Email locked);
**buyer Telegram** via #5's `/start` linking + `tgSend` (incl. already-linked-as-seller reuse), unlink +
test; routing the in-scope buyer events (order/payment confirmed, shipped, delivered, offer responses,
return requested/accepted/declined) through the seam **with a guest fall-through to today's behavior**;
bilingual es-MX (+ en); one api/pure-logic spec per testable story.
**Out (later / other epics):** **guest** buyer prefs / email-keyed prefs / unsubscribe-token "manage"
links; **full per-event × per-channel matrix** (v1 is event-*group*); **WhatsApp / SMS**; **agent (MCP)
read/write of buyer prefs** (additive — note for the agent epic); **digest/quiet-hours**; migrating the
remaining buyer email call-sites beyond the in-scope set.

## Open risks / questions
- **Shared `telegram_links` row across audiences.** One person may be buyer *and* seller; the row is
  keyed by `clerk_user_id`. Linking once should serve both; **unlinking must not silently kill the other
  audience's Telegram.** Define: unlink toggles the audience's Telegram prefs; only delete the shared row
  when no audience is using it. Spec it (B2.3). *(The single real new wrinkle vs. #5.)*
- **Guest fall-through is the safety-critical path.** `dispatchToBuyer` must never drop a guest's
  order-confirmation/shipped email. If `buyer_clerk_user_id` is null → send the transactional email to
  `buyer_email` exactly as today, skip prefs/push/Telegram. Cover guest *and* signed-in parity in the
  B1.4 api spec.
- **Mandatory Compras email must be un-disableable end to end** — enforce forced-on in the **resolver**
  (single source of truth), not just by hiding the toggle in the UI, so agents/any future caller can't
  suppress a receipt.
- **Event-group key collision** for dual-audience users — resolved by audience-namespacing (B1.2);
  call it out so the seller rows #5 wrote aren't reinterpreted as buyer rows.
- **#5 is a hard dependency; #3b is not.** Build only after #5 merges (seam, tables, `tgSend`, webhook,
  grid). Buyer money events are already-firing emails, so no #3b gate — but **align `payment_confirmed`
  with #3b's state vocabulary if #3b has landed** by build time (soft).
- **Two repos, async deploy.** Like #5, dispatch + routing + settings are **frontend**
  (`apps/miyagisanchez`); any schema delta ships via the Supabase CLI. Confirm whether any in-scope
  buyer event fires from the **backend** (Cloud Run) — if so, merge backend-first / degrade gracefully
  (LEARNINGS). Default-on + guest fall-through keep the 99% path byte-for-byte unchanged in a deploy-lag
  window. Rebase latest `main`; **announce** the shared changes (the `notifications/` seam, the grid
  component, `app/account` nav) — shared surface breaks sibling PRs.
- **No backfill.** Absent buyer rows = documented buyer defaults; never write rows for existing buyers.

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance checks Daniel-runnable.
- [x] Class = Feature/epic; Stage-2.5 bucket = genuinely-new-but-reuse-heavy (and lighter than #5 — it
      re-aims #5's machinery at buyers).
- [x] v1 in/out boundary written; Daniel's 4 scope decisions captured (audience reach · what's
      toggleable · event-groups · settings home).
- [x] Medusa-first/reuse list produced (#5 seam + resolver · the two Supabase tables · `tgSend` ·
      `/start` webhook · push · every buyer email sender · the grid component · `app/account` shell).
- [x] Each story risk-tiered (all HIGH); QA stage named per story; live/browser smokes' owner (Daniel)
      identified; **#5 named as the hard dependency; #3b as a soft alignment only.**
- [x] **Daniel approved this scope doc (2026-06-06)** ← gate passed. Sign-off note: **Devoluciones
      folded into v1** as a 4th buyer event-group. Scaffolded
      `05-trust-offers-and-messaging/buyer-notifications/` (epic README + sprint-1..2) + committed
      `plan(buyer-notifications): scaffold epic + sprints` + 2 kickoff prompts emitted + #5b ticked in
      BUILD-ORDER.
