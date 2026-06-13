# Homepage Polish — Dirección B «Catálogo limpio»
**Implementation handoff · 12 jun 2026 · Source: design audit + approved mockups (see `mockups-directions.html`, section "Dirección B")**

---

## Paste-this-prompt for Claude Code

> I'm handing you a designed, signed-off homepage redesign for miyagisanchez.com (the `apps/miyagisanchez` Next.js app). The full spec is in `HANDOFF.md` in this folder and the visual source of truth is `mockups-directions.html` (open in a browser; use the "Dirección B" frames — signed-out and signed-in — plus the icon mapping in section 00). `audit.html` has the reasoning if you need context for a decision.
>
> Before writing code: read `Roadmap/WAYS-OF-WORKING.md`, `Roadmap/LEARNINGS.md` and `AGENTS.md`, then plan this as an epic (`feat/homepage-polish-b`) with stories matching the "Stories" section of HANDOFF.md. Scaffold the epic docs first, get my approval on the plan, then build story by story with smoke tests. Never violate the five rules in AGENTS.md — all commerce data via Medusa Store API, Supabase only for favorites/offers/conversations, es-MX copy only (the homepage is NOT on the bilingual allow-list), Clerk for auth state, and keep UCP surfaces accurate if data sources change.
>
> Visual fidelity matters: match the mockup's hierarchy, spacing and copy exactly unless a token already exists for it in `app/globals.css` — always prefer existing tokens/classes (`card-tile`, `chip`, `badge`, `t-price`, spacing/radius vars) over new CSS.

---

## 1 · Goal

Replace the current homepage (`app/page.tsx`) — category chips + Vecindario banner + recency dump — with the Dirección B module stack. One page, two states:

- **Signed-out:** orient in one line, merchandise immediately, recruit sellers, end with a CTA.
- **Signed-in:** recognize the user — continuation rail + actionable offer alert replace the ribbon.

Fixes audit findings A1–A6, B1–B4, C1–C3 (see `audit.html`).

## 2 · Module stack (top → bottom)

| # | Module | Signed-out | Signed-in |
|---|--------|-----------|-----------|
| 1 | Header | search + agent sparks + **labeled "Vende" pill** (→ `/vende`) | search + sparks + `+` publish + avatar |
| 2 | Value-prop ribbon | ✅ | ❌ hidden |
| 3 | Retoma donde te quedaste | ❌ | ✅ first content module |
| 4 | Pending-offer alert | ❌ | ✅ only when actionable |
| 5 | Selección de la semana | ✅ featured + 4-grid | ✅ (2-grid is fine if rail is present) |
| 6 | Vecindario live strip | ✅ | ✅ |
| 7 | Categorías (list + counts) | ✅ | ✅ |
| 8 | Seller block | ✅ | swap → seller snapshot if user has a shop |
| 9 | Terminal CTA + footer | "Crear cuenta" | "Publicar" nudge |

### 2.1 Header (layout.tsx)
- Replace the signed-out bare `iconoir-plus-circle` with a labeled pill button **"Vende"** (`btn btn-primary btn-sm` style, → `/vende`). Finding A4.
- Add the agent affordance **inside the mobile search bar**: `iconoir-sparks` at the right edge of the input (color `var(--agent)`), opening the same agent surface as the desktop `AIAgentButton`. Finding B4.

### 2.2 Value-prop ribbon (signed-out only)
- One slim bar under the header, NOT a hero: bg `var(--accent-soft)`, border `--selva-100`, radius `--r-sm`.
- Copy: `Compra y vende en México — gratis, protegido y con ofertas.` + link `Cómo funciona` → `/vende` (or `/acerca` — confirm with Daniel).
- Icon: `iconoir-shield-check` accent. Finding A1/A5.

