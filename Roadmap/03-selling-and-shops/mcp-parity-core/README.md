---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
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
| 1 | Campaign CRUD over MCP (create/update/activate/cancel) | low | ✅ shipped + live — PR [#237](https://github.com/danybgoode/miyagisanchezcommerce/pull/237) |
| 1 | Manuscript review + publish over MCP | low | ✅ shipped + live — PR [#237](https://github.com/danybgoode/miyagisanchezcommerce/pull/237) |
| 1 | `launchpad` block in `patch_store_configuration` | low | ✅ shipped + live — PR [#237](https://github.com/danybgoode/miyagisanchezcommerce/pull/237) |
| 1 | Manifest sync (4 drifted tools + new A1 tools, permanent drift guard) | low | ✅ shipped + live — PR [#237](https://github.com/danybgoode/miyagisanchezcommerce/pull/237) |
| 1 | Fix `update_listing` title-validation drift | low | ✅ shipped + live — PR [#237](https://github.com/danybgoode/miyagisanchezcommerce/pull/237) |
| 1 | e2e coverage for `list_launchpad_campaigns`/`list_manuscript_submissions` | low | ✅ shipped + live — PR [#237](https://github.com/danybgoode/miyagisanchezcommerce/pull/237) |
| 2 | `configure_listing_options` over MCP (CPP price_grid/Opciones) | high | ✅ merged 2026-07-16, dark (flag OFF) — PR [#265](https://github.com/danybgoode/miyagisanchezcommerce/pull/265) |
| 3 | `delete_listing` over MCP | high | ✅ merged 2026-07-16, dark (flag OFF) — PR [#266](https://github.com/danybgoode/miyagisanchezcommerce/pull/266) + backend [#97](https://github.com/danybgoode/medusa-bonsai-backend/pull/97) |
| 3 | `apply_price` over MCP | high | ✅ merged 2026-07-16, dark (flag OFF) — PR [#266](https://github.com/danybgoode/miyagisanchezcommerce/pull/266) + backend [#97](https://github.com/danybgoode/medusa-bonsai-backend/pull/97) |
| 4 | `support` block in `patch_store_configuration` | high | ✅ merged 2026-07-16, dark (flag OFF) — PR [#267](https://github.com/danybgoode/miyagisanchezcommerce/pull/267) |
| 4 | `checkout` block in `patch_store_configuration` | high | ✅ merged 2026-07-16, dark (flag OFF) — PR [#267](https://github.com/danybgoode/miyagisanchezcommerce/pull/267) |

## Deploy order
Sprint 1 is frontend-only, all LOW, ships first — it's the literal blocker for
`panfleto-premium-shop` Sprint 3 (campaign creation + manuscript review + the shop's
`accepts_manuscripts` opt-in). Sprint 2 is the only story touching `apps/backend` — its
backend/shared-helper piece merges and finishes deploying (~12 min, no preview) before the
dependent frontend tool ships. Sprints 3 and 4 are independent of each other, both frontend-only,
each HIGH with its own kill-switch + Daniel smoke.

## Definition of Done (epic)
- [x] All sprints merged to `main`; **smokes stated as gaps** — all 5 HIGH stories ship dark, each flag flips only after its Daniel smoke (walkthroughs in sprint-{2,3,4}.md)
- [x] Each `sprint-N.md` has its smoke walkthrough for every HIGH story (S3's corrected for the real soft-delete semantics)
- [x] This README marked ✅; every sprint status ticked with PR refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switches:** all 5 seeded OFF live and re-verified via a direct `platform_flags`
      query (not just migration-tool success — see the migrations-gap learning). Each flips only
      after its story's Daniel smoke passes. Sprint 1 needed no new flag.
- [x] Feature branches deleted (local + remote, both repos); frontmatter `status: shipped`;
      BUILD-ORDER regenerated.

See also the sibling epic `mcp-parity-config` (uniformly LOW config-wrapper tools, built after this
one) and the deferred, named-not-scoped `mcp-money-features`/`mcp-connector-parity` buckets
(coupons/sweepstakes/events; ML connectors/import/embed-key) — recorded in this epic's planning
session, not yet scaffolded.
