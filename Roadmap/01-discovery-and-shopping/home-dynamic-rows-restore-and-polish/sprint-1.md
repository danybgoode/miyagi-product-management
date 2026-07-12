# Homepage dynamic rows — restore on prod + polish to spec — Sprint 1: Restore rows on prod — observed red, root cause, fix + breadcrumb

**Status:** 🟨 code complete, gate green, PR open — Daniel's live prod smoke owed before close

## Stories

### Story 1.1 — Observe the red + write the root cause (no code) ✅
**As a** signed-in buyer, **I want** my homepage to show my favorites rail and pending-offer
ribbon, **so that** I resume where I left off — today it silently shows nothing.

**Observed (read-only, no auth needed — the bug is a build artifact, present for every visitor):**
fetched `https://miyagisanchez.com/`, downloaded every `_next/static/chunks/*.js` file the homepage
HTML references, and grepped them. Chunk `0wy7q9c8.-ni~.js` contains, verbatim, in the live prod bundle:

```
l=t.default.env.NEXT_PUBLIC_MEDUSA_STORE_URL??"http://localhost:9000",
o=t.default.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY??""
...
fetch(`${l}/store/home/personalization`, {headers:{"x-publishable-api-key":o, Authorization:`Bearer ${t}`}})
```
No shipped chunk contains `api.miyagisanchez.com` anywhere. So every signed-in browser in production
calls `http://localhost:9000/store/home/personalization` — which fails outright (nothing listens there
in a visitor's browser) — before the request ever reaches the real backend, CORS, or Clerk-JWT layers.

**Root cause — NOT CORS** (superseding the S4-era code comment and this doc's own original framing):
`apps/miyagisanchez/Dockerfile` (builder stage) and `cloudbuild.yaml` never pass
`NEXT_PUBLIC_MEDUSA_STORE_URL` / `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` as Docker **build-args** — only
`infra/gcp/deploy-frontend.sh` sets them, and only as Cloud Run **runtime** env vars (`--set-env-vars`,
applied after the image is already built). Next.js inlines `NEXT_PUBLIC_*` at `next build` time; since
the var was undefined during the Cloud Build step, the compiler left a live `process.env.NEXT_PUBLIC_…`
read in the shipped client JS, which evaluates to `undefined` in every browser → falls back to
`http://localhost:9000` / `""`. Broken since the Cloud Run cutover (`frontend-vercel-to-cloudrun`,
2026-07-10) — a config gap in the new deploy rail, not a CORS allow-list problem.

**Fix precedent found in-repo:** `app/layout.tsx` mounts `<ClerkProvider>` (a Server Component, no
`'use client'`) with no explicit `publishableKey` prop. Clerk's own SDK reads its env var **server-side
at request time** (where Cloud Run's real runtime env is correctly visible to Node) and forwards it down
as a serialized prop to its internal client boundary — sidestepping build-time inlining entirely. The
bundle shows the identical broken `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||""` fallback text, but it's dead
code there: the real `publishableKey` prop short-circuits it before that line ever runs.

**Systemic finding (flagged, out of this sprint's scope):** the same broken-inlining pattern is
confirmed for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` too (harmless only because Clerk's SDK doesn't depend
on it). Whether `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_MP_PUBLIC_KEY` /
`NEXT_PUBLIC_SUPABASE_*` (checkout/money-adjacent) have the same gap is **unconfirmed** — the homepage
doesn't load those chunks. Owed: a follow-up audit of checkout-page bundles for the same pattern before
this is fully ruled safe elsewhere.

**Acceptance:** met — exact failing layer named with evidence (bundle excerpt above).
**Risk:** low
**Commit:** `77e1d77` (root repo, doc-only)

### Story 1.2 — Fix the failing layer ✅
**As a** signed-in buyer, **I want** the rows to render on prod, **so that** the homepage is mine again.

Not a CORS/Cloud-Run-env fix (see 1.1) — a code fix, matching the Clerk precedent: `app/(site)/page.tsx`
(Server Component) reads `process.env.MEDUSA_STORE_URL` / `process.env.MEDUSA_PUBLISHABLE_KEY` (the
canonical unprefixed names, already correctly set on Cloud Run, already used server-side by
`lib/medusa.ts`) and passes them as props into `<HomePersonalizationProvider storeUrl={…}
publishableApiKey={…}>`, which now uses the props instead of reading `NEXT_PUBLIC_*` itself. No
Dockerfile/cloudbuild/infra edit; no new env vars.
**Acceptance:** prod, signed-in, ≥1 favorite → `data-testid="home-retoma-rail"` renders; with an
actionable offer → `data-testid="home-offer-alert"` renders. Anonymous prod HTML unchanged
(`home-static.spec.ts` green).
**Risk:** low — no shared-infra/CORS/Cloud Run/Docker file touched, purely `apps/miyagisanchez` app
code reusing an existing, already-correct env var. This **supersedes** the original "Daniel merges"
framing above (which assumed a CORS/infra fix) — by the WAYS-OF-WORKING risk-tier rule this qualifies
as reviewer-mergeable-on-green, not Daniel-only. Still called out explicitly in the PR since it's the
epic's headline fix.
**Commit:** `3b12053` (apps/miyagisanchez)

### Story 1.3 — Make island failure observable (breadcrumb) ✅
**As a** maintainer, **I want** a visible breadcrumb when the personalization fetch fails,
**so that** "fail-open by design" can never mask a prod outage again (this bug survived a platform
migration unnoticed).
`console.warn('[home-personalization] fetch failed', reason)` now fires on a non-ok response or a
caught error, extracted as a pure `logPersonalizationFetchFailure` helper in
`lib/home-personalization.ts` (the existing Clerk/next-free seam) so it's unit-testable without a
browser; guarded by the existing `cancelled` flag so an unmount race never logs a false failure. No
UI change, no retry/poll.
**Acceptance:** met — `e2e/home-personalization.spec.ts` gained a pure-logic test asserting the helper
warns exactly once with the right reason on failure, and is never called on success (nothing to invoke
= nothing to log). Observed red once: temporarily stubbed out the `console.warn` call inside the
helper, confirmed the new test failed (`expect(calls).toHaveLength(1)` → received `0`), then restored
and confirmed green.
**Risk:** low
**Commit:** `5541d5b` (apps/miyagisanchez)

## Sprint QA
- **api spec(s):** extended `e2e/home-personalization.spec.ts` with a pure-logic test for the new
  `logPersonalizationFetchFailure` breadcrumb helper (warns once with the reason on failure; nothing
  to assert on success beyond "not invoked"). `home-static.spec.ts` stayed green, untouched — its
  assertions only cover anonymous HTML, which nothing in this sprint's fix changes.
- **deterministic gate:** `tsc --noEmit` ✅, `npm run build` ✅ (`/` still prerenders as `○` static —
  the epic's hard rail holds), Playwright `api` project — all `home-*` specs green (17/17); 6
  pre-existing failures elsewhere (`launchpad-*`, `not-found-shape`) confirmed unrelated (reproduce
  identically on unmodified `origin/main`, touch none of the files this sprint changed) and a 7th
  (`agent-connector.spec.ts`) that only fails under full-suite parallel load (passes in isolation) —
  a pre-existing rate-limiter test-flake, not a regression from this sprint.
- **browser smoke owed:** yes, to Daniel — the real signed-in eyeball on prod (favorites rail +
  offer ribbon actually rendering after deploy). The live-bundle evidence in Story 1.1 proves the
  fetch was broken and Story 1.2's fix now targets the right URL/key via props, but a live confirmation
  on his real account remains the final word per the walkthrough below. Auth path, can't be automated.

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