### 2.3 Retoma donde te quedaste (signed-in)
- Source: `marketplace_favorites` (Supabase) joined to listings via Medusa product ids — newest 3.
- Card: square image, **price 13.5px semibold accent**, one-line title, note line.
- Price-drop badge (`↓ Bajó $X`, color `var(--energy)`) requires storing price-at-favorite. If `marketplace_favorites` lacks a price column: **add `price_cents_at_save`** (Supabase migration, non-commerce table = allowed) and backfill on next favorite; ship the rail without the badge until data exists. v1 may also include recently-viewed via `localStorage` (client component) — optional story.
- Header link "Favoritos →" → `/account` favorites tab.

### 2.4 Pending-offer alert (signed-in, conditional)
- Source: `marketplace_offers` where user is buyer and status = pending (and seller-side offers if user has a shop).
- Card: icon `iconoir-hand-cash` in `--promo-soft` circle · bold line `Tu oferta de $X sigue pendiente` · muted line with listing title + shop · CTA `Ver` → offer thread.
- Render nothing when there's nothing actionable. Max 2 cards.

### 2.5 Selección de la semana
- **Curation rule (cold start), not recency:** active listings WITH at least one image AND a price, ordered fresh-first; exclude anything older than 14 days unless pinned. Pinning: `metadata.featured = true` on the Medusa product (admin sets) → becomes the **featured card**; otherwise featured = newest qualifying listing.
- Featured card: full-width 16:9 image, "Destacado" pill (`--selva-700` bg, white), title + location + verified shop (`iconoir-badge-check` accent, replaces the "✓" text glyph) on the left, **price 18px semibold accent** right.
- Grid: 4 cards, 2-col. Card hierarchy (finding B3): image `aspect-ratio: 1/1` (no fixed height) → **price 16px semibold `t-price`** → title 12.5px muted, 2-line clamp → ONE meta line (`Location · Condition`). Favorite heart overlay stays.
- **Timestamps: only show when < 48h** ("Nuevo hoy" / "Hace 3 h" as a small `badge-soft` on the image); hide entirely otherwise. Finding A2.
- "Ver todo →" → `/l`.

### 2.6 Vecindario live strip
- Replaces the current static banner (keep `data-testid="vecindario-feed-entry"` on the section link for e2e).
- Eyebrow `Pulso local` + title `Vecindario` + `Ver vecindario →` → `/vecindario`.
- Body: 1–2 REAL pulse items (web-visible, approved — same source as `/vecindario`, `isNeighborhoodPulseSocialItem`): type label (uppercase 10px accent), quote/snippet (12.5px, 2-line clamp), `submitter · colonia · timeAgo` (11px subtle). Icons: `iconoir-star` (recomendación), `iconoir-bell` (aviso).
- Empty fallback: current banner copy, single card. Finding B1.

### 2.7 Categorías
- **Only categories with ≥1 active listing**, with live counts: list rows (not chips) — `iconoir-*` icon 17px muted · label 13.5px · count 12px subtle · `iconoir-arrow-right` 13px. Card-panel container, divided rows. → `/l?category=X`. Finding A3.
- Counts: aggregate from Medusa products by category (cache ~5 min).

### 2.8 Seller block / snapshot
- No shop: minimal card — `iconoir-shop` in accent-soft tile · `¿Vendes algo?` bold · `Tu tienda gratis, sin comisiones.` muted · arrow → `/vende`.
- Has shop: snapshot — `Tu tienda esta semana` · `N visitas · N ofertas nuevas` · `Publicar otro` → `/sell`.

### 2.9 Terminal CTA + footer (mobile included)
- Signed-out: `Guarda favoritos y haz ofertas con tu cuenta.` + `Crear cuenta` (primary pill → `/sign-up`) + `Seguir explorando` (ghost → `/l`).
- Signed-in: `¿Algo que ya no usas? Publícalo gratis.` + `Publicar` → `/sell`.
- Footer links row (NOW VISIBLE ON MOBILE — remove `hidden md:block` or add a compact mobile variant): Anuncios · Vecindario · Vende gratis · Agent API · Términos. Finding B2.
- Empty-marketplace state: keep current copy but add CTAs `Publica lo primero` → `/vende` + `Pasea por el vecindario` → `/vecindario`. Finding C2.

