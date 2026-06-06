# Epic · Seller Agent Operations

> ✅ **EPIC COMPLETE.** Sprints 1–2 SHIPPED + live-QA'd 2026-06-03; **Sprint 3 SHIPPED + live-QA'd
> 2026-06-04** (create listings via MCP — the one operation the first two sprints deferred). The agent now
> runs the full listing lifecycle: create → manage → pause/activate. The operational follow-on to the
> seller-config MCP tools ([Bulk Import › Sprint 4](../bulk-import-migration/sprint-4.md)). Bridges 03 ·
> Selling & Shops into 07 · Agentic & Federated Commerce.

**Tagline:** *Tu agente atiende la tienda — ofertas y anuncios, no solo la configuración.*

**For sellers who want their own AI agent to run the shop.** We already let a seller's agent read and adjust
shop *configuration* via MCP. This epic extends that to the two things a seller does every day: **respond to
price offers** and **manage listings** — all through the same per-shop token, scoped to one shop, validated,
and audited.

## Why sequenced this way
- **Offers are frontend-native** — `marketplace_offers` lives in Supabase with a `shop_id` column, and the
  respond flow is pure Supabase + Stripe. An agent token wraps it cleanly. → **Sprint 1, ships first.**
- **Listings are Medusa-gated** — listing writes require a Clerk JWT (`/store/sellers/me/products`), which
  an agent token isn't, and no service-to-service product-write route exists yet. So this needs a new
  backend (Cloud Run) endpoint. → **Sprint 2.**

## Guardrails (carry into each sprint)
- **Same auth as config tools.** Per-shop bearer token (`ms_agent_…`), `resolveAgentShop`, scoped to one shop.
- **Live commerce = strict + audited.** Accepting an offer commits a sale price; a price edit changes what
  buyers pay. Every write is strictly validated, written to the agent audit log (`metadata.ucp_agent_audit`),
  and notified (Telegram admin; seller email on money-sensitive changes).
- **Reuse, don't rewrite.** Extract the existing respond logic into a shared lib used by both the portal and
  the agent — identical behaviour, one code path.
- **No auto-pilot.** Each response is an explicit per-offer / per-listing action, never a standing
  auto-accept rule.

## Sprints
- [sprint-1.md](sprint-1.md) — Respond to offers via MCP (`list_offers`, `respond_to_offer`). ✅
- [sprint-2.md](sprint-2.md) — Manage listings via MCP (`list_my_listings`, `update_listing`,
  `set_listing_status`) + the backend internal route. ✅
- [sprint-3.md](sprint-3.md) — Create listings via MCP (`create_listing`) + the backend internal *create*
  route. ✅ Single-listing create; the agent now runs the full listing lifecycle (create → manage → activate).

## Out of scope
Bulk multi-row create via MCP (the file-based Bulk-Import flow already covers volume) · buyer-side agent
actions · agent activity dashboards · standing auto-accept rules · deleting listings.
