# 03 · Selling & Shops

**For sellers.** Everything from "I want to sell something" to a running shop with orders and payouts — free, with no commission.

The bar is "open a shop in minutes." Sellers get a real storefront, simple listing tools, and a dashboard that keeps orders, offers, and money in one place.

## Current features
- ✅ **Onboarding** — create a store and your first listing (the two are decoupled, so neither blocks the other)
- ✅ **Listing tools** — create & edit with photos and rich details across all listing types
- ✅ **Seller dashboard** — orders, offers, analytics, content, settings
- ✅ **Order management** — including confirming manual payments received
- ✅ **Get paid directly** — your own Stripe / MercadoPago / SPEI, no commission
- ✅ **Subscriptions** — recurring offerings
- ✅ **Profile & account** navigation across web and mobile

## Epics
- ✅ **[Seller Coupon Codes](promotions/)** — create & manage discount codes for your shop (powers
  the World Cup "Sube tus promos" campaign). Sprint 1 shipped: create/manage + checkout redemption
  + usage stats.
- 🚧 **[Bulk Import & Express Migration](bulk-import-migration/)** — *Trae tu tienda completa en
  minutos.* Bring a whole catalog and shop config from another platform via the seller's own AI
  agent (UCP files), on-site paste-to-AI parsing, declarative "Storefront-as-Code", and live MCP
  config tools. **Sprints 1 & 2 SHIPPED & live-QA'd 2026-06-03** — S1 (file upload → validate →
  staging → idempotent upsert → R2 images) and S2 (on-site "Pega y publica": paste → Gemini Flash
  extraction → inline-editable staging → import). Sprints 3–4 (Storefront-as-Code, MCP config) planned.

## Backlog / ideas
- 📋 Richer seller analytics
- 📋 Referral program (reward = platform-owned credit; planned as a separate epic)

> Epics and sprint/story breakdowns are added here as work in this domain is planned.
