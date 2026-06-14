---
status: shipped
slug: agent-connection
---

# Epic · Agent Connection & Discoverability

> ✅ **SHIPPED + live-QA'd 2026-06-03.** All 3 sprints live.

**Tagline:** *That the agent that arrives finds the real door — and the seller can hand it the key.*

**For AI agents and the sellers who want their own agent to run their shop.** We just shipped the first
seller-side MCP write-tools (03 · Sprint 4). This epic makes that work *usable and trustworthy*: an agent
that discovers Miyagi hits only real endpoints and sees the full current toolset, and a seller can connect
their own agent in one copy-paste. It also lays down the platform's first automated smoke tests.

## Why this came up
Two gaps surfaced right after the seller-tools shipped:
1. **The public agent docs were wrong.** `/agent` advertised endpoints that 404 (`/api/ucp/listings`,
   `/api/ucp/offer`, `/api/mcp`). Root cause: endpoint/tool metadata was hand-copied across three places
   (`/agent`, the UCP manifest, the MCP server) with no shared source — so it drifted.
2. **The seller-tools loop was half-open.** A seller could mint an agent token but had no instructions to
   wire it into Claude or any MCP client.

## What shipped
- **S1 — Accurate agent docs + drift-proof source of truth.** One canonical capabilities module
  (`lib/ucp/capabilities.ts`) now feeds the `/agent` page and the manifest, so docs can't drift again. The
  manifest + `/agent` + MCP discovery advertise the full current toolset including the seller config tools,
  and `/.well-known/ucp` resolves to the manifest for auto-discovery.
- **S2 — "Conecta tu agente".** A copyable `claude_desktop_config.json` snippet in shop settings (MCP URL +
  `Authorization: Bearer` header, prefilled with the just-generated token), with 3 setup steps and a plain
  note on what the agent can change vs. what stays manual.
- **S3 — Playwright smoke harness.** The platform's first automated tests — an API-level harness that guards
  the agent surface and replaces the hand-driven curl runs (per the refined Definition of Done).

## Sprints
- [sprint-1.md](sprint-1.md) — Accurate agent docs + drift-proof source of truth.
- [sprint-2.md](sprint-2.md) — "Conecta tu agente" seller helper.
- [sprint-3.md](sprint-3.md) — Playwright smoke harness (QA kickoff).

## Out of scope (deferred 07 backlog)
Embeddable widget (claimed in docs but never built — its own epic) · richer seller write-tools beyond config
(manage listings / respond to offers via agent) · agent activity analytics & audit-log visibility.
