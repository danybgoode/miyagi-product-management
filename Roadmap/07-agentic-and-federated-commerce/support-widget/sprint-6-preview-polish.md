# Sprint 6 - Seller Preview Polish

> Status: shipped to production. Branch: frontend `fix/support-widget-preview`; PR
> [miyagisanchezcommerce#32](https://github.com/danybgoode/miyagisanchezcommerce/pull/32).

## Scope decision

Keep the shipped external support widget unchanged for real visitors. This sprint only improves the seller-facing
preview in `shop/manage/settings/canal` so it clearly shows how the widget behaves on an external page.

## US-13 - Clear preview states

**As a** seller, **I want** to see the support widget closed and open, **so that** I understand what visitors will
experience before copying the snippet.

**Acceptance**
- [x] Settings preview shows a closed launcher state.
- [x] Settings preview shows an open lightbox state.
- [x] Preview uses the actual `miyagi-support-widget` loader behavior, not a hand-drawn mock.
- [x] Preview-only checkout buttons do not initiate real Stripe/Mercado Pago checkout.

## US-14 - Visible position preview

**As a** seller, **I want** the position toggle to update the preview immediately, **so that** I can confidently
choose right or left before saving/copying.

**Acceptance**
- [x] `Derecha` / `Izquierda` updates both preview states without saving settings.
- [x] The closed launcher is fully visible and not clipped by the preview frame.
- [x] The open modal remains centered and usable in the preview frame.
- [x] The copied snippet remains canonical and unchanged except for the chosen `data-position`.

## QA / Smoke

- [x] Frontend `npx tsc --noEmit`.
- [x] Frontend `npm run build`.
- [x] Targeted Playwright/source coverage for preview state attributes and no real checkout in preview.
- [x] Visual smoke of `shop/manage/settings/canal` with seller auth: Daniel confirmed preview smoke green.
- [x] Vercel production built merge commit `bd264f1` and completed deployment.
- [x] Production smoke: `embed.js` 200/CORS-open; support config fails closed 404/CORS-open.

## Risk

Low/medium, frontend-only settings preview and embed-loader preview mode. No backend or live money-path changes.
