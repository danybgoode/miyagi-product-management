# Sprint 2 — Buyer capture + cart/checkout parity

Goal: the buyer fills the custom fields in the product buy box, the exact text echoes through the
cart drawer and the checkout review, and it lands on the Medusa cart line item as structured
metadata.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **✅ SHIPPED to prod 2026-06-05 — PR #18 merged (`3280bff`), CI green.**

> **High-risk:** the payload is injected at the cart line-item step that feeds the live checkout /
> payment flow. Daniel merges. No backend change — Medusa stores line-item metadata natively.

Maps to epic acceptance criteria **AC 2.1, AC 2.2, AC 2.3, AC 3.1**.

---

## US-1 — Fields render in the buy box ✅
**As a** buyer, **I want** the custom fields right where I buy, **so that** I can personalize before
adding to cart.
- [x] New `app/components/PersonalizationFields.tsx` — renders the listing's `custom_fields`
      **before** the Add-to-Cart / Buy CTA (AC 2.1), with a live character counter that updates on
      keystroke (AC 2.2) and clear optional/required labels.

## US-2 — Graceful required-field validation ✅
**As a** buyer, **I want** a gentle nudge if I skip a required field, **so that** I'm not punished
with abrupt errors.
- [x] If a required field is blank, the Add-to-Cart / Buy click is intercepted and the first missing
      field is focused with helpful microcopy — no aggressive red box (AC 2.3).

## US-3 — Payload echoes through cart + checkout ✅
**As a** buyer, **I want** to see my exact input at every step, **so that** I trust it saved.
- [x] `CartItem` (`app/components/CartContext.tsx`) carries an optional `personalization`; the cart
      drawer and `SellerBundleSection` render the lines beneath the item title (AC 3.1).
- [x] Buy-now path stashes the payload (sessionStorage keyed by listing) and the checkout review
      (`app/checkout/CheckoutExperience.tsx`) shows it beneath the product title (AC 3.1).

## US-4 — Payload lands on the order line item ✅
**As a** buyer, **I want** my personalization attached to the actual purchase, **so that** the
seller receives it.
- [x] `CheckoutPayButton` + `lib/cart.ts startCheckout()` thread the payload per line item and send
      `metadata: { personalization }` on `POST /store/carts/:id/line-items`.

---

## QA / smoke-test stage
- `tsc --noEmit` + `npm run build` green.
- **Playwright spec** (one): drive add-to-cart → start-checkout on a disposable listing and assert
  the Medusa cart line item carries `metadata.personalization`. **Do not complete a real card
  payment** — assert at the cart/line-item stage (or use a manual/SPEI path). State the live-pay gap
  in the PR.
- Manual on preview: char counter live; required blank → focus + microcopy; cart + checkout echo the
  exact text.

## Definition of done (sprint)
A buyer personalizes a product in the buy box, sees the exact text in the cart and at checkout, and
the payload is attached to the Medusa cart line item. Risk tier: **high** (checkout seam) → Daniel
merge.
