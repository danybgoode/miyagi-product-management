# Retrospective — Site-wide analytics: GTM container (GA4 + Clarity)

**Area:** 09-platform-infra · **Risk:** all LOW · **Span:** 1 sprint, 2026-06-22 · **Repo:** `apps/miyagisanchez` (frontend-only)
**Outcome:** a **single GTM container** (`GTM-MWHVLJ3M`) now loads across every platform surface, gated
client-side so the just-shipped static `(site)` shell stays a function-free CDN asset. GA4 + Microsoft
Clarity are managed as tags **inside** GTM — no redeploy to add or change them.

## What shipped (PR [#106](https://github.com/danybgoode/miyagisanchezcommerce/pull/106))
- **S1.1 — pure gate** `3f59de2`: `lib/analytics-gating.ts` `shouldLoadAnalytics({hostname,pathname})` +
  an 8-case unit spec. Loads on every platform surface (marketplace, checkout, account, `/shop/manage`);
  skips the white-label channels — seller custom domains and `<slug>.miyagisanchez.com` subdomains (via
  the reused pure `shopSlugFromHost`) — and the embed widget (`/embed/*` by path). It mirrors the server
  channel semantics in `app/(shell)/layout.tsx`/`lib/channel.ts`, but from the browser's own
  `window.location` — no `headers()`, no network.
- **S1.2 — loader** `fb3242b`: `<SiteAnalytics>` `'use client'` component mounted once in the **static**
  root `app/layout.tsx`. Reads `window.location` → the gate → injects the single GTM container
  (`NEXT_PUBLIC_GTM_ID`, **no hardcoded id**) exactly once; skips cleanly when the env id is absent. It
  renders an invisible `data-site-analytics` marker for the api spec. `next build` confirmed `/` stays a
  static `○` route — the client island did not taint the root layout dynamic.
- **S1.3 — spec + doc fix** `e547fe9` + `8b3df66`: an api spec (marker SSRs on the public root; embed +
  white-label excluded via the imported pure gate) and the cross-review-added opt-in browser smoke; plus
  the `lib/print-qr.ts` stale "analytics already wired site-wide" comment corrected to reference the GTM
  container.

## What went well
- **Static-safety was a build-output gate, not a vibe.** The whole risk was "don't undo marketplace-
  static-shell." A client island reading `window.location` (not `headers()`) keeps `/` at `○` — re-checked
  in `next build` exactly as that epic did. The loader rides in the static root layout and still decides
  per-host at runtime.
- **Reuse over rebuild.** The gate reuses the pure `shopSlugFromHost` so the subdomain rule can't drift
  from the real subdomain channel, and mirrors `lib/channel.ts` for the platform/preview host set.
- **One container, zero-redeploy tags.** Choosing a single GTM container (not separate GA + Clarity
  snippets) means GA4 and Clarity are added/changed in the GTM UI without shipping code — the loader is
  the only code surface.
- **Cross-agent review (Codex) earned its keep.** It flagged a real coverage gap — the api spec only saw
  the SSR marker, never that `injectGtm()` runs/respects the gate — closed with an opt-in
  `*.browser.spec.ts` (gated behind `MS_TEST_GTM_ID`, not in the blocking gate). The `.vercel.app`-breadth
  nit was declined with rationale (mirrors the established `lib/channel.ts` preview convention).

## What we learned (promoted to LEARNINGS.md)
- **Client-side gating is how you add a site-wide third-party loader without un-static-ing a static shell.**
  After marketplace-static-shell, the reflex "drop a `<Script>` in the layout" would re-introduce a
  per-request decision. Mirror the server channel rule from `window.location` in a pure, unit-tested gate
  and inject from a `useEffect`; the root layout stays static and the loader still decides per host/path.
- **A JS-only, env-gated side effect (script injection) is not coverable by the `api` gate — pair the pure
  decision (unit-tested) with an opt-in `*.browser.spec.ts` gated behind an env flag.** The marker proves
  the component mounted; the pure gate proves *where*; only a browser run with the id configured proves the
  script actually loads. Same "name the gap, don't fake it" discipline as the authed-money-path smoke.

## Gaps / owed (to Daniel) — analytics can't record until these are done
The code + the `NEXT_PUBLIC_GTM_ID=GTM-MWHVLJ3M` Vercel env (prod + preview + dev) are **live**. The
container is empty until tags are added **inside GTM** (no code change, no redeploy):
1. **Clarity (1 click, recommended):** Clarity dashboard → **Settings → Setup → Google Tag Manager →
   Finish setup** → sign in with the Google account that owns container `GTM-MWHVLJ3M` → **Create and
   publish**. Clarity auto-creates + publishes its tag into the container — no project ID or hand-built tag
   needed. (Clarity confirmed only **1 session / 30 days** today — it was created but never actually
   loading; this is the fix.) Once it fires, the existing `/vende` `window.clarity('set',…)`
   seller-acquisition tags start attributing for free.
2. **GA4 (optional, addable anytime):** GA4 = Google Analytics 4. It needs a GA4 **property** (created in
   Google Analytics under Daniel's Google account) which yields a **Measurement ID** (`G-XXXXXXX`); then in
   GTM add a **Google tag** with that id on the **All Pages** trigger and publish. No code change — the
   container already loads. Skip it for now if undecided; Clarity alone is the immediate win.
3. **Smoke:** open `https://miyagisanchez.com/` → `window.dataLayer` exists + the GTM script loaded;
   `/embed/s/<shop>` and a white-label host **do not** load GTM; `/vende` fires the `seller_acquisition_*`
   tags with no console errors. Next day: the Clarity dashboard records real sessions (no longer ~1/30d).
   Optionally run the browser smoke against prod: `MS_TEST_GTM_ID=1 PLAYWRIGHT_BASE_URL=https://miyagisanchez.com npm run test:e2e:browser`.

## Process note
The epic folded in the orphaned, never-built **Sprint 4 of the archived `neon-egress-and-db-isolation`
epic** (a Clarity base-loader + UTM scope). That older sprint assumed a separate Clarity snippet; this epic
delivered the same end (Clarity recording site-wide) through the single GTM container instead, and the
neon-egress S4 now carries a superseded-by pointer. Consent UI / LFPDPPP review stays a deliberate separate
epic (decision 2) — analytics shipped now, the cookie banner later.
