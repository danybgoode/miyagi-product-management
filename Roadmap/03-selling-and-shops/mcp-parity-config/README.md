---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: mcp-parity-config
---

# Epic: MCP seller-surface parity — config (pure config wrappers)

> **Area:** 03-selling-and-shops · **Risk:** low (every story) · **Scope seed:** none — sibling
> epic to `mcp-parity-core`, split out from the same audit specifically because this half is
> uniformly LOW.

## Why
The MCP capability audit that produced `mcp-parity-core` also found a second, larger set of
seller-portal mutations with no MCP equivalent — but unlike core's launchpad/CPP/pricing/checkout
work, these are all pure config wrappers: no money, no side effects beyond a config write, no
kill-switch needed. Splitting them into their own epic means they flow through fast green-CI
auto-merge instead of waiting behind `mcp-parity-core`'s HIGH-risk, Daniel-merge-gated stories.
Build this epic **after** `mcp-parity-core` — not because of a technical dependency, but so
`mcp-parity-core`'s urgent launchpad unblock and money-adjacent hardening get review priority.

## Medusa-first note
No commerce primitives touched at all — every story here wraps an existing `app/api/sell/**`
config route (collections, shop slug, notification preferences, CMS content, Telegram linking).

## What already exists (reuse, don't rebuild)
- The MCP tool pattern: `create_collection` → `validateCollectionName` →
  `createSellerCollectionViaInternal` (`app/api/ucp/mcp/route.ts:1649-1670`) — every tool here
  follows it: `resolveAgentShop(authHeader)` first, ownership check, `{content, isError?}`.
- `validateCollectionName` (`lib/collection-derive.ts`) — reused verbatim for `update_collection`.

## Scope — stories

| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | `update_collection` / `delete_collection` over MCP | low | ⬜ not started |
| 1 | `reorder_collections` over MCP | low | ⬜ not started |
| 1 | `set_listing_repuve` over MCP (optional, low priority) | low | ⬜ not started |
| 2 | `set_shop_slug` over MCP | low | ⬜ not started |
| 2 | Notification-preferences over MCP (extend existing block or new tool) | low | ⬜ not started |
| 2 | Shop CMS content CRUD over MCP | low | ⬜ not started |
| 2 | Telegram link/unlink/test over MCP | low | ⬜ not started |

## Deploy order
Both sprints are frontend-only, independent of each other and of `mcp-parity-core`. No backend
changes, no deploy-lag coordination needed.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated — expect none, all LOW/automatable)
- [ ] Each `sprint-N.md` has its smoke walkthrough if any manual check is warranted
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written (can be brief — a low-risk, mechanical epic)
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** none needed — every story here is config-only, LOW risk, auto-mergeable.
- [ ] Feature branch deleted; this README's frontmatter `status: shipped`
      (run `node scripts/build-order.mjs`)

See also the sibling epic `mcp-parity-core` (the mixed-risk launchpad unblock + money-adjacent
hardening, built first) and the deferred, named-not-scoped `mcp-money-features`/
`mcp-connector-parity` buckets recorded in that epic's planning session.
