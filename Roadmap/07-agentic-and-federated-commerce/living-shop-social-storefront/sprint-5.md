# Living Shop — Sprint 5: Seller studio

**Status:** ✅ shipped — `ea108ac` (PR #391)

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

Every step here needs a real seller session — **the whole walkthrough is OWED (Daniel)**.

1. Open `https://miyagisanchez.com/shop/manage/tienda`.
   → Five areas — Muro, Secciones, Tema, Marca, Vista previa — and existing brand data already populated under **Marca**.
2. In **Marca**, change the tagline and save.
   → It saves through the same controls as *Diseño y marca*; reopening that settings page shows the same value, because there is one write path, not two.
3. In **Secciones**, move a section with the up/down buttons using only the keyboard.
   → Focus stays on the button, the order changes, and a screen reader announces the new position.
4. In **Tema**, switch to Retro Social, then open **Vista previa**.
   → The preview shows Retro *before* saving. Open the public shop in another tab — it still shows the saved theme.
5. Switch the preview to **Celular**.
   → 375px rendering of the same pending configuration.
6. Save, then reload the public shop.
   → It now matches what the preview showed.
7. **The leak check, and it runs anonymously:** copy the preview iframe's URL (it carries `?preview=1&theme_mode=…`) and open it in a private window.
   → The SAVED shop renders, not the draft. Covered automatically by `e2e/shop-preview-overlay.spec.ts`.
