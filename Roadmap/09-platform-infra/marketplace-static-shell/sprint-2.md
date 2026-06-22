# Static marketplace shell — Sprint 2: Make the homepage a static CDN asset

**Status:** ✅ **SHIPPED 2026-06-22** — [PR #102](https://github.com/danybgoode/miyagisanchezcommerce/pull/102)
squash-merged `1c67cb6` (Daniel-authorized merge on green; branch deleted). `/` now prerenders as a
static CDN asset (`next build` reports `○ /` with `1m` ISR revalidate, **no `ƒ`**). Frontend (Vercel),
homepage + shared chrome. Risk: **MED** (raised to touch shared `PlatformShell` — see the key finding
below). Completes **Phase 1**. CI green (type-check+build · Playwright-vs-preview, full suite) + codex
cross-review (no blocking; 1 real should-fix applied — FavoriteButton hydrate-once, see below).
**Owed to Daniel:** live instant cold-load + signed-in heart-hydration eyeball on prod.

**Key finding (the real blocker S1 missed):** removing the page's `currentUser()` was **necessary but
not sufficient**. The shared `PlatformShell` chrome rendered Clerk's **server** `<Show when=…>` (+
`<UserButton>`), and Clerk's server `<Show>` calls `await auth()` → `headers()` — which forced the
whole `(site)` tree dynamic regardless of the page. Confirmed with `export const dynamic = 'error'`
(build failed: *"Route / … used `headers()`"* via Clerk `auth()`). **Fix (Daniel-approved, client-gate
everywhere):** a new client `app/components/AuthShow.tsx` replaces the server `<Show>` in
`PlatformShell` — it gates on the Clerk *client* session (`useAuth`), defaults to **signed-out** until
a session is confirmed (so the static HTML keeps the signed-out chrome the `nav-entry-points` /
`home-chrome` specs assert), and swaps to signed-in on hydration. Tradeoff: on the already-dynamic
`(shell)` pages the header's auth-dependent bits now hydrate client-side (a brief swap) instead of SSR.

**Also required for a build-safe static page:** because `/` is now prerendered at **build** time, a
thrown Medusa/Supabase fetch would fail the whole deploy — so the homepage's curated reads each
`.catch(() => fallback)` (degrade to the empty-state, self-heal on the next ISR revalidation). The
pulse read was wrapped in `unstable_cache` (CACHE.CATEGORY) to remove the last uncached dependency.

**Squash-merged `1c67cb6` (#102), 7 files:** `lib/neighborhood-pulse-server.ts` (cache pulse) ·
`app/components/AuthShow.tsx` + `PlatformShell.tsx` (client auth-gate) ·
`app/components/FavoritesProvider.tsx` + `FavoriteButton.tsx` (client heart hydration, hydrate-once) ·
`app/(site)/page.tsx` (de-personalize + `revalidate=60` + throw-safe reads) · `e2e/home-static.spec.ts`.

## Why
With the shell no longer forcing dynamic (S1), the only remaining blocker to a static homepage is the homepage's
own `currentUser()` + signed-in modules. Remove them → the curated homepage prerenders to a CDN asset → instant
load, **zero Vercel functions**, no cold-start. This is the direct fix for the ~30 s idle load.

## Stories

### Story 2.1 — De-personalize the homepage to the curated shell ✅
**As** any visitor, **I want** the homepage to be the same fast curated page, **so that** it serves instantly from
the CDN.
**Acceptance:**
- `app/(site)/page.tsx` (post-S1 path) drops `currentUser()` and the four signed-in modules (retoma rail, offer
  alerts, seller snapshot, server-seeded `favoritedIds`). It renders only the curated content
  (Selección / categories / vecindario strip) — already cached via `lib/cache-policy.ts`.
- The production build emits the homepage as **static / prerendered** (confirm in `next build` output — no `ƒ`
  function marker for `/`); a cold load is instant.
**Risk:** med (removing a personalization path; behavior change for signed-in users — by design, returns in Phase 2).

### Story 2.2 — Heart-states client-side (no server seeding) ✅
**As** a signed-in visitor, **I want** my favorites still reflected on the curated grid, **so that** de-personalizing
the render doesn't lose the heart state.
**Acceptance:**
- `FavoriteButton` reflects the user's favorite state **client-side** (it's already a client component) — either
  it self-fetches initial state on mount for signed-in users, or renders unfilled then corrects on hydration.
  No server-side `favoritedIds` query in the page render.
