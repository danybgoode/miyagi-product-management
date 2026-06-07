# 01 · Discovery & Shopping — Refresh (2026-06)

**Depth: LIGHT** (feeds #3c, not #3b). Pinned: frontend `origin/main@ed447bd`, backend
`origin/main@0980253`. Read-only via `git show`. No files modified.

## Reproduction status of v1 findings

| v1 finding | Status | Current anchor / note |
|---|---|---|
| Listing polymorphism — backend supports `listing_type` filter but frontend query builder doesn't forward it; cards don't distinguish product/service/rental/digital/subscription | **PARTIALLY CHANGED (P1)** | `lib/listings.ts:119` now **normalizes `listing_type` onto the listing object** (`p.type?.value ?? meta.listing_type ?? 'product'`), so the data is available to cards. **Not verified fixed:** whether the search query *forwards* a `listing_type` filter and whether `app/l/page.tsx` cards render a type affordance — recheck when #3c is groomed. |
| PDP type-specific logic not introduced early as a buyer decision frame; seller trust below payment/fulfillment on mobile | **STILL LIVE (P1)** | unchanged; feeds #3c PDP hierarchy. |
| Mobile filters are a dense inline form, not a bottom-sheet/full-screen layer | **STILL LIVE (P1)** | unchanged. **Citation re-confirmed (2026):** Baymard still recommends a dedicated full-screen/bottom-sheet filter layer with a sticky "Filter & Sort" trigger, a deliberate apply action, and a dynamic "Show X results" CTA. |
| Search semantics are basic title/description matching, no query-type→filter mapping | **STILL LIVE (P2)** | unchanged; feeds #3c. |
| AI assistant is an external prompt handoff, not an embedded catalog assistant | **STILL LIVE (P2)** | `AIAgentButton.tsx` still copies a prompt + opens an external agent. |

## Net-new (post-audit surfaces)
- **New entry points into PDPs/shops** — short-links (`mschz.org/[code]` + custom product slugs) and
  subdomains create additional discovery/share surfaces. They 301/white-label to the canonical PDP,
  so they don't change the *discovery information architecture*, but they **multiply the contexts**
  a listing card/PDP renders in (see 05 per-channel trust note). No new P0.
- **Personalized products** add a buy-box surface on the PDP (live counter, required-field nudge) —
  audited functionally in its epic; no discovery regression.

## Refreshed citations
- Baymard mobile filter UI — current (2026): bottom-sheet/full-screen layer, sticky trigger, apply
  action, "Show X results". Source: https://baymard.com/learn/ecommerce-filter-ui
- (Carried from v1, not re-verified this pass — light domain) Baymard search-query-types; arXiv
  conversational-shopping. Re-confirm at #3c groom if a recommendation leans on them.

## Go-forward
01 is **#3c material** (listing-type taxonomy, mobile filter rebuild, PDP hierarchy, AI→catalog).
Nothing here moves #3b. The `listing_type` normalization is a small head-start for the #3c taxonomy work.
