# Support Widget Retrospective

**Date:** 2026-06-05  
**Scope:** full support-widget epic across frontend `miyagisanchezcommerce#25` and backend `medusa-bonsai-backend#7`.

## What Shipped
- Seller support settings: enable/disable, exactly three presets, custom min/max, currency, default visibility, and paste-ready snippet.
- Hidden Medusa support primitive: provision/reuse endpoint, catalog/storefront exclusion, and support metadata through checkout/order/payment.
- External widget: `<miyagi-support-widget>` in the existing loader, Shadow DOM button, host-page lightbox, bilingual copy, validation, provider handoff, success listener, and auto-close confirmation.
- Guest support checkout: no Clerk redirect, email receipt collection, `channel=embed`, Stripe Connect and Mercado Pago seller-connected rails, no platform-token MP fallback.
- Success/order/webhook/agent parity: support-specific success state, seller order context, webhook side-effect guards, and UCP/MCP support discovery + checkout tools.

## Verification
- Frontend local: `npx tsc --noEmit`, `npm run build`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:e2e` -> `65 passed / 1 skipped`.
- Backend local: `npm run build`.
- Frontend PR CI: type-check/build, preview Playwright, and Vercel preview all green.
- Production deploy: Vercel production ready; backend Cloud Build `04cb012` succeeded and Cloud Run `medusa-web-00084-tlv` serves 100% traffic.
- Production API smoke: `embed.js` 200/CORS-open; `/api/embed/support` fails closed 404/CORS-open; backend `/store/sellers/me/support-product` is deployed and auth-gated.

## Still Owed
- Real Stripe and Mercado Pago support transactions in production. This is intentionally Daniel-owned because it touches real payment rails, seller sessions, and provider receipts.

## What Went Well
- Extending the existing embed loader kept the external-site model consistent: host-page UI only, payment handoff on Miyagi-owned infrastructure.
- Medusa-first modeling avoided a parallel money ledger. Support rides existing cart/order/payment concepts with support metadata instead of a Supabase money table.
- Pure validation tests on `lib/support-widget.ts` caught the most important amount/message rules without requiring real seller credentials.
- Backend-first merge plus frontend graceful fail-closed support kept the async deploy window tolerable.

## What Went Wrong
- I briefly followed a stale Render CLI/service clue and manually triggered a Render deploy. That was wrong for this project; the active backend pipeline is Cloud Build `us-east4` -> Cloud Run `medusa-web`. The Render deploy was cancelled before completion.

## Durable Learning
- Deployment source of truth lives in `apps/miyagisanchez/AGENTS.md`, `Roadmap/WAYS-OF-WORKING.md`, `Roadmap/LEARNINGS.md`, and `apps/backend/cloudbuild.yaml`: frontend deploys git-driven through Vercel; backend deploys git-driven through Cloud Build/Cloud Run. Ignore stale Render services for Miyagi backend shipping.
