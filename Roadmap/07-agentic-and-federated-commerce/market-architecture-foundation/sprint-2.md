# Market architecture foundation — owned shops, country marketplaces, and locale — Sprint 2: Country routes, selector, and Mexico continuity

**Status:** ⬜ not started

## Epic-mode boundary

This is the public-routing boundary. It stacks on Sprint 1's market-filter contract and performs one
clean pre-launch cutover rather than operating old and new canonical systems in parallel.

## Stories

### Story 2.1 — Master-brand root selector and canonical `/mx`

**As a** visitor, **I want** to choose the market I am entering, **so that** Miyagi never mixes
country commerce contexts.

**Acceptance:**

- `/` is a static, fast master-brand page with explicit Mexico and United States choices.
- Mexico links to `/mx`; United States links to `/us`.
- Browser language/IP may recommend but never silently or permanently redirect.
- Existing Mexico marketplace homepage content lives canonically at `/mx`.
- No catalog item renders on the root selector.
- Copy explains owned shops versus Miyagi Markets without claiming worldwide operational readiness.

**Risk:** high (root/shared public surface)

### Story 2.2 — Market-prefixed Mexico discovery and permanent redirects

**As a** Mexico buyer, **I want** every marketplace route to retain one market context, **so that**
search, categories, shops, products, cart creation, and canonical URLs agree.

**Acceptance:**

- Marketplace home, browse/search, category, PDP, and platform-host shop routes resolve `mx`.
- Old indexable marketplace URLs receive one-hop 308 redirects to their `/mx` canonical
  equivalents; no redirect chains.
- Tenant subdomain/custom-domain/embed URLs remain unchanged and never gain `/mx`.
- Internal links, sitemap, OpenGraph, structured data, emails, MCP/UCP URLs, and checkout return URLs
  use the canonical market path where they refer to the marketplace.
- Route-group/middleware implementation reuses one page/component system; no MX codebase fork.

**Risk:** high (routing + checkout links)

### Story 2.3 — Market-aware reads and agent contract

**As a** buyer or agent, **I want** catalog tools scoped to a market, **so that** results, currency,
and checkout URLs cannot cross country boundaries.

**Acceptance:**

- Marketplace listing/search/category/shop functions require/derive `market`.
- UCP/MCP marketplace tools accept `market` with a temporary MX default and return `market_code`.
- Agent instructions describe Miyagi as a commerce system with country markets; the search tool
  describes the active Mexico market rather than defining the master brand as Mexico-only.
- An unavailable/invitation market returns a structured unavailable state, never an empty-looking
  success or another market's data.
- Existing seller-operation MCP behavior remains shop-scoped and market-neutral.

**Risk:** high (agent/catalog contract)

### Story 2.4 — Locale and international SEO are separate

**As a** search engine or multilingual visitor, **I want** stable market and language signals, **so
that** market routing is indexable without confusing language with commerce.

**Acceptance:**

- `/` is `x-default`; `/mx` self-canonicalizes and emits `es-MX`; `/us` self-canonicalizes and emits
  `en-US`.
- Alternates are emitted only for real pages; no fake `/us` marketplace alternate to MX catalog.
- `/us-eng` is absent.
- Locale selection does not mutate market, cart Region, currency, or publication.
- Sitemap contains canonical market URLs and excludes redirect sources.

**Risk:** medium

## Sprint QA

- **api specs:** root contains no catalog; `/mx` content and market filtering; one-hop redirect
  matrix; custom-domain/subdomain/embed routes unchanged; canonical/hreflang/x-default; UCP market
  unavailable response.
- **browser spec:** anonymous root selector at mobile and desktop; navigation to `/mx`; no hydration
  or console errors.
- **browser smoke owed:** none requiring auth/money; existing checkout return-link regression suite
  remains required.
- **deterministic gate:** `tsc --noEmit` + build + full Playwright `api` green; focused browser spec
  green before integration.

## Sprint 2 — Smoke walkthrough

Env: branch preview, then production after merge.

1. Open `https://miyagisanchez.com/`.
   → Master-brand selector renders; no product/catalog cards; Mexico and US choices are visible.
2. Select Mexico.
   → `https://miyagisanchez.com/mx` renders the current marketplace experience in es-MX.
3. Open an old marketplace PDP/search/category/shop URL.
   → One-hop 308 lands on the equivalent `/mx` canonical URL.
4. Open a real seller subdomain/custom domain and an embed shop.
   → URLs and white-label chrome are unchanged; no `/mx` prefix appears.
5. Inspect canonical/alternate metadata on `/`, `/mx`, and `/us`.
   → `x-default`, `es-MX`, and `en-US` are correct; no `/us-eng`.
6. Ask the marketplace MCP search for `market=us`.
   → Structured invitation/unavailable response; zero MX listings.

If any step fails, note the step number + what you saw — that's the bug report.
