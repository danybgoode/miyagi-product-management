# Sprint 4 — Configuración por agente vía MCP

Goal: the seller's **own AI agent** reads and adjusts their storefront configuration programmatically
— no portal login — so business rules (tiempos de procesamiento, negociación, branding) can be
optimized continuously and conversationally. This bridges 03 · Selling & Shops into
07 · Agentic & Federated Commerce.

> **Build note:** this sprint **wraps Sprint 3's apply engine** as MCP tools on the existing server
> (`app/api/ucp/mcp/route.ts`), which today exposes only buyer-side tools. These are the first
> **seller write-tools** — the security bar is higher than the rest of the epic.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **All stories ✅ SHIPPED + live-QA'd 2026-06-03 — sprint & epic complete.**

---

## US-1 — Expose `get_store_configuration` ✅
**As a** seller's agent, **I want** to read the current store configuration, **so that** I can reason
about what to change.
- [x] New MCP tool returns the store's declarative config blocks (the Sprint 3 schema), scoped to the
      authenticated shop (`lib/store-config.ts` · `buildStoreConfigSnapshot`).
- [x] Read-only; no secrets ever returned (payment keys, CLABE, Stripe/MP tokens, Cal.com keys all
      stripped). **Live-verified:** snapshot for "VP Shops" exposed only declarative profile data.

## US-2 — Expose `patch_store_configuration` (granular) ✅
**As a** seller's agent, **I want** to update specific config blocks, **so that** I can adjust rules
without resending the whole manifest.
- [x] Accepts **partial blocks** — deep-merged, untouched blocks preserved. **Live-verified:** patched
      `notifications` alone, `profile` untouched.
- [x] Reuses the Sprint 3 atomic block-apply engine via shared `lib/apply-config-manifest.ts` (same
      path as the file-upload importer).
- [x] **Strict validation** before any DB write. **Live-verified:** an invalid `accent_color` ("rojo")
      was dropped with a plain-language issue while the valid block still applied — bad value never hit the DB.

## US-3 — Scoped authorization ✅
**As the** platform, **I want** only an authenticated, permissioned agent to patch a shop, **so that**
no one can edit a store they don't represent.
- [x] Per-shop bearer token (`ms_agent_…`), seller-provisioned in “Agentes” settings, stored as a
      SHA-256 hash (`lib/agent-auth.ts`). **Live-verified:** no-token + revoked-token both rejected.
- [x] Scoped per shop by construction — a token resolves to exactly one shop.

## US-4 — Audit log + security notifications ✅
**As a** seller, **I want** a record of what my agent changed and an alert on sensitive edits, **so
that** automation never surprises me.
- [x] Every successful patch appends to a capped **operational audit log** at `metadata.ucp_agent_audit`
      (`lib/agent-audit.ts`), plus an admin/ops Telegram notification on every change.
- [x] **Sensitive** blocks (offers/negotiation, shipping — financially impactful) additionally email
      the seller a security alert with a revoke-token CTA. *(Realized decision below.)*
- [x] The irreversible OAuth sections (pagos, canal, citas) are **structurally non-patchable** via MCP —
      they require the manual UI. That is the strongest form of "sensitive blocks need a manual step,"
      so no separate re-auth handshake was added for the declarative subset.

---

### Definition of done (sprint)
A permissioned agent can fetch a shop's config, patch a single block (e.g. negotiation or processing
time), and have the change validated, applied, audited, and — for sensitive blocks — flagged to the
seller. Listed under 07's feature map as the first seller-side MCP capability.

### Out of scope (this sprint)
Buyer-facing agent changes · catalog writes via MCP (separate future capability) · cross-shop /
admin-level config.

---

### Decision (resolved at build)
Which config blocks may a patch touch silently vs. require a manual re-auth step? **Resolved:** every
declarative block is patchable silently; `métodos de pago`, `canal propio`, and `citas` (Cal.com) are
OAuth-bound and **structurally non-patchable** via MCP (they're absent from the manifest schema and
require the manual UI). Within the patchable subset, `offers`/`negotiation` and `shipping` are treated
as **sensitive** → the seller gets a security email on change. All agent changes hit the audit log +
admin Telegram notification.
