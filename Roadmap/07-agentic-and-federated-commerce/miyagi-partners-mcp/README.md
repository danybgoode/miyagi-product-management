---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: miyagi-partners-mcp
---

# Epic: Miyagi Partners — multi-tenant MCP credential + roles

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high · **Scope seed:** [`00-ideas/seeds/miyagi-partners-mcp.md`](../../00-ideas/seeds/miyagi-partners-mcp.md)

## Why
A partner (promoter/consultant managing client shops, Shopify-partners style) gets one MCP credential
and dashboard scoped to *all* their client shops — every shop they close lands in their agent's reach
automatically, no per-shop token juggling. Decided (Daniel, 2026-07-09): **partner multi-shop only in
v1**; platform-admin-over-all-shops is a fast-follow behind its own flag. Also folds in the first
structured feedback channel (`send_feedback` MCP tool → Telegram + admin list).

## Medusa-first note
Partners/grants are a marketplace concept Medusa has no module for → Supabase (`partner_grants`,
`platform_feedback` — both confirmed absent, genuinely new; AGENTS rule 2 check passed). Commerce
data stays untouched — the epic only changes *who may call* the existing seller MCP tools.

## What already exists (reuse, don't rebuild)
- `lib/agent-auth.ts` — the ONE resolver (`resolveAgentShop`); `parseBearer` /
  `classifyAgentCredential` are pure and gain the third prefix. Token helpers shape-agnostic.
- The seller MCP tool set (~38 tools, `app/api/ucp/mcp/route.ts`) — zero new shop-operation tools;
  `resolveAgentShop(authHeader)` has **19 call sites** → swap to a wrapper
  (`resolveToolShop(authHeader, args.shop_slug?)`) mechanically.
- Seller connector-URL mechanism (`ms_connector_` + `/api/ucp/mcp/c/[slug]`) — mirrored for the
  partner URL variant (`/api/ucp/mcp/p/<slug>`), required because claude.ai connectors can't send
  bearer headers.
- Promoter program (`PRM-` codes, close flow at `app/(shell)/promotor/cerrar/` + `app/api/promoter/`)
  — partner identity keys off the approved promoter record.
- Admin UI sections `audit` / `flags` / `promoter`; `lib/telegram.ts` `tgNotify`; `lib/agent-audit.ts`
  audit-entry shape (partner trail gets a real table — calls span shops).
- Pure spec seam: `e2e/agent-connector.spec.ts`; flag rail: `lib/flags.ts` `FlagKey` + `DEFAULT_FLAGS`.

## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | `ms_partner_` credential + connector-URL variant + `partner_grants` + resolver grant-set + `shop_slug` routing + per-call audit + `partners.mcp_enabled` flag (dark-launch) | high | ✅ merged dark 2026-07-17 — PR [#272](https://github.com/danybgoode/miyagisanchezcommerce/pull/272); ⚠ migration NOT yet applied (Daniel) |
| 2 | Promoter-close auto-grant + `/partner` dashboard + seller-side revoke | low-med | ✅ merged dark 2026-07-17 — PR [#274](https://github.com/danybgoode/miyagisanchezcommerce/pull/274) |
| 3 | Feedback loop: `send_feedback` tool + `platform_feedback` + Telegram + `/admin/feedback` | low | ✅ merged 2026-07-17 — PR [#273](https://github.com/danybgoode/miyagisanchezcommerce/pull/273); ⚠ `platform_feedback` migration NOT yet applied (Daniel) |

## Kill-switch decision (Stage 6b, recorded at grooming)
**Flag story (in S1):** `partners.mcp_enabled` — **enablement/dark-launch polarity, default `false`,
created DISABLED in every env** (auth surface: merge dark, flip deliberately). Seam: the credential
classifier/wrapper branch in `lib/agent-auth.ts` — one `isEnabled()` covers MCP, dashboard, and
auto-grant. Mechanism: in-house flags reader (node seam — confirmed, no Edge Config needed).

## Deploy order
Frontend-only (Next.js app + Supabase migrations); no backend-repo change. Merge dark behind the
flag; S1 must be live (flag ON in a controlled window) before S2's auto-grant means anything. Supabase
migrations ride the PR per the shared-project caution (LEARNINGS: `.env.local` Supabase IS prod —
leave seed/migration files to deploy-time application, never push from a build session).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** `partners.mcp_enabled` exists in `platform_flags` with dark-launch polarity
      (default `false`, created DISABLED in every env) — verify-only, planned in S1.
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
