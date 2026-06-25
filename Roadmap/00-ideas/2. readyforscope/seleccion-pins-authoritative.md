# Selección — make admin pins authoritative (price-gate bug + show-all-pins)

**Status: APPROVED 2026-06-25 — scaffold the epic.**
Source: Daniel testing session 2026-06-25, on the shipped **`homepage-seleccion-curation`** epic (01 · Discovery & Shopping).
Class: **Bug** (the Destacado isn't the rank-1 pin; pins beyond the freshest-24 don't render) **+ a light
enhancement** (grid grows to show all pins). Risk **LOW** for the two frontend pure-logic stories on the
`lib/home-curation.ts` seam; **MED** for the one backend read-filter (`/store/listings?featured=true`) that lets a
pin render regardless of freshness. No payments/auth/DB-migration.

> **TL;DR** — Daniel pinned 9 products and ranked them; rank 1 is *Mitos en el Ring*. The homepage shows
> *Forrest Combi (original)* — **rank 4** — as the Destacado. Root cause: a pin overrides the 14-day freshness
> cutoff but **not** the price gate, so every **"Sin precio"** pin (events / agenda / art listings) is silently
> filtered out, and the lowest-rank *priced* pin wins. Daniel is configuring it correctly — it's a half-built
> promise in the curation filter.

---

## Stage-2.5 bucket

| Ask | Class | Bucket | Why |
|---|---|---|---|
| Destacado isn't the rank-1 pin | **Bug** | — (defect) | `isQualifying` drops "Sin precio" pins; a pin only overrides freshness, not price. One-seam fix in `lib/home-curation.ts`. |
| Show all my pins, not just 5 | **Feature** | **Light enhancement** | Grid grows to include every qualifying pin; auto-curation fills only the leftover slots. Pure-logic change on the same seam (+ thin wrapper). |
| "Is there a pin limit?" | — (orientation) | **Already answered** | No limit on *pinning*; the *display* cap was 1 + 4 = 5. This work removes the effective cap for pins (see decision 2). |

## Reproduction (observed 2026-06-25, prod)

1. `/admin/seleccion` → **FIJADOS (9)**, ordered 1–9:
   1. *Mitos en el Ring — lucha libre + mitología prehispánica* — **Sin precio** · Agenda CDMX  ← labeled **DESTACADO** in admin
   2. *Hardcore Art Book Fair 2026* — **Sin precio** · Agenda CDMX
   3. *Bren-Sue — obra #1* — **Sin precio** · Bren-Sue
   4. *Forrest Combi (original)* — $2,000.00 · El Manchón
   5. *Bren-Sue — obra #2* — **Sin precio** · Bren-Sue
   6. *Érase una vez (cómic)* — $150.00 · El Manchón
   7. *Taza de gatos* — $300.00 · Sofia Weidner
   8. *Placas de cerámica* — $1,300.00 · Sofia Weidner
   9. *La mano de Dios: fútbol y teatro* — **Sin precio** · Teatro UNAM
2. Homepage `/` → the big **Destacado** card renders ***Forrest Combi (original)*** (rank 4), **not** rank 1.

**Divergence from the promise** (`/admin/seleccion` copy: *"El de menor orden es el Destacado"*): the lowest-rank
pin should be the Destacado. The first **three** pins are skipped because they have no price.

## Root cause

`lib/home-curation.ts` → `isQualifying(l, now)`:

```ts
const active   = l.status === 'active' || l.status === 'published'
const hasImage = (l.images?.length ?? 0) > 0
const hasPrice = l.price_cents != null
if (!active || !hasImage || !hasPrice) return false
return isPinned(l) || ageMs(l.created_at, now) <= MAX_AGE_DAYS * DAY_MS   // pin overrides ONLY freshness
```

A pin (`metadata.featured === true`) overrides the **freshness** branch, but `hasPrice`/`hasImage`/`active` are
hard gates applied *before* it. So a pinned "Sin precio" listing returns `false` and is dropped from **both**
`pickFeatured` (the Destacado) and `curateGrid` (the grid). With pins 1–3 priced "Sin precio", `pickFeatured`
returns the lowest-rank *priced* pin = rank 4 (*Forrest Combi*). Confirmed against the live screenshots.

