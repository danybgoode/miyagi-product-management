# MCP parity config — Sprint 2: Shop-identity & content config tools

**Status:** ✅ shipped + live 2026-07-16 — same PR pair as Sprint 1 (FE [#271](https://github.com/danybgoode/miyagisanchezcommerce/pull/271) + BE [#100](https://github.com/danybgoode/medusa-bonsai-backend/pull/100)). 2.2 decision: granular grid ≠ notifications config block → dedicated tool. Owed: first real-token smoke (walkthrough below).

## Stories

### Story 2.1 — `set_shop_slug` over MCP
**As a** shop agent, **I want** to change my shop's public URL slug, **so that** rebranding
(mirroring what happened by hand in `panfleto-premium-shop` Sprint 2) is agent-doable next time.
**Acceptance:** wraps `PATCH /api/sell/shop/slug`; surfaces the route's existing slug-format/
collision errors faithfully; on success confirms the old-slug 301 alias behavior (already shipped
in `custom-slugs`) is unchanged.
**Reuses:** the existing `PATCH /api/sell/shop/slug` route, unmodified.
**Risk:** low — note in the PR that this is SEO/domain-linked even though config-only; no special
handling needed beyond what the route already does.

### Story 2.2 — Notification preferences over MCP
**As a** shop agent, **I want** to set email notification preferences via MCP.
**Acceptance:** first check whether `PATCH /api/sell/notification-preferences` is a strict
superset of the `notifications` block `patch_store_configuration` already covers
(`email_new_view`/`email_new_message`) — if so, extend that existing block rather than adding a
new tool; if it covers genuinely different preferences, add a dedicated `set_notification_preferences`
tool instead. **This decision must be made by reading both code paths before building, not assumed.**
**Reuses:** whichever of the two existing surfaces turns out to be the superset.
**Risk:** low

### Story 2.3 — Shop CMS content CRUD over MCP
**As a** shop agent, **I want** to create/edit/delete shop content pages, **so that** managing
custom pages beyond Acerca/FAQ is agent-doable.
**Acceptance:** three tools — `create_content`, `update_content`, `delete_content` — wrapping
`POST /api/sell/content`, `PATCH/DELETE /api/sell/content/[id]`.
**Reuses:** the existing `app/api/sell/content/**` routes, unmodified.
**Risk:** low

### Story 2.4 — Telegram link/unlink/test over MCP
**As a** shop agent, **I want** to manage my shop's Telegram notification link via MCP.
**Acceptance:** three tools — `link_telegram`, `unlink_telegram`, `test_telegram` — wrapping
`POST/DELETE /api/sell/telegram/link` and `POST /api/sell/telegram/test`.
**Reuses:** the existing `app/api/sell/telegram/**` routes, unmodified.
**Risk:** low

## Sprint QA
- **api spec(s):** one per story — auth, ownership, happy path, and each route's existing
  validation/error cases surfaced faithfully.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **browser smoke owed:** none — every story is config-only and fully automatable.
