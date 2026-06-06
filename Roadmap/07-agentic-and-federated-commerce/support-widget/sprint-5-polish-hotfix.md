# Sprint 5 - Floating Polish + Checkout Hotfix

> Status: shipped to production. PRs: frontend
> [miyagisanchezcommerce#29](https://github.com/danybgoode/miyagisanchezcommerce/pull/29), backend
> [medusa-bonsai-backend#8](https://github.com/danybgoode/medusa-bonsai-backend/pull/8).

## Scope decision

Keep the shipped support experience:

`external site -> widget lightbox -> Stripe / Mercado Pago buttons -> provider checkout popup/new tab -> Miyagi success -> widget success postMessage`

This sprint does **not** move support to the regular `/checkout` page and does **not** replace the provider buttons with a single hosted checkout CTA.

## US-10 - Floating support launcher

**As a** supporter, **I want** the support widget launcher to float in a familiar place, **so that** it feels like a polished support widget even when the snippet is pasted at the end of a page.

**Acceptance**
- [x] `<miyagi-support-widget>` defaults to a fixed bottom-right launcher with safe-area-aware spacing.
- [x] Sellers can choose `bottom-right` or `bottom-left` in the snippet generator.
- [x] `data-layout="inline"` preserves the previous inline placement for intentional in-content embeds.
- [x] Mobile launcher spacing avoids browser safe areas and the modal remains usable.
- [x] Existing lightbox inputs and Stripe/Mercado Pago buttons remain unchanged.

## US-11 - Seller preview

**As a** seller, **I want** to preview the support widget in settings, **so that** I can understand what visitors will see before pasting the snippet.

**Acceptance**
- [x] `shop/manage/settings/canal` shows a contained support widget preview near the snippet.
- [x] Preview reflects accent color, enabled state, presets, and selected position.
- [x] Preview uses the real widget behavior without pinning the launcher to the settings page viewport.

## US-12 - Support checkout seller-resolution hotfix

**As a** supporter, **I want** Stripe/Mercado Pago support checkout to open successfully, **so that** my contribution is not blocked by seller-resolution plumbing.

**Acceptance**
- [x] Support checkout no longer treats the Supabase shop id as the authoritative Medusa seller id.
- [x] Backend resolves support seller from the Medusa support product linkage/metadata.
- [x] If a bad `seller_id` is provided, backend falls back to product-linked seller resolution instead of failing early.
- [x] Valid configured support widget no longer returns `Este anuncio aún no tiene vendedor registrado.`
- [x] The current lightbox provider buttons remain unchanged.

## QA / Smoke

- [x] Frontend `tsc --noEmit`.
- [x] Frontend `npm run build`.
- [x] Frontend `npm run test:e2e` against local Next + Medusa: `95 passed / 1 skipped`.
- [x] Backend `npm run build`.
- [x] Playwright coverage for floating position / preview where feasible.
- [x] Backend unit coverage verifies seller resolution; real Stripe/Mercado Pago transaction remains Daniel-owned in production.
- [x] Frontend production deploy built merge commit `2e9b070` and is Ready on Vercel.
- [x] Backend Cloud Build `2c4f91c1-39d3-4f28-b3bd-aeeec0e7203c` succeeded for merge commit `0980253`.
- [x] Cloud Run `medusa-web-00086-npx` is ready and serving 100% traffic.
- [x] Production route probes: support config fails closed with CORS headers; Medusa support-product route is live and fail-closed behind the publishable API key guard.

## Risk

- US-10 / US-11: low-medium, frontend embed/settings UI.
- US-12: high, checkout/payment path. Daniel merge.
