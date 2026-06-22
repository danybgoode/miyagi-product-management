# Static marketplace shell — Sprint 1: Route-group split (static `(site)` vs dynamic `(channel)`)

**Status:** ✅ **SHIPPED 2026-06-22** — [PR #101](https://github.com/danybgoode/miyagisanchezcommerce/pull/101)
squash-merged `a1e6ea4` (Daniel-authorized merge on green). CI green (type-check+build · Playwright-vs-preview, full
channel suite) + advisory codex cross-review (no blocking; 2 findings applied `c98108b`). Branch deleted.
**Owed to Daniel:** live custom-domain / subdomain / embed / seller-mode white-label eyeball on prod (steps 7–9) —
can't be header-simulated on a preview.
Frontend (Vercel; **shared `app/layout.tsx` + `middleware.ts` — high blast radius**). Risk: **HIGH** — every
channel (custom-domain / subdomain / embed / seller-mode) depends on the layout's header branch. **Daniel merges.**
This is the architectural foundation; no homepage personalization change yet (S2).

**Mechanism shipped (Option A, Daniel-confirmed in plan mode):** single dynamic `(shell)` tree + static `(site)`
homepage. Root `app/layout.tsx` is now **static** (no `headers()`); the per-request chrome logic moved verbatim into
`app/(shell)/layout.tsx`; the buyer chrome was extracted to `app/components/PlatformShell.tsx` (one source, both
shells); all page-route dirs `git mv`'d under `app/(shell)/`; the homepage moved to `app/(site)/page.tsx`.
**Middleware is functionally unchanged** — the existing custom-domain/subdomain `/`→`/s/[slug]` rewrites already keep
channels off the bare `/`, so `/` is owned solely by the static `(site)` tree (no two-layout collision). URLs are
byte-identical (route groups are URL-transparent). The platform seasonal-theme boot script stays in the static
root `<head>` (it self-gates on pathname + origin-scoped localStorage, so it stays a no-op on white-label/ineligible
paths). Commits: S1.1 `3428985` · S1.2 `2262f8f` · S1.3 `f9edca2` · fix `348e2ad` (CI caught two
over-broad gotcha mitigations: the theme boot script must be **path-gated** — emitted from the `(site)`/`(shell)`
layouts, present on `/agent`/`/`, absent on `/terminos` — and `not-found.tsx` must stay **bare** so white-label
`/embed` 404s don't leak the platform search box).

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
_Numbered steps, one action + one expected result each. Steps 1–6 are the deterministic/CI gate (run in the
worktree off `feat/marketplace-static-shell`). Steps 7–9 are channel/white-label live checks **owed to Daniel** —
they can't be header-simulated on a preview because middleware strips spoofed `x-miyagi-*` on platform hosts._

**Deterministic gate (agent-run — all green this build):**
1. **Type-check.** Run `npx tsc --noEmit` in the worktree → exits clean, no errors.
2. **Production build.** Run `npm run build` → compiles successfully; the route table prints `┌ ƒ /` (homepage
   resolves to one `/`, no route-group collision error) and all URLs are clean (no `(site)`/`(shell)` segment in
   any path). `/` is still `ƒ` dynamic in S1 (the page keeps `currentUser()` until S2) — expected.
   _(The `[neighborhood-pulse] catalog unavailable: fetch failed` log is the sandbox not reaching Medusa; it
   degrades to `?? []`. The "inferred workspace root" warning is the worktree-local `package-lock.json` — untracked,
   not committed.)_
3. **Static invariant spec.** Run `playwright test --project=api static-shell-split` → 4 passed: root + `(site)`
   layout chain reads no `headers()`/`x-miyagi`; `(shell)/layout.tsx` does; homepage serves platform chrome
   anonymously; `/embed/*` suppresses it.
4. **Anti-erosion guards follow the move.** Run `playwright test --project=api design-token-foundation
   shop-settings-no-monolith` → green (the design-token allow-list + monolith `SETTINGS_DIR` were repointed to
   `app/(shell)/...`, incl. allow-listing the relocated `channelAccent #1d6f42` default).
5. **Pure-logic channel guards.** Run `playwright test --project=api subdomain trust-signals neon-egress-cache`
   → green (channel detection + cache-policy SSOT unaffected).
6. **Full `api` suite vs the branch preview (CI — authoritative).** CI's "Playwright vs preview" must be green
   against the `feat/marketplace-static-shell` Vercel preview — this is the real gate (local can't reach Medusa;
   the SSO-gated preview needs the CI bypass secret). The channel suite (`own-shop-seo`, `own-shop-channel`,
   `embed-shop`, `embed-widget`, `embed-channel`, `embed-key`, `nav-entry-points`, `home-chrome`, `home-icons`,
   `marketplace-positioning`) is the live guardrail and must stay green.

**Live channel/white-label eyeball (owed to Daniel — on a real host):**
7. **Custom domain.** Visit a verified custom-domain shop root (e.g. `theirshop.mx/`) → renders the branded
   white-label `ChannelLayout` (no platform header/search), URL stays at `/`. Visit `theirshop.mx/l/<id>` → still
   white-label, native on the domain.
8. **Subdomain.** Visit `<slug>.miyagisanchez.com/` → branded white-label shell, slug never exposed in the URL.
9. **Embed + seller-mode.** Embed a shop widget (`/embed/s/<slug>` in an iframe on a third-party page) → renders
   the shop, no platform chrome, framable. Sign in and open `/shop/manage` → seller shell renders (dark bar +
   SellerNav), no buyer chrome. On the platform homepage `miyagisanchez.com/` → platform header/search/footer
   present, instant. _(Optional: toggle the seasonal platform theme on `/`, confirm it still applies before paint —
   the boot script is unchanged but now lives in the static root `<head>`.)_
