# Seller-portal rails foundation — Sprint 1: Shared primitives + feedback contract

**Status:** ✅ built 2026-07-10 — PR #208 (`feat/seller-portal-rails-foundation`), commits `c7c7b29` (S1.1)
+ `b075522` (S1.2). Deterministic gate green (`tsc` + `npm run build` + `npm run test:e2e`, 23 tests).
Daniel's live visual smoke (light/dark/calm + undo path) still owed — no money/auth path.

> Builds the primitives everything else adopts. No call-site sweep yet (that's Sprint 2) — here we create
> the components + the one feedback contract, and wire them into 1–2 reference call-sites to prove them.
> **Rails: R1, R2, R3, R6, R7.**

## Stories

### Story 1.1 — Shared look primitives (`<StatusBadge>` · `<Button>` · `<Card>`)
**As a** merchant, **I want** every status, button, and card in the portal to speak one visual language,
**so that** the portal reads as one product and doesn't break in dark/calm mode.
**Build:** `components/ui/StatusBadge.tsx`, `Button.tsx`, `Card.tsx` on the Design System v2 tokens only.
- `<StatusBadge>` maps every state to the 5 semantic tokens (+`-soft`) and encodes the **R1 order-lifecycle
  mapping**: paid→success "Nuevo" · pending_payment→warning · processing→info · shipped/in_transit→info ·
  delivered→success · completed→neutral · refunded/canceled→danger · ML source→promo (azafrán). No raw
  `green-100/indigo/purple/amber-50`.
- `<Button>` = one **R2 hierarchy**: `primary` (accent pill) · `secondary` · `ghost` · `danger` (filled,
  confirmation surfaces only). Kills the 4 hand-rolled shapes.
- `<Card>` = **R3 radii-by-role** (inputs `--r-sm` · rows/cards `--r-md` · panels/modals `--r-lg` · badges/
  primary buttons `--r-pill`). No literal radius values.
- **Fix `--color-subtle`**: define it in `globals.css` (or replace usage with `--bg-sunk`).
**Acceptance (Daniel-runnable):**
1. On an entitled test shop, open `/shop/manage/orders` — every status chip is one of 5 colors; no purple/
   indigo "En camino"; ML badge is azafrán, not yellow.
2. Toggle dark mode and calm mode — chips, buttons, and cards keep contrast (no white boxes, no invisible text).
3. Grep proof: `StatusBadge`/`Button`/`Card` render with zero literal radii and zero raw palette classes.
**Risk:** low

### Story 1.2 — Shared feedback primitives (one `<Toast>` + one `<Banner>`)
**As a** merchant, **I want** every action to tell me what will happen, that it's happening, and what
happened — with a way to undo — **so that** I trust the portal and never lose work to a silent failure.
**Build:** `components/feedback/Toast.tsx` + `Banner.tsx` (token colors, Iconoir icon slot, action slot,
correct `aria-live`). Implement the **R6 before/during/after** contract incl. the optimistic-apply → toast
+ **"Deshacer"** → revert-on-error path — lift the proven pattern from `ManageDashboard.tsx`'s optimistic
toggle. **Delete the 4 existing implementations** (ManageDashboard bespoke, `settings/_components/Toast.tsx`,
OrdersInbox gray result box, wizard inline banners) and re-point them at the shared primitive.

> **Built-vs-planned corrections (found during S1.1/S1.2, confirmed with Daniel before proceeding):**
> - The optimistic-toggle+revert pattern and its bespoke Toast are **not** in `ManageDashboard.tsx` — the
>   catalog-management epic's own Sprint 1 already moved the pause/activate grid into
>   `app/(shell)/shop/manage/catalogo/CatalogTable.tsx`. That's the real S1.2 delete/reference target;
>   `ManageDashboard.tsx` is now just a summary card + link.
> - There turned out to be **6 duplicate implementations, not 4**: `OfferInbox.tsx` and `OrderDetail.tsx`
>   each had their own bespoke toast the sprint doc didn't name — found and converted while wiring
>   `<StatusBadge>` into those same files.
> - `--color-subtle` had **3 call sites, not 1** (`OrdersInbox.tsx` ×2, `OrderDetail.tsx` ×1) — all generic
>   tag/pill chips, fixed with one `--bg-sunk` alias in `globals.css`.
> - All 3 toggle handlers in `CatalogTable.tsx` gained a genuine new "Deshacer" action on success (they
>   only had revert-on-error before) — a real behavior addition, not just a visual refactor.
**Acceptance (Daniel-runnable):**
1. Pause a listing on the dashboard → a single toast reads "«‹título›» — pausado · Deshacer"; clicking
   Deshacer restores it within ~2s.
2. Force a failure (offline/500) on that action → the optimistic change reverts and a banner/toast explains,
   in es-MX, what to do next.
3. Grep proof: no toast/banner JSX renders outside `components/feedback/`.
**Risk:** low

## Sprint QA
- **api spec(s):** pure-logic spec on the `<StatusBadge>` order-status→token mapping (`e2e/` or a colocated
  unit spec — free coverage, no network); extend `e2e/seller-mode.spec.ts` to assert **≤1 `.btn-primary` per
  route** (R2) on `/shop/manage` + `/shop/manage/orders`.
- **browser smoke owed:** yes, to Daniel (visual only — no money/auth path): dashboard + orders inbox in
  light/dark/calm; the undo path on a pause toggle.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the Vercel preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/shop/manage/orders (as an entitled seller).
   → Every order status chip is one of five colors; "En camino" is blue (info), not purple; an ML order's
     source badge is azafrán (promo), not yellow.
2. Switch the device/app to dark mode, reload the same page.
   → No white cards, no invisible text; chips and buttons keep their contrast.
3. Go to https://miyagisanchez.com/shop/manage/catalogo (the pause/activate toggle lives in the Catálogo
   table, not the `/shop/manage` dashboard summary card) and click the pause icon on any active listing.
   → One toast appears: "Anuncio pausado. · Deshacer".
4. Click "Deshacer" in that toast within 4s (auto-dismiss window).
   → The listing returns to Activo within ~2s; no page reload needed.
5. (Optional, forces the failure path) Turn on airplane mode, pause a listing.
   → The change reverts and a message in es-MX says what happened and what to do — no silent failure, no dead end.
6. Go to https://miyagisanchez.com/shop/manage/offers and accept or decline any pending offer.
   → A toast confirms the result (this surface's own bespoke toast was found + converted mid-sprint, not
     originally in scope — same shared `<Toast>` now).

If any step fails, note the step number + what you saw — that's the bug report.