## 3 · Icon standardization (site-wide, same epic)

Replace every `CATEGORIES[].icon` emoji in `lib/types.ts` with iconoir class names and update renderers (`CategoryChips.tsx`, listing filters, anywhere `cat.icon` renders) to `<i className={`iconoir-${cat.icon}`} />`. **All names verified to exist** in the iconoir build loaded in `layout.tsx`:

| key | icon | was |
|-----|------|-----|
| (todo chip) | `view-grid` | 🛍️ |
| autos | `car` | 🚗 |
| inmuebles | `home` | 🏠 |
| electronica | `smartphone-device` | 📱 |
| hogar | `sofa` | 🪴 |
| moda | `shirt` | 👗 |
| deportes | `basketball` | ⚽ |
| servicios | `wrench` | 🔧 |
| mascotas | `fish` ⚠ provisional — iconoir has no paw/dog/cat (`dog`, `cat`, `paw`, `t-shirt`, `tag`, `verified-badge` DO NOT EXIST; do not use). Probe other animal glyphs at runtime if desired. | 🐾 |
| herramientas | `hammer` | 🔨 |
| negocios | `building` | 🏭 |
| cursos | `graduation-cap` | 🎓 |
| comunidad | `group` | 👥 |
| creatividad | `palette` | 🎨 |
| otros | `package` | 📦 |

Also: verified "✓" text glyphs → `iconoir-badge-check`; audit remaining UI emoji (`grep -rn` for emoji ranges in `app/` and `lib/`) and replace or remove — emoji are no longer part of the buyer-surface design language. Seller portal (`lib/seller-nav.ts`) already complies.

## 4 · Data & architecture notes

- Listings read via `lib/listings.ts` → Medusa Store API (rule 1). New helpers: `getCuratedListings(n)`, `getCategoryCounts()`, `getFeaturedListing()`.
- Favorites/offers/pulse via Supabase `db` (rule 2). Conversations unread for header badge already exists.
- Homepage is server-rendered with `currentUser()` (Clerk) branching — keep a single `app/page.tsx`, render modules conditionally; extract `app/components/home/*` components per module.
- es-MX copy exactly as written here; do NOT add to the bilingual allow-list.
- Time-ago: reuse existing `timeAgo` but gate display at < 48h on home surfaces.

## 5 · Stories (suggested)

1. **Icon language migration** — types + renderers + ✓ glyphs (independent, ship first).
2. **Curated selección + card hierarchy** — helpers + featured + grid + timestamp gating.
3. **Categorías with life** — counts + list module.
4. **Ribbon + header CTAs** (Vende pill, mobile sparks) + terminal CTA + mobile footer.
5. **Vecindario live strip** (real pulse items + fallback).
6. **Signed-in modules** — retoma rail, offer alert, seller snapshot, favorites price column migration.

Each story: type-check (`npx tsc --noEmit`), build, Playwright smoke (`npm run test:e2e` — keep `vecindario-feed-entry` testid green), verify both auth states and dark/calm modes, then PR.

## 6 · QA checklist (visual)

- [ ] Price is the loudest element on every listing card (16px+ semibold accent).
- [ ] Max ONE meta line per grid card; no timestamps older than 48h anywhere on home.
- [ ] Empty categories never render; counts accurate.
- [ ] No emoji anywhere on the homepage; single iconoir language.
- [ ] Signed-out: ribbon visible, no personalization. Signed-in: ribbon gone, rail first.
- [ ] Footer + terminal CTA visible on mobile browser (not just PWA tab bar).
- [ ] Dark mode + calm mode render correctly (tokens only, no hardcoded hex).
