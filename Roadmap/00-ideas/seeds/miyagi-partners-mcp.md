---
title: "Miyagi Partners — multi-tenant MCP credential + roles"
slug: miyagi-partners-mcp
status: ready
area: "07"
type: feature
priority: wave-2
risk: high
epic: null
build_order: null
updated: 2026-07-09
---

# Miyagi Partners — multi-tenant MCP credential + roles

**As a** partner (promoter/consultant managing client shops, Shopify-partners style), **I want** one
MCP credential and dashboard scoped to *all* my client shops, **so that** every shop I set up lands in
my agent's reach automatically and I can operate them without juggling per-shop tokens.

## Stage-2.5 bucket: genuinely new
Current MCP auth is strictly **1 credential = 1 shop** (`ms_agent_<hex>` hashed token, or
`ms_connector_<slug>` URL credential — both resolved by the single `resolveAgentShop` seam in
`lib/agent-auth.ts`). No multi-shop, partner, or admin credential exists anywhere.

## Decision (Daniel, 2026-07-09): partner multi-shop only in v1
Platform-admin-over-all-shops via MCP ships as a **fast-follow behind its own flag**, after the
partner scope proves out. (Evaluated: admin is the same mechanism with an `all-shops` grant — but it
concentrates every seller tool behind one credential; sequencing it second keeps the v1 auth surface
reviewable.)

## Shape
- **Credential:** third shape `ms_partner_<hex>` through the *same* resolver + dispatcher — the
  resolver returns a *grant set* instead of one shop. Tools gain an optional `shop_slug` argument when
  the credential is partner-shaped (defaulting when only one grant exists); every existing seller tool
  keeps working unchanged for `ms_agent_`/`ms_connector_`.
- **Grants:** `partner_grants` (partner ↔ shop, role, granted_by, timestamps) in Supabase — partners
  are a marketplace concept Medusa has no module for (AGENTS rule 2 check: not commerce data). Roles
  v1: `manager` (full seller-tool scope) and `viewer` (read-only tools). Seller can revoke a grant from
  shop settings; partner sees revocation immediately (grant checked per call, not per session).
- **Funnel wiring:** the promoter close (`/promotor/cerrar`) auto-grants the closed shop to the
  closer's partner scope — the "shop they just set up appears in their MCP and dashboard" moment.
- **Dashboard:** a `/partner` page listing granted shops + per-shop deep links into `/shop/manage`
  (reuse the admin tenant-management list patterns; read-only v1, no impersonation).
- **Feedback channel (folded in here — Daniel asked; nothing like it exists):** an MCP `send_feedback`
  tool + `platform_feedback` table (author kind: seller/partner/agent, category: feature/mcp-tool/bug,
  free text + optional tool name), Telegram notify via `tg`, and a minimal `/admin/feedback` list.
  Agents can file structured, tech-level orientation the moment they hit a gap — cheapest possible
  product-signal loop from the people already inside the tools.

## What already exists (reuse, don't rebuild)
- `lib/agent-auth.ts` — one resolver, deliberately the only place credentials become shops; extend it,
  don't fork it. Token generate/hash/rotate helpers are shape-agnostic already.
- The full seller MCP tool set (config read/patch, offers, listings, collections, orders…) — zero new
  tools needed for shop operations; only the auth scoping changes.
- Promoter program (approval flow, `PRM-` codes, close flow) — the partner identity can key off the
  approved promoter record; no second application funnel.
- Admin tenant-management UI patterns; `tg` notifications; audit-log shape from ML sync events for the
  per-call partner audit trail.

## Scope boundary
**In:** `ms_partner_` credential + grants + roles (manager/viewer); shop_slug routing on existing
tools; promoter-close auto-grant; seller-side revoke; `/partner` dashboard (list + links); per-call
audit log; `send_feedback` + admin list.
**Out (v1):** platform-admin credential (fast-follow); partner-initiated billing on behalf of clients;
grant invitations to arbitrary existing shops (only shops the partner closed/created — manual admin
grant covers exceptions); partner analytics roll-ups.

## Sprint slicing (skateboard → car)
1. **S1 — credential + grants + resolver + audit.** `ms_partner_` shape, `partner_grants`, resolver
   returns grant set, `shop_slug` tool routing, per-call audit. Risk: **HIGH** (auth boundary). QA:
   pure-logic specs on credential classification + grant resolution (extend the existing agent-auth
   spec seam); api spec proving credential-for-partner-A can never touch unauth'd shop B.
2. **S2 — funnel + dashboard + revoke.** Promoter-close auto-grant, `/partner` page, seller revoke.
   Risk: LOW-MED. QA: api spec on grant lifecycle; browser smoke owed to Daniel.
3. **S3 — feedback loop.** `send_feedback` tool + table + Telegram + admin list. Risk: LOW. QA: api spec.

## Kill-switch decision (risk: high)
**Recommend a flag story**: `partners.mcp_enabled` — **enablement / dark-launch polarity, default
`false`, created DISABLED in every env** (auth surface: merge dark, flip deliberately). Seam: the
credential classifier branch in `resolveAgentShop` — one `isEnabled()` check covers MCP, dashboard,
and auto-grant (they all resolve through it). Mechanism: the in-house flags reader (node seam — not
Edge, no Edge Config needed).

## Cross-agent planning panel
This epic hits the panel trigger (new credential primitive + auth-boundary fork). **Offer stands:**
`node scripts/cross-panel.mjs <this seed> --lens both --agent codex` (advisory, never a gate) before
scaffolding — say the word.

## Smoke walkthrough owner: Daniel (real partner credential in claude.ai, two granted shops, one revoked mid-session, one cross-shop denial).