**Second observation (2026-06-25, follow-up test).** Daniel re-pinned 5 **priced** products (Sandra Cuevas $80
[Destacado], Print cumbia $300, Gorra gatos $400, Haz churros $812, Maleza $150). The homepage now shows the
**Destacado correctly** (Sandra Cuevas, rank 1) — but **nothing renders underneath**. Cause: the homepage pool is
the **freshest 24** listings (`getCuratedPool`, `limit=24`), while the admin **Candidatos** screen pins from the
freshest **50**. The rank-1 pin is recent (in the pool); pins 2–5 are older listings **outside the 24-newest
window**, so they can't render — and the grid can't auto-fill because most *fresh* catalog items are "Sin precio"
events the grid skips. **This re-implicates the pool ceiling I'd earlier deferred** — Daniel is actively hitting
it, so the fix is promoted into scope (Story 2).

Tertiary: the homepage renders **1 Destacado + 4 grid = 5** items (`getCuratedListings(4)`), so even with the pool
fixed, pins ranked 6+ wouldn't show without the grow-to-all-pins change (Story 3).

> **What was *ruled out* during validation:** write-side type coercion (the backend `/internal/admin/featured/:id`
> route writes a real boolean `featured` and numeric `featured_rank` via `updateSellerProduct`); cache propagation
> (`revalidateTag('listings', 'default')` is the standard repo pattern, ISR window is 60 s); and the rank logic
> itself (admin writes ranks 1..n on reorder, `pickFeatured` returns the lowest-rank pin — both correct).

## Decisions (Daniel, 2026-06-25)

1. **Pins override the price gate only.** An explicit pin always shows regardless of price, but **still must be
   active/published with ≥1 image** — a Destacado with no image looks broken, and a non-published listing must
   never be featured. (All 9 current pins have images, so all qualify after the fix.)
2. **Pins render regardless of freshness.** A pinned product must appear on the homepage even if it's older than
   the freshest-24 pool. Medusa-first: add a `featured=true` read filter to `/store/listings`, fetch the pinned set
   explicitly, and **union** it into the curated pool before `pickFeatured`/`curateGrid`. (Promoted from deferred —
   Daniel is hitting this now.)
3. **The grid grows to show every qualifying pin.** Destacado = rank-1 pin; the grid shows **all remaining
   qualifying pins** in `featured_rank` order, then auto-curation fills any leftover slots up to a sensible
   minimum. No hard display cap for pins (a safety max guards runaway — see open risks).

## Medusa-first reframe (AGENTS five-rule check)

- **Rule 1 (Medusa owns commerce):** the pin stays `metadata.featured` / `metadata.featured_rank` on the Medusa
  product. No write changes. Story 2 adds a **read filter** (`featured=true`) to the existing Medusa store route
  `/store/listings` — following the established metadata-filter pattern there (brand/year/transmission/…) — so the
  frontend reads pins from Medusa, never Supabase.
- **Rule 2 (Supabase):** untouched.
- **Rule 3 (UCP/MCP):** unaffected — `featured` already flows through catalog metadata.
- **Rule 4 (Clerk):** untouched.
- **Rule 5 (es-MX):** no new copy; admin stays es-MX.

## What already exists (reuse, don't rebuild)

- **`lib/home-curation.ts`** — `isQualifying`, `isPinned`, `pickFeatured`, `curateGrid`, `byPinnedThenFresh`,
  `featuredRank`. The fix is a few lines here. Next-free seam → free pure-logic coverage.
