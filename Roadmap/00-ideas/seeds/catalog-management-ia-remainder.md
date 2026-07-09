---
title: "IA restructure remainder (F5/F6/F7) — folds into catalog-management"
slug: catalog-management-ia-remainder
status: scaffolded
area: "03"
type: feature
priority: wave-1
risk: high        # inherits catalog-management's HIGH epic tier (Daniel merges); intrinsic story risk LOW–MED
epic: "03-selling-and-shops/catalog-management"
build_order: null
updated: 2026-07-09
---

# Scope — P1·C · IA restructure remainder (F5, F6, F7)

> **This is NOT a new epic.** It folds into the in-flight **`03-selling-and-shops/catalog-management`**
> epic as **two new sprints (S5 + S6)**. This seed is the Definition-of-Ready artifact for those sprints —
> the gate. On sign-off, S5/S6 get hand-added to the catalog-management epic (README scope table +
> `sprint-5.md`/`sprint-6.md`), **not** scaffolded as a standalone epic. The umbrella seed
> `seller-portal-ux-audit.md` (P1·C section) stays the umbrella pointer.
>
> **Sequencing (hard):** groom + build **AFTER catalog-management S3 merges** so nav/shell work doesn't
> collide with S3's open PRs. S3 is BUILT, PRs open in both repos, **HIGH — Daniel merges** (not yet
> merged as of 2026-07-09). S4 (profit columns) is independent (gated on profit-analyzer US-4) and touches
> the *table*, not nav/shell — S5/S6 and S4 don't fight over files, but S5/S6 still wait for S3's merge.

## The ask (mirrored back)
*You want the remaining IA gaps from the July-2026 audit — the ones NOT already shipped by
catalog-management S1 — closed as a fast-follow inside the same epic: nav that never 404s, a real seller
frame over publishing, a usable mobile bar, and the 62KB Canal mega-section broken up. Right?*

## Stage-2.5 bucket — light-enhancement / sweeper (mostly), one structural refactor
The **4-group rail (Operar/Catálogo/Crecer/Configuración) + the real `/shop/manage/catalogo` route already
shipped** in catalog-management S1.1/S1.2 (merged 2026-07-08). So NAV-IA-SPEC's change list is **mostly
done** — this is the *remainder*. All of it rides the existing `lib/seller-nav.ts` SSOT + `SellerNav.tsx` +
the shell layout. Nothing here is net-new commerce; it's presentation/IA/chrome. F6 (seller shell over
`/sell`) is the one genuine *structural* change (a shared-layout touch), which is why it's isolated in S6
with plan-mode + a cross-agent-panel offer.

## What already exists (reuse, don't rebuild — Medusa-first = frontend-first here)
- **`lib/seller-nav.ts`** — the nav SSOT (4 groups, mobile primary/overflow arrays, active-matcher,
  breadcrumb deriver). **Extend** with an optional per-entry `flag` field + mobile grouping metadata; do
  **not** fork.
- **`SellerNav.tsx`** — renders the desktop rail + the mobile bottom bar + "Más" sheet from the SSOT.
  Extend it (add the FAB, the grouped sheet, the badge relay); it already has the "Más" disclosure spine.
- **`lib/seller-pending-summary.ts`** — the pure es-MX pending-count helper (Pedidos/Ofertas). It is the
  **badge feed** for the mobile relay — reuse, don't recompute.
- **`lib/flags.ts` `isEnabled()`** — the *same* server-side gate the pages use. Resolve the enabled set in
  the manage layout (server) and pass it to the client `SellerNav`; the nav filter must consume the
  identical flag, so an entry can't render for a page that `notFound()`s.
- **`lib/seller-mode.ts` `isSellerModePath`** — stays **pure + path-only** for `/shop/manage/*` (the api
  spec loads it directly). `/sell` needs an **owner-aware** branch — do NOT jam ownership into the pure
  predicate (see F6 note).
- **`app/(shell)/layout.tsx`** suppression branch + **`app/(shell)/shop/manage/layout.tsx`** seller shell
  (dark brand top bar + rail/bar). Extract the shell into a shared component so `/sell` can render it too.
