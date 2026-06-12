# Homepage Polish — Dirección B — Sprint 4: Signed-in modules

**Status:** ⬜ not started · **Risk:** LOW except **S4.4 HIGH** (Supabase migration → Daniel merges)

> Recognise the returning user: a continuation rail, an actionable offer alert, and a seller snapshot — the
> ribbon is gone. The price-drop badge is deferred; this sprint lands the column so it starts accruing data.

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

### Story 4.4 — `price_cents_at_save` column + backfill (data only) — HIGH
**As a** future buyer, **I want** the price at the moment I favorited stored, **so that** a price-drop badge
can light up later without a backfill scramble.
**Acceptance:** add `price_cents_at_save` to `marketplace_favorites` (Supabase migration in
`apps/miyagisanchez/supabase/`; additive, non-commerce table = allowed). Populate it on the next favorite
write. **No UI/badge change this story** — data only. The rail (S4.1) must keep working whether or not the
column has values.
**Risk:** **HIGH** (DB migration) → **Daniel merges.**

## Sprint QA
- **api spec(s):** pure-logic spec on the offer-alert "is actionable / max 2" derivation and the seller-vs-buyer
  branch; rail join shape. Migration verified applied (column exists; new favorite writes it).
- **browser smoke owed:** **yes, to Daniel** (authed) — retoma rail renders first when signed-in; offer alert
  appears only with a real pending offer; seller snapshot shows for a shop account. These need a signed-in
  session, so they're owed to Daniel (the authed `MS_TEST_*` browser smoke can cover the rail/alert render
  once fixtures exist).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (signed-in — **owed to Daniel**, holds the sessions)

1. Sign in as a buyer with ≥1 favorite, open https://miyagisanchez.com
   → "Retoma donde te quedaste" is the first content module; the value-prop ribbon is **gone**. *(auth path — Daniel)*
2. As a buyer with a pending offer, reload the homepage.
   → A "Tu oferta de $X sigue pendiente" alert (max 2) with a `Ver` link to the offer thread. With no pending offer, no alert renders. *(auth path — Daniel)*
3. Sign in as a seller account with a shop.
   → The seller block is the "Tu tienda esta semana" snapshot (visitas · ofertas), not the recruit card. *(auth path — Daniel)*
4. (DB) After favoriting a new item, check `marketplace_favorites`.
   → The new row has a non-null `price_cents_at_save`. *(migration check — Daniel merges S4.4)*

If any step fails, note the step number + what you saw — that's the bug report.
