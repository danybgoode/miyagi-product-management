# Homepage Polish — Dirección B — Sprint 4: Signed-in modules

**Status:** 🏗️ built — **draft PR [#87](https://github.com/danybgoode/miyagisanchezcommerce/pull/87)**
(`feat/homepage-polish-b`). S4.1 ✅ · S4.2 ✅ · S4.3 ✅ · **S4.4 ✅ already live (re-scoped — no
migration).** · **Risk: LOW** (no HIGH story → no Daniel-merge gate). Authed browser smokes owed to Daniel.

> Recognise the returning user: a continuation rail, an actionable offer alert, and a seller snapshot — the
> ribbon is gone. The price-drop badge is deferred (the column already exists, see S4.4).
>
> **S4.4 re-scope (verified 2026-06-12):** `price_cents_at_save` was already shipped in the original
> `20260525000000_favorites_conversations.sql` — the column exists live on `marketplace_favorites`
> (`integer`, nullable), `POST /api/favorites` already writes it (`price_cents_at_save:
> listing?.price_cents ?? null`), and all existing rows are populated (0 nulls). So there was **no
> migration to write and nothing for Daniel to merge** — S4.4 collapsed to verify-and-document and the
> sprint shipped frontend-only, LOW-risk.

## Stories

### Story 4.1 — "Retoma donde te quedaste" rail (no badge)
**As a** signed-in buyer, **I want** my recent favorites surfaced first, **so that** I can pick up where I
left off.
**Acceptance:** newest 3 from `marketplace_favorites` joined to listings via Medusa product ids. Card: square
image, **price 13.5px semibold accent**, one-line title, note line. Header link "Favoritos →" → `/account`
favorites tab. **No `↓ Bajó $X` price-drop badge in v1** (deferred until S4.4 data exists). Renders as the
first content module when signed-in; degrade gracefully if empty (`?? []`).
**Risk:** LOW.

### Story 4.2 — Pending-offer alert (conditional)
**As a** signed-in buyer (or seller), **I want** a reminder of an offer that still needs action, **so that** I
don't lose a live negotiation.
**Acceptance:** source `marketplace_offers` where user is buyer and status = pending (and seller-side pending
if the user has a shop). Card: `iconoir-hand-cash` in `--promo-soft` circle · bold `Tu oferta de $X sigue
pendiente` · muted listing title + shop · CTA `Ver` → offer thread. **Render nothing when nothing is
actionable. Max 2 cards.**
**Risk:** LOW.

### Story 4.3 — Seller snapshot (when the user has a shop)
**As a** signed-in seller, **I want** a quick pulse of my shop, **so that** the homepage is useful to me too.
**Acceptance:** when the user has a shop, swap the seller-recruit block → snapshot: `Tu tienda esta semana` ·
`N visitas · N ofertas nuevas` · `Publicar otro` → `/sell` (reuse `getShop`). No shop → keep the minimal
recruit card (`¿Vendes algo?` → `/vende`).
**Risk:** LOW.

### Story 4.4 — `price_cents_at_save` column + backfill (data only) — ✅ ALREADY LIVE (re-scoped)
**As a** future buyer, **I want** the price at the moment I favorited stored, **so that** a price-drop badge
can light up later without a backfill scramble.
**Acceptance (already met before this sprint):** `price_cents_at_save` exists on `marketplace_favorites`
and is populated on every favorite write. **No UI/badge change** — data only; the rail (S4.1) works whether
or not the column has values.
**Status:** ✅ **shipped in the original `20260525000000_favorites_conversations.sql`.** Verified live
2026-06-12: column present (`integer`, nullable); `POST /api/favorites` writes
`price_cents_at_save: listing?.price_cents ?? null`; all existing rows populated (3/3, 0 nulls). The
account favorites page already renders a price-drop badge from it.
**Risk:** ~~HIGH (DB migration)~~ → **none.** No migration authored, nothing for Daniel to merge.

## Sprint QA
- **api spec(s):** ✅ `e2e/home-offer-alert.spec.ts` — pure-logic spec on the offer-alert "is-actionable /
  max 2 / soonest-first" derivation + the seller-vs-buyer copy branch + deep-link fallback (9 tests, green).
  S4.4 column verified live (exists; `POST /api/favorites` writes it; rows populated).
- **browser smoke owed:** **yes, to Daniel** (authed) — retoma rail renders first when signed-in; offer alert
  appears only with a real pending offer; seller snapshot shows for a shop account. These need a signed-in
  session, so they're owed to Daniel (the authed `MS_TEST_*` browser smoke can cover the rail/alert render
  once fixtures exist).
- **deterministic gate:** `tsc --noEmit` ✅ + `next build` ✅ + Playwright `api` pure specs ✅ locally; the
  network-backed `api` suite runs in CI vs the branch preview (the authoritative pre-merge gate).

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (signed-in — **owed to Daniel**, holds the sessions)

1. Sign in as a buyer with ≥1 favorite, open https://miyagisanchez.com
   → "Retoma donde te quedaste" is the first content module; the value-prop ribbon is **gone**. *(auth path — Daniel)*
2. As a buyer with a pending offer, reload the homepage.
   → A "Tu oferta de $X sigue pendiente" alert (max 2) with a `Ver` link to the offer thread. With no pending offer, no alert renders. *(auth path — Daniel)*
3. Sign in as a seller account with a shop.
   → The seller block is the "Tu tienda esta semana" snapshot (visitas · ofertas), not the recruit card. *(auth path — Daniel)*
4. (DB, S4.4 — already live) After favoriting a new item, check `marketplace_favorites`.
   → The new row has a non-null `price_cents_at_save`. *(No migration this sprint — the column + write
   already shipped; verified live 2026-06-12: 3/3 rows populated. This step just confirms it keeps working.)*

If any step fails, note the step number + what you saw — that's the bug report.
