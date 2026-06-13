# 02 · Checkout & Payments

**For buyers and sellers.** Turning intent into a paid order — safely, with the payment methods Mexicans actually use.

Money flows directly to the seller's own accounts; the platform takes no commission. Card, bank transfer, wallet, and cash are all first-class, including the in-person and "I'll pay you later" realities of local commerce.

## Current features
- ✅ **Cart & guided checkout**, single-item or multi-seller bundle
- ✅ **Payment methods:** card (Stripe), MercadoPago, SPEI bank transfer, DiMo, cash
- ✅ **Arranged payment / WhatsApp** path for in-person deals
- ✅ **Manual-payment lifecycle:** order shows "payment pending" → buyer marks "I paid" → seller confirms receipt → confirmed
- ✅ **Method-aware checkout** — e.g. arranged-delivery-only listings show manual payment instead of card

## Epics
- ✅ **[Checkout & Manual-Payment State Hardening](checkout-state-hardening/)** — durable manual-payment state, ship-gating, one coupon-aware total (#3b · complete 2026-06-07).
- ✅ **[Delivery & Manual-Money Polish](delivery-money-polish/)** — two-sided off-platform refund machine, pickup propose-and-confirm appointment, CP-first reorder, quote recovery/timeout (#3c · Epic B). *Shipped 2026-06-09 (3 sprints to prod; HIGH-risk refunds/payments/fulfillment).*

## Backlog / ideas
- 📋 **Buyer protection / escrow ("Compra Protegida")** — hold funds until the buyer confirms
- ✅ **Coupon redemption at checkout** — enter a seller's code, see the discount before paying
  (the seller-facing side lives in [03 · Seller Coupon Codes](../03-selling-and-shops/promotions/))
- 📋 Wallet / stored balance

> Epics and sprint/story breakdowns are added here as work in this domain is planned.
