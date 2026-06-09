# Sprint 3 — PDP hierarchy

> Epic: [Discovery Polish](README.md) · **Risk: LOW–MED** (frontend-only; presentational reorder of an
> existing PDP — no commerce logic change).
> **Status: ✅ BUILT — [PR #53](https://github.com/danybgoode/miyagisanchezcommerce/pull/53), awaiting
> merge.** Both stories committed on `feat/discovery-polish` (S3.1 `8452ed0` · S3.2 `e54426b`); gate
> green (tsc + build + `api` pure spec). Goal met: the product page leads with a frame appropriate to
> the listing type, and on mobile the seller's trust signals sit above payment/fulfillment detail.

## Stories

### S3.1 — Type-specific decision frame ✅ (`8452ed0`)
**As** a buyer, **I want** the PDP to open with the decision frame that matches the listing type, **so
that** a service, rental, or digital good isn't presented like a boxed product.
- **Built:** new pure helper `listingTypeFrame(type)` in `lib/listing-query.ts` (the next-free taxonomy
  module — single source, unit-tested in the `api` gate) maps each non-product type → es-MX
  `{ label, hint, icon }`; `product` → `null` (its buy box leads). The PDP (`app/l/[id]/page.tsx`)
  renders a compact accent banner `[data-testid="pdp-type-frame"]` above the price: service → "Solicita
  o agenda con el vendedor", rental → "Coordina fechas y disponibilidad", digital → "Entrega automática
  al instante", subscription → "Acceso recurrente". No new type model — reuses the normalized `listing_type`.
- **Acceptance:** opening a service PDP and a product PDP shows distinct, type-appropriate primary frames.
- **QA:** pure `api` spec `e2e/pdp-type-frame.spec.ts` (3 ✅) + anonymous browser smoke
  (`pdp-hierarchy.browser.spec.ts`) comparing a service vs product PDP's lead block. **Risk: LOW–MED.**

### S3.2 — Seller trust above the fold on mobile ✅ (`e54426b`)
**As** a buyer on mobile, **I want** the seller's trust signals near the top, **so that** I can judge
who I'm buying from before scrolling through payment/fulfillment detail.
- **Built:** extracted the inline seller card into a reusable server component
  `app/components/SellerTrustCard.tsx` (`[data-testid="seller-trust-card"]` — identity + verified ✓ +
  location + WhatsApp/phone/email contact + scheduling + pickup + claim nudge). The PDP dual-renders it
  via the established `md:hidden` / `hidden md:block` idiom: on a phone it leads **above** the
  payment/fulfillment methods box (`[data-testid="pdp-methods"]`); desktop order is unchanged. The
  component is a **self-contained reuse seam** Epic D can render in `ChannelLayout` for per-channel
  parity, and Epic C can hang "trust capsules" off (noted in the component header).
- **Acceptance:** on a phone viewport the seller trust signals appear above payment/fulfillment detail.
- **QA:** anonymous browser smoke at a mobile viewport (390×844) asserting `seller-trust-card`
  precedes `pdp-methods` by bounding-box. **Risk: LOW–MED.**

## Sprint QA — plan
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- **New specs:** anonymous `*.browser.spec.ts` (type-frame differs by type; trust precedes payment on
  mobile). Extract the trust block as a component so Epic D can reuse it (note the seam for D).
- **Deploy:** frontend-only.

## Sprint 3 — Smoke walkthrough
```
Env: PR #53 Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
All steps are anonymous (no sign-in). To find a listing of a given type, use the type chip
on the search page: https://miyagisanchez.com/l?listing_type=service (or =product / =rental /
=digital / =subscription), then open the first result.

1. Open https://miyagisanchez.com/l?listing_type=service and click the first listing.
   → Below the title, before the price, a compact accent banner reads "Servicio · Solicita o
     agenda con el vendedor" (the type frame leads the page).
2. Open https://miyagisanchez.com/l?listing_type=product and click the first listing.
   → There is NO type banner — the lead is the price + buy box. Visibly different from step 1.
3. (Optional) Repeat step 1 with ?listing_type=rental / =digital / =subscription.
   → The banner reads "Renta · Coordina fechas…" / "Producto digital · Entrega automática al
     instante" / "Suscripción · Acceso recurrente" respectively.
4. On a phone (or DevTools device toolbar at ~390px wide), open any listing from a real shop
   (e.g. via https://miyagisanchez.com/l) and look at the order of blocks under the price.
   → The seller card (logo, ✓ verified, shop name + location, contact buttons) appears ABOVE
     the "Métodos disponibles / Entrega y disponibilidad" box.
5. Resize the same page to desktop width (≥768px).
   → The seller card moves back BELOW the methods box (desktop order unchanged); the layout
     still reads correctly with no duplicate card visible.

If any step fails, note the step number + what you saw.
```
*(No money/auth path — fully anonymous-testable; `pdp-hierarchy.browser.spec.ts` covers steps 1–2 and 4.)*
