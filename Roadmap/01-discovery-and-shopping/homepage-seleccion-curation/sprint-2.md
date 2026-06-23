# Sprint 2 — Admin curation (pin/unpin + reorder)

**Epic:** [Homepage Selección: bug sweep + admin curation + dynamic rotation](README.md) · **Repo:** `apps/miyagisanchez` (+ possible tiny `apps/backend`)
**Goal:** give an admin a screen to control the "Selección de la semana" — pin/unpin products and order them —
built **Medusa-first** on the existing `metadata.featured` pin (+ a new `metadata.featured_rank`), behind the
existing admin shell + Clerk guard. No new tables, no Supabase pin.

## Stories

### S2.0 — Pre-flight (investigation, no feature code) · —
**As the** builder, **I want** to confirm the Medusa-first write path before building the admin write, **so that**
we don't invent a Supabase pin or a redundant route.
- Read `apps/backend/src/api/admin/` (esp. `sellers`, `custom`) + the native Medusa admin products API. Determine
  the path to set `metadata.featured` (bool) + `metadata.featured_rank` (number) on a product: native Medusa admin
  product update vs. a thin custom admin route.
- Confirm how the frontend admin call authenticates to that path (Medusa admin token vs. an in-repo `withAdmin`
  route that proxies). Confirm the `listings` cache tag is the right bust target.
- **Rule 3 check:** decide whether `/api/ucp/catalog` should expose `featured` so agents see the same curation.
- **Output:** a short written decision in this doc (*Pre-flight decision* below). **Gates S2.1.**

### S2.1 — Admin write path: toggle + rank a product's featured state · MED
**As an** admin, **I want** to set/unset a product's featured pin and its order, **so that** I control the Selección.
- Implement the write confirmed in S2.0: set `metadata.featured` + `metadata.featured_rank` on the **Medusa
  product**, behind `withAdmin` (or the Medusa admin token path). On success, **revalidate the `listings` tag** so
  the homepage reflects the change within the ISR window.
- **Acceptance:** an authorized admin call pins/unpins a product and sets its rank; an unauthorized call is
  rejected (401/redirect); after a write, `getCuratedPool`-backed reads reflect it on the next window.
- **QA:** route/handler spec — auth (admit admin / reject non-admin), the metadata write shape, and that the cache
  tag is busted. **Risk: MED** — admin product-metadata mutation; reviewer may auto-merge on green CI, or Daniel
  merges (his call). Announce in the PR (touches product metadata read by curation + possibly UCP).

### S2.2 — `/admin/seleccion` UI (pin/unpin + reorder), in the admin nav · LOW
**As an** admin, **I want** a screen listing candidate products with pin toggles and drag-reorder, **so that** I
curate without touching Medusa admin directly.
- New `app/(shell)/admin/seleccion/` (page + client), modeled on `app/(shell)/admin/vecindario/`. Lists candidate
  products (the curated pool / a search), shows pin state + rank, lets the admin toggle and reorder (a small drag
  lib is allowed per Daniel), saving via S2.1. Register in **`lib/admin/sections.ts`** (es-MX label + icon).
- **Acceptance:** admin pins, unpins, and reorders; saves persist (S2.1) and survive reload; the homepage reflects
  the curation on the next ISR window; the section appears in the admin nav.
- **QA:** Clerk-gated admin render spec via `e2e/_helpers/auth.ts` (`@clerk/testing`); admin browser smoke owed to
  Daniel (he holds the admin session). es-MX copy-complete.

### S2.3 — Curation reads honor admin order · LOW
**As a** buyer, **I want** the featured pick + grid to reflect the admin's chosen order, **so that** merchandising
is intentional.
- In `lib/home-curation.ts`: extend `byPinnedThenFresh` so pinned items sort by `featured_rank` asc (then fresh),
  and `pickFeatured` returns the lowest-rank pin. Unranked pins fall back to fresh order. Keep the seam next-free.
- **Acceptance:** pure-logic spec — ranked pins order by rank; tie/unranked falls back to fresh; the featured pick
  is the lowest-rank pin; unpinned behaviour unchanged.
- **QA:** extend `e2e/home-curation.spec.ts` (pure/api gate — free coverage).

## Sprint QA
- Deterministic gate: `tsc` + `build` + `home-curation` pure spec (S2.3) + the S2.1 route spec + the S2.2 admin
  render spec. The authed **admin** end-to-end (pin → reorder → see it on the homepage) is owed to Daniel on prod.
- S2.0's decision must be recorded **before** S2.1 starts.

## Pre-flight decision (S2.0 — recorded 2026-06-23, gates S2.1)

Read: `apps/backend/src/api/admin/*`, `apps/backend/src/api/internal/seller-products/[id]/route.ts`,
`apps/backend/src/api/store/_utils/seller-product-update.ts`, frontend env + `lib/listings.ts` cache.

