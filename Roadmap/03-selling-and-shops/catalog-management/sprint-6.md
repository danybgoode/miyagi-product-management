# Catalog management — Sprint 6: Structural refactor (seller shell over `/sell` · Canal split)

**Status:** ✅ BUILT, PR open — [FE PR #219](https://github.com/danybgoode/miyagisanchezcommerce/pull/219), branch `feat/catalog-management-s6` off `origin/main`. HIGH epic tier ⇒ **Daniel merges**, pending his live smoke (below) + review.

> P1·C IA restructure remainder (F6/F7) — the seller-portal UX audit fold-in. Scope seed:
> [`00-ideas/seeds/catalog-management-ia-remainder.md`](../../00-ideas/seeds/catalog-management-ia-remainder.md).
> These are the two structural changes isolated out of S5: a shared-`layout.tsx` touch and a
> 1074-line file split. Folds into this HIGH epic ⇒ Daniel merges. **Cross-agent planning panel run
> on 6.1** (an expensive-to-reverse chrome-gate fork) — `node scripts/cross-panel.mjs` (both lenses,
> codex) ran on the finalized design BEFORE any layout code was written. Both lenses agreed the
> root-layout touch + the extraction were the right composition; the one real, adjudicated finding
> (below) was folded into the build.

> **Nav-label decision (confirmed with Daniel during planning, not the scope doc's original literal
> wording):** the existing `lib/seller-nav.ts` Catálogo-group entry `{ key: 'canales', label:
> 'Canales' }` was already repointed at the Mercado Libre connection-status page by Sprint 1 (a
> pre-existing rename this sprint's research surfaced mid-plan, not anticipated by the scope doc).
> Rather than invent a second, awkward "Canales"-adjacent label for the new federation page, "Canales"
> now points at federation (`/shop/manage/canal-propio`) and Mercado Libre gets its **own** new nav
> entry (`label: 'Mercado Libre'`) instead of sharing the old one.

## Stories

### Story 6.1 — Seller shell over `/sell` + `/sell/setup` (F6) ✅ built
**As a** shop owner, **I want** publishing to happen inside the seller frame, **so that** I'm not flipped into buyer chrome (search/cart) at the moment of max concentration.
**Acceptance:** for a **signed-in shop owner**, `/sell` and `/sell/setup` render the seller shell (dark brand top bar + `SellerNav`), no buyer search/cart. **Signed-out `/sell` keeps buyer chrome** (acquisition — owned by the `/vende` epic). The white-label double-suppression guarantee is unchanged (a manage/sell page on a custom domain/subdomain still defers to `ChannelLayout`). `isSellerModePath` stays a **pure path predicate** (its api spec stays green, unchanged — still asserts `isSellerModePath('/sell') === false`) — ownership is decided in the layout, not in the predicate.
**Risk:** MED — touches the shared `app/(shell)/layout.tsx` chrome decision (blast radius: every page). Daniel merges.
**Kill-switch:** `seller.shell_on_sell_enabled` — **kill-switch polarity, default `true`, created ENABLED in every env**. *(Correction from the original scope doc: the flag lives in `lib/flags.ts` / the Supabase `platform_flags` table, NOT Flagsmith — Flagsmith was fully decommissioned 2026-07-01 by the `feature-flags-inhouse` epic, before this sprint scoped. Seeded via a migration in this PR, same mechanism as every other flag in the app.)* Disabling instantly reverts `/sell` to buyer chrome without a redeploy. The owner-aware branch is gated in `lib/seller-shell-gate.ts`'s `sellShellEligible()`.
**As built:** (1) extracted the seller shell into `app/(shell)/shop/manage/_components/SellerShellChrome.tsx` (both `shop/manage/layout.tsx` and the new `sell/layout.tsx` render it — a pure, behavior-preserving refactor of already-shipped S5 nav/badge logic, verified byte-identical before wiring the new branch); (2) new `lib/seller-shell-gate.ts` (`isSellShellCandidatePath` — pure, exact `/sell`/`/sell/setup` match, next-free like `lib/seller-mode.ts` so the api spec can load it directly — plus `sellShellEligible()`, React `cache()`-memoized per request); (3) new `app/(shell)/sell/layout.tsx` mirrors `shop/manage/layout.tsx`'s whiteLabel-defer shape; (4) root `app/(shell)/layout.tsx` adds `ownerSellShellEligible` as an additional OR-term into the buyer-chrome suppression check — `isSellerModePath`/`sellerMode` themselves untouched.
**Cross-panel finding, adjudicated:** both lenses flagged that the gate's own live Medusa `/store/sellers/me` ownership check would duplicate the identical call `/sell/page.tsx` already makes inline. Fixed by extracting one shared, `React.cache()`-wrapped `lib/get-my-seller.ts` — both the gate and `/sell/page.tsx` now share ONE Medusa round-trip per request instead of two.
**Reuse:** `app/(shell)/shop/manage/layout.tsx` shell markup (now `SellerShellChrome.tsx`); `lib/seller-mode.ts` (unchanged, stays pure); the `navigation-settings-reorg` `isSellerModePath` precedent.

### Story 6.2 — Split `Canal.tsx` (F7, change #7) ✅ built
**As a** seller, **I want** channels and support to be separate homes, **so that** a 62KB mega-section isn't one wall.
**Acceptance:** the 1074-line `settings/_sections/Canal.tsx` is split — **federation (dominio/subdominio/embed/agents) → a new `/shop/manage/canal-propio` page** under Catálogo; **the support widget → its own settings card** (`/shop/manage/settings/apoyo`). `lib/shop-settings/taxonomy.ts` updated. No behavior change (Sweeper: same behavior, less code, no regressions). The **anti-monolith guard** (already existed from `shop-settings-refactor` — this sprint tightened its cap, not built a new mechanism) fails CI if a settings component exceeds the new line cap.
**Risk:** MED (Sweeper)
**As built:** followed the `shop-settings-refactor` playbook — grep confirmed `CanalInitial` has **zero external type importers** (only `[section]/page.tsx`'s default-export import), so the type-relocation risk that bit the original `ShopSettings.tsx` decommission didn't apply here. Moved `EmbedSnippetSection.tsx`, `SubdomainSection.tsx`, `DomainPaywallUpsell.tsx`, `DomainCadenceField.tsx`, `PromoterCodeField.tsx` into `canal-propio/` (each confirmed imported only from the Canal cluster). New `_sections/Apoyo.tsx` (`slug: 'apoyo'`, `manual: false`, `group: 'integraciones'`) replaces the retiring `canal` taxonomy entry. `settings/[section]/page.tsx` redirects the old `/settings/canal` URL to `/canal-propio` rather than 404ing a bookmarked DNS-instructions link. `MAX_SETTINGS_COMPONENT_LINES` tightened **1200 → 900** — verified via a real `wc -l` scan post-split (`Envios.tsx` at 668 lines is now the largest remaining settings file, same "cap above the largest file with headroom" principle the original 1200 used). Companion-edit checklist completed: `lib/design-token-audit.ts`'s raw-color allowlist + `enforcedSweptPaths` reassigned to the new file paths; two API routes' paywall error copy (`app/api/sell/shop/domain{,/cloudflare}/route.ts`) updated from stale "Ajustes → Canal" to "Catálogo → Canales"; `e2e/shop-settings-money-sections.browser.spec.ts` split into two tests matching the two new surfaces.
**Reuse:** `lib/shop-settings/taxonomy.ts`; the `shop-settings-refactor` anti-monolith guard spec + decommission playbook; `mercadolibre/page.tsx`/`collections/page.tsx`'s server/client page-split pattern for the new `canal-propio/page.tsx`.

## Sprint QA
- **api spec(s):** `e2e/seller-mode.spec.ts` — new `isSellShellCandidatePath` describe block (6 tests: exact `/sell`/`/sell/setup` match, sibling `/sell/edit`/`/sell/print` routes unaffected, unrelated routes false); existing `isSellerModePath` block unchanged/green; `REAL_MANAGE_ROUTES` + the Catálogo-entries label assertion updated for the 5-entry group (Anuncios/Colecciones/Canales/Mercado Libre/Importar catálogo) (6.1+6.2). `e2e/shop-settings-no-monolith.spec.ts` green against the new 900-line cap (6.2).
- **browser smoke owed:** yes, to Daniel — the **authed** owner-shell on `/sell`+`/sell/setup` and the flag-OFF instant-revert (6.1, he holds the seller session); the federation page's live DNS-poll/Cloudflare-autoconfig flow and the Apoyo card's save round-trip (6.2). The signed-out `/sell` (buyer chrome) case runs anonymously in the browser project.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` all green (`seller-mode.spec.ts` 32/32, `shop-settings-no-monolith.spec.ts` 5/5). Full `api` suite run: only 3 pre-existing failures, all unrelated to this sprint's files (`home-static.spec.ts`, `home-auth-leakage.spec.ts`, `launchpad-campaign-vote.spec.ts`) — confirmed present on unmodified `origin/main` before this branch touched anything.

## Sprint 6 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (PR #219) pre-merge · https://miyagisanchez.com once merged.

1. **(owed to Daniel — authed)** Signed in as a shop owner, open `/sell`.
   → You see the seller frame (dark "Miyagi Sánchez · Vendedor" top bar + the seller nav), **not** the buyer header/search/cart. Same on `/sell/setup`.
2. Open `/sell` in a private window (signed out).
   → Buyer chrome (search/cart) renders as before — the acquisition path is untouched.
3. Flip `seller.shell_on_sell_enabled` OFF in `/admin/flags` (or directly in the `platform_flags` table), reload `/sell` as the owner.
   → `/sell` reverts to buyer chrome instantly (kill-switch works, no redeploy). Flip it back ON.
4. Open a shop on its own custom domain / subdomain and go to a manage page (e.g. `/shop/manage`).
   → The branded channel shell still owns the chrome — no stacked/double shell (the white-label guarantee held).
5. From the seller rail (or the "Más" mobile sheet), open **Catálogo → Canales**.
   → Lands on `/shop/manage/canal-propio`: the free URL/slug card, the subdomain section, and the custom-domain connect flow (or the paywall upsell if not entitled) all render exactly as they did in the old Configuración → Canal propio section. Try the DNS-record "Copiar valor" button and, if you have a real domain handy, the connect flow through to DNS-poll — no page-level "Guardar cambios" bar here (each action already saves inline via its own endpoint, unchanged from before).
6. Also from Canales, confirm the embed snippet generator (bottom of the page) renders and its live preview still works.
7. Open Configuración → **Apoyos y propinas** (was inside "Canal propio" before this sprint).
   → The support-widget card renders (enable toggle, preset amounts, min/max range, visibility). Toggle a value, hit "Guardar cambios" → toast confirms the save round-trip still works.
8. From the seller rail, confirm **both** "Canales" (→ Canales/domain page) and **"Mercado Libre"** (→ the ML connection-status page, unchanged) appear as separate Catálogo entries — desktop rail and the mobile "Más" sheet's Catálogo group.
9. Visit the old URL directly: `/shop/manage/settings/canal`.
   → Redirects to `/shop/manage/canal-propio` (no 404 for an old bookmark/shared DNS-instructions link).

If any step fails, note the step number + what you saw — that's the bug report.
