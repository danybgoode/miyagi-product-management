# Market architecture foundation — owned shops, country marketplaces, and locale — Sprint 2: Country routes, selector, and Mexico continuity

**Status:** 🟨 in progress — preserved worktree `feat/market-architecture-foundation-s2`

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

## Build contract (locked by the architect before the builder started)

Cite `README.md` decisions **D7, D7b, D7c, D8, D10, D14**. Branch `feat/market-architecture-foundation-s2`,
cut from the S1 frontend branch (stacked — **D14**).

**Route shape (D7).** Literal `mx/` segments. **No root-level `[market]` dynamic segment** — it would
shadow-compete with ~20 existing top-level routes. In scope for the prefix and nothing else:

| From | To |
|---|---|
| `app/(site)/page.tsx` (Mexico homepage) | `app/(site)/mx/page.tsx`, moved verbatim, `revalidate = 60` preserved |
| — | `app/(site)/page.tsx` becomes the master-brand selector: static, zero catalog, Mexico + United States |
| `/l`, `/l/[id]`, `/s/[slug]` | `app/(shell)/mx/…` thin routes over the **same** shared components |

Out of scope and staying un-prefixed: `/c/[collection]`, `/g`, `/v`, `/e`, `/vecindario`,
`/comparador`, `/agent`, `/acerca`, `/vende/*`, `/sell`, `/shop`, `/account`, `/admin`. Bare `/c`
is tenant-only and header-scoped; the marketplace collection URL is
`/s/[slug]/c/[collection]` and moves with the `/s` family (**D7c**). Do not widen the list.

**The un-prefixed `/s/[slug]` and `/l/[id]` route files stay in the tree.** They are the target of
middleware's tenant rewrite. Deleting them breaks every subdomain, custom domain and embed.

**D7b — one prop, no host-sniffing.** Shared components take `marketBasePath`: `''` from tenant
routes, `marketBasePath('mx')` from marketplace routes. A component must never read `headers()` to
guess which context it is in.

**D8 — the redirect rule goes LAST in `middleware.ts`.** Add the platform-host 308 (`/l`, `/l/*`,
`/s/*` → `/mx/…`) **below** every subdomain/custom-domain/embed branch, so a tenant host never
reaches it. This is the highest-risk edit in the epic. One hop, no chains. A spec asserts the full
redirect matrix **and** that a tenant host produces no `/mx` anywhere in its HTML or headers.

**The redirect-chain trap the architect already found — fix these four, then go looking for more.**
"No redirect chains" is not satisfied by a clean `/l → /mx/l` hop, because four existing redirects
already *target* the paths you are about to move, and each becomes a silent two-hop chain:

| Site | Today | Must become |
|---|---|---|
| `lib/shortlink.ts#shopTarget` | `{origin}/s/{slug}` | `{origin}/mx/s/{slug}` |
| `lib/shortlink.ts#listingTarget` | `{origin}/l/{productId}` | `{origin}/mx/l/{productId}` |
| `lib/shortlink.ts#HOME_TARGET` | `{origin}` — which is now the **selector**, not the Mexico marketplace | `{origin}/mx` |
| `lib/shortlink.ts#PASSTHROUGH_PREFIXES` | passes `s` and `l` through to the identical path | those two prefixes must land on `/mx/…`; `g`, `e`, `v` stay un-prefixed (D7 scope) |
| `middleware.ts` subdomain-paywall 301 (~line 150) | `https://{ROOT_DOMAIN}/s/{slug}` | `/mx/s/{slug}` |

`mschz.org` is **the highest-real-traffic surface on the platform right now** (666 requests/7d,
measured during the GCP teardown) and it is a QR/print redirector — a printed code cannot be
re-issued. Treat it as the load-bearing case, not a footnote.

**Link sweep — derive the population, don't trust a count.** 62 files reference `/l/` and 46 carry an
absolute `miyagisanchez.com/…` marketplace URL as of 2026-07-28; that inventory is stale the moment a
sibling epic lands. Re-derive it with a grep at build time and script the sweep with a shape
assertion that aborts on the first non-matching site. Internal links, sitemap, OpenGraph, structured
data, emails, MCP/UCP URLs and **checkout return URLs** all move together.

**D10 — MCP/UCP.** `search_listings` and the marketplace catalog tools take optional `market`
(default `'mx'`, labelled temporary in the tool description) and return `market_code`. `market: 'us'`
⇒ `{ unavailable: true, market_code: 'us', marketplace_status: 'invitation', reason }`. The agent
instructions describe Miyagi as a commerce system **with country markets**, and the search tool
describes the active Mexico market — it no longer defines the master brand as Mexico-only.

**Locale/SEO (Story 2.4).** `/` is `x-default`; `/mx` self-canonicalizes + `es-MX`; `/us`
self-canonicalizes + `en-US`. All three are real pages, so the alternates block on those three is
honest — but **catalog pages emit no `/us` alternate at all**. `/us-eng` must not exist. Sitemap
contains canonical market URLs and excludes every redirect source.

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
