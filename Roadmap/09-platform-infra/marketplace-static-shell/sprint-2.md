# Static marketplace shell — Sprint 2: Make the homepage a static CDN asset

**Status:** ⬜ Not started. Frontend (Vercel), homepage only — runs on the S1 static-able `(site)` shell.
Risk: **MED** (homepage surface; personalization intentionally dropped here, returns in Phase 2). Completes Phase 1.

## Why
With the shell no longer forcing dynamic (S1), the only remaining blocker to a static homepage is the homepage's
own `currentUser()` + signed-in modules. Remove them → the curated homepage prerenders to a CDN asset → instant
load, **zero Vercel functions**, no cold-start. This is the direct fix for the ~30 s idle load.

## Stories

### Story 2.1 — De-personalize the homepage to the curated shell
**As** any visitor, **I want** the homepage to be the same fast curated page, **so that** it serves instantly from
the CDN.
**Acceptance:**
- `app/(site)/page.tsx` (post-S1 path) drops `currentUser()` and the four signed-in modules (retoma rail, offer
  alerts, seller snapshot, server-seeded `favoritedIds`). It renders only the curated content
  (Selección / categories / vecindario strip) — already cached via `lib/cache-policy.ts`.
- The production build emits the homepage as **static / prerendered** (confirm in `next build` output — no `ƒ`
  function marker for `/`); a cold load is instant.
**Risk:** med (removing a personalization path; behavior change for signed-in users — by design, returns in Phase 2).

### Story 2.2 — Heart-states client-side (no server seeding)
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
_Written at build time — numbered steps; include the `next build` static-marker check for `/` and the cold-load
eyeball (owed-to-Daniel)._