- **`e2e/home-curation.spec.ts`** — already has *"a PINNED listing qualifies even past the 14-day cutoff"* and
  *"no image or no price disqualifies"*. Extend it (the no-price case now splits: **pinned** no-price qualifies,
  **unpinned** no-price still doesn't) and update the grid-cap test for grow-to-all-pins.
- **`lib/listings.ts`** — `getCuratedPool` (one cached fetch, limit 24), `getFeaturedListing`, `getCuratedListings`.
  The grid-size change lands in `getCuratedListings` + `curateGrid`.
- **The Destacado / grid card components** already render `price_cents == null` as **"Sin precio" / "Precio a
  consultar"** — no UI change needed for priceless cards.

## Scope — sprints, stories, risk & QA

| Sprint | # | Story | Risk | QA |
|---|---|---|---|---|
| **S1** | S1.1 | **Pins authoritative over price.** In `isQualifying`, a pinned listing bypasses the `hasPrice` gate but still requires `active/published` + `≥1 image`. (Unpinned behaviour unchanged.) | LOW | Extend `home-curation.spec.ts`: a pinned no-price listing **qualifies** + is the Destacado at rank 1; an unpinned no-price listing is **still excluded**; a pinned no-image listing is **still excluded**. |
| **S1** | S1.2 | **Grid grows to all pins.** `getCuratedListings` / `curateGrid` include **every** qualifying pin (in `featured_rank` order, after the Destacado), then auto-fill unpinned up to a min of `GRID_SIZE`, capped at a safety max. | LOW | Spec: N pins ⇒ grid shows N−1 pins + fill; pins never sliced below the cap; unpinned remainder still shuffles per window; Destacado never repeats. |
| **S2** | S2.0 | **Pre-flight:** confirm the `/store/listings` filter shape + that `featured`/`featured_rank` survive the `toListingShape` round-trip; decide pool union point (in `getCuratedPool`). | — | — |
| **S2** | S2.1 | **Backend `featured` read-filter.** Add `?featured=true` to `/store/listings` (mirror the existing metadata-filter pattern). Backend-only, additive. | MED | Backend spec / curl: `?featured=true` returns only pinned products; absent param = unchanged. |
| **S2** | S2.2 | **Frontend unions pins into the pool.** `getCuratedPool` (or a sibling `getPinnedListings`) fetches `?featured=true` and unions (dedupe by id) with the freshest-24 pool, so a pin renders regardless of age. Tagged `listings`. | LOW | Spec/smoke: a pin older than the freshest-24 appears as Destacado + in the grid; busting `listings` still refreshes within the ISR window. |

> S1 is pure-logic on the next-free seam → Playwright `api` spec, no network/auth, **frontend-only, ships first**.
> S2 adds a backend route filter (**Cloud Run deploy, ~12 min, no preview**) + a thin frontend union → **backend
> merges first**, frontend degrades gracefully if the filter lags (falls back to today's freshest-24 behaviour).

## In / out of scope

**In:** S1.1 price-gate exemption for pins · S1.2 grid grows to all pins · S2 pins render regardless of freshness
(backend `featured` filter + frontend union).
**Out:** the admin candidate **search box** (still the noted `homepage-seleccion-curation` follow-up — this epic
makes *pinned* items render at any age, but doesn't widen what's *pinnable* past the freshest-50 candidate list) ·
per-visitor shuffle · admin "this pin won't show" warnings (grow-to-all-pins removes the need) · touching the
price/image gates for *unpinned* auto-curation · any write-path/Medusa-metadata change.

## Open risks

- **Runaway grid.** "Show all pins" needs a safety max (suggest grid ≤ 11 so Destacado + grid ≤ 12) so a careless
  50-pin spree can't balloon the homepage. **Daniel confirmed cap = 11 at grooming** (revisit at build if wrong).
- **Cross-repo deploy gap.** S2.2 (frontend) calls the S2.1 (backend) filter. If the frontend merges before the
  backend finishes its ~12-min Cloud Run deploy, `?featured=true` is ignored and old pins simply don't show yet
  (no error) — merge **backend first**, verify, then frontend.
- **Layout at odd counts.** The grid is responsive (1 / 2 / 4 cols) — 5, 8 or 9 cards should reflow fine, but the
  smoke walkthrough must eyeball it.
- **`featured=true` returns a lot.** If many products are ever pinned, the union fetch grows — keep a sane `limit`
  on the pinned fetch (the display cap already bounds what renders).

## Smoke walkthrough owner

Frontend, no auth on the homepage read → the **api spec covers the logic**. The **admin pin/reorder → homepage
reflection** eyeball is **owed to Daniel** (needs his Clerk admin session + a ~1-min ISR wait). Steps land in the
sprint doc on scaffold.

## Definition of Ready — checklist

- [x] As-a / I-want / so-that clear; acceptance testable by Daniel (Destacado = rank-1 pin; all pins render under it regardless of age).
- [x] Stage-2.5 bucket named (defect + light enhancement).
- [x] v1 in/out boundary written; candidate search box explicitly deferred.
- [x] Reuse list produced (Medusa-first: read filter on the existing store route + a thin frontend union).
- [x] Each story risk-tiered (S1 LOW, S2 MED backend) + QA named (extend `home-curation.spec.ts` + backend filter spec).
- [x] **Daniel approved 2026-06-25** → scaffold the follow-up epic + sprints and emit the kickoffs.
