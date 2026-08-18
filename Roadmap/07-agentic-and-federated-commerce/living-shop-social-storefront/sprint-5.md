# Living Shop — Sprint 5: Seller studio

**Status:** ⬜ not started

**Risk:** MED — substantial seller UX/editor state; respect shop-settings anti-monolith guard.

## Stories

### Story 5.1 — Dedicated Appearance & Content studio IA
**As a** seller, **I want** one coherent place to manage what my shop says and how it looks, **so that** I do not have to understand internal settings taxonomy.

**Acceptance:** create a dedicated seller surface with tabs/sections **Wall · Sections · Theme · Brand · Preview**; reuse/move existing logo/banner/tagline/social/accent/hero controls rather than duplicate persistence; `Diseno.tsx` does not grow into a new monolith and guarded components remain under the line cap.

### Story 5.2 — Wall management experience
**As a** seller, **I want** to see draft/scheduled/published entries and act on them quickly, **so that** maintaining the storefront feels like running a social page.

**Acceptance:** list has clear status, kind, effective publish time and pin state; create/edit/duplicate where appropriate, publish/unpublish/delete and pin actions have explicit feedback; scheduled items display local intended time + absolute semantics; destructive action has existing undo/confirmation convention as appropriate.

### Story 5.3 — Section manager
**As a** seller, **I want** to reorder and toggle only supported shop destinations, **so that** I can emphasize what matters without breaking navigation.

**Acceptance:** required Wall/Shop are visually locked; optional available sections can be toggled and reordered using keyboard/mobile-accessible controls; impossible states are prevented before save; live preview mirrors the proposed nav.

### Story 5.4 — Theme mode picker + Custom controls
**As a** seller, **I want** to select a finished theme or tune Custom with plain-language controls, **so that** personalization feels creative rather than technical.

**Acceptance:** three large theme choices with representative previews; Custom reveals only when selected; controls use descriptive labels/examples rather than CSS vocabulary where possible; invalid combinations show inline reason; Reset to theme default is explicit and reversible before save.

### Story 5.5 — Responsive live preview
**As a** seller, **I want** to preview unsaved appearance/content changes at desktop and mobile sizes, **so that** I can judge the shop before publishing changes.

**Acceptance:** preview consumes the same renderer/schema as public shop (no second visual implementation); desktop/mobile toggle; unsaved local recipe/section state can be previewed without leaking publicly; direct “View live shop” remains available; preview errors are isolated and do not lose edits.

## QA

- seller settings page/component line-cap guard remains green;
- browser specs for keyboard/mobile section reorder and theme controls;
- preview/public resolver parity spec (same normalized input produces same attributes);
- save/discard/reset behavior specs;
- live-smoke on seller studio at desktop + mobile.

## Smoke walkthrough

1. Open the seller studio.
   → Five coherent areas—Wall, Sections, Theme, Brand, Preview—are available; existing brand data is already populated.
2. Draft a new Product Wall entry, pin it and preview without publishing.
   → Preview shows it; public shop does not.
3. Reorder optional sections and switch from Default to Retro Social.
   → Preview updates immediately without saving.
4. Switch preview to mobile.
   → 375px rendering is usable and reflects the same pending configuration.
5. Save/publish changes.
   → Public shop now matches preview; toast/feedback is explicit.
6. Reopen existing Diseño/settings routes.
   → No duplicate conflicting controls or monolith regression; links route to the new canonical studio where appropriate.
