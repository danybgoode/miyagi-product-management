---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: mcp-parity-core
---

# Epic: MCP seller-surface parity — core (unblock, hardening, money-adjacent)

> **Area:** 03-selling-and-shops · **Risk:** mixed (LOW→HIGH by story) · **Scope seed:** none —
> commissioned directly during `panfleto-premium-shop` Sprint 3 planning, audit-driven.

## Why
AGENTS.md rule #3 promises every seller-portal mutation is agent-accessible via MCP. Building
panfleto Sprint 3 found that promise broken for the bookshop launchpad — zero MCP write tools;
campaigns and manuscript review are portal-UI-only — which directly blocked that sprint. Daniel
asked to go further than the one gap that bit: audit the whole MCP surface and bring it to
"tip-top shape." Three parallel research passes + an Opus-led design pass found the gap is broad —
this epic is the mixed-risk half of the response (the urgent unblock plus every genuinely risky,
money-adjacent mutation, each individually gated). The uniformly-LOW config remainder is a
separate epic, `mcp-parity-config`, so it isn't held behind this epic's Daniel-merge gates.

## Medusa-first note
No new commerce primitives anywhere in this epic. Every story wraps an existing seller-portal
route or `lib/` function that already validates against Medusa correctly — the work is exposing
that existing, hardened logic through a new MCP tool, never reimplementing it. Sprint A2 is the one
story with a real Medusa product/price mutation in its call path (`apps/backend`), and it reuses
that backend's existing validators verbatim.

## What already exists (reuse, don't rebuild)
- The MCP tool pattern itself: `create_collection` → `validateCollectionName` →
  `createSellerCollectionViaInternal` (`app/api/ucp/mcp/route.ts:1649-1670`) — every new handler in
  this epic follows this shape: `resolveAgentShop(authHeader)` first, ownership check before
  mutating, `{content, isError?}` response.
- Launchpad campaign/review functions (`lib/launchpad-campaigns.ts`, `lib/launchpad.ts`) — fully
  built, just not MCP-exposed. Sprint A1 wraps them 1:1.
- CPP "Opciones" validation (`apps/backend/src/api/store/_utils/seller-product-{create,update}.ts`,
  `src/lib/price-tiers.ts`) — fully built, portal-UI-only today. Sprint A2 wraps it verbatim.
- `normalizeSupportSettings` (`lib/support-widget.ts`) — Sprint A4.1 reuses it verbatim.

## Scope — stories

| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | Campaign CRUD over MCP (create/update/activate/cancel) | low | ⬜ not started |
| 1 | Manuscript review + publish over MCP | low | ⬜ not started |
| 1 | `launchpad` block in `patch_store_configuration` | low | ⬜ not started |
| 1 | Manifest sync (4 drifted tools + new A1 tools, permanent drift guard) | low | ⬜ not started |
| 1 | Fix `update_listing` title-validation drift | low | ⬜ not started |
| 1 | e2e coverage for `list_launchpad_campaigns`/`list_manuscript_submissions` | low | ⬜ not started |
| 2 | `configure_listing_options` over MCP (CPP price_grid/Opciones) | high | ⬜ not started |
| 3 | `delete_listing` over MCP | high | ⬜ not started |
| 3 | `apply_price` over MCP | high | ⬜ not started |
| 4 | `support` block in `patch_store_configuration` | high | ⬜ not started |
| 4 | `checkout` block in `patch_store_configuration` | high | ⬜ not started |

## Deploy order
Sprint 1 is frontend-only, all LOW, ships first — it's the literal blocker for
`panfleto-premium-shop` Sprint 3 (campaign creation + manuscript review + the shop's
`accepts_manuscripts` opt-in). Sprint 2 is the only story touching `apps/backend` — its
backend/shared-helper piece merges and finishes deploying (~12 min, no preview) before the
dependent frontend tool ships. Sprints 3 and 4 are independent of each other, both frontend-only,
each HIGH with its own kill-switch + Daniel smoke.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs) for every HIGH story
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switches:** `mcp.configure_options.enabled`, `mcp.delete_listing.enabled`,
      `mcp.apply_price.enabled`, `mcp.support_config.enabled`, `mcp.checkout_config.enabled` — all
      new-capability (default OFF), flipped only after each story's Daniel smoke passes. Sprint 1
      needs no new flag (launchpad tools inherit the existing `launchpad.enabled`).
- [ ] Feature branch(es) deleted; this README's frontmatter `status: shipped`
      (run `node scripts/build-order.mjs`)

See also the sibling epic `mcp-parity-config` (uniformly LOW config-wrapper tools, built after this
one) and the deferred, named-not-scoped `mcp-money-features`/`mcp-connector-parity` buckets
(coupons/sweepstakes/events; ML connectors/import/embed-key) — recorded in this epic's planning
session, not yet scaffolded.
