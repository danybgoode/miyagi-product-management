# checkout experience

Area: Dev
Priority: P0
Status: To Do

## Context

Checkout is the highest-stakes UX moment — where buyers either complete or abandon. The current Medusa cart → order flow needs to be polished into a fast, trust-building, Mexico-specific checkout experience. Key local considerations: MercadoPago wallet, OXXO cash, SPEI bank transfer, and address input adapted to Mexican addresses (colonia, municipio, CP).

---

## 👤 User Story

**As a** buyer ready to purchase,

**I want** a fast, clear, and familiar checkout experience that supports Mexican payment methods and addresses,

**So that** I can confidently complete my purchase in under 2 minutes.

---

## ✅ Acceptance Criteria

### Checkout flow (steps)

- [ ]  **Step 1 — Review:** item summary, seller, price, estimated shipping cost
- [ ]  **Step 2 — Shipping:** address input (or select saved address) — Mexican address fields: Calle + número, Colonia, Municipio, Estado, CP
- [ ]  **Step 3 — Payment:** payment method selection
- [ ]  **Step 4 — Confirm:** order summary + CTA "Pagar / Pay"
- [ ]  Progress indicator visible at all steps (stepper UI)
- [ ]  Single-page checkout preferred (steps on same page, no full page reload) — evaluate Medusa's cart checkout API

### Payment methods

- [ ]  **MercadoPago wallet** (primary for MX — buyer pays with their MP balance or saved cards)
- [ ]  **Tarjeta de crédito/débito** (via MP Transparent Checkout — no redirect)
- [ ]  **OXXO** (cash payment — generates a reference code, buyer pays at any OXXO)
- [ ]  **SPEI** (bank transfer — generates CLABE, 24h window)
- [ ]  Payment methods shown with recognizable logos

### Compra Protegida badge

- [ ]  A "🔒 Compra Protegida / Protected Purchase" trust badge is visible throughout checkout
- [ ]  Tooltip/expandable explains what it means in simple terms
- [ ]  Payment is deferred-capture (see Compra Protegida task) — this must be handled correctly per payment method

### Address

- [ ]  Mexican CP (Código Postal) lookup: entering a CP auto-fills Estado + Municipio (use Copomex API or similar)
- [ ]  Saved addresses are listed first if user has prior purchases
- [ ]  Address validation before proceeding to payment step

### Post-checkout

- [ ]  Order confirmation page: order ID, estimated delivery window, link to conversation with seller
- [ ]  Email confirmation sent via Novu (or MP's built-in email for MP payments)
- [ ]  Buyer is navigated to the order conversation thread

### Edge cases

- [ ]  Out-of-stock check at payment step (race condition protection)
- [ ]  OXXO and SPEI: show pending payment state clearly (these aren't instant)
- [ ]  Coupon code input field at review step (Medusa Discount)

---

## 📎 References

- Medusa Cart → Order flow: [https://docs.medusajs.com/storefront-development/checkout/overview](https://docs.medusajs.com/storefront-development/checkout/overview)
- Copomex API (CP lookup): [https://api.copomex.com/](https://api.copomex.com/)
- MercadoPago Transparent Checkout: [https://www.mercadopago.com.mx/developers/en/docs/checkout-api/landing](https://www.mercadopago.com.mx/developers/en/docs/checkout-api/landing)
- OXXO: [https://www.mercadopago.com.mx/developers/en/docs/checkout-api/payment-methods/oxxo](https://www.mercadopago.com.mx/developers/en/docs/checkout-api/payment-methods/oxxo)
- Related: **Compra Protegida (escrow)**, **MercadoPago MCP**, **Novu notifications**