# Catalog management — Sprint 5: Nav SSOT layer (flag-safe nav · mobile bar · one import door)

**Status:** 🚧 built, gate green, PR open (Daniel merges — folds into the epic's HIGH tier) · commit refs: see PR. **Sequence gate: build after S3 merges** (nav/shell work must not collide with S3's open PRs) — satisfied, S3 merged 2026-07-09. Independent of S4's table columns.

> **Scope note (confirmed with Daniel during planning):** Story 5.3's "one import door" is narrowed to
> just fixing `ManageDashboard.tsx`'s mobile-hidden Importar button. The settings-page banner stays on
> its own distinct `/shop/manage/settings/import` (store-**configuration** import) — that's a genuinely
> different feature from `/shop/manage/import`'s catalog importer, not a duplicate door.
>
> **Also (my own call during planning, not re-asked):** the "Más" sheet ships with a **4th group,
> "Catálogo"** (Colecciones · Canales · Importar catálogo), beyond the 3 the acceptance text named
> (Operar · Crecer · Configuración) — omitting it would have silently dropped those 3 destinations from
> mobile reachability entirely.

> P1·C IA restructure remainder (F5/F7) — the seller-portal UX audit fold-in. Scope seed:
> [`00-ideas/seeds/catalog-management-ia-remainder.md`](../../00-ideas/seeds/catalog-management-ia-remainder.md).
> Everything here flows through the `lib/seller-nav.ts` SSOT + `SellerNav.tsx` + `lib/seller-pending-summary.ts`.
> Intrinsic risk LOW–MED; folds into this HIGH epic ⇒ Daniel merges.

## Stories

### Story 5.1 — Flag-safe nav parity (R13) ✅ built
**As a** seller, **I want** nav entries to appear only when their page actually exists, **so that** I never tap a rail/sheet item into a 404.
**Acceptance:** `SellerNavEntry` gains an optional `flag: FlagKey`; the manage layout resolves the enabled set server-side via the **same `isEnabled()`** the pages use and passes it to the client `SellerNav`, which filters on it. With `ops.profit_enabled` OFF: no Ganancias entry in the rail or the mobile "Más" sheet, and `/shop/manage/profit` still `notFound()`s. With it ON: the entry appears and resolves 200. Pure filter fn is unit-tested.
**Risk:** LOW
**Reuse:** `lib/flags.ts isEnabled()` (identical gate to the pages — do not fork the flag read); `lib/seller-nav.ts` SSOT (add the field, don't restructure). *(LEARNINGS: the Ganancias 404 is the flag→notFound→force-dynamic case, profit-analyzer S1, 2026-07-06 — fix it nav-side, not page-side.)*

### Story 5.2 — Mobile bar redesign (F5) ✅ built
**As a** seller on a phone, **I want** a Publicar action and a sanely-grouped "Más", **so that** every dashboard action is reachable in ≤2 taps.
**Acceptance:** the mobile bottom bar reads **Resumen · Pedidos(badge) · ⊕ Publicar FAB (center, 46px, accent) → `/sell` · Catálogo · Más(badge relay)** — ≤5 slots. The "Más" sheet is **grouped with headers** (Operar remainder incl. Ofertas w/ badge · Crecer grid · Configuración w/ status pill · "Ver tienda pública" link) — no ungrouped junk drawer. Any badge hidden inside "Más" **relays** onto the "Más" trigger (info color), fed by `lib/seller-pending-summary.ts`. Every Crecer/Config destination reachable in ≤2 taps. FAB lands on `/sell`.
**Risk:** LOW–MED
**Reuse:** `SellerNav.tsx` (extend the existing "Más" disclosure — add the FAB + grouping + relay); `lib/seller-pending-summary.ts` (the badge feed); the buyer PWA "Publicar ⊕" FAB pattern from `navigation-settings-reorg` as the visual precedent.

### Story 5.3 — One import door + mobile restore (F7, change #3) ✅ built, narrowed scope
**As a** seller, **I want** the catalog importer reachable on mobile, **so that** import isn't desktop-only.
**Acceptance (as built):** `ManageDashboard.tsx`'s "Importar" control (→ `/shop/manage/import`, the
catalog/product importer) drops its `hidden sm:inline-block` — visible + tappable at 390px. The
settings-page banner is **left untouched**, pointing at its own distinct `/shop/manage/settings/import`
(store-**configuration** import, a different feature — see the scope note at the top of this doc).
**Risk:** LOW
**Reuse:** `ManageDashboard.tsx` only; no new route.

## Sprint QA
- **api spec(s):** extend `e2e/seller-mode.spec.ts` — flag-off ⇒ Ganancias entry absent, flag-on ⇒ present + 200 (5.1); mobile bar ≤5 slots, every Crecer/Config destination reachable ≤2 taps, badge relay surfaces on "Más", FAB→`/sell` (5.2); Importar link resolves + not `hidden` on mobile (5.3). Pure-logic specs on the new nav flag-filter fn + mobile grouping (free coverage).
- **browser smoke owed:** yes, to Daniel — the mobile bar on a real phone (FAB → `/sell`, grouped "Más", a live pending badge relaying onto "Más").
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 5 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. With `ops.profit_enabled` OFF, open `/shop/manage` as a seller.
   → The rail and the mobile "Más" sheet show **no** "Ganancias" entry; visiting `/shop/manage/profit` directly still 404s (no dead link anywhere).
2. Flip `ops.profit_enabled` ON, reload.
   → "Ganancias" now appears in the Crecer group and `/shop/manage/profit` loads (this is the R13 parity check).
3. On a phone (or 390px viewport), look at the bottom bar.
   → Five slots: Resumen · Pedidos · a center accent **⊕ Publicar** · Catálogo · Más. Tapping ⊕ opens `/sell`.
4. Have a pending offer on the shop, then open "Más".
   → The "Más" trigger carries a badge (info color) before you open it; inside, the sheet is grouped under **four** headers — Operar (Ofertas, with its own badge) · Catálogo (Colecciones, Canales, Importar catálogo) · Crecer (grid layout) · Configuración. "Ver tienda pública" is present below the last group.
5. Tap Colecciones, Canales, and Importar catálogo from the "Más" sheet's Catálogo group (one at a time, back each time); tap any Crecer item (e.g. Cupones); tap Configuración.
   → Every destination is reached in ≤2 taps; nothing lands on a 404.
6. If the shop's settings aren't fully complete, look at the Configuración entry in "Más".
   → It carries a small warning-colored "Pendiente" pill (the shared `StatusBadge` primitive) — mirroring the same completion signal `/shop/manage/settings` already computes.
7. On the phone dashboard, find "Importar".
   → It's visible (not desktop-only) and routes to `/shop/manage/import` (the catalog importer). The settings page's own import banner is untouched and still links to `/shop/manage/settings/import` (store-configuration import) — a deliberately separate feature, not a duplicate door (see the scope note at the top of this doc).

If any step fails, note the step number + what you saw — that's the bug report.
