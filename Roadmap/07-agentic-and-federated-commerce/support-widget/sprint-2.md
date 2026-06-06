# Sprint 2 - Embedded Lightbox UX

Goal: ship the external-site support surface: a lightweight custom element that opens a host-page lightbox and
collects the contribution details without leaving the reader's context.

Status: ✅ shipped to production.

## US-3 - Support widget shell ✅ · Risk: LOW/MEDIUM
**As a** supporter, **I want** a compact widget that opens a lightbox on the current page, **so that** I do not
lose my reading context.

Acceptance:
- [x] `<miyagi-support-widget data-key="emb_pk_...">` registers from `embed.js`.
- [x] It renders in Shadow DOM and is isolated from host CSS.
- [x] It opens/closes a responsive lightbox on the host page.
- [x] It includes responsive/mobile CSS constraints.

## US-4 - Supporter inputs ✅ · Risk: LOW/MEDIUM
**As a** supporter, **I want** preset/custom amount, optional name/email/message, and public/private controls,
**so that** the contribution feels fast and personal.

Acceptance:
- [x] Three seller preset amounts render as tap-friendly choices.
- [x] Custom amount validates against min/max and currency.
- [x] Message is optional and max 250 characters.
- [x] Public/private toggle is clear.
- [x] Standalone loader includes es/en strings.

## QA
- [x] Playwright/static coverage guards widget registration, lightbox handoff strings, bilingual strings, and validation.
- [x] API e2e confirms cross-origin CORS behavior remains intact.
- [x] Loader/API production smoke passed (`embed.js` 200/CORS-open; support config fail-closed).
