# Retrospective — Static marketplace shell

**Area:** 09-platform-infra · **Risk:** med→high (S1/S3) · **Span:** 4 sprints, 2026-06-22
**Outcome:** the marketplace homepage went from a **~30 s per-request Vercel cold-start** to a
**static CDN asset** (zero functions), with signed-in personalization restored **from GCP** as
client islands — no Vercel function reintroduced.

## What shipped
- **S1 — route-group split** (PR #101 `a1e6ea4`): a header-free, static-able marketplace `(site)`
  tree vs a dynamic `(shell)` tree. **Option A** — middleware unchanged, because channels already
  rewrite `/`→`/s/[slug]` into `(shell)`. The channel suite (own-shop-seo, embed, ChannelLayout,
  nav-entry-points) stayed green through the restructure.
- **S2 — static homepage** (PR #102 `1c67cb6`): dropped `currentUser()` + the four signed-in
  modules; replaced Clerk's **server** `<Show>` in the chrome with a client `AuthShow` (the real
  blocker — server `<Show>` calls `auth()`→`headers()`, forcing the whole `(site)` tree dynamic).
  `next build` now emits `○ /`. Heart-states hydrate client-side via `FavoritesProvider`.
- **S3 — personalization endpoint** (backend #34 `49057b9`): `GET /store/home/personalization`
  on Cloud Run — a **real jose-JWKS Clerk-JWT verify** (not the forgeable decode-only helper),
  read-only Supabase favorites/offers + native Medusa seller snapshot, returns **raw data** so the
  frontend keeps es-MX copy single-source. Live `medusa-web-00109-w6m`; agent smokes green.
- **S4 — client islands** (PR #104): `HomePersonalizationProvider` gets a Clerk JWT client-side and
  does **one fetch** (not a poll) to the S3 endpoint; `HomeRetomaOffers` + `HomeSellerModule` slots
  render the data and **no-op otherwise**, so `/` stays static. Pure `lib/home-personalization.ts`
  seam (priceLabel / favoriteConditionLabel / sellerModule); offer copy via the existing pure
  `deriveOfferAlerts`. Markup recovered verbatim from the pre-S2 page.

## What went well
- **The phasing held.** Phase 1 (S1+S2) delivered the instant homepage and stood alone; Phase 2
  (S3+S4) restored personalization without touching that win. Each phase was independently shippable.
- **Reuse over rebuild.** S4 wrote almost no new markup — it recovered the four modules verbatim from
  `a1e6ea4^` and reused the pure `deriveOfferAlerts` + the `FavoritesProvider`/`AuthShow` client idiom.
- **The static invariant was a build-output gate, not a vibe.** Every sprint re-checked `next build`
  prints `○ /` (no `ƒ`) — the one assertion that proves the homepage is still function-free.
- **Cross-agent review earned its keep.** Codex flagged a real **stale-personalization leak** (sign-out
  / account-switch kept the prior user's data) as blocking; Antigravity independently confirmed it and
  added a `priceLabel` RangeError guard + seller-stat `?? 0` hardening — all fixed before merge.

## What we learned (promoted to LEARNINGS.md)
- **The app shell was dynamic for *channel routing*, not just auth.** Dropping `currentUser()` from the
  page was necessary but not sufficient — the shared `layout.tsx`/chrome read `headers()` (channel
  detection) and Clerk's **server** `<Show>` called `auth()`→`headers()`. A static-first homepage needed
  a **route-group split** (static tree vs dynamic channel tree) + **client-gating** the auth chrome,
  not just a page edit. Confirm with `export const dynamic = 'error'` — it names the exact dynamic API.
- **A cross-origin personalization endpoint must allow the calling origin, or the client island silently
  degrades.** The S3 endpoint's CORS allows the **prod** origin only, so the S4 island fetch is
  CORS-blocked on a `*.vercel.app` preview and renders nothing — meaning the **authed hydration smoke is
  a prod-origin smoke**, not previewable. Gate the strict positive browser assertion behind an env flag
  (`MS_TEST_PERSONALIZATION_STRICT=1`) for the prod run; keep CI/preview lenient.
- **A client island reading cross-service wire data must be defensive at the render boundary.** It
  consumes raw JSON from another service — guard `Intl.NumberFormat` against a bad currency (a
  `RangeError` blanks the whole client render) and `?? 0` numeric fields (else "undefined visitas").
- (Reconfirmed) **A unit-tested pure helper can't import `next/cache`** — `conditionLabel` lives in
  `lib/listings.ts` (which imports `next/cache`), so S4 re-derived `favoriteConditionLabel` in the
  next-free `lib/home-personalization.ts` seam for both client-import and the Playwright runner.
- (Reconfirmed) **A squash-merged sprint branch is a dead end.** The `feat/marketplace-static-shell`
  remote still held S1's pre-squash commits; S4 pushed a fresh `feat/marketplace-static-shell-s4` off
  `main` to keep the PR diff clean.

## Gaps / owed (to Daniel)
- **Live instant cold-load eyeball** on `https://miyagisanchez.com/` after idle (S2 step 7).
- **Signed-in island hydration on prod** — sign in on the live homepage and confirm the retoma rail /
  offer alert / seller module appear a beat after the instant static paint (S4 step 7). Needs the prod
  origin (CORS) — not previewable. Optionally run the browser spec with `MS_TEST_PERSONALIZATION_STRICT=1`.
- **S3 authed happy-path / no-data degrade** curls (need a live Clerk session JWT — sprint-3 steps 5–6).
- **Prune the stale `feat/marketplace-static-shell` remote branch** (S1 pre-squash commits).

## Process note
S1 was correctly treated as high-blast-radius (shared layout + middleware) and leaned on the channel
suite; the actual mechanism turned out simpler than feared (Option A — middleware untouched, because
the channel rewrites already routed `/` into the dynamic tree). The phased plan let the risky structural
change (S1) and the new authed endpoint (S3) each land on their own gate, with the low-risk frontend
islands (S4) as the cheap finisher.
