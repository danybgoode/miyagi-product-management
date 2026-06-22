# Static marketplace shell — Sprint 1: Route-group split (static `(site)` vs dynamic `(channel)`)

**Status:** ⬜ Not started. Frontend (Vercel; **shared `app/layout.tsx` + `middleware.ts` — high blast radius**).
Risk: **HIGH** — every channel (custom-domain / subdomain / embed / seller-mode) depends on the layout's header
branch. **Daniel merges.** This is the architectural foundation; no homepage personalization change yet (S2).

## Why
The marketplace homepage can't be static while the *shared root layout* reads `headers()` to pick white-label vs
platform chrome. Split routing so the marketplace tree renders from a **header-free** layout (static-able) and the
white-label tree keeps the dynamic, header-reading layout — then route requests to the right tree in middleware.

## Stories

### Story 1.1 — Carve the `(site)` (marketplace) and `(channel)` (white-label) trees
**As** the platform, **I want** the marketplace shell decoupled from request-header channel detection, **so that**
marketplace pages can render statically while channels stay dynamic.
**Acceptance:**
- Marketplace pages render under a layout that does **not** call `headers()`/`currentUser()` (static-able). The
  white-label shell (`ChannelLayout` + embed/seller-mode suppression) lives in a tree whose layout *does* read the
  channel headers (stays dynamic). Plan-mode picks the concrete structure (route groups + a rewrite target).
- URLs are **unchanged** (route groups are URL-transparent; the channel tree is reached by an internal rewrite).
**Risk:** high (shared layout restructure).

### Story 1.2 — Middleware rewrites channel/embed requests into the channel tree
**As** the platform, **I want** custom-domain / subdomain / embed / seller-mode requests routed to the dynamic
white-label tree, **so that** only those requests pay the dynamic render and the marketplace host stays static.
**Acceptance:**
- `middleware.ts` resolves the channel as today, then **rewrites** matching requests into the channel subtree
  (instead of only tagging `x-miyagi-*` headers). Marketplace-host requests fall through to `(site)` untouched.
- The `/` route collision (same URL, two layouts) is resolved cleanly by the rewrite (document how).
**Risk:** high (middleware governs all routing).

### Story 1.3 — Prove channels unbroken
**As** the platform, **I want** the existing channel guarantees intact, **so that** the split is invisible to users.
**Acceptance:**
- The channel suite stays green: `own-shop-seo.spec.ts`, the embed specs, the `ChannelLayout`/white-label specs,
  `nav-entry-points.spec.ts`. Add/extend a spec asserting the **marketplace** layout no longer forces dynamic
  (e.g. the homepage HTML renders without a per-request auth/header dependency) while a white-label path still
  renders the branded shell.
**Risk:** med (test coverage of the invariant).

## Sprint QA
- **deterministic gate:** `tsc --noEmit` + `next build` (inspect the build output — marketplace routes should
  report static/prerenderable where applicable) + the Playwright `api` suite, all green vs the branch preview.
- **browser smoke owed:** **Daniel** — custom-domain + subdomain + embed white-label eyeball on a real host
  (middleware header-spoofing can't simulate channels on a preview — use the path-tagged `/embed/*` surface where
  possible; live custom-domain look stays owed to Daniel; see LEARNINGS).
- **announce** the shared-layout/middleware change to any parallel agents.

## Sprint 1 — Smoke walkthrough
_Written at build time — numbered steps, one action + one expected result each. Channel/white-label live checks
flagged owed-to-Daniel (can't be header-simulated on a preview)._
