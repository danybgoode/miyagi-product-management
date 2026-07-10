# Miyagi Partners — multi-tenant MCP credential + roles — Sprint 3: Feedback loop (send_feedback + admin list)

**Status:** ⬜ not started

## Stories

### Story 3.1 — `send_feedback` MCP tool + `platform_feedback` table
**As an** agent (or the seller/partner driving it), **I want** a `send_feedback` tool (author kind:
seller/partner/agent · category: feature/mcp-tool/bug · free text · optional tool name), **so that**
structured, tech-level product signal is filed the moment a gap is hit.
**Acceptance:** tool available to all three credential shapes; row lands in `platform_feedback` with
the resolved author identity; `tgNotify` fires (best-effort — a Telegram failure never fails the
tool); tool description teaches agents when to use it.
**Risk:** low (additive tool behind existing auth)

### Story 3.2 — `/admin/feedback` list
**As the** platform admin, **I want** a minimal `/admin/feedback` list (filter by category/author
kind, newest first), **so that** the signal is readable where the other admin sections already live.
**Acceptance:** admin-guarded route in the existing admin shell; shows author, kind, category, tool
name, text, timestamp; no edit/reply v1.
**Risk:** low (read-only admin UI)

## Sprint QA
- **api spec(s):** `send_feedback` round-trip per credential shape; category/author-kind validation;
  Telegram-failure tolerance (mock).
- **browser smoke owed:** no — admin list assertable via api spec + a quick self-check.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. From an agent session (any credential shape), call `send_feedback` with category `mcp-tool` and a
   tool name.
   → Tool returns success.
2. Check the ops Telegram channel.
   → A feedback notification arrived with author + category.
3. Open https://miyagisanchez.com/admin/feedback
   → The entry is listed, newest first, with the author identity resolved.

If any step fails, note the step number + what you saw — that's the bug report.
