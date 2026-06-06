# Sprint 4 - Success, Receipts, Public Feed, Agent Parity

Goal: close the loop after payment: supporter feedback, seller visibility, receipt clarity, and UCP/MCP access.

Status: ✅ shipped to production · real transaction smoke pending.

## US-7 - Success feedback ✅ · Risk: MEDIUM/HIGH
**As a** supporter, **I want** an immediate success state in the widget, **so that** the experience feels
complete.

Acceptance:
- [x] Payment success notifies the opener via `postMessage`.
- [x] Lightbox shows confirmation and subtle confetti.
- [x] Lightbox closes after 3 seconds or manually.

## US-8 - Receipts and visibility ✅ · Risk: HIGH
**As a** seller/supporter, **I want** branded receipts and support visibility, **so that** both sides understand
what happened.

Acceptance:
- [x] Supporter success/checkout context describes a contribution/support payment.
- [x] Seller order surfaces show support context.
- [x] Public/private preference is stored in support metadata for downstream display.

## US-9 - Agent parity ✅ · Risk: MEDIUM/HIGH
**As an** AI agent, **I want** support capability discoverable over UCP/MCP, **so that** agentic commerce stays
complete.

Acceptance:
- [x] Capability manifest exposes support availability.
- [x] MCP/UCP can initiate support checkout with the same validation.

## QA
- [x] Success `postMessage` and UCP/MCP support discovery are covered by static/API specs.
- [x] Webhooks skip listing fulfillment side effects for support and surface contribution context.
- [ ] Daniel/live smoke confirms real hosted receipt wording from Stripe/Mercado Pago in production.
