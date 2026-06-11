# Navigation & Settings Reorg — Sprint 3: Seller-mode shell

**Status:** ✅ BUILT 2026-06-10 — branch `feat/nav-reorg-s3` (fresh off `origin/main 1c1923c`; the old
`feat/nav-reorg` was a squash-merge dead-end after S1 #75 / S2 #77). S3.2 `ccb28b8` · S3.1 `84be20c`.
**PR [#80](https://github.com/danybgoode/miyagisanchezcommerce/pull/80) open — awaiting Daniel merge (HIGH).**
Latest `main` merged in (`21bf64f`, picked up #73 `daf6300`) so CI's merged test set matches the preview.
Gate green locally: `tsc` ✅ · `next build` ✅ · `e2e/seller-mode.spec.ts` 11/11 ✅. · **Risk:** HIGH (alters the global app-shell suppression gate —
**Daniel merges**) · audit §4 · files: `app/layout.tsx`, new `app/shop/manage/layout.tsx`, new
`app/shop/manage/SellerNav.tsx`, pure `lib/seller-mode.ts` + `lib/seller-nav.ts`, `e2e/seller-mode.spec.ts`

> **Why HIGH:** S3.1 changes the predicate in `app/layout.tsx` that decides whether platform chrome renders,
> so a mistake regresses the header/footer/tab-bar on **every** page. Treat as shared-infra; merge latest
> `main` first and announce. CI-vs-preview is the gate plus a Daniel visual pass.

## Stories

### Story 3.1 — Suppress buyer chrome under `/shop/manage`
**As a** seller, **I want** `/shop/manage` to drop the buyer chrome and feel like a distinct space **so that**
managing my shop isn't visually tangled with shopping.
**Acceptance:**
- On `/shop/manage/*` the buyer header, footer, and `MobileTabBar` do **not** render.
- A **dark brand top bar** renders with a **"Volver a comprar"** action that returns to the marketplace.
- Implemented by **extending** the existing suppression branch in `layout.tsx` via a **pure**
  `isSellerModePath(pathname)` (mirror the `whiteLabel = isEmbed || isChannel` pattern) + a new
  `app/shop/manage/layout.tsx`. Buyer pages outside `/shop/manage` are unchanged.
- Composes safely with white-label: a seller managing a shop on a custom domain/subdomain does not
  double-suppress or render two shells.
**Risk:** HIGH

### Story 3.2 — Seller nav (`SellerNav.tsx`)
**As a** seller, **I want** a nav built for shop operations **so that** I can move between manage areas quickly.
**Acceptance:**
- **Desktop left rail**, grouped: **Operar** (Resumen · Pedidos · Ofertas · Anuncios) / **Crecer**
  (Analítica · Promociones · Eventos · Importar · Ajustes).
- **Mobile seller bar**: Resumen · Pedidos · Ofertas · Anuncios · **Más**.
- Every entry links to its **existing** `/shop/manage/*` sub-page; the active entry reflects the current route.
- No new manage pages are created.
**Risk:** LOW

## Sprint QA
- **api spec(s):** `isSellerModePath` + the `SellerNav` section config (groups → routes) → pure modules
  (e.g. `lib/seller-mode.ts`, `lib/seller-nav.ts`) → `e2e/seller-mode.spec.ts` asserts the predicate matches
  `/shop/manage/*` (and not buyer routes) and that every rail/bar entry maps to a real route.
- **browser smoke owed:** **owed to Daniel (authed seller session)** — that `/shop/manage` renders **no**
  buyer header/tab-bar and shows the dark seller bar. (Many client-island assertions can be covered by the
  local authed-clerk browser smoke once the seller fixture is set; the live look stays Daniel's.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
  **HIGH → Daniel merges.** Merge latest `main` first; announce the `layout.tsx` touch.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while testing pre-merge)

1. Sign in as a seller and open https://miyagisanchez.com/shop/manage **[owed to Daniel — authed seller]**
   → No buyer header, footer, or bottom tab bar; a **dark brand top bar** is shown instead.
2. On desktop, look at the left rail.
   → Two groups: **Operar** (Resumen · Pedidos · Ofertas · Anuncios) and **Crecer** (Analítica · Promociones · Eventos · Importar · Ajustes); each links to its manage page; the current page is highlighted.
3. Click **"Volver a comprar"** in the seller top bar.
   → You return to the marketplace with the normal buyer chrome restored.
4. On a phone, open `/shop/manage`. **[owed to Daniel — authed seller]**
   → A seller bottom bar shows Resumen · Pedidos · Ofertas · Anuncios · **Más** (not the buyer tab bar).
5. (edge) If you have a shop on a custom domain/subdomain, open its `/shop/manage`. **[owed to Daniel]**
   → Exactly one shell renders — no double-suppression, no stacked bars.

If any step fails, note the step number + what you saw — that's the bug report.
