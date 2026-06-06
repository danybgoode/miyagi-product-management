# 07 · Agentic & Federated Commerce

**For sellers and AI agents.** Sell *everywhere* — not just on the marketplace, but on your own domain, inside someone else's site, and to AI shopping agents directly.

A seller's catalog lives once and surfaces through many independent storefronts. And because the platform is agent-native, an AI assistant can discover, negotiate, and buy without ever opening a browser.

## Current features
- ✅ **Marketplace storefront** — discovery & cross-seller traffic
- ✅ **Your own domain** — white-label storefront on any custom domain
- ✅ **Embeddable widget** — drop your shop, a product card, or a buy-button onto any existing website via one
  `<script>`/snippet *(SHIPPED 2026-06-04 — finally serves the `'embed'` channel that was reserved in code but
  never built. Shadow-DOM elements + full-shop iframe; checkout always hands off to our hosted flow. See the epic below.)*
- ✅ **Agent-native commerce (UCP/MCP)** — open standard so AI agents can browse, negotiate, and checkout
- ✅ **Open catalog & checkout APIs**
- ✅ **Seller-side MCP write-tools** — `get/patch_store_configuration` let a seller's own agent read and
  adjust its storefront config, with per-shop token auth, strict validation, audit log + security alerts.
  Shipped via [03 · Bulk Import & Express Migration › Sprint 4](../03-selling-and-shops/bulk-import-migration/sprint-4.md)
  (the platform's first seller write-tools on the MCP server).

## Epics
- [agent-connection/](agent-connection/) ✅ **Agent Connection & Discoverability** — accurate agent docs
  (drift-proof single source of truth), `.well-known` discovery, "Conecta tu agente" seller helper, and the
  platform's first Playwright smoke harness. *(SHIPPED + live-QA'd 2026-06-03.)*
- [embeddable-widget/](embeddable-widget/) ✅ **Embeddable Widget** — drop your shop / a product / a
  buy-button onto any external site via a `<script>` (hybrid Shadow-DOM elements + full-shop iframe), with
  checkout handed off to our hosted flow (`channel=embed`) and a self-serve snippet generator in seller
  settings. *(SHIPPED 2026-06-04 — all 3 sprints; built the channel claimed in docs but never served.)*

## Backlog / ideas
- ✅ Richer seller agent capabilities — manage listings / respond to offers via MCP (beyond config).
  Shipped as [03 · Seller Agent Operations](../03-selling-and-shops/seller-agent-operations/) (2026-06-03).
- 📋 Agent activity analytics & audit-log visibility (surface the S4 `ucp_agent_audit` log to sellers)
- 🚧 Embeddable widget — now promoted to its own epic ([embeddable-widget/](embeddable-widget/), scaffolded 2026-06-04)
- 📋 More embed / channel surfaces (reviews widget, "make an offer" widget, per-embed allow-listed origins)

> Epics and sprint/story breakdowns are added here as work in this domain is planned.
