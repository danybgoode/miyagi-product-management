# Sprint 1 — Accurate agent docs + drift-proof source of truth

Goal: an AI agent that discovers Miyagi hits only real endpoints and sees the full current toolset
(including the new seller config tools) — and the docs can never silently drift from the real API again.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **All stories ✅ SHIPPED + live-QA'd 2026-06-03.**

---

## US-1 — Single source of truth for capabilities ✅
**As the** platform, **I want** endpoint + tool metadata defined once, **so that** agent docs can't drift
from the real API.
- [x] New `lib/ucp/capabilities.ts` lists the canonical public UCP endpoints + MCP tool names (buyer +
      seller), matching what actually exists. The `/agent` page and manifest consume it.

## US-2 — Correct the public `/agent` briefing ✅
**As an** AI agent, **I want** the briefing to list real endpoints, **so that** I don't 404.
- [x] `/agent` now renders endpoints from the shared module; MCP config uses `/api/ucp/mcp`; the stale
      `/api/ucp/listings`, `/api/ucp/offer`, and `/api/mcp` references are gone (one stray "Browse listings
      API" link was caught by the smoke test and fixed). Seller tools shown with their token note.

## US-3 — Manifest full capability set + `.well-known` discovery ✅
**As an** AI agent, **I want** one discovery document listing everything including seller tools.
- [x] `GET /api/ucp/manifest` advertises all 11 MCP tools + a `seller_configuration` block (with the
      `Authorization: Bearer ms_agent_…` auth note); capabilities sourced from the shared module.
- [x] `GET /.well-known/ucp` resolves to the manifest (next.config rewrite).
- [x] MCP `initialize` instructions describe the seller workflow.

*(Skipped `app/robots.ts` from the plan — robots.txt can't carry a manifest pointer and no sitemap exists;
`.well-known/ucp` + the indexable `/agent` JSON-LD are the real discovery mechanisms.)*

### QA — live, all pass (commit a7f13fd + fix 862e41a)
`curl` + Playwright against prod: manifest lists 11 tools + `seller_configuration`; `/agent` has the real
MCP URL and no stale paths; `/.well-known/ucp` resolves; MCP `tools/list` includes the seller tools and the
seller tool rejects calls without a token.
