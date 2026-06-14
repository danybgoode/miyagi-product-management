---
status: shipped
slug: support-widget
---

# Epic - Support Widget

> Status: ✅ shipped to production. PRs: frontend
> [miyagisanchezcommerce#25](https://github.com/danybgoode/miyagisanchezcommerce/pull/25), backend
> [medusa-bonsai-backend#7](https://github.com/danybgoode/medusa-bonsai-backend/pull/7).
> Latest polish/hotfix: frontend
> [miyagisanchezcommerce#29](https://github.com/danybgoode/miyagisanchezcommerce/pull/29), backend
> [medusa-bonsai-backend#8](https://github.com/danybgoode/medusa-bonsai-backend/pull/8).
> Latest preview polish: frontend
> [miyagisanchezcommerce#32](https://github.com/danybgoode/miyagisanchezcommerce/pull/32).
> Remaining live confirmation: real Stripe/Mercado Pago support transaction in production.

**Tagline:** *A Buy Me a Coffee-style support button for every Miyagi seller, embeddable anywhere.*

## Why this matters
Sellers do not only sell catalog items. Many creators, curators, service providers, and small merchants also
have audiences on blogs, portfolios, newsletters, and personal sites where a visitor may want to send a quick
tip or contribution without starting a full marketplace shopping flow.

The shipped embeddable widget already lets a seller drop a product, buy button, or whole shop onto another
website. This epic adds a lighter support surface: preset amounts, optional custom amount, optional note, and a
guest-first payment handoff that keeps payment on Miyagi-owned infrastructure.

## Product decisions
- **V1 keeps payment off the third-party origin.** The external site gets a lightbox and contribution form; the
  actual Stripe/Mercado Pago payment handoff stays on Miyagi-owned pages and existing rails.
- **Commerce remains Medusa-owned.** Support contributions use a hidden Medusa support product/equivalent and
  flow through cart/order/payment metadata, not a custom Supabase money table.
- **Guest-first.** Supporters must not need Clerk to contribute.
- **Bilingual.** The standalone loader keeps its own es/en strings, matching the existing embed-loader exception.

## Sprints
- [sprint-1.md](sprint-1.md) - Seller support setup + Medusa support primitive.
- [sprint-2.md](sprint-2.md) - Embedded support widget + lightbox inputs.
- [sprint-3.md](sprint-3.md) - Guest support checkout + seller payment routing.
- [sprint-4.md](sprint-4.md) - Success feedback, receipts/feed, and UCP/MCP parity.
- [sprint-5-polish-hotfix.md](sprint-5-polish-hotfix.md) - Floating launcher polish, seller preview, and checkout seller-resolution hotfix.
- [sprint-6-preview-polish.md](sprint-6-preview-polish.md) - Clear seller preview with closed/open states and visible position switching.

## QA / smoke stage
- **Deterministic gate:** frontend `npx tsc --noEmit`, `npm run build`, `npm run test:e2e`; backend `npm run build`.
- **Latest local result:** frontend typecheck passed, frontend build passed, backend build passed, frontend API e2e
  passed `95 passed / 1 skipped` with local Next + Medusa dev servers, and backend seller-resolution unit coverage passed.
- **CI/deploy:** frontend PR checks green; Vercel production built merge commit `2e9b070`. Backend Cloud Build
  `2c4f91c1-39d3-4f28-b3bd-aeeec0e7203c` succeeded for merge commit `0980253`, and Cloud Run
  `medusa-web-00086-npx` serves 100% traffic.
- **Latest preview-polish deploy:** frontend PR #32 checks green; Vercel production built merge commit `bd264f1`.
- **Production smoke:** `embed.js` 200/CORS-open, support config fails closed 404/CORS-open, backend
  `support-product` route is deployed and auth-gated.
- **Specs added:** support config CORS/fail-closed, widget registration/lightbox handoff, support validation,
  UCP/MCP support discovery, and success `postMessage` source guard.
- **Live confirmation split:** agent owned API/static smoke; Daniel owns the real Stripe/Mercado Pago
  support transaction in production.

## Risk tiers
| Story | Risk | Merge owner |
|---|---|---|
| US-1 seller setup | HIGH | Daniel |
| US-2 Medusa support primitive | HIGH | Daniel |
| US-3 widget lightbox | LOW/MEDIUM | Reviewer if isolated |
| US-4 supporter inputs | LOW/MEDIUM | Reviewer if isolated |
| US-5 guest checkout | HIGH | Daniel |
| US-6 seller payment routing | HIGH | Daniel |
| US-7 success feedback | MEDIUM | Daniel if payment-coupled |
| US-8 receipts/feed | HIGH | Daniel |
| US-9 UCP/MCP parity | MEDIUM/HIGH | Daniel if checkout-coupled |

## Out of scope for V1
Inline Stripe Payment Element or Mercado Pago Bricks on the third-party origin, recurring memberships, public
analytics, per-origin allowlists, and platform-funded matching campaigns.
