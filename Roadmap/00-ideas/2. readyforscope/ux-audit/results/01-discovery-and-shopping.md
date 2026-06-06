**Structural UX Audit**

The current discovery layer has a strong base: category chips, shareable `/l?...` search URLs, two-column mobile listing cards, seller links, condition/location, favorites, PDP trust/payment/fulfillment summaries, offers, bundles, and UCP/MCP catalog plumbing.

The highest-friction issue is **listing polymorphism**. The backend already supports `listing_type` filtering at [apps/backend/src/api/store/listings/route.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/listings/route.ts:88), but the frontend query builder does not forward `listing_type` [apps/miyagisanchez/lib/listings.ts](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/listings.ts:20), and cards do not distinguish product/service/rental/digital/subscription [apps/miyagisanchez/app/l/page.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/l/page.tsx:90). This makes a rental and a product look cognitively identical until the PDP.

The PDP has useful type-specific logic, but it is not introduced early enough as a buyer decision frame. Service/rental/digital/subscription cues exist in fulfillment/payment sections [apps/miyagisanchez/app/l/[id]/page.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/l/[id]/page.tsx:141), digital and subscription branches are separate [apps/miyagisanchez/app/l/[id]/page.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/l/[id]/page.tsx:516), and seller trust appears below payment/fulfillment on mobile [apps/miyagisanchez/app/l/[id]/page.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/l/[id]/page.tsx:547). For P2P trust, seller identity, verification, location, and response/contact paths should be in the primary mobile viewport.

Mobile search is thumb-friendly in the PWA bottom bar [apps/miyagisanchez/app/components/MobileTabBar.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/MobileTabBar.tsx:147), but filters are implemented as a dense inline form above results [apps/miyagisanchez/app/l/SearchBar.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/l/SearchBar.tsx:58). Baymard’s current mobile filtering guidance favors a dedicated full-screen or bottom-sheet filter layer with sticky “Filter & Sort” and applied filter visibility, not a long inline control stack. Source: [Baymard mobile filter UI](https://baymard.com/learn/ecommerce-filter-ui).

Search semantics are basic title/description matching [apps/backend/src/api/store/listings/route.ts](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/listings/route.ts:70). Baymard’s 2026 search guidance emphasizes product-type, feature, and use-case queries, ideally translating terms into visible applied filters. Source: [Baymard ecommerce search UX 2026](https://baymard.com/blog/ecommerce-search-query-types).

The AI assistant is currently an **external prompt handoff**, not an embedded shopping assistant. It copies a prompt and opens Claude [apps/miyagisanchez/app/components/AIAgentButton.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/AIAgentButton.tsx:6). That is strong for agent-native commerce, but weak for conversational-to-catalog UX: the user does not get native result cards, filtered catalog states, PDP links, or “why this result” grounding inside the marketplace. Recent research suggests shopping AI works best as a complement to search, with users moving between chat and catalog. Source: [Shopping with a Platform AI Assistant](https://arxiv.org/abs/2603.24947).

**Prioritized Action Plan**

1. Define a buyer-facing listing-type taxonomy: product, service, rental, digital, subscription. For each type, define required card facts, PDP hero facts, primary CTA, secondary CTA, and trust cues.

2. Add listing-type affordances to browse/search: type filter, visible applied filter chips, and card-level type label/action framing. Products can say condition + location; services need availability/service area; rentals need rental period/availability; digital needs delivery/access; subscriptions need interval/tier.

3. Rebuild mobile filtering as a bottom-sheet or full-screen “Filter & Sort” flow with sticky trigger, applied chips, clear-all, category-scoped filters, and “Show X results.” Keep `/l?...` URLs shareable.

4. Improve search-to-filter interpretation: preserve keyword search, but map obvious query terms into category, location, price, type, condition, and category-specific filters. Show interpreted filters so users can undo them.

5. Reorder PDP mobile information hierarchy: title, price, listing type, seller verification/shop/location, condition/location/availability, then primary action. Seller trust should become part of the first decision viewport, not a later card.

6. Tailor PDP CTAs by listing type: “Comprar ahora” for products/digital, “Agendar cita” for services, “Ver disponibilidad” for rentals, “Suscribirme” for subscriptions, “Preguntar” when price/payment is unresolved.

7. Convert AI handoff into catalog handoff: keep the external prompt option, but add native assistant outputs as actionable cards with “View PDP,” “Apply filters,” “Save search,” and “Ask seller.” Cite product facts from listing data to reduce AI trust ambiguity. Source: [grounded conversational shopping agents](https://arxiv.org/abs/2503.04830).

8. Use your Gumtree reference for top-of-funnel structure: prominent search, immediate categories, buyer-first discovery. Use your Vinted reference for decision sheets: bundle/offer/review moments should keep context visible and actions adjacent.

9. Validation pass before implementation: run mobile task walkthroughs for “find a service,” “rent something,” “buy a digital file,” “compare two local used items,” and “ask AI for something vague, then buy/message.”