- Anonymous and signed-in both get the static page; the heart is a progressive enhancement.
**Risk:** low (isolated client component).

## Sprint QA
- **deterministic gate:** `tsc` + `next build` (assert `/` is static in the output) + Playwright `api` green.
- **api spec:** assert the homepage renders the curated content **anonymously** (the curated shell is now the
  whole page) — a read-only `request.get('/')` sees Selección/categories without auth.
- **browser smoke owed:** **Daniel** — the instant cold-load eyeball on the real homepage, and a signed-in load
  confirming the heart-states hydrate (no personalization modules, by design).

## Sprint 2 — Smoke walkthrough
_Numbered steps, one action + one expected result each. Steps 1–6 are the deterministic/CI gate (run in
the checkout off `feat/marketplace-static-shell-s2`). Steps 7–8 are the live confirmation **owed to
Daniel** (he holds the signed-in session + sees the real cold-load)._

**Deterministic gate (agent-run — this build):**
1. **Type-check.** `npx tsc --noEmit` → exits clean, no errors.
2. **Production build — THE load-bearing check.** `npm run build` → compiles, and the route table prints
   **`┌ ○ /`** with a `1m` revalidate column (static / ISR-prerendered, **no `ƒ`**). This is the proof the
   homepage is now a static CDN asset with zero per-request function. _(Locally the curated content
   prerenders to the empty-state because the sandbox can't reach Medusa — the `.catch(() => …)` reads
   degrade gracefully and the build still succeeds; on Vercel the build reaches the warm Medusa/Cloud SQL
   and prerenders real curated content.)_
3. **De-personalization (anonymous static HTML).** `curl -s http://<host>/` (or the spec) → the HTML
   contains the curated chrome (`home-ribbon`, `site-footer`, `¿Qué estás buscando?`,
   `vecindario-feed-entry`) and the signed-out CTAs (`Vende gratis`, `Publicar gratis`, `href="/sell"`),
   and contains **none** of `home-retoma-rail` / `home-offer-alert` / `home-seller-snapshot` /
   `home-seller-recruit` (the four signed-in modules are gone for everyone).
4. **New spec.** `playwright test --project=api home-static` → the "signed-in modules absent" test passes
   against any host; the "curated content renders" test passes where the catalog is non-empty (skips on an
   empty env, fails only where `/api/ucp/catalog` is unreachable — i.e. local-without-Medusa; CI is
   authoritative).
5. **Guardrail specs stay green.** `playwright test --project=api static-shell-split home-chrome
   home-icons home-curation nav-entry-points neon-egress-cache` → green. (The signed-out CTAs the
   nav-entry-points spec asserts still ship in the static HTML because `AuthShow` defaults to signed-out;
   `/sell` comes from the always-rendered `MobileTabBar` FAB.)
6. **Full `api` suite vs the branch preview (CI — authoritative).** CI's "Playwright vs preview" must be
   green against the `feat/marketplace-static-shell-s2` Vercel preview — the real gate (local can't reach
   Medusa; the SSO-gated preview needs the CI bypass secret). The two catalog-dependent tests
   (`home-static` curated-render + the pre-existing `static-shell-split` embed test) light up here.

**Live confirmation (owed to Daniel — on the prod homepage after merge):**
7. **Instant cold-load.** After ~30 min of no traffic, open `https://miyagisanchez.com/` → it paints the
   curated homepage **instantly** (no ~30 s cold-start), because `/` is served from the CDN as a static
   asset. _(Before this sprint the same idle-then-load took ~30 s.)_
8. **Signed-in heart hydration.** Sign in, then open `https://miyagisanchez.com/` → the page is the same
   curated shell (no retoma rail / offer alerts / seller snapshot — by design, returns in Phase 2), and on
   the Selección grid the hearts for listings you've favorited **fill in after load** (client-side
   hydration via `FavoritesProvider` → one `/api/favorites` call), with the header swapping to the
   signed-in chrome (Publicar / account menu / UserButton) a beat after paint.
