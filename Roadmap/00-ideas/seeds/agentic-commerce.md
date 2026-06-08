---
title: "Agentic commerce"
slug: agentic-commerce
status: shipped
area: "07"
type: feature
priority: null
risk: high
epic: "07-agentic-and-federated-commerce/agent-connection"
build_order: null
updated: 2026-06-08
---

The frontier capability is real: custom-domain routing, merchant domain setup, deterministic checkout options, UCP/MCP endpoints, and automated negotiation all exist in some form. The main UX gap is that the system can let agents and automations act, but it does not yet give humans a durable, reassuring explanation of who acted, under what authority, on which channel, and why.

**Highest-Risk Findings**

1. **Invisible transactions lack human-readable provenance.**  
   Offers and orders do not currently carry a clear “actor envelope” for `human buyer`, `buyer agent`, `seller automation`, `platform system`, or `external API client`. The offers schema tracks status, counters, and checkout sessions, but not agent identity, delegation, consent, or rule provenance: [20260520_marketplace_offers.sql](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/supabase/20260520_marketplace_offers.sql:17). Auto-negotiation updates offer status in code, but the seller inbox does not clearly explain “your automation countered/accepted/declined because rule X matched”: [offers route](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/offers/route.ts:238).

2. **Channel attribution is conceptually promised but not reliably preserved.**  
   The merchant settings UX says custom domain and marketplace share inventory, checkout, admin, and tagged sales: [ShopSettings.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/settings/ShopSettings.tsx:3604). However, the current Medusa-backed checkout/order mirror does not appear to persist `source_channel`, `custom_domain`, `embed`, or `agent/API` provenance into order metadata: [order-mirror.ts](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/order-mirror.ts:84). Legacy Stripe/MP routes detect channel, but the newer cart checkout path does not carry that UX promise through.

3. **Embedded widget experience is under-defined.**  
   The roadmap claims an embeddable widget: [README.md](/Users/cosmo/dobby/medusa-bonsai/Roadmap/07-agentic-and-federated-commerce/README.md:9). I found channel detection support for `embed`, but not a complete widget runtime with isolated cart/session state, postMessage lifecycle, host callbacks, or embedded payment return handling: [channel.ts](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/channel.ts:13). Cart state is global `localStorage` under one key: [CartContext.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/CartContext.tsx:95). Checkout can redirect to sign-in or payment rails, which risks breaking buyer spatial trust inside a third-party site: [CheckoutPayButton.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/CheckoutPayButton.tsx:91).

4. **White-label domains preserve branding, but not enough platform trust continuity.**  
   Custom domain routing is solidly implemented through middleware and Supabase shop lookup: [middleware.ts](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/middleware.ts:29). The white-label shell minimizes platform chrome while retaining a platform footer: [ChannelLayout.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/s/[slug]/ChannelLayout.tsx:1). But checkout success/cancel URLs in the backend use platform `SITE_URL`, not the buyer’s originating custom domain or embedded host: [start-checkout route](/Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/carts/[id]/start-checkout/route.ts:448). That can make a buyer feel unexpectedly moved between businesses.

5. **Protocol/DX feedback is useful, but not agent-grade yet.**  
   The MCP server exposes meaningful tools, including search, listing detail, checkout creation, offers, shop lookup, availability, appointment booking, and buyer trust: [mcp route](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/ucp/mcp/route.ts:111). The checkout-session endpoint returns deterministic payment options and a recommended method: [checkout-session route](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/ucp/checkout-session/route.ts:20). But `/agent` documentation appears out of sync with real endpoints and the MCP URL: [agent page](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/agent/page.tsx:30). The manifest is bespoke rather than standard UCP discovery, and tool errors are mostly text instead of structured, recoverable action states.

**Mental Model Mismatches**

- Merchants are told “one catalog, many surfaces,” but there is no central channel control surface showing Marketplace, Custom Domain, Widget, and Agent/API as one synchronized distribution map.
- Sellers can configure auto-negotiation rules, but the resulting inbox experience still looks like ordinary offer status rather than an auditable seller-side automation.
- Buyers can be guided toward agent handoff through Claude prompts: [AIAgentButton.tsx](/Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/AIAgentButton.tsx:9), but there is no in-account “my agent did this for me” receipt, permission record, or revoke point.
- Developer-merchants get APIs and MCP tools, but failures need clearer machine-readable next actions: `requires_auth`, `approval_url`, `recoverable`, `field`, `correlation_id`, `retry_after`, and `merchant_visible_message`.

**Deterministic UX Opportunities**

The settings and checkout flows already have strong deterministic patterns: registrar detection, Cloudflare auto-config, DNS polling, trust-level radio choices, negotiation sliders, postal-code autofill, preselected shipping, and recommended payment options. Extend that same philosophy to agent commerce:

- Agent permissions should use presets: “browse only,” “negotiate up to X,” “buy up to X,” “requires approval above X.”
- Seller counters should offer preset chips: “minimum acceptable,” “midpoint,” “final offer,” “include shipping,” “decline with reason.”
- Webhook setup should offer templates for Zapier, Make, n8n, custom HTTPS, plus a prefilled test payload.
- Channel visibility should default to “sync globally,” with explicit exception controls for price, stock, and availability.

**Prioritized Recommendations**

**P0**
- Add a human-visible provenance envelope to every offer, order, checkout session, webhook, and MCP action: actor type, agent/client name, delegation ID, source channel, automation rule, approval snapshot, and correlation ID.
- Preserve channel context through Medusa checkout and order mirroring, including custom domain, embed host, marketplace, and API/agent source.
- Fix protocol discoverability and docs: align `/agent`, MCP URL, UCP manifest, and structured error responses.

**P1**
- Create a merchant “Channel Control Center” showing Marketplace, Custom Domain, Widget, and Agent/API status, with shared catalog/inventory clearly explained.
- Define the embedded widget as a self-contained checkout surface with isolated session state, host callbacks, embedded return handling, and buyer receipts.
- Add buyer and seller agent activity ledgers: what happened, who authorized it, what rule/limit applied, and what can be paused or revoked.

**P2**
- Surface auto-negotiation as explicit timeline events in offer conversations and seller order views.
- Add webhook delivery logs, test events, retry visibility, and signature verification status.
- Balance white-label trust with platform trust through consistent “secured/order-tracked by Miyagi Sánchez” explanations without stealing seller brand ownership.

Protocol sources reviewed: [UCP](https://ucp.dev/), [UCP Embedded Checkout](https://ucp.dev/specification/embedded-checkout/), [UCP Order MCP](https://ucp.dev/specification/order-mcp/), and the current [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic).