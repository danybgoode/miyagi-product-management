# Miyagi Partners — multi-tenant MCP credential + roles — Sprint 2: Funnel auto-grant + partner dashboard + seller revoke

**Status:** ✅ merged dark 2026-07-17 — PR [#274](https://github.com/danybgoode/miyagisanchezcommerce/pull/274) (`85c8820`). Semantics decision (fresh-review, reversible): deliberate human decisions WIN over the funnel — no viewer→manager upgrade, no auto-re-grant after a seller revoke (ops note instead). ⚠ OWED: Daniel confirms that semantics + the smoke walkthrough below (flag ON window).

## Stories

### Story 2.1 — Promoter-close auto-grant
**As a** partner closing a shop through `/promotor/cerrar`, **I want** the closed shop granted to my
partner scope automatically (role `manager`), **so that** the shop I just set up appears in my MCP
and dashboard without an admin touch.
**Acceptance:** closing a shop as an approved promoter with a partner credential creates the
`partner_grants` row (granted_by: `promoter-close`); a closer *without* a partner credential closes
exactly as today (no error, no grant); grant visible in `/partner` and reachable via MCP immediately.
**Risk:** med (writes into the auth-grant table from the funnel; gated behind `partners.mcp_enabled`)

### Story 2.2 — `/partner` dashboard (read-only v1)
**As a** partner, **I want** a `/partner` page listing my granted shops with role + granted-at and
per-shop deep links into `/shop/manage`, **so that** I can see and reach my portfolio in one place.
**Acceptance:** lists only granted, unrevoked shops; empty state explains how shops arrive
(promoter close / admin grant); no impersonation — links land on the normal auth'd `/shop/manage`;
copy es-MX.
**Risk:** low (read-only UI; reuses admin tenant-list patterns)

### Story 2.3 — Seller-side revoke
**As a** seller, **I want** to see and revoke any partner grant on my shop from shop settings,
**so that** partner access is always under my control.
**Acceptance:** settings section lists active grants (partner, role, since); revoke sets
`revoked_at`; the partner's next MCP call on that shop denies (per-call check, no session grace);
revocation is logged in the partner audit trail; copy es-MX.
**Risk:** med (auth-adjacent; simple delete-style write)

## Sprint QA
- **api spec(s):** grant-lifecycle spec (close → grant exists → MCP reaches shop → revoke → next call
  denied); dashboard route auth (partner sees only own grants).
- **browser smoke owed:** yes, to Daniel — real promoter close on prod (funnel path), and the
  settings revoke from a real seller session.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (flag ON)

1. As an approved promoter holding a partner credential, close a test shop via
   https://miyagisanchez.com/promotor/cerrar. **(funnel path — owed to Daniel)**
   → Close succeeds as today.
2. Open https://miyagisanchez.com/partner
   → The just-closed shop is listed (manager, granted now).
3. In your agent session, call a tool with `shop_slug: <new-shop>`.
   → Works without any new token.
4. As the seller of that shop, open shop settings → partner access.
   → The grant is listed. Revoke it. **(seller control — owed to Daniel)**
5. Repeat step 3.
   → Denied on the next call; `/partner` no longer lists the shop.

If any step fails, note the step number + what you saw — that's the bug report.
