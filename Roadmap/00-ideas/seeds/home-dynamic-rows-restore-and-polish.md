---
title: "Homepage dynamic rows — restore on prod + polish to spec"
slug: home-dynamic-rows-restore-and-polish
status: scaffolded
area: "01"
type: epic
priority: null
risk: low
epic: "01-discovery-and-shopping/home-dynamic-rows-restore-and-polish"
build_order: null
updated: 2026-07-12
---

# Scope — Homepage dynamic rows: restore on prod + polish to spec

## Outcome & signal
Signed-in visitors on prod see the two top personalization rows again — the "Retoma donde
te quedaste" rail and the pending-offer ribbon — matching `marketplace_search_results_mobile.png`.
Signed-out first-visit gets the richer iteration in `mercado-libre-search-results.png` (hero +
trust badges, Recién llegado al barrio, Pasillos with counts, seller block). Daniel tests it by
opening `/` signed-in on his phone with ≥1 favorite and ≥1 pending offer, and in an incognito tab.

## Stage-2.5 bucket
**Mixed — and that's the finding.** The "removed" rows are NOT removed: `marketplace-static-shell`
S4 (#104) restored them as client islands, unconditionally rendered, backed by a live endpoint.
- **Restore (S1): already-possible / bug.** `HomeRetomaOffers` + `HomePersonalizationProvider`
  ship in `app/(site)/page.tsx` today; there is no flag gating them. If prod shows nothing, the
  ONE island fetch is failing silently — the provider swallows all errors by design, and its own
  comment names the suspects: **CORS (`STORE_CORS` allows the prod origin only — has it been
  updated post Vercel→Cloud Run/Cloudflare?)** and the never-done prod eyeball ("the authed
  hydration eyeball is owed to Daniel on prod"). Also check `NEXT_PUBLIC_MEDUSA_STORE_URL` /
  `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` are baked into the Cloud Run frontend build.
- **Signed-in polish (S2): light enhancement + one genuinely-new primitive** (see risks).
- **Signed-out iteration (S3): light enhancement** — every ingredient already exists server-side.

## Scope
**In v1:**
- S1 — observed-red repro on prod → root-cause → fix → make island failure observable (one
  `console.warn`/breadcrumb in the catch, so "silent by design" never masks an outage again).
- S2 — signed-in polish to spec: hide the value-prop ribbon for signed-in users ("su trabajo ya
  está hecho"); price-drop badge on rail cards ("↓ Bajó $300"); recently-viewed cards ("Visto
  ayer") alongside favorites.
- S3 — signed-out first-visit iteration: hero ("Lo que tu barrio vende, compra y recomienda") +
  trust badges (Compra protegida · Haz tu oferta · 0% comisiones); "Recién llegado al barrio"
  row with "Nuevo hoy" badges; "Pasillos" chips with live counts; restyled seller block ("Pon tu
  puesto en el barrio") + Crear cuenta / Seguir explorando terminal CTA.

**Out of v1:**
- Any per-request server personalization on `/` — the page MUST stay an ISR static asset
  (the whole point of the static-shell epic; ~30 s cold-starts otherwise).
- Cross-device recently-viewed history (server-side view tracking) — v1 may be device-local.
- Push/email price-drop notifications (separate notifications domain).
- Changes to `/l` search results or category pages.

## What already exists (reuse, don't rebuild)
- `app/components/HomeRetomaOffers.tsx` — both rows, markup verbatim from the pre-S2 signed-in block.
- `app/components/HomePersonalizationProvider.tsx` — Clerk JWT + one fetch, fail-open.
- `apps/backend/src/api/store/home/personalization/route.ts` — verified-JWT endpoint returning
  `recentFavorites` / `offerAlertInputs` / `sellerSnapshot`; unit-tested.
- `lib/home-offer-alert.ts` (alert derivation + copy), `lib/home-favorites.ts`, `lib/home-personalization.ts`.
- `AuthShow` (client auth-gate that keeps `/` static) — the exact tool for hiding the ribbon signed-in.
- `getCuratedListings` / `isRecentForBadge` / `timeAgo` — "Recién llegado" is a newest-first variant
  of an existing cached read; `getCategoryCounts` + `CategoryChips` — Pasillos with counts.
- Copy lives in `locales/es.json` `home.*` via `getOverriddenDictionary` (admin-editable since #198).
- e2e already covering this surface: `home-static.spec.ts`, `home-personalization*.spec.ts`,
  `home-offer-alert.spec.ts`, `home-auth-leakage.spec.ts`.

## UX heuristics & rails check
- **CI guards covering this surface:** design-token guard (no raw hex — reuse `var(--fg-inverse)`
  etc.); Iconoir class guard (#235/#240 — verify any new icons exist in the loaded bundle);
  `home-static.spec.ts` asserts the four signed-in testids are ABSENT from anonymous static HTML —
  every new row must stay ISR-static or client-gated, never `currentUser()`/`headers()`.
- **Audits-lens findings that apply:** 01 audit is "#3c material" (PDP hierarchy, discovery);
  no P0 on the homepage. No conflict found.
- **Design-language debt (if any):** none new; reuse `card-tile`, `badge badge-soft`, glass tokens.

## Acceptance criteria
- S1: On prod, a signed-in account with ≥1 favorite sees the retoma rail; with an actionable
  offer sees the ribbon. A forced endpoint failure logs a visible breadcrumb (no more silent
  empty). Root cause written down in the sprint doc.
- S2: Signed-in → no value-prop ribbon (signed-out static HTML unchanged — `home-static.spec.ts`
  stays green). A favorited listing whose price dropped shows "↓ Bajó $N". A listing viewed
  yesterday shows in the rail with "Visto ayer". Regression specs per story.
- S3: Incognito first visit renders hero + badges, Recién llegado (newest listings, "Nuevo hoy"
  <24 h), Pasillos with counts, seller block — all present in the prerendered static HTML
  (`next build` static marker for `/` preserved, no `ƒ`).

## Open risks / research
- **Price-drop badge needs a price baseline** — `marketplace_offers`-style history doesn't exist
  for favorites. Fork: snapshot `price_cents` onto `marketplace_favorites` at favorite time
  (Supabase, non-commerce ✓) vs. comparing against Medusa price history. **Rule 1/2 call → panel
  offer:** `node scripts/cross-panel.mjs <this seed> --lens both --agent codex` before deciding.
- **Recently-viewed source** — same fork: device-local (`localStorage`, zero backend, no
  cross-device) vs. a Supabase `marketplace_recently_viewed` table. Recommend localStorage for v1
  (thinnest slice; the rail already renders client-side anyway).
- **CORS/env verification is config on shared backend infra** — the S1 fix story should be
  flagged for Daniel's merge even inside a low-risk epic.
- Verify on prod, not preview: previews are CORS-excluded by design, so the islands NEVER render
  there — don't mistake that for the bug.
