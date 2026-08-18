# Living Shop — Sprint 2: Living homepage

**Status:** ✅ shipped — `58fb637` (PR #391)

**Risk:** LOW-MED — public rendering/cache behavior across owned-shop homepage; no money-path changes.

## Stories

### Story 2.1 — Wall becomes the homepage narrative
**As a** buyer, **I want** a seller's homepage to show what is happening now, **so that** the shop feels current and inhabited rather than like a static product grid.

**Acceptance:** `/s/[slug]` and its subdomain/custom-domain rewrite render the pinned visible entry first, then published/schedule-effective entries newest-first; initial page is bounded and has a deterministic load-more/pagination path; no Wall content produces a designed empty/new-shop state rather than an error; announcement, identity, hero and trust surfaces still compose coherently.

### Story 2.2 — Native Post card
**As a** buyer, **I want** merchant notes and images to read like authored shop content, **so that** I can understand the person/brand behind the catalog.

**Acceptance:** Post card supports body, bounded media, author/shop identity and date; semantic heading/body structure; alt text preserved; no comment/reaction UI; long content truncation/expansion is accessible and stable on mobile.

### Story 2.3 — Native Product + Collection Wall cards
**As a** buyer, **I want** products and collections to appear inside the seller's story with real commerce actions, **so that** discovery and shopping are one flow.

**Acceptance:** Product card resolves current product image/title/price/availability and links to the existing PDP; Collection card resolves current collection identity + a bounded sample of currently public products and links to its existing collection route; optional seller note is visually distinct from canonical commerce fields; unavailable references disappear safely.

### Story 2.4 — Native Event Wall card
**As a** buyer, **I want** upcoming shop events to appear in the Wall with the real event action, **so that** a merchant's physical/community activity is part of the storefront.

**Acceptance:** Event entry resolves title/date/venue/status and existing RSVP/ticket destination; cancelled/past handling is explicit; missing/foreign events never render; event date is locale/market appropriate.

### Story 2.5 — Default Living Shop theme
**As a** buyer, **I want** the evolved default storefront to remain unmistakably Miyagi Sánchez and easy to shop, **so that** social content does not reduce commerce clarity.

**Acceptance:** Default theme uses current shop tokens/design language; Wall is primary but Shop/Collections remain obvious; desktop may use a restrained supporting rail, mobile becomes one linear flow; no horizontal overflow at 360–390px; all interactive targets meet existing mobile rails; current shop with no new settings degrades to the new Default without losing content.

## QA

- public API/read specs for ordering, pinned behavior, schedule visibility and unavailable references;
- browser specs for all four card kinds at desktop + mobile viewport;
- accessibility assertions for headings, links/buttons, image alt and keyboard expansion;
- bounded initial payload/per-page assertion;
- rendered `live-smoke` on marketplace shop route and one channel-host simulation.

## Smoke walkthrough

1. Open a shop that has published Wall entries: `https://miyagisanchez.com/mx/s/<slug>`.
   → The pinned entry leads under **Novedades**; the rest are newest-first; each card type is distinct but part of one Wall.
2. Click a **Producto** card.
   → The existing PDP opens on the same host, at `/mx/s/<slug>/l/<id>`.
3. Click a **Colección** card.
   → The existing collection page opens, showing only that shop's collection.
4. Open the same shop on its subdomain (`https://<slug>.miyagisanchez.com`).
   → Same Wall, and every link stays on the subdomain — no `/mx/s/` prefix leaks.
5. Resize to 375px.
   → One column, no horizontal scroll, no clipped CTA.
6. Open a shop with no Wall entries.
   → Today's storefront, unchanged. The Wall section is absent rather than an empty shell.
7. Anonymous read, runs anywhere:
   `curl -s 'https://miyagisanchez.com/api/shop/wall?slug=<slug>' | head -c 400`
   → JSON with at most 12 entries, each carrying an `effective_at` in the past. An unknown slug returns **404**; an unreachable backend returns **503**, never an empty 200.
