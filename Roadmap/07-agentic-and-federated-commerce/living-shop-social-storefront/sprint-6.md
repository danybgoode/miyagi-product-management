# Living Shop — Sprint 6: Agent and configuration parity

**Status:** ✅ shipped — `00facf5` (PR #391)

**Risk:** LOW-MED — authenticated seller-agent writes + public read schema; no money tools.

## Stories

### Story 6.1 — Storefront-as-Code parity for presentation + sections
**As a** seller, **I want** my theme mode/recipe and controlled sections to import/export through the existing shop settings contract, **so that** my storefront is reproducible and portable.

**Acceptance:** settings schema/import/export handles `theme_mode`, `theme_recipe`, `sections` and migrated legacy state; invalid enum/color/order values produce precise validation issues; get→export→import round-trip preserves normalized configuration.

### Story 6.2 — MCP presentation parity
**As a** seller's agent, **I want** to read and change the same Theme/Sections configuration the seller UI can, **so that** “make my shop more retro and put Events before Collections” is one safe agent operation.

**Acceptance:** existing `get/patch_store_configuration` surface accepts the new schema or a deliberately versioned extension; audit log records normalized changes; capabilities/manifest accurate; no agent-only escape hatch exposes raw CSS.

### Story 6.3 — MCP Wall tools
**As a** seller's agent, **I want** to create, list, edit, publish, schedule, pin and delete my shop's Wall entries, **so that** agents can operate the living storefront end to end.

**Acceptance:** tools are scoped by existing seller credential resolution; support four kinds with the same validator as human API; referenced Product/Collection/Event must belong to the credential's shop; every write is audited; clear/refuse semantics are deterministic; media attachment uses existing safe upload/file reference constraints rather than arbitrary remote fetch.

### Story 6.4 — Public agent-readable shop narrative
**As a** shopping agent, **I want** the public shop representation to expose recent Wall entries and enabled sections structurally, **so that** the social storefront is legible beyond pixels.

**Acceptance:** public UCP/about-shop/shop discovery representation includes a bounded recent Wall view with typed entries and canonical references/actions; does not expose drafts/scheduled-future entries or private seller data; docs/manifest are updated and internally consistent.

## QA

- config validation + round-trip api specs;
- MCP credential isolation specs, including foreign reference refusal;
- audit-log assertion for Wall writes;
- manifest/capability contract specs;
- one end-to-end agent smoke: create draft → publish Product entry → read public representation → delete/unpublish.

## Smoke walkthrough

Steps 1–4 need a shop agent token (`ms_agent_…`) from *Agentes e integraciones* — **OWED (Daniel)**.

1. Ask the seller agent for the current shop configuration (`get_store_configuration`).
   → The response includes a `presentation` block with the normalized theme mode, recipe and section order.
2. Ask it to switch to Retro Social and move Eventos before Colecciones (`patch_store_configuration`).
   → Applied; the public shop reflects it; an audit entry appears in the shop's agent log.
3. Ask it to create and publish a Producto Wall entry for one of your products (`create_wall_entry`).
   → It appears publicly with current canonical product data, and the write is audited.
4. Ask it to use ANOTHER seller's product id.
   → Refused with a clear ownership reason. No row is created.
5. Anonymous, runs anywhere — fetch the public representation:
   `curl -s -X POST https://miyagisanchez.com/api/ucp/mcp -H 'content-type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_shop","arguments":{"shop_slug":"<slug>","market":"mx"}}}'`
   → The JSON payload carries `wall` (published entries only, bounded) and `sections` (the shop's real destinations). Drafts and future-scheduled entries are absent.
6. Fetch `https://miyagisanchez.com/api/ucp/manifest`.
   → It names the Wall tools and states that the presentation block has no CSS/HTML/JS/font-URL field.
