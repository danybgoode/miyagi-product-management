# Living Shop — Sprint 6: Agent and configuration parity

**Status:** ⬜ not started

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

1. Ask the seller agent for current shop theme and sections.
   → It returns normalized Default/Retro/Custom config and approved section keys only.
2. Ask it to switch to Retro Social and move Events before Collections.
   → Patch succeeds; audit entry exists; public shop reflects it.
3. Ask it to create a Product Wall entry for one of this seller's products and publish it.
   → Entry appears publicly with current canonical product data.
4. Ask it to use another seller's product id.
   → Tool refuses with a clear ownership reason.
5. Fetch the public agent shop representation.
   → Recent published Wall entries + section destinations are present; drafts/future schedule are absent.