- **`app/(shell)/shop/manage/settings/_sections/Canal.tsx`** (1117 lines) + **`lib/shop-settings/taxonomy.ts`**
  — the split seams for F7.
- **`e2e/seller-mode.spec.ts`** — extend (don't fork); it already asserts nav↔route parity + the
  `isSellerModePath` truth table.
- **Precedents:** `seller-nav-consolidation` (nav SSOT + grep-to-zero fs-guard), `shop-settings-refactor`
  (anti-monolith guard + "prove unreachability / grep the *type* imports" playbook for the Canal split),
  `navigation-settings-reorg` (the `isSellerModePath` gate + the buyer PWA "Publicar ⊕" FAB pattern to
  mirror), `marketplace-static-shell` (the `(site)`/`(shell)` route-group + auth-in-layout dynamics that
  govern F6).

## Research (present-day facts confirmed against `main`)
- **Ganancias 404 root cause (R13/F7):** `/shop/manage/profit/page.tsx` does `if (!(await
  isEnabled('ops.profit_enabled'))) notFound()` with `export const dynamic = 'force-dynamic'`; the rail
  entry `ganancias` in `lib/seller-nav.ts` renders unconditionally → dead-end when the flag is off. The
  fix is nav-side flag parity, not a page change. *(LEARNINGS: flag→notFound→force-dynamic, profit-analyzer
  S1, 2026-07-06.)*
- **F6 is more than "extend `isSellerModePath`."** `/sell` + `/sell/setup` live under `app/(shell)/sell/`,
  a **sibling** of `app/(shell)/shop/manage/`, so the seller shell (rendered by the manage layout) does
  **not** wrap them today. And "signed-out keeps buyer chrome" means the suppression must be
  **ownership/auth-aware**, which the pure path predicate can't know. So F6 = (a) an owner-aware branch in
  `app/(shell)/layout.tsx` (it already reads `headers()`; `(shell)` is already dynamic, so an `auth()`
  owner check is safe per the marketplace-static-shell learning), plus (b) a shared seller-shell component
  rendered over `/sell` for owners. This is the shared-`layout.tsx` blast-radius touch LEARNINGS warns to
  announce.
- **Canal.tsx = 1117 lines / 62KB** confirmed; the "Canales" rail entry currently points at
  `/shop/manage/mercadolibre` (the ML page), whereas NAV-IA-SPEC's target Canales absorbs
  ML + dominio/subdominio/embed/agents into one federation home.

## The slices — two sprints inside catalog-management

### Sprint 5 — Nav SSOT layer: flag-safe nav · mobile bar · one import door
*The fast, high-visibility, low-risk cluster — all of it flows through the nav SSOT + `SellerNav.tsx`.*

- **S5.1 — Flag-safe nav parity (R13, F7).**
  *As a seller, I want nav entries to appear only when their page actually exists, so that I never tap a
  rail/sheet item into a 404.* `SellerNavEntry` gains an optional `flag: FlagKey`; the manage layout
  resolves the enabled set server-side via the **same `isEnabled()`** the pages use and passes it down;
  `SellerNav` filters on it. Ganancias carries `ops.profit_enabled` → hidden when off. **Acceptance:** with
  `ops.profit_enabled` OFF, no Ganancias entry in rail/mobile sheet and `/shop/manage/profit` still
  `notFound()`s; ON, the entry appears and resolves 200. Pure filter fn unit-spec'd. **Risk: LOW.**
- **S5.2 — Mobile bar redesign (F5).**
  *As a seller on a phone, I want a Publicar action and a sanely-grouped "Más", so that every dashboard
  action is reachable in ≤2 taps.* Rebuild the mobile bar to **Resumen · Pedidos(badge) · ⊕ Publicar FAB
  (center, 46px, accent) → `/sell` · Catálogo · Más(badge relay)**. "Más" sheet is **grouped with headers**
  (Operar remainder incl. Ofertas w/ badge · Crecer grid · Configuración w/ status pill · "Ver tienda
  pública" link) — no ungrouped junk drawer. Any badge hidden inside "Más" **relays** onto the "Más"
  trigger (info color), fed by `lib/seller-pending-summary.ts`. **Acceptance:** ≤5 slots; every
  Crecer/Config destination reachable ≤2 taps; a pending Ofertas badge shows on "Más" when Ofertas is in
  the sheet; FAB lands on `/sell`. **Risk: LOW–MED.** Browser smoke (real phone) owed to Daniel.
- **S5.3 — One import door + mobile restore (F7, change #3).**
  *As a seller, I want a single Importar home reachable on mobile, so that import isn't three doors and
  isn't desktop-only.* Dashboard "Importar" + the settings banner become **links into
  `/shop/manage/import`**; remove the `hidden sm:inline-block` that hides Importar on mobile.
  **Acceptance:** the dashboard Importar control is visible + tappable at 390px and routes to
  `/shop/manage/import`; no second/third import entry point remains. **Risk: LOW.**

### Sprint 6 — Structural refactor: seller shell over `/sell` · Canal split
*The two changes that touch shared surface — isolated here for plan-mode + cross-panel care.*

- **S6.1 — Seller shell over `/sell` + `/sell/setup` (F6).**
  *As a shop owner, I want publishing to happen inside the seller frame, so that I don't get flipped into
  buyer chrome (search/cart) at the moment of max concentration.* Extract the seller shell into a shared
  component; add an **owner-aware branch** to `app/(shell)/layout.tsx` so `/sell` + `/sell/setup` render
  the seller shell **for signed-in shop owners**; **signed-out `/sell` keeps buyer chrome** (acquisition —
  owned by `/vende` epic). White-label double-suppression guarantee unchanged. **Acceptance:** authed owner
  on `/sell` sees the seller top bar + nav, no buyer search/cart; signed-out `/sell` is unchanged (buyer
  chrome); `isSellerModePath` purity spec still green. **Risk: MED** (shared `layout.tsx`; Daniel merges —
  epic is HIGH-tier). Authed browser smoke owed to Daniel; the signed-out case works anonymously (browser
  spec). **Plan-mode + a cross-agent-panel offer** on the chrome-gate approach (an expensive-to-reverse
  shared-layout fork).
- **S6.2 — Split `Canal.tsx` (F7, change #7).**
  *As a seller, I want channels and support to be separate homes, so that a 62KB mega-section isn't one
  wall.* Split the 1117-line `Canal.tsx`: **federation (dominio/subdominio/embed/agents) → a Canales page**
  under Catálogo; **the support widget → its own settings card**. Update `lib/shop-settings/taxonomy.ts`.
  Follow the shop-settings-refactor playbook: **prove the old mega-section unreachable** (grep the *type*
  imports, exhaustive registry) before deleting, then lock with an **anti-monolith guard** (fs-guard fails
  CI if a >N-line Canal section reappears). **Acceptance:** Canales page renders the federation sections;
  support card renders in settings; no behavior change; anti-monolith guard green. **Risk: MED** (Sweeper —
  same behavior, less code, no regressions).

## Risk tier & kill-switch (Stage 6b)
**Intrinsic story risk: LOW–MED.** Nothing here touches payments / checkout / fulfillment / auth / DB
migrations / money. **But it folds into a HIGH-tier epic and S6.1 touches shared `layout.tsx`** → per the
epic's discipline and "when unsure, high," **Daniel merges S5 + S6** (same as the epic's other sprints).

**Kill-switch decision — carve-out (recommended), with one flag to weigh at sign-off:**
- *Is there a runtime seam a kill-switch can gate?* For the nav/mobile/import/Canal work: **no money/commerce
  seam** — a bad nav/shell/refactor change is a **rendering regression caught by CI + the branch preview**,
  reverted with `git revert`, not a runtime flag. **Carve-out.** (S5.1 *consumes* existing flags —
  `ops.profit_enabled` — it doesn't add one.)
- **One recommendation to decide (S6.1):** because the owner-aware chrome branch in `layout.tsx` has
  real blast radius (a regression there degrades every page), you *could* gate it behind a kill-switch flag
  — e.g. `seller.shell_on_sell_enabled`, default **`true`**, created **enabled** in every env (a true
  kill-switch: disabling instantly reverts `/sell` to buyer chrome without a redeploy). Server seam only
  (Flagsmith, not Edge — the branch is in a server layout, not `middleware.ts`). **Recommend, you decide at
  the gate:** flag the shell branch (safety valve on a shared-surface change) vs carve-out (revert-only, one
  less flag to seed). Not auto-injected.

## QA / smoke (WAYS-OF-WORKING — every story names a stage)
- **Specs (extend `e2e/seller-mode.spec.ts`, don't fork):** flag-off ⇒ Ganancias entry absent, flag-on ⇒
  present + 200 (S5.1); mobile bar ≤5 slots, every Crecer/Config destination ≤2 taps, badge relay surfaces
  on "Más", FAB→`/sell` (S5.2); Importar link resolves + not `hidden` on mobile (S5.3); `/sell` renders the
  seller shell for an owner and buyer chrome when signed-out (S6.1); Canales page + support card render, and
  the **anti-monolith fs-guard** on Canal (S6.2). Pure-logic specs on the new nav filter fn + mobile
  grouping (free coverage).
- **Browser smoke owed to Daniel:** the mobile bar on a real phone (S5.2) and the **authed** owner-shell on
  `/sell` (S6.1 — he holds the seller session). The signed-out `/sell` and the anonymous nav assertions run
  in the browser project without a login.
- **Deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before each merge.

## Scope
**In (this fold-in, S5 + S6):** flag-safe nav parity (R13); the mobile bar (Publicar FAB + grouped "Más"
sheet + badge relay); one import door + mobile restore; the seller shell over `/sell` + `/sell/setup` for
owners (signed-out keeps buyer chrome); the Canal.tsx split (Canales page + support card). es-MX copy
throughout (AGENTS rule 5). One api/spec per testable story + the sprint smoke walkthroughs.
**Out:** the emoji/icon dialect (folds into `emoji-to-iconoir-sweep`, not here); anything already shipped in
catalog-management S1 (4-group rail, `/shop/manage/catalogo` route); the S4 profit columns (its own
sprint); any Medusa/Supabase backend change (this is frontend/chrome only); re-auditing the buyer surface.
**Decide at sign-off (below).**

## Decisions at the scope-doc gate — RESOLVED (Daniel, 2026-07-09, "approved")
1. **Money-first dashboard header stats (NAV-IA-SPEC change #8).** → **OUT of this fold-in** (dashboard
   content, not IA/nav plumbing — deferred to P2·E depth pass or its own light story).
2. **Sprint split.** → **2 sprints** as scoped: S5 (nav SSOT layer) + S6 (shared-surface refactor).
3. **S6.1 kill-switch.** → **Flag it:** `seller.shell_on_sell_enabled`, kill-switch polarity, default
   `true`, created **ENABLED** in every env (server seam, Flagsmith).

## Definition of Ready check
- [x] As-a/I-want/so-that per story; acceptance Daniel-runnable.
- [x] Stage-2.5 bucket named (light-enhancement/sweeper + one structural refactor).
- [x] v1 in/out boundary written; 3 open decisions surfaced for the gate.
- [x] Medusa-first/reuse list produced (seller-nav SSOT · SellerNav · pending-summary · `isEnabled` · shell
      layout · Canal seams · seller-mode predicate · precedents).
- [x] Each story risk-tiered; QA stage named; smoke owner = Daniel (mobile + authed owner-shell).
- [x] Kill-switch decision recorded (carve-out + one recommended flag for S6.1 to weigh).
- [x] Sequencing recorded: build AFTER catalog-management S3 merges.
- [x] **Daniel approved this scope doc (2026-07-09)** ← gate passed. S5 + S6 hand-added to the
      catalog-management epic (README scope table + deploy order + `sprint-5.md`/`sprint-6.md`); the two
      per-sprint Claude Code kickoffs emitted. No standalone-epic scaffold (folds into the existing epic).
