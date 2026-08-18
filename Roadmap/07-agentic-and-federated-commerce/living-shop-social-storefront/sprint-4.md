# Living Shop — Sprint 4: Theme engine v2

**Status:** ⬜ not started

**Risk:** MED — cross-storefront visual system + compatibility migration/resolver; no arbitrary style execution.

## Stories

### Story 4.1 — Three-mode theme schema + resolver
**As a** seller, **I want** a simple choice between Default, Retro Social and Custom, **so that** I understand the level of control without choosing among implementation-oriented presets.

**Acceptance:** typed settings distinguish `theme_mode` (`default|retro|custom`) from `theme_recipe`; absent/invalid values resolve to Default; one pure resolver produces approved data attributes/CSS-variable values; public components consume resolved tokens, not raw seller strings.

### Story 4.2 — Legacy preset compatibility
**As an** existing shop owner, **I want** my current Papel/Pizarra/Lienzo/Terracota look to survive the new model, **so that** an upgrade does not silently reset my storefront.

**Acceptance:** all shipped `theme_preset` values are accepted and deterministically mapped to an equivalent recipe or compatibility adapter; settings import/get round-trip does not reject old state; migration/backfill, if used, is idempotent and product-owner applied; visual regression fixtures prove each legacy preset remains materially equivalent until the seller chooses a new mode.

### Story 4.3 — Finished Retro Social theme
**As a** seller, **I want** a nostalgic social-profile storefront that still behaves like modern commerce, **so that** my shop can feel playful and personal rather than SaaS-templated.

**Acceptance:** Retro Social meaningfully changes module framing, identity prominence, surface/pattern treatment, typography and Wall rhythm; it does not introduce inaccessible blinking/marquee behavior, tiny targets or layout breakage; PDP/collections/content pages inherit the theme coherently; checkout/auth secure-hop behavior remains unchanged.

### Story 4.4 — Custom recipe vocabulary
**As a** seller, **I want** substantial visual freedom through understandable controls, **so that** I can create a distinct shop without writing code.

**Acceptance:** schema supports approved typography, density, corners, surface, background, accent/secondary accent, hero treatment, Wall layout, Wall card treatment, product-card treatment and identity prominence; every enum/range is bounded; arbitrary CSS/HTML/JS/font URL fields do not exist; colors are validated and converted through safe vars; combinations pass contrast/token rails or are refused with a useful reason.

### Story 4.5 — Theme application across all shop surfaces
**As a** buyer, **I want** the merchant's visual identity to persist beyond the homepage, **so that** PDPs, collections, events and content pages feel like one site.

**Acceptance:** resolved theme applies to homepage, Shop, collection, event, About/FAQ/Policies and seller-owned PDP surface on all channels; platform-owned secure checkout/auth handoff remains clearly trustworthy and unchanged where intentionally outside shop theming.

## QA

- pure resolver/validation specs for every enum and invalid fallback;
- legacy-preset compatibility snapshots/DOM token assertions;
- contrast tests for generated combinations within the approved palette model;
- design-token audit clean; no raw seller CSS injection path;
- browser visual-structure specs at 375px and desktop for Default/Retro/representative Custom.

## Smoke walkthrough

1. Open a shop currently using Papel before choosing a new mode.
   → Its appearance remains materially equivalent; no reset to Default.
2. Choose Retro Social.
   → Homepage, PDP and collection page all adopt the nostalgic framed/profile language while actions remain modern and readable.
3. Choose Custom and set compact density, square corners, bordered surfaces, a secondary accent and feed-sidebar layout.
   → Preview/public shop reflect only those approved controls; no arbitrary code field exists.
4. Enter an invalid color/schema value through the API.
   → Validation refuses it or resolves safely; no style/script injection reaches markup.
5. Test at 375px.
   → Retro and Custom collapse cleanly; no horizontal overflow or sub-44-ish touch targets introduced by theme chrome.
