# Sprint 3 — PDP hierarchy

> Epic: [Discovery Polish](README.md) · **Risk: LOW–MED** (frontend-only; presentational reorder of an
> existing PDP — no commerce logic change).
> **Status: 📋 PLANNED — not started.** Goal: the product page leads with a frame appropriate to the
> listing type, and on mobile the seller's trust signals sit above payment/fulfillment detail.

## Stories

### S3.1 — Type-specific decision frame
**As** a buyer, **I want** the PDP to open with the decision frame that matches the listing type, **so
that** a service, rental, or digital good isn't presented like a boxed product.
- Use the already-branched per-type signals (`lib/ucp/schema.ts:157,181`) to lead the PDP with the
  right primary affordance/copy per type (e.g. service → "Solicita / agenda"; rental → period; digital
  → instant delivery). Reorder existing blocks; don't add a new type model.
- **Acceptance:** opening a service PDP and a product PDP shows distinct, type-appropriate primary frames.
- **QA:** anonymous browser smoke comparing a service vs product PDP's lead block. **Risk: LOW–MED.**

### S3.2 — Seller trust above the fold on mobile
**As** a buyer on mobile, **I want** the seller's trust signals near the top, **so that** I can judge
who I'm buying from before scrolling through payment/fulfillment detail.
- On mobile, lift the seller trust block above the payment/fulfillment sections in the PDP order.
  (Coordinates with Epic C's "trust capsules" and Epic D's per-channel parity — keep the trust block a
  reusable component so D can render it in `ChannelLayout` too.)
- **Acceptance:** on a phone viewport the seller trust signals appear above payment/fulfillment detail.
- **QA:** anonymous browser smoke at a mobile viewport (trust block precedes payment block). **Risk: LOW–MED.**

## Sprint QA — plan
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- **New specs:** anonymous `*.browser.spec.ts` (type-frame differs by type; trust precedes payment on
  mobile). Extract the trust block as a component so Epic D can reuse it (note the seam for D).
- **Deploy:** frontend-only.

## Sprint 3 — Smoke walkthrough (fill in with real URLs at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.

1. Open a SERVICE listing PDP, e.g. https://miyagisanchez.com/l/<service-id>
   → The page leads with a service-appropriate frame (e.g. "Solicita / agenda"), not a product box.
2. Open a PRODUCT listing PDP, e.g. https://miyagisanchez.com/l/<product-id>
   → The lead frame is the product buy box — visibly different from the service frame.
3. On a phone-width screen, open either PDP and look at the top.
   → The seller's trust signals appear above the payment/fulfillment detail.

If any step fails, note the step number + what you saw.
```
*(No money/auth path — anonymous-testable; a browser spec can cover it.)*
