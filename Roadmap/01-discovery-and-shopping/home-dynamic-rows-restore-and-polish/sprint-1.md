# Homepage dynamic rows — restore on prod + polish to spec — Sprint 1: Restore rows on prod — observed red, root cause, fix + breadcrumb

**Status:** ⬜ not started

## Stories

### Story 1.1 — Observe the red + write the root cause (no code)
**As a** signed-in buyer, **I want** my homepage to show my favorites rail and pending-offer
ribbon, **so that** I resume where I left off — today it silently shows nothing.
**Steps:** on **prod** (previews are CORS-excluded by design — never verify there), sign in with an
account that has ≥1 favorite, open `/` with devtools → Network. Inspect the
`GET <MEDUSA_STORE_URL>/store/home/personalization` call: missing (env vars not baked into the
Cloud Run build?), CORS-blocked (`STORE_CORS` on the backend Cloud Run service missing the prod
origin?), 401 (Clerk JWT verification), or 200-but-empty (data issue). Write the observed failure
+ root cause into this file before touching code.
**Acceptance:** this sprint doc names the exact failing layer with evidence (status code /
console error / missing env).
**Risk:** low

### Story 1.2 — Fix the failing layer
**As a** signed-in buyer, **I want** the rows to render on prod, **so that** the homepage is mine again.
Likely a config-only fix (Cloud Run backend `STORE_CORS`, or frontend `NEXT_PUBLIC_MEDUSA_STORE_URL`
/ `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` at build time). Code changes only if 1.1 proves a code bug.
**Acceptance:** prod, signed-in, ≥1 favorite → `data-testid="home-retoma-rail"` renders; with an
actionable offer → `data-testid="home-offer-alert"` renders. Anonymous prod HTML unchanged
(`home-static.spec.ts` green).
**Risk:** low, but touches shared backend config → **Daniel merges**.

### Story 1.3 — Make island failure observable (breadcrumb)
**As a** maintainer, **I want** a visible breadcrumb when the personalization fetch fails,
**so that** "fail-open by design" can never mask a prod outage again (this bug survived a platform
migration unnoticed).
Minimal: `console.warn('[home-personalization] fetch failed', …)` in the provider's catch +
non-ok branch. No UI change, no retry loop, no polling.
**Acceptance:** forcing a failure (bad key locally) logs the warn; success logs nothing; regression
spec covers the catch path (extend `e2e/home-personalization.spec.ts` pure-logic seam or the
browser spec's mock).
**Risk:** low

## Sprint QA
- **api spec(s):** extend `e2e/home-personalization.spec.ts` / `home-personalization.browser.spec.ts`
  (mocked fetch → warn on failure, rows on success). `home-static.spec.ts` must stay green untouched.
- **browser smoke owed:** yes, to Daniel — signed-in prod eyeball on his real account (the
  "authed hydration eyeball" the S4 comment says was never done). Auth path, can't be automated.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Sign in at https://miyagisanchez.com/sign-in on your phone (account with ≥1 favorite — favorite
   any listing first via its ♥ if needed).
   → After landing on `/`, within ~2 s a "Retoma donde te quedaste" row appears above the category
   chips, showing your newest favorites.
2. Make (or have pending) an offer on any listing, then reload https://miyagisanchez.com.
   → A card "Tu oferta de $N sigue pendiente · <listing> · Ver" appears under the rail. **(auth
   path — owed to Daniel)**
3. Open https://miyagisanchez.com in a private window (signed out).
   → Neither row appears; the page looks exactly as before this sprint.

If any step fails, note the step number + what you saw — that's the bug report.
