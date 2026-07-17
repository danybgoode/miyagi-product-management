# MCP parity config — Sprint 1: Catalog config tools

**Status:** ✅ shipped + live 2026-07-16 — FE PR [#271](https://github.com/danybgoode/miyagisanchezcommerce/pull/271) (`800538f`), BE PR [#100](https://github.com/danybgoode/medusa-bonsai-backend/pull/100) (`2b6e0d0`). All 3 tools (incl. optional 1.3) in prod tools/list.

## Stories

### Story 1.1 — `update_collection` / `delete_collection` over MCP
**As a** shop agent, **I want** to rename/describe or remove one of my collections, **so that**
collection management is fully agent-doable (today only `create_collection` exists).
**Acceptance:** two tools — `update_collection` (name/description, same 2-60 char name rule as
create) and `delete_collection`. Both auth via `resolveAgentShop`, verify the collection belongs
to the calling shop, and delete correctly un-assigns member listings without deleting them.
**Reuses:** `PATCH/DELETE /api/sell/collections/[id]`; `validateCollectionName`
(`lib/collection-derive.ts`) reused verbatim for the name check.
**Risk:** low

### Story 1.2 — `reorder_collections` over MCP
**As a** shop agent, **I want** to set the display order of my collections, **so that** storefront
nav ordering is agent-settable.
**Acceptance:** `reorder_collections` accepts a full ordered list of collection ids/names, applies
the same reordering `PATCH /api/sell/collections/reorder` already does; a partial or malformed
list is rejected with a clear error, not silently applied.
**Reuses:** `PATCH /api/sell/collections/reorder`.
**Risk:** low

### Story 1.3 — `set_listing_repuve` over MCP (optional, low priority)
**As a** shop agent selling a vehicle, **I want** to set REPUVE (vehicle registry) verification
data via MCP, **so that** autos-category listings can be fully configured by an agent.
**Acceptance:** wraps `PATCH /api/sell/listing/[id]/repuve`; scoped to `category: autos` listings;
ownership verified.
**Reuses:** the existing `PATCH /api/sell/listing/[id]/repuve` route.
**Risk:** low — build only if time allows; not blocking the sprint's close-out.

## Sprint QA
- **api spec(s):** one per story — auth, ownership, happy path, and the name-length/reorder
  malformed-input rejection cases.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **browser smoke owed:** none — every story is config-only and fully automatable.
