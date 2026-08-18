# Living Shop — Sprint 7: Cross-channel finish + dogfood

**Status:** ⬜ not started

**Risk:** MED — broad public-surface hardening, SEO/cache/performance; no payment logic changes.

## Stories

### Story 7.1 — Cross-channel parity and isolation
**As a** buyer, **I want** the living shop to behave identically on marketplace, free subdomain and custom domain, **so that** the merchant's channel choice does not change the experience.

**Acceptance:** Wall, all enabled sections, theme recipe and relative navigation work on all three channels; foreign shop objects/routes fail white-label safely; embed intentionally remains current compact catalog behavior; no unnecessary middleware change if existing pass-through already suffices.

### Story 7.2 — SEO / metadata / sitemap continuity
**As a** merchant, **I want** my living shop content to remain crawlable and canonical on my preferred domain, **so that** customization does not fragment search identity.

**Acceptance:** enabled indexable section routes join per-host sitemap/canonical rules; Wall homepage metadata continues to use merchant identity/hero/brand safely; individual Wall entries are not automatically separate indexable pages unless a durable route is explicitly justified in build; hidden/unavailable sections do not leak into sitemap; OG image/theme behavior remains valid.

### Story 7.3 — Accessibility hardening across themes
**As a** buyer using keyboard, screen reader, zoom or reduced motion, **I want** every theme to preserve the same interaction quality, **so that** merchant expression does not trade away access.

**Acceptance:** contrast guards cover theme recipe surfaces; focus indicators remain visible in all modes; semantic landmarks/headings/nav are stable; keyboard access for Wall expansion/load-more and seller studio controls; reduced-motion respected; 200% zoom/mobile reflow does not lose actions.

### Story 7.4 — Wall performance + cache behavior
**As a** buyer, **I want** a media-rich Wall to remain fast, **so that** social expression does not make the storefront sluggish.

**Acceptance:** bounded initial entry count; optimized/lazy media; no unbounded canonical-object N+1 pattern (batch or bounded resolver strategy); publish/unpublish invalidates the right shop views; performance budget is measured against the current shop homepage and any material regression is named/fixed rather than assumed acceptable.

### Story 7.5 — Edge states and lifecycle behavior
**As a** seller/buyer, **I want** deleted products, cancelled events, empty sections and renamed shops to fail gracefully, **so that** Wall history does not become broken chrome.

**Acceptance:** deleted/unpublished Product/Collection refs disappear or degrade according to one documented rule; cancelled/past Events have a defined state; deleting the pinned entry clears pin semantics; shop rename/domain canonical behavior remains intact; empty Wall/Events/Collections states never imply unavailable data is an empty successful result.

### Story 7.6 — Flagship dogfood + visual acceptance
**As the** product owner, **I want** three fully configured shops/states exercising Default, Retro Social and Custom, **so that** the capability is judged as a coherent product rather than isolated controls.

**Acceptance:** configure representative shop states using real catalog/event/content data; capture desktop + mobile before/after references; Default proves clarity, Retro proves strong personality, Custom proves high expressive range; product owner walk-through covers marketplace + subdomain/custom host and seller editor; defects discovered are fixed inside the epic rather than documented as a future “real version.”

## QA

- channel-header/isolation api specs;
- sitemap/canonical specs;
- browser accessibility/keyboard + 375px/200%-zoom smoke;
- performance measurement with bounded Wall dataset and canonical-reference resolution count;
- `live-smoke` across homepage, Shop, one collection, Events and one PDP for each theme mode;
- full deterministic gate + cross-family review if final diff touches a consequential shared seam.

## Smoke walkthrough

1. Open the Default dogfood shop on marketplace, subdomain and custom domain.
   → Same Wall/sections/content; links remain host-correct; no platform-brand leakage on white-label hosts beyond intentionally secure handoff.
2. Repeat key routes for Retro Social.
   → Theme persists across homepage, Shop, collection, Events, content page and PDP; no accessibility regression.
3. Repeat for representative Custom recipe at 375px and desktop.
   → Distinct appearance, coherent UX, no overflow/clipped actions.
4. Publish a media-heavy Wall entry and load the homepage cold.
   → Initial Wall is bounded, media lazy/optimized, interaction remains responsive; load-more fetches the next page only.
5. Unpublish the product referenced by a Wall entry.
   → Public Wall no longer presents stale buyable data or a broken foreign card.
6. Inspect sitemap/canonical on custom domain.
   → Only enabled/public shop destinations are listed and canonical remains the merchant domain.