- **Write path → a NEW thin admin-scoped backend internal route.** The frontend holds **no Medusa admin token**
  (only the Store API publishable key + `MEDUSA_INTERNAL_SECRET`), so it can't call Medusa `/admin/products/:id`
  directly. The existing `/internal/seller-products/[id]` route is **seller-scoped** — it requires `seller_slug`
  and verifies the seller owns the product (wrong for admin curation). So we add
  `apps/backend/src/api/internal/admin/featured/[id]/route.ts` (`PATCH`, `x-internal-secret`) that **reuses the
  shared `updateSellerProduct(scope, id, body)` util** — it already does the metadata deep-merge and the safe
  `updateProducts(id, data)` form that dodges Medusa's selector trap. **No Supabase pin, no new table** (Rule 1/2 ✓).
- **Auth (two layers):** browser → Next.js admin route via the Clerk session cookie, gated by `withAdmin`
  (`lib/admin/guard.ts`, audits via `after()`); Next.js → Medusa via the existing `x-internal-secret`
  (`MEDUSA_INTERNAL_SECRET`) service-to-service secret. No Medusa admin token introduced (Rule 4 ✓).
- **Cache bust → `revalidateTag('listings')`.** Confirmed: `getCuratedPool` (`lib/listings.ts`) reads
  `/store/listings` tagged `['listings']`; `app/api/sell/shop/route.ts` already busts via `revalidateTag('listings')`.
- **UCP `featured` → keep as metadata passthrough (no new code).** `featured`/`featured_rank` already flow into
  `/api/ucp/catalog` items inside the `metadata` object (`lib/ucp/schema.ts` passes `metadata` through), so agents
  can read them today. Promoting to a first-class field is additive scope with low value → **out of S2** (Rule 3 ✓).
- **Deploy order:** the backend internal route **merges + finishes deploying first** (Cloud Run us-east4, ~12 min,
  no preview); the frontend route degrades gracefully (returns a 502 with a clear message, never throws) if the
  backend route 404s during the lag window.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: prod `https://miyagisanchez.com` once the backend (PR #37) + frontend are deployed (the backend
route has no preview, so the end-to-end pin write only works after the backend merges). **All admin
steps owed to Daniel — admin Clerk session.** The two auto-tests that DON'T need a session (anonymous
`/api/admin/seleccion*` → 401, and the anon `/admin/seleccion` redirect) run in CI against the preview.

1. Sign in as an admin, open `https://miyagisanchez.com/admin`.
   → The left-nav now lists **"Selección"** (es-MX, ⭐ icon), next to Vecindario. Click it.
2. On `/admin/seleccion`, find a product under **Candidatos** and click **Fijar**.
   → It jumps up into **Fijados** and shows a **Destacado** badge (it's the only pin → rank 1). Reload —
     it's still pinned.
3. Pin a second product, then **drag** the ≡ handle to reorder the two pinned rows.
   → The order (and the `1`/`2` numbers + which row shows **Destacado**) updates and persists on reload.
4. Open `https://miyagisanchez.com/` (the homepage) — wait past one ISR window (~60s) or hard-reload
   until revalidated.
   → The **"Selección de la semana"** featured card + grid reflect your pins **in your chosen order**; the
     rank-1 pin is the big **Destacado** card.
5. Back on `/admin/seleccion`, click **Quitar** on each pin you added; re-check the homepage after a window.
   → The Selección reverts to pure auto-curation (freshest qualifying).
6. `GET https://miyagisanchez.com/api/ucp/catalog` (no first-class field added per S2.0).
   → A pinned product's catalog item carries `metadata.featured: true` (+ `metadata.featured_rank`) for
     agents — the curation signal rides through the existing metadata passthrough, no new UCP field.

Known v1 limitation: **Candidatos** lists only the freshest ~50 listings, so an admin can't pin a product
older than that yet (a search box is the noted follow-up). A pin already set stays effective regardless.

If any step fails, note the step number + what you saw — that's the bug report.

## Status — ✅ SHIPPED 2026-06-23 (backend BE #37 `815994f` → live rev `medusa-web-00110-prz`; frontend #113 `4a59644`)
- [x] S2.0 — recorded 2026-06-23 (write path = new admin-scoped backend internal route reusing `updateSellerProduct`)
- [x] S2.1 — backend route `PATCH /internal/admin/featured/[id]` (BE PR #37 `815994f`, live-smoked: 401 without secret);
      frontend write path (FE #113 `4a59644`: withAdmin GET pool + PATCH → revalidateTag; pure `buildFeaturedPatch`). **MED.**
- [x] S2.2 — `/admin/seleccion` UI w/ @dnd-kit drag-reorder + nav section "Selección" (FE #113). **LOW.**
- [x] S2.3 — `byPinnedThenFresh` honors `featured_rank` asc + pure spec (FE #113). **LOW.**

Cross-review (codex) ran on both green PRs: backend should-fix (preserve rank when key omitted) + 3 frontend
should-fixes/nit applied (reject coerced ranks · `featuredRank` Infinity contract · pin rank-collision `max+1`);
3 declined with rationale (MCP-tool ask · cross-repo 502 false-positive · documented freshest-50 limit).
**Owed to Daniel:** the admin Clerk-session end-to-end smoke (walkthrough above) + UCP metadata check on prod.
