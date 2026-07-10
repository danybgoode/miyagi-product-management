# Miyagi Partners — multi-tenant MCP credential + roles — Sprint 1: Credential + grants + resolver + audit (flag dark-launch)

**Status:** ⬜ not started

## Stories

### Story 1.1 — `partners.mcp_enabled` flag slice (dark-launch)
**As the** platform, **I want** every partner-credential code path gated behind
`partners.mcp_enabled` (default `false`, created DISABLED in every env), **so that** the whole epic
merges dark and activates deliberately.
**Acceptance:** flag key added to `lib/flags.ts` `FlagKey` + `DEFAULT_FLAGS` (`false`); with the flag
off, an `ms_partner_` credential resolves to nothing (401/unknown-credential — indistinguishable from
a bad token); the seed migration for the `platform_flags` row rides the PR (never pushed from a build
session — shared Supabase project).
**Risk:** high (auth surface; the gate itself)

### Story 1.2 — `ms_partner_` credential + `partner_grants` + grant-set resolver
**As a** partner, **I want** one `ms_partner_<hex>` credential whose resolution returns my full grant
set (shop + role per grant), **so that** a single token reaches every client shop I'm granted.
**Acceptance:**
- `parseBearer` / `classifyAgentCredential` accept the third prefix (pure — spec-extended).
- `partner_grants` table (partner ↔ shop, role `manager|viewer`, granted_by, timestamps, revoked_at);
  migration in the PR.
- Grant checked **per call**, not per session — revoking then calling again denies immediately.
- Hash-stored token (mirror `ms_agent_` discipline) + generate/rotate helpers reused.
**Risk:** high (auth boundary)

### Story 1.3 — Partner connector-URL variant for claude.ai
**As a** partner using claude.ai (which can't send custom bearer headers), **I want**
`/api/ucp/mcp/p/<slug>` mirroring the seller connector route, **so that** the credential works as a
claude.ai custom connector, not just Desktop/CLI.
**Acceptance:** route synthesizes the bearer and calls the same shared dispatcher; slug stored
plaintext on the partner record (re-show rationale, same as `ms_connector_`); rotate invalidates the
old URL; never touches the DB itself.
**Risk:** high (auth surface, mirrors reviewed pattern)

### Story 1.4 — `shop_slug` tool routing across the dispatcher
**As a** partner agent, **I want** every existing seller tool to accept an optional `shop_slug`
argument when my credential is partner-shaped (defaulting when I hold exactly one grant), **so that**
the ~38 existing tools work multi-shop with zero new tools.
**Acceptance:**
- Wrapper `resolveToolShop(authHeader, args.shop_slug?)` swapped at all 19 `resolveAgentShop` call
  sites; `ms_agent_`/`ms_connector_` behavior byte-identical (parity spec).
- Partner + `shop_slug` outside the grant set → explicit denial; `viewer` role calling a write tool →
  explicit denial naming the role.
- api spec: credential-for-partner-A can never touch unauth'd shop B (the epic's core security claim).
**Risk:** high (touches every tool's auth path)

### Story 1.5 — Per-call partner audit trail
**As the** platform, **I want** every partner tool call logged (partner, shop, tool, role, at,
outcome) in a real table, **so that** partner activity is reviewable per shop and per partner.
**Acceptance:** table + best-effort append (a logging failure never fails the call —
`lib/agent-audit.ts` discipline); surfaced minimally in `/admin/audit`; entries visible for denied
attempts too.
**Risk:** low (additive logging)

## Sprint QA
- **api spec(s):** extend `e2e/agent-connector.spec.ts` (pure: third prefix classification); new
  `e2e/partner-auth.spec.ts` (api project): flag-off 401, cross-shop denial, viewer-write denial,
  revoke-then-call denial, single-grant default, seller-credential parity unchanged
  (`mcp-tool-dispatch-parity.spec.ts` stays green).
- **browser smoke owed:** yes, to Daniel — real partner credential in claude.ai (custom connector
  add + two granted shops + one mid-session revoke + one cross-shop denial).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (flag flip in a controlled window) — pre-merge, run
against the branch preview with the bypass token.

1. (admin) Create a partner credential + two grants (manager on shop A, viewer on shop B) via the
   manual admin path; keep the printed `ms_partner_…` token and the `/api/ucp/mcp/p/<slug>` URL.
2. With `partners.mcp_enabled` OFF, call any MCP tool with the partner token.
   → Unknown-credential 401 — identical to a garbage token.
3. Flip `partners.mcp_enabled` ON (admin → flags). Call `list`-type tool with `shop_slug: <shop-A>`.
   → Real data for shop A.
4. Call a write tool (e.g. config patch) with `shop_slug: <shop-B>` (viewer).
   → Denied, message names the viewer role. **(auth path — owed to Daniel)**
5. Call any tool with `shop_slug: <un-granted shop C>`.
   → Denied. **(the core security claim — owed to Daniel)**
6. Add the `/api/ucp/mcp/p/<slug>` URL as a claude.ai custom connector; list tools and read shop A.
   → Works without any bearer header. **(claude.ai path — owed to Daniel)**
7. Revoke the shop-A grant, then repeat step 3 in the SAME session.
   → Denied on the very next call (per-call check).
8. (regression) Run a seller's existing `ms_agent_`/`ms_connector_` session on shop A.
   → Behavior unchanged.

If any step fails, note the step number + what you saw — that's the bug report.
