# Retrospective · Embeddable Widget (07)

**Shipped:** 2026-06-04 — all 3 sprints, 7 user stories, merged to `main` + live on prod (PRs #4, #6, #7).
**Tagline delivered:** drop your shop — or one product, or a single buy-button — onto any website you already have.

## What shipped
- **S1 · Foundations (PR #4).** Publishable per-shop embed key (`emb_pk_…` at top-level
  `marketplace_shops.metadata.embed_key`, out of `metadata.settings` so a config patch can't clobber it),
  Clerk-gated mint route, CORS-open public resolver (`/api/embed/shop`, fails closed to anonymous), the
  `embed` channel (`?channel=embed` → `mi_channel` cookie via middleware, so a `window.open` hand-off that
  can't carry a header still tags the sale), and an `embed` rate-limit bucket applied only to widget traffic.
- **S2 · The three surfaces (PR #6).** `public/embed.js` — a dependency-free IIFE loader registering
  Shadow-DOM `<miyagi-buy-button>` + `<miyagi-product>` (style-isolated, fed by the CORS-open UCP catalog),
  plus `app/embed/s/[slug]` — a full-shop iframe reusing the white-label `ChannelLayout`, served
  `frame-ancestors *`. Every buy hands off to our **existing, unchanged** hosted checkout; no payment surface
  ever renders on the third-party origin.
- **S3 · Self-serve + polish (PR #7).** A snippet generator in seller settings (mint-or-reveal key, three
  prefilled snippets, live preview, copy) + `data-accent`/`data-locale` theming threaded through the surfaces.

## What went well
- **Reuse over rebuild.** No new commerce endpoints — the surfaces ride the already-CORS-open UCP catalog +
  the existing hosted checkout + `ChannelLayout`. The whole epic is frontend-only (Vercel), zero backend.
- **The CI gate earned its keep.** Every story merged on a green deterministic gate (tsc + build + Playwright
  vs the SSO-gated preview via the bypass token). A spec accreted per testable story; the white-label
  assertion caught the riskiest change (root-layout chrome suppression) end-to-end on a real deploy.
- **Pre-merge review caught a real bug.** The local `/code-review` pass on the HIGH-risk US-3 found that
  `window.open()` with `noopener` in the feature string returns `null` even on success — which double-opened
  checkout. Fixed before it reached Daniel's smoke.
- **Money path stayed untouched.** The hard architectural line — widget never renders payment, checkout
  always on our origin tagged `channel=embed` — held across all three surfaces, including the iframe
  (buy breaks out top-level because Clerk can't run in a cross-origin iframe).

## What we learned / would do differently
- **Stacked-PR mechanics bit us.** Merging the S1 PR with `--delete-branch` deleted S2's *base* branch, and
  GitHub **closes** a PR whose base branch is deleted (it auto-retargets only on *head* deletion). S2's PR #5
  died and had to be reopened as #6. Lesson: merge the base PR, **retarget the child to `main` first**, *then*
  delete the base branch.
- **Root-layout chrome suppression** wanted a header-driven conditional (`x-miyagi-embed` set by middleware,
  read by an async root layout). Cheap here only because the app was already ~all-dynamic; on a more static
  app this would have forced a wider rethink. Worth a generalized "surface" concept if more chromeless
  surfaces appear.
- **Standalone-script i18n** doesn't fit the app's `locales/{es,en}.json` rule literally — `embed.js` can't
  import them at runtime. Both locales live in the loader's `STRINGS`; documented as a deliberate deviation.

## Known gaps / follow-ups (stated, not glossed)
- **Live confirmation owned by Daniel:** the HIGH-risk US-3 browser smoke (real buy-button → hosted popup →
  live checkout, confirming `channel=embed` lands in Stripe/MP metadata) and the Clerk-gated settings-UI
  visual check (snippet copy + accent/locale render). The agent did the API-level prod smoke (embed.js
  CORS/JS, both elements registered, iframe `frame-ancestors *` + white-label) — all green.
- Out of scope for v1 (candidates for a follow-up): inline on-host checkout, per-embed allow-listed origins
  (v1 is publishable-key + rate-limit, open origins), embed impression/click analytics, non-shop embeds
  (reviews / "make an offer" widget).
