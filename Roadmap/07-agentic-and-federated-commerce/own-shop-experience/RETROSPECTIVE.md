# Retrospective — Own channel: full shop experience (own-shop-experience)

**Closed:** 2026-06-05 · **Scope delivered:** Sprints 1 + 2 (Sprint 3 descoped to a future epic).

## What shipped

**Sprint 1 — Full white-label shop routing** (PR #10, merge `8b5c118`, HIGH risk):
- The middleware stopped **rewriting every route** of a custom domain to `/s/[slug]` (root cause: a domain
  could only show the homepage; product/cart/`/api/*` died). Now it resolves the shop once, only `/`
  rewrites, and the rest passes through with channel headers on the **request**.
- White-label chrome centralized in the root layout (same pattern as `embed`): every page on the domain is
  wrapped in `ChannelLayout` with the shop's brand.
- Per-shop isolation: foreign product → white 404; `/s/*` and `/l` (browse) → homepage; `x-miyagi-*`
  headers are stripped on platform hosts (anti-spoof).

**Sprint 2 — SEO continuity + legacy redirects + fail-safe** (PR #11, merge `09c06d0`, MEDIUM risk):
- `lib/custom-domain.ts` `getActiveCustomDomain(slug)` — reverse lookup (only if `custom_domain_verified`),
  cached + `shop-domains` tag.
- Page-level 308 from `/s/[slug]` and `/l/[id]` to the live domain; `canonical`/`og:url` to the domain.
- `app/robots.ts` + `app/sitemap.ts` per host. `revalidateTag` in the domain flow → instant fail-safe.

## What went well
- **The middleware pivot was the right, low-regression-risk idea**: links were already relative, so no bulk
  link-rewriting was needed.
- **CI caught a real robustness bug**: the Supabase lookup threw 500 on previews (stub client). The fix
  (try/catch → degrades to "no domain") also protects production.
- **The isolated worktree** avoided clashing with the parallel `feat/sweepstakes` agent.
- Story-by-story cadence + green gate + spoofed-`Host` smoke worked well for what IS testable without the
  backend/live domain.

## What we learned / friction
- **Next 16**: `revalidateTag(tag, 'default')` takes a profile 2nd arg; the Supabase client is a stub in
  envs without service-role (its `.select()` doesn't chain) → any lookup must be in a try/catch.
- **White-label by hostname is NOT testable on previews** (`*.vercel.app` = platform host; Supabase
  stubbed) → the positive path (verified domain → redirect/canonical, rendered chrome) remains **Daniel's
  smoke on a real domain**. Gap declared, not papered over.
- **Specs must not hardcode slugs**: derive from the public catalog (`embed-shop.spec.ts` pattern).
- **The epic doc underestimated Sprint 3.** It assumed "frontend only" and a working checkout; the
  investigation revealed that (a) checkout from a custom domain **doesn't work today** (Clerk is
  platform-domain-only; the auth/payment "hop" was never built), and (b) propagating the channel through
  Medusa's new flow requires **backend**. Hence it was descoped.

## What was NOT done (explicit debt → future epic)
- **Checkout from a custom domain** (the "hop" to the platform for auth/payment and the return to the
  domain) — today a buyer on `myshop.mx` can't functionally buy.
- **Transactional emails with the tenant domain** (AC 2.3) — requires `channel` in the main flow's metadata
  (backend).
- **Asset masking** (AC 1.3) and **Clerk satellite domains** (full AC 2.2) — deferred by design.
- All of this lives in `Roadmap/00-ideas/2. readyforscope/custom-domain-checkout.md`.

## Gotchas for the next agent
- The backend deploys via a **regional Cloud Build in us-east4** (~12 min); the frontend via Vercel on
  merge to `main`. Vercel previews are SSO-gated (bypass token in `playwright.config.ts`).
- The shop page (`/s/[slug]`) is now **dynamic** (it reads `headers()` to decide the redirect); the data is
  still cached via `unstable_cache`.
- Only domain in the system: `panuchas.com` → slug `miyagi-sanchez`, **unverified**
  (`custom_domain_verified=false`). Don't verify it on a real shop to test: it would make prod redirect
  (308) a live shop to a dead host.
