---
status: shipped
slug: seller-agent-connect-mcp-url
---

# Epic: Seller agent connect — always-on personal MCP URL + Claude one-click, and a setup prompt that helps

> **Area:** 03-selling-and-shops · **Risk:** Sprint 1 low · Sprint 2 **high (auth)** · **Type:** feature + copy
> **Scope doc:** [`00-ideas/2. readyforscope/seller-agent-connect-mcp-url.md`](../../00-ideas/2.%20readyforscope/seller-agent-connect-mcp-url.md)
> **Status:** ✅ SHIPPED 2026-07-02 · S1 [#158](https://github.com/danybgoode/miyagisanchezcommerce/pull/158) ·
> S2 [#159](https://github.com/danybgoode/miyagisanchezcommerce/pull/159) squash-merged `4be2b86`, Daniel merged
> on green CI. **Owed:** applying the flag seed migration + flipping `seller_agent.connector_url_enabled` on,
> the live claude.ai connector round-trip, and the valid-slug smoke (see `sprint-2.md`) — all deliberate,
> post-merge, live-infra/auth steps, not build gaps.

## Why
Two gaps stop a seller's agent from actually running the shop. (1) The setup emit prompt
(`buildSetupPrompt`) tells the agent to convert *what the seller shares* into JSON and return **only** JSON — it
never says to read Miyagi context or **interview** the seller, so with no input it emits the bare skeleton
`{"miyagi_setup_version":"1"}`. (2) The agent token is **show-once + button-gated** and the only copyable
artifact is an MCP config with an `Authorization: Bearer` **header** — which **claude.ai's custom-connector
modal cannot accept at all** (URL + optional OAuth only). So a seller literally can't connect via claude.ai
today. We give them an always-present, copyable **personal MCP URL** (credential in the URL) + a one-click
**"Agregar a Claude"** deep-link, and fix the prompt to interview.

## Medusa-first note
Commerce untouched — the connector URL calls the **existing** seller MCP tools at the **existing** scope; no
new commerce write path (rule #1 preserved). The connector slug/token lives in `marketplace_shops.metadata`
(non-commerce identity — where the token hash already lives), not a new commerce table (rule #2). Clerk still
authorizes minting; the connector is an **agent** credential scoped to one shop, never a human-auth replacement
(rule #4 — do not widen scope). All seller copy es-MX (rule #5).

## Research note (present-day, 2026-07-01)
claude.ai custom connectors accept a **remote MCP server URL** + (Advanced) an **OAuth Client ID/Secret** —
**no Bearer/header field** (open feature request; GitHub `anthropics/claude-ai-mcp` #112). So the credential
must ride in the URL (chosen) or via OAuth (deferred). The header snippet stays for Claude Desktop / CLI.

## What already exists (reuse, don't rebuild)
- `lib/setup-spec.ts` `buildSetupPrompt()` + `SETUP_LANGUAGE_DIRECTIVE`; `/api/ucp/setup-spec` + MCP
  `get_setup_spec` — Part A edits the **prompt body** only; validators (`validateSetup`, `/api/sell/shop`,
  `/settings-import`, `/import`) untouched. (`/agent` also renders this prompt — it inherits the fix.)
- `components/ConnectAgentPanel.tsx` + `/api/sell/agent-token` (POST/DELETE) + `lib/agent-auth.ts` — token
  mint/store(hash)/revoke; Part B extends: auto-provision, render the URL, add the deep-link, rotate/revoke.
- `app/api/ucp/mcp/route.ts` — the Bearer resolution + one-shop scope the URL path must **reuse exactly**.
- `app/(shell)/sell/setup/SetupClient.tsx` `LoopClose` ("Tu agente como tu dependiente" / "Conecta tu
  agente") + seller settings "Agentes e integraciones" — where the panel renders.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Rewrite `buildSetupPrompt` — read Miyagi context + interview on thin input, keep JSON-only final output ✅ [#158](https://github.com/danybgoode/miyagisanchezcommerce/pull/158) merged `893d23b` | low |
| 2 | Per-shop personal MCP URL (opaque connector slug in path) resolving to the existing seller scope ✅ [#159](https://github.com/danybgoode/miyagisanchezcommerce/pull/159) merged `4be2b86` | **high (auth)** |
| 2 | `ConnectAgentPanel`: always-shown copyable URL + "Agregar a Claude" deep-link + rotate/revoke; keep header snippet ✅ [#159](https://github.com/danybgoode/miyagisanchezcommerce/pull/159) merged `4be2b86` | **high** |
| 2 | Kill-switch (default off), auth `api` specs (both flag states, flag→auth→config ordering), smoke walkthrough ✅ [#159](https://github.com/danybgoode/miyagisanchezcommerce/pull/159) merged `4be2b86` | high |

## Deploy order
Sprint 1 frontend-only (prompt string), low-risk, can merge alone. Sprint 2 touches the **auth** path to
seller-scoped MCP tools — behind a **kill-switch** (default off → merge dark), then seed/verify per the flag
run-order; **Daniel merges**. If any backend (Medusa/Cloud Run) piece is needed for the slug resolver, merge
backend-first and degrade the frontend gracefully.

## Definition of Done (epic)
- [x] All stories merged to `main` + smoke-tested (gaps stated) — S1 `893d23b`, S2 `4be2b86`; the auth/live
      gaps below are explicitly owed to Daniel, not silently skipped
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs); money/auth steps flagged owed to Daniel
- [x] This README marked ✅; sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated (03 agent-native setup / "Conecta tu agente" line)
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe)
- [ ] **Kill-switch migration ships but is NOT yet applied to the live `platform_flags` table** — the in-house
      flag store (epic 09 · feature-flags-inhouse replaced Flagsmith). The seed migration
      (`supabase/migrations/20260702120000_seller_agent_connector_flag.sql`, `enabled: false`) is on `main`;
      applying it + later flipping it on are left as a deliberate deploy-time step, because `.env.local`
      points at the **same shared Supabase project as production** (`xljxqymsuyhlnorfrnno`) — there's no
      isolated dev DB to rehearse a live flip against without touching prod. Until applied, `isEnabled()`
      already fails open to the same `false` default, so this is a paperwork gap, not a behavior gap.
- [x] Feature branch deleted; PR merged
