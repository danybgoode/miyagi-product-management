# Static marketplace shell — Sprint 4: Personalization client islands (Phase 2)

**Status:** 🏗️ **BUILT — pre-merge** ([PR #104](https://github.com/danybgoode/miyagisanchezcommerce/pull/104),
draft; branch `feat/marketplace-static-shell-s4` in `apps/miyagisanchez` — a **fresh** name off `main`, since the
old `feat/marketplace-static-shell` remote still holds S1's stale pre-squash commits).
Frontend (Vercel). Risk: **LOW** (client-side progressive enhancement on an already-static page; no
server function, no money mutation, degrades to nothing). Independent — S3 endpoint is already live.
**Completes the epic.**

**Gate (green, this build):** `tsc --noEmit` ✓ (exit 0) · `npm run build` ✓ — route table still prints
**`┌ ○ /`** (`1m` revalidate, **no `ƒ`**: the islands did NOT regress the homepage to a function) ·
`playwright --project=api home-personalization` ✓ (3 pure-logic tests) · the `home-static`
"four signed-in modules absent for an anonymous visitor" guardrail ✓ · the anonymous browser test ✓.
(The 2 catalog-dependent guardrails — `home-static` curated-render + `static-shell-split` embed — only
pass where `/api/ucp/catalog` is reachable; they fail in the sandbox-without-Medusa and are authoritative
on **CI-vs-preview**, per LEARNINGS / sprint-2.md.)

## What shipped (files) — branch `feat/marketplace-static-shell`
- `lib/home-personalization.ts` — pure, next-free seam: `HomePersonalization` wire-contract type +
  `priceLabel` / `favoriteConditionLabel` / `sellerModule`. `favoriteConditionLabel` re-derives the
  es-MX condition label because `lib/listings.ts conditionLabel` imports `next/cache` (not client-importable).
- `app/components/HomePersonalizationProvider.tsx` — `'use client'`; `useAuth()` → one fetch (not a poll)
  to `GET ${NEXT_PUBLIC_MEDUSA_STORE_URL}/store/home/personalization` with `x-publishable-api-key` +
  `Authorization: Bearer <clerk-jwt>`; exposes `{ data }` via context, `null` during SSR/loading/signed-out/error.
- `app/components/HomeRetomaOffers.tsx` — top slot: `home-retoma-rail` + `home-offer-alert`
  (runs the existing pure `deriveOfferAlerts`). Markup verbatim from the pre-S2 page.
- `app/components/HomeSellerModule.tsx` — bottom slot: `home-seller-snapshot` XOR `home-seller-recruit`
  per `sellerModule(...)`. Markup verbatim from the pre-S2 page.
- `app/(site)/page.tsx` — wrap the body in `<HomePersonalizationProvider>`; mount `<HomeRetomaOffers />`
  after the ribbon and `<HomeSellerModule />` before the terminal CTA. Page stays an async server component;
  no new server reads; `revalidate = 60` unchanged.
- `e2e/home-personalization.spec.ts` (api, Story 4.1) + `e2e/home-personalization.browser.spec.ts`
  (browser, Story 4.2).

**Commits (path-scoped):** S4.1 `36164e8` (islands) · S4.2 `626ce60` (browser spec).

> **Original status:** ⬜ Not started. Frontend (Vercel). Risk: MED — client islands layered onto the
> static homepage. Independent once S3 is live. Completes the epic.

## Why
With the static shell (Phase 1) and the Cloud Run personalization endpoint (S3) in place, re-add the signed-in
"welcome back" modules as **client islands** — progressive enhancement that never blocks the instant static page.

## Stories

### Story 4.1 — Retoma rail + offer alerts + seller snapshot as client islands
**As** a signed-in visitor, **I want** my recent favorites, offer alerts, and seller snapshot back on the homepage,
**so that** the static page still recognizes me.
**Acceptance:**
- Client components mount on the static homepage, get a **Clerk JWT client-side** (`useAuth`), call the S3 Cloud
  Run endpoint, and render the three modules — reusing the existing markup from the old `app/page.tsx` signed-in
  block (retoma rail, `deriveOfferAlerts` output, seller snapshot).
- **Degrade gracefully:** while loading, or if the endpoint is slow/unreachable, the islands render nothing
  (no layout shift that blocks the static content; the page is fully usable without them).
- Signed-out visitors render the plain static shell (islands no-op without a session).
**Risk:** med (client data-fetch + auth on a static page).

### Story 4.2 — Visibility-friendly, no-regression hydration
**As** the platform, **I want** the islands cheap, **so that** they don't reintroduce the cost we removed.
**Acceptance:**
- The fetch fires once on mount (not a poll); no `currentUser()` / server function returns to the homepage path.
- A browser spec asserts the island hydrates for a signed-in fixture and is absent/empty anonymously.
**Risk:** low.

## Sprint QA
- **deterministic gate:** `tsc` + `next build` (homepage **stays static** — the islands are client-only, the
  route must not regress to a function) + Playwright `api` green.
- **browser smoke (`*.browser.spec.ts`):** signed-in fixture sees the islands hydrate; anonymous sees the plain
  static shell. Authed fixture reads `MS_TEST_*` and skips gracefully when unset.
- **browser smoke owed:** **Daniel** — a real signed-in homepage load showing the modules return, served on the
  static shell.

## Sprint 4 — Smoke walkthrough
_Numbered steps, one action + one expected result. Steps 1–6 are the deterministic/CI gate (run in a
checkout of `feat/marketplace-static-shell`). Steps 7–8 are the live confirmation **owed to Daniel** (he
holds a signed-in prod session; the authed island fetch needs the prod origin per the CORS note in S3)._

**Deterministic gate (agent-run — this build):**
1. **Type-check.** `node_modules/.bin/tsc --noEmit` → exits clean (0), no errors.
2. **Production build — THE load-bearing check.** `npm run build` → compiles, and the route table prints
   **`┌ ○ /`** with a `1m` revalidate column (still static / ISR-prerendered, **no `ƒ`**). This is the proof
   the client islands did **not** regress the homepage back to a per-request function.
3. **Pure-logic spec (Story 4.1).** `playwright test --project=api home-personalization.spec` → the 3 tests
   (`priceLabel`, `favoriteConditionLabel`, `sellerModule`) pass — the islands' es-MX copy + module choice
   are covered without auth/network.
4. **No-regression guardrail.** `playwright test --project=api home-static` → "the four signed-in modules are
   absent for an anonymous visitor" passes (the islands render `null` server-side → the anonymous static HTML
   is unchanged). _(The sibling "curated content renders" test only passes where `/api/ucp/catalog` is
   reachable — it skips/fails in a sandbox-without-Medusa; CI-vs-preview is authoritative.)_
5. **Anonymous browser test (Story 4.2).** Build + `next start`, then
   `playwright test --project=browser home-personalization.browser -g anonymous` → after hydration settles,
   none of `home-retoma-rail` / `home-offer-alert` / `home-seller-snapshot` / `home-seller-recruit` render.
6. **Full `api` suite vs the branch preview (CI — authoritative).** CI's "Playwright vs preview" must be
   green against the `feat/marketplace-static-shell` Vercel preview — the real gate (local can't reach Medusa;
   the SSO-gated preview needs the CI bypass secret). The catalog-dependent guardrails light up here.

**Live confirmation (owed to Daniel — on the prod homepage after merge):**
7. **Signed-in islands hydrate.** Sign in, then open `https://miyagisanchez.com/` → the page paints the
   curated static shell **instantly**, and a beat later the personalization islands hydrate from the Cloud Run
   endpoint: if you have recent favorites the **retoma rail** appears near the top; an actionable pending offer
   shows an **offer alert**; and near the bottom you see **"Tu tienda esta semana"** (sellers with a shop) or
   **"¿Vendes algo?"** (no shop). _(Must be on the prod origin — the S3 endpoint's CORS allows
   `https://miyagisanchez.com` only, so on a `*.vercel.app` preview the island fetch is CORS-blocked and the
   modules stay absent; that's the documented degrade, not a bug.)_
8. **Still instant + graceful degrade.** Confirm the cold-load is still instant (the islands never block the
   static paint), and that a signed-in user with no favorites/offers/shop sees only the recruit card (no empty
   rails) — the islands hide every empty section.

---

## Epic close (after this sprint)
Run the epic Definition of Done (README): poster, `RETROSPECTIVE.md`, team memory + `MEMORY.md`, `LEARNINGS.md`
(the durable rule: the app shell was dynamic for **channel routing**, not just auth — a static homepage needed a
route-group split + middleware rewrite, not just dropping `currentUser()`). Set the README frontmatter
`status: shipped` and regenerate the board.
