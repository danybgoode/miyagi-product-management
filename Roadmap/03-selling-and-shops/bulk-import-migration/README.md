---
status: shipped
slug: bulk-import-migration
---

# Epic · Bulk Import & Express Migration

> ✅ **EPIC COMPLETE.** Scoped 2026-06-03 from
> [`00-ideas/seeds/bulk-upload-agentic.md`](../../00-ideas/seeds/bulk-upload-agentic.md).
> **All 4 sprints SHIPPED 2026-06-03** (S1 live-QA passed; S2 Gemini Flash, Story A live-QA'd; S3 all
> 4 stories shipped; S4 all 4 stories shipped + live-QA'd end-to-end via MCP).

**Tagline:** *Trae tu tienda completa en minutos.*

**For sellers migrating from another platform (or starting from a messy list).** Today, moving a
catalog and a full shop configuration into a new marketplace means meticulous CSV mapping, ten
settings tabs, and re-entering everything by hand. This epic turns that switching cost from *days of
admin work* into *minutes* — by leaning on the open standards the platform is already built on.

## Why this is a Miyagi-shaped feature
Miyagi is **native to UCP (Universal Commerce Protocol) and MCP (Model Context Protocol)**. We
already expose a canonical UCP catalog schema and a live MCP server. That means we don't have to
invent an import format — the seller's *own* AI agent can map their existing Shopify / Mercado Libre
data into our schema and hand us a clean file. The friction of onboarding becomes a one-step,
AI-assisted creative act instead of a configuration chore.

## The migration arbitrage
The biggest barrier to switching e-commerce platforms isn't price — it's **setup fatigue**. A seller
who knows they must re-enter shipping rules, re-link booking tools, redefine operating windows, and
re-upload a catalog will simply stay on their old platform. Collapse that to a single upload (or a
single agent call) and the switching cost approaches zero.

## What's already in place (reuse, don't rebuild)
- ✅ **Canonical UCP schema** — `lib/ucp/schema.ts` (`UcpListing`, `UcpShop`). The import *target*
  already exists.
- ✅ **Live MCP server** — `app/api/ucp/mcp/route.ts` (JSON-RPC). Today it exposes **buyer-side**
  tools only (search, checkout, offers, booking). Seller **write** tools are net-new.
- ✅ **Listing creation path** — `POST /api/sell/create` → Medusa. We map UCP onto a known payload.
- ✅ **Settings surface** — 11 sections at `/shop/manage/settings` with completion checkmarks.
- ✅ **Background jobs/workflows** — the Medusa backend (`jobs/`, `workflows/`) is the right home for
  heavy/async import so we don't time out an HTTP request.

## The four capabilities (→ four sprints)
Sequenced so each sprint **reuses the previous one's engine**, and the zero-cost / no-LLM foundation
ships first.

| Sprint | Capability | New infra |
|--------|-----------|-----------|
| [S1](sprint-1.md) ✅ | **Catálogo por archivo UCP** — upload a file the seller's own agent built *(SHIPPED & live-QA passed)* | Import core (validate → upsert → R2 images), copyable prompt |
| [S2](sprint-2.md) ✅ | **Pega y publica** — paste raw text, *our* LLM extracts products *(SHIPPED; Gemini Flash; Story A live-QA'd)* | Gemini Flash (`GEMINI_API_KEY`), rate-limited |
| [S3](sprint-3.md) ✅ | **Tienda como código** — one declarative file dresses the whole shop *(SHIPPED — all 4 stories)* | Settings manifest + atomic block apply + async logo/banner ingest + live checkmarks |
| [S4](sprint-4.md) ✅ | **Configuración por agente vía MCP** — `get/patch_store_configuration` *(SHIPPED + live-QA'd)* | Seller-side MCP write-tools, per-shop token auth, strict validation, audit log + security alerts (bridges into 07) |

## Key decisions & guardrails (carry into each sprint)
- **LLM is S2-only.** S1, S3, S4 need no LLM on our side — the tenant's agent does the parsing
  off-platform. S2 is the only sprint that commits us to token cost + a prompt-injection surface;
  it's **gated** (provider decided when we reach it; leaning Claude Haiku 4.5 for an Anthropic-native
  shop). Isolate user input in tagged blocks and ignore command-style text inside them.
- **Async, not synchronous.** Big catalogs time out a normal request. Intake → `202 Accepted` →
  process in a Medusa job → live status badge. Same for async image fetch/optimize.
- **Idempotent upserts.** Match on SKU / external ID. Re-uploading updates in place — never
  duplicates. This makes the importer safe to re-run and usable for ongoing inventory sync.
- **Plain-language errors.** No stack traces. "Línea 24: falta el campo obligatorio 'moneda'" — copy
  the seller can paste straight back into their agent to auto-correct.
- **Storefront-as-Code can't cover OAuth-bound settings.** `pagos` (Stripe/MP), `canal` (domain), and
  `citas` (Cal.com) need live handshakes — a JSON file can't grant them. S3 covers only the
  declarative subset (perfil, envíos, negociación, notificaciones, diseño, pedidos, devoluciones) and
  explicitly flags the rest as "still needs a manual step."

## Out of scope (noted for later)
- Two-way *export* / continuous sync back to other platforms.
- Direct platform-to-platform connectors (read another store's API for the seller). For now the
  seller's agent bridges that gap.
- Bulk *edit* of an existing live catalog via the grid (S1/S2 are import-focused; upsert covers
  re-runs).

## Sprints
- [sprint-1.md](sprint-1.md) — Catálogo por archivo UCP (the import core).
- [sprint-2.md](sprint-2.md) — Pega y publica (on-site AI parse). *Gated on LLM green-light.*
- [sprint-3.md](sprint-3.md) — Tienda como código (declarative settings).
- [sprint-4.md](sprint-4.md) — Configuración por agente vía MCP.
