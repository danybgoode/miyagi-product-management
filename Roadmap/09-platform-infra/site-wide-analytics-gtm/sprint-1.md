# Sprint 1 — GTM container, site-wide & static-safe

**Epic:** [Site-wide analytics: GTM (GA4 + Clarity)](README.md) · **Risk:** all LOW · **Repo:** `apps/miyagisanchez`
**Goal:** a single GTM container loads across platform surfaces (incl. the seller dashboard), gated client-side
so the static `(site)` subtree stays static, with GA4 + Clarity managed inside GTM.

## Stories

### S1.1 — Pure gating lib + unit spec · LOW
**As a** maintainer, **I want** a pure, testable rule for where analytics loads, **so that** gating is correct
and free of network/headers.
- `lib/analytics-gating.ts` → `shouldLoadAnalytics({ hostname, pathname })`: **true** on the platform host
  (incl. `/shop/manage`, checkout, account); **false** on a custom domain, a `*.miyagisanchez.com` subdomain,
  and `/embed/*`. (Mirror the server channel semantics in `app/(shell)/layout.tsx`, but from hostname/path.)
- **Acceptance:** fixtures cover marketplace, dashboard, checkout, account (load) and custom-domain, subdomain,
  embed (skip). **QA:** pure `lib/` spec, no network (free coverage).

### S1.2 — `<SiteAnalytics>` GTM loader in `app/layout.tsx` · LOW
**As** Daniel, **I want** GTM loading site-wide, **so that** GA4 + Clarity (its tags) start recording.
- A client component mounted once in `app/layout.tsx`: reads `window.location`, calls `shouldLoadAnalytics`,
  and injects the **single GTM container** (`NEXT_PUBLIC_GTM_ID`) when eligible; emits a marker attribute for
  the spec. **No `headers()`** — keeps `(site)` static. Skip cleanly when the env id is absent (dev/preview).
- **Acceptance:** on the public marketplace + `/shop/manage`, `window.dataLayer` / `google_tag_manager`
  initializes; on `/embed/*` and a white-label host it does not; no console errors; `window.clarity` becomes
  defined once GTM fires the Clarity tag (the `/vende` `set` tags then land).
- **QA:** the gate logic is covered by S1.1; **real GTM firing is a browser smoke owed to Daniel** (needs the
  live `NEXT_PUBLIC_GTM_ID` + the GA4/Clarity consoles).

### S1.3 — api spec + stale-comment fix · LOW
**As** a future reader, **I want** the spec to pin the loader and the docs to be true.
- api spec: assert the `<SiteAnalytics>` marker renders on the public root + dashboard, and (via the pure gate)
  that embed/white-label are excluded. Correct the `lib/print-qr.ts` comment to reflect reality (analytics now
  loaded site-wide via GTM).
- **Acceptance:** spec green; comment matches reality. **QA:** Playwright `api` + grep.

## Sprint QA
- Deterministic gate: pure `lib/analytics-gating.ts` spec + the marker api assertion + `tsc`/`next build`/
  Playwright `api`; design-token / raw-color guards stay green. No money/auth/DB path.
- **Owed to Daniel (operational + smoke):** create/confirm the GTM container; add the GA4 config tag + the
  Microsoft Clarity tag inside GTM; set `NEXT_PUBLIC_GTM_ID` in Vercel; then confirm GA4 realtime + the Clarity
  dashboard record real sessions and the `/vende seller_acquisition_*` tags appear.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (set `NEXT_PUBLIC_GTM_ID` on the preview), then production after merge.

1. Open `<preview>/` and check the console: `window.dataLayer` exists and the GTM container loaded.
   → GTM is initialized on the public marketplace.
2. Open `<preview>/shop/manage` (signed in as a seller).
   → GTM is loaded here too (dashboard is a platform surface).
3. Open `<preview>/embed/s/<test-shop>`.
   → GTM is **not** loaded (embed excluded).
4. Open the storefront on a seller white-label host (custom domain or `<shop>.miyagisanchez.com`).
   → GTM is **not** loaded (white-label excluded).
5. Open `<preview>/vende` and interact.
   → No console errors; `window.clarity` is defined; the `seller_acquisition_*` set-tags fire.
6. **(Owed to Daniel)** After prod deploy + GTM tag config, next day open the GA4 realtime + Clarity dashboards.
   → Real sessions/page-views recorded (Clarity no longer ~1/30 days); GA4 shows hits.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
**Status:** ✅ shipped 2026-06-22 — PR #106 squash `68a3bb0`. Owed to Daniel: GTM tag config + firing smoke (steps 1–6).
- [x] S1.1 — BUILT `3f59de2` (`lib/analytics-gating.ts` + `e2e/analytics-gating.spec.ts`, 8 unit cases green)
- [x] S1.2 — BUILT `fb3242b` (`app/components/SiteAnalytics.tsx` mounted in `app/layout.tsx`; `next build` keeps `/` static `○`)
- [x] S1.3 — SHIPPED `e547fe9` (`e2e/site-analytics-loader.spec.ts` + `lib/print-qr.ts` stale-comment fix) + `8b3df66` (cross-review: opt-in `site-analytics-loader.browser.spec.ts` for real GTM injection)

**Sprint 1 SHIPPED 2026-06-22** → PR [#106](https://github.com/danybgoode/miyagisanchezcommerce/pull/106) squash-merged `68a3bb0`, risk **LOW**.
CI green vs preview: `tsc` + `next build` (`/` stays `○`) · Playwright `api` (`analytics-gating` 8 + `site-analytics-loader`
marker/gate) · design-token guard. Codex cross-review: 0 blocking; the should-fix (api spec saw only the SSR marker) was
closed with the opt-in browser smoke; the `.vercel.app`-breadth nit was declined (mirrors `lib/channel.ts`).
**Env set:** `NEXT_PUBLIC_GTM_ID=GTM-MWHVLJ3M` in Vercel (production + preview + development), verified.
**Owed to Daniel (operational, no code):** activate Clarity via its 1-click GTM wizard (Clarity confirmed only 1 session/30d —
created but never loading); optionally add GA4 (needs a GA4 property); then the firing smoke (steps 1–6 above). The browser
smoke can verify injection on prod: `MS_TEST_GTM_ID=1 PLAYWRIGHT_BASE_URL=https://miyagisanchez.com npm run test:e2e:browser`.
