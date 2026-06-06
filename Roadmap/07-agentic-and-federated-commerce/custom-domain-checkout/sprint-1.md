# Sprint 1 — The checkout "hop" (buying from a custom domain becomes functional)

Goal: a buyer on the seller's custom domain can **start and complete a purchase**. Since auth is
platform-only, the buy button takes them to `miyagisanchez.com` for session + payment (the product travels
in the URL). Frontend only, no changes to the payment logic.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **🚧 CODE COMPLETE — US-1 + US-1b built and committed
(`436a46a`), deterministic gate GREEN (tsc + build + pure URL spec). PR open, MEDIUM risk. Pending:
Daniel's smoke of the rendered hop on a real verified domain.**

Risk: **MEDIUM** — frontend only (routing the buyer to the platform's existing checkout; no changes to the
payment logic).

Main files (representative):
- `lib/checkout-hop.ts` — **new**: pure client-safe helpers `checkoutHopHref` / `signInHopHref` /
  `currentCustomDomain` (no-op on platform; absolute URL to the platform + `origin` on a custom domain).
- `app/l/[id]/page.tsx` — reads `x-miyagi-domain` → `customDomain`; CTAs (server Links) hop; passes
  `customDomain` to `BuyButton` + `OfferCheckoutButton`.
- `app/components/BuyButton.tsx` — the no-session branch hops to the platform (US-1).
- `app/components/OfferCheckoutButton.tsx` — same hop for accepted offers (US-1b).
- `e2e/custom-domain-checkout-hop.spec.ts` — **new** pure URL spec.

---

## US-1 — Buy from a custom domain ✅ · Risk: MEDIUM
**As** a buyer on a shop's custom domain, **I want** to be able to buy a product, **so that** I don't hit a
broken checkout.
- [x] On a custom-domain PDP, the buy/checkout/sign-in CTAs point to the **platform**
      (`https://miyagisanchez.com/checkout?listingId=…&origin=<domain>`) instead of relative routes.
- [x] The channel is detected from the white-label headers the storefront already has.

**Acceptance:** from `myshop.mx` (PDP), tapping "buy" lands on the platform's checkout for **that** product
and you can reach payment (with a session).

---

## US-1b — Offer → checkout hop ✅ · Risk: MEDIUM
**As** a buyer with an accepted offer on a custom domain, **I want** to pay it, **so that** I can close the
negotiated purchase.
- [x] `OfferCheckoutButton` hops to the platform the same way, keeping `offerId` + `origin`.

**Acceptance:** a buyer on a custom domain can pay an accepted offer.

---

> **Deferred (not S1):** multi-item (bundle) carts from a custom domain — the cart (localStorage) doesn't
> cross origins; requires serializing the cart. Follow-up story.

## Sprint smoke
- `tsc` + `build` + Playwright green.
- Spec: the CTA builds the absolute platform URL **only** on the `custom` channel (not on the marketplace).
- Daniel: on a real domain, tapping "buy" leads to the platform checkout for the correct item.
