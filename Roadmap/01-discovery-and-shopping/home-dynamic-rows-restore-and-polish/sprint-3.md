# Homepage dynamic rows — restore on prod + polish to spec — Sprint 3: Signed-out first-visit iteration — hero, Recién llegado, Pasillos, seller block

**Status:** ✅ merged `f77dda0` (PR #255, squash-merged to `main` 2026-07-15) — Daniel's
visual-design eyeball still owed (async, no auth/money path — see Sprint QA below)

> Reference mockup: `mercado-libre-search-results.png` (signed-out · primera visita). Hard rail:
> `/` stays an ISR static asset — every section below is server-rendered from cached reads or
> client-gated via `AuthShow`; no `currentUser()`/`headers()`.

## Stories

### Story 3.1 — Hero + trust badges (signed-out) ✅
**As a** first-time visitor, **I want** an instant read on what this place is ("Lo que tu barrio
vende, compra y recomienda") with trust badges (Compra protegida · Haz tu oferta · 0% comisiones),
**so that** I trust it enough to browse.
Replaces the thin ribbon *for signed-out* (2.1 already removed it signed-in — this supersedes the
ribbon entirely; reconcile with 2.1: hero is signed-out-only via `AuthShow`, prerendered). Copy as
new `home.hero.*` dictionary keys (admin-editable, es-MX); `home.ribbon` removed (nothing else read
it).
**Acceptance:** incognito `/` shows hero + 3 badges in the prerendered HTML; signed-in shows
neither hero nor ribbon. Static marker for `/` preserved.
**Risk:** low
**Commit:** `6ca63c4` (apps/miyagisanchez) — replaced `home-ribbon-auth.browser.spec.ts` with
`home-hero-auth.browser.spec.ts` (verified red on a deliberate testid mutation, then green); updated
the 3 other specs that asserted the real `home.ribbon` dictionary shape (`home-static`, `home-chrome`,
`home-announcement`, `copy-overrides-merge`).

### Story 3.2 — "Recién llegado al barrio" row ✅
**As a** visitor, **I want** the newest neighborhood listings with "Nuevo hoy" badges, **so that**
the marketplace feels alive.
**Finding during build: no new backend/lib/listings.ts function was needed.** `getRecentListings()`
already existed (`sort=reciente`, newest-first) — reused directly, over-fetching 12 to leave room
for dedupe. New pure `excludeIds()` in `lib/home-curation.ts` filters out anything already in
Selección; new `isNewToday()` (`<24h`) is a deliberately *tighter, distinct* window from the
existing `isRecentForBadge` (48h, used by the Selección grid's plain timestamp badge) — the
acceptance calls for same-day "Nuevo hoy," not a 48h window. "Ver todo →" links to
**`/l?sort=reciente`** (there is no `sort=newest` — `reciente` is the real newest-sort `SortOption`).
**Acceptance:** row renders in anonymous static HTML with newest listings; a listing published
today carries "Nuevo hoy"; no overlap with Selección. Pure-logic spec on the dedupe/badge seam.
**Risk:** low
**Commit:** `29827b8` (apps/miyagisanchez) — `excludeIds`/`isNewToday` added to
`e2e/home-curation.spec.ts` (each verified red on a deliberate mutation, then green); integration
assertion added to `home-static.spec.ts`.

### Story 3.3 — "Pasillos" chips with live counts ✅
**As a** visitor, **I want** category chips with counts (Electrónica 14 · Hogar y jardín 9 …),
**so that** I can dive into an aisle in one tap.
Reuse `getCategoryCounts` (already fetched on `/`) + extend `CategoryChips` with a count variant +
relabel the existing lead chip "Todo" → "Todas →" (no duplicate chip). Only categories with ≥1
active listing (existing rule).
**Finding during the full-suite gate run: a real bug, fixed same-sprint.** The first cut made the
whole chip rail vanish whenever `getCategoryCounts()` came back empty (a transient data gap, not
"zero categories have listings") — the lead chip and static category list used to be unconditional.
Fixed by falling back to the full static `CATEGORIES` list (no counts) whenever `counts` is empty,
so the browse-by-category rail never disappears. This also required updating a pre-existing,
now-stale assumption in `home-icons.spec.ts` (it hardcoded `iconoir-car`/`iconoir-home` as always
present; S3.3 intentionally filters to categories with real listings, so the guard now checks
generically for at least one Iconoir category glyph).
**Acceptance:** chips show label + count matching the Categorías section's numbers; tap →
`/l?category=<key>`. Existing chips elsewhere unchanged.
**Risk:** low
**Commits:** `594b13e` (apps/miyagisanchez) — new `home-static.spec.ts` assertion (verified red on a
deliberate mutation, then green); `de692ab` — the graceful-degradation fix + `home-icons.spec.ts`
update, found by the full deterministic gate run before merge (not by Daniel or a reviewer).

### Story 3.4 — Seller block + terminal CTA restyle ✅
**As a** would-be seller, **I want** "Pon tu puesto en el barrio" with the three reassurances
(gratis y sin comisiones · tu propio dominio · pagos protegidos) and "Abre tu tienda gratis",
**so that** browsing converts into selling.
Restyle/extend the existing signed-out terminal CTA (`AuthShow when="signed-out"`, same gating) to
the mockup's dark card; keep "Crear cuenta / Seguir explorando" as the final row, completely
untouched. Copy via `home.terminalCta.*` (unchanged) / new `home.sellerBlock.*` keys.
`data-testid="home-unete-signup"` survives — it's actually guarded by
`e2e/home-auth-leakage.spec.ts`, not `nav-entry-points.spec.ts` as this doc originally said (no
functional impact, just naming the right spec).
**Acceptance:** incognito bottom-of-page matches mockup structure; signed-in still gets
`HomeSellerModule` instead; existing specs green.
**Risk:** low
**Commit:** `adcf1af` (apps/miyagisanchez) — new `home-static.spec.ts` assertion, self-gated on the
block's own testid since it only renders when Selección is non-empty (verified red on a deliberate
href mutation, then green).

## Sprint QA
- **api spec(s):** `home-static.spec.ts` extended for hero / Recién llegado / Pasillos counts /
  seller block; `home-curation.spec.ts` extended for `excludeIds`/`isNewToday`; `home-chrome.spec.ts`,
  `home-announcement.spec.ts`, `copy-overrides-merge.spec.ts`, `home-icons.spec.ts` updated for the
  ribbon→hero rename and the counts-filtered chip rail; new `home-hero-auth.browser.spec.ts` replaces
  `home-ribbon-auth.browser.spec.ts`. `home-auth-leakage.spec.ts` (the real `home-unete-signup` guard)
  is byte-identical to `origin/main` — untouched, confirmed green.
- **browser smoke owed:** no auth/money path — fully anonymous surface, agent-verifiable end to end.
  Owed to Daniel: an async **visual-design** eyeball against the reference mockups (colors/spacing/
  layout — an agent can't judge visual fidelity, only structure/data correctness).
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ (`/` still prerenders `○` static,
  revalidate 1m) + Playwright `api` — full suite locally: 2245 passed, 7 pre-existing failures
  confirmed unrelated (2 curated-listings-empty-shaped + 5 launchpad-flag-state — the exact pattern
  Sprint 2 documented; both spec files diff byte-identical against `origin/main`, i.e. nothing this
  sprint touched).
- **cross-agent + fresh-reviewer review:** `node scripts/cross-review.mjs 255 --agent codex` posted an
  advisory pass (should-fix: chip label+count coupled to React's SSR comment-node serialization,
  addressed — `6be66cd`; two minor nits, one addressed via the same commit, one left as-is). The
  `pr-reviewer` subagent independently verified every claim against the diff/`origin/main` and
  returned **Approve**, flagging 5 `copy-overrides-*.spec.ts` fixtures still referencing the deleted
  `home.ribbon.*` key as harmless-but-stale example data — fixed same-sprint (`6be66cd`).
- **CI gotcha:** the first post-review push (`6be66cd`) had `Type-check + build` pass but `Playwright
  vs preview` time out after 10 min — Vercel never built a preview deployment for that commit at all
  (confirmed via `vercel ls`, no deployment appeared). An empty-commit retrigger (`4ce5f4d`) produced a
  normal ~7 min green run. One-off Vercel webhook gap, not a code issue — matches the existing
  LEARNINGS pattern for GitHub Actions occasionally not scheduling a run.
- **Merged:** squash-merged to `main` as `f77dda0`, PR #255, 2026-07-15. Branch deleted.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com in a private window.
   → Hero "Lo que tu barrio vende, compra y recomienda" + 3 trust badges at the top (no green
   ribbon anywhere).
2. Scroll once.
   → "Recién llegado al barrio" row with the newest listings; anything published today shows
   "Nuevo hoy". None of these repeat in "Selección de la semana" below.
3. Find the "Pasillos" chips.
   → Each chip shows a count; tapping "Electrónica <n>" lands on
   https://miyagisanchez.com/l?category=electronica with listings.
4. Scroll to the bottom.
   → Dark "Pon tu puesto en el barrio" card with "Abre tu tienda gratis", then
   "Crear cuenta / Seguir explorando".
5. Sign in and reload https://miyagisanchez.com.
   → Hero and seller block are gone; your rail (S1) and seller snapshot render instead.

If any step fails, note the step number + what you saw — that's the bug report.
