# Miyagi Partners — multi-tenant MCP credential + roles — Retrospective

_Closed: 2026-07-17_

> Final epic of the four-epic batch session (Fable 5 multi-epic experiment, merges pre-authorized).
> All three sprints merged DARK behind `partners.mcp_enabled` in one session-day.

## What shipped
- **S1 (HIGH, PR [#272](https://github.com/danybgoode/miyagisanchezcommerce/pull/272))** — the
  third credential shape `ms_partner_<hex>` (partner = approved promoter; token hash + plaintext
  connector slug on `marketplace_promoters`), `partner_grants` (manager|viewer, revoked_at,
  one-active-per-pair) checked PER CALL, `resolveToolShop(authHeader, args, tool)` — seller creds
  byte-identical passthrough; partner path flag→lookup→grant→`shop_slug` routing→viewer-write
  denial→`partner_tool_calls` audit incl. denials — swapped mechanically (scripted, guard-shape
  asserted) at **42** call sites, `/api/ucp/mcp/p/[slug]` connector route (flag before
  rate-limit), `shop_slug` injected into every seller tool schema at module init, and
  `/api/admin/partners` mint/grant/revoke.
- **S2 (MED, PR [#274](https://github.com/danybgoode/miyagisanchezcommerce/pull/274))** —
  promoter-close auto-grant at the single shop-creation seam (`shop/setup`, verified sole seam by
  the fresh reviewer), `/partner` read-only dashboard (promoter↔Clerk bind, own grants only),
  seller-side revoke in settings + `GET/DELETE /api/sell/partner-grants`.
- **S3 (LOW, PR [#273](https://github.com/danybgoode/miyagisanchezcommerce/pull/273))** —
  `send_feedback` MCP tool (56 → 57 tools; author identity derived server-side from the resolved
  credential, never from args; viewer-callable by design) + `platform_feedback` +
  best-effort Telegram + `/admin/feedback`.

## What went well
- **The one-seam design held**: every security property (flag-off indistinguishability, cross-shop
  denial that never confirms existence, per-call revoke, viewer-write denial) lives in ONE function
  the fresh reviewer could verify exhaustively — including a scripted cross-check that all 42 call
  sites pass the correct tool literal with zero transpositions.
- **Stacked branches + one integration pass** (the mcp-parity-core retro's prescription) worked:
  S2/S3 built in parallel on S1's branch with disjoint file sets, then a clean
  `rebase --onto main` each after S1's squash — no repeat of the mangled-seam conflicts.
- The review lattice earned its keep again: codex caught real robustness gaps (unhandled tg
  promises, role-typo coercion, JSON-null 500); the fresh reviewer caught the epic's two best
  findings — the **funnel-vs-human-intent escalation** (below) and the missing success-side audit.

## What we learned
- **A groomed count goes stale fast in a hot file**: the sprint doc said ~19 `resolveAgentShop`
  call sites; reality at build time was 42 (the two mcp-parity epics landed in between). Mechanical
  swaps should re-derive their inventory from the code at build time, never trust the doc's number.
- **"Idempotent retry" and "authorization write" don't compose naively**: the innocent-looking
  duplicate-close no-op grew an upgrade path that would have let a promoter re-close silently
  escalate an admin's deliberate `viewer` grant, and a fresh insert could undo a seller's revoke.
  Decided (reversible, flagged to Daniel): **deliberate human decisions win over the funnel** —
  pairs with ANY history are no-ops with an ops note; only history-free pairs auto-grant. When a
  funnel writes into an auth table, enumerate who else writes that table and whose intent wins.
- **A killed subagent's uncommitted tree can be salvageable**: the S2 builder was stopped
  mid-codex-fix; per the fork-failure discipline the tree was re-derived directly — the
  uncommitted diff was coherent, verified (tsc + specs), attributed to the codex comment it
  answered, and landed by the coordinating session instead of re-spawning.
- **The permission classifier is part of the process, not an obstacle**: it blocked the agent-side
  prod DDL (Supabase migration apply) exactly at the named-category boundary from LEARNINGS. The
  right move was to stop and hand it to Daniel — made safe by the fail-open flag design (absent
  row ⇒ OFF ⇒ dark).

## Gaps / follow-ups
- **A deploy race bit the S2/S3 merges**: the two Cloud Builds finished out of order and prod
  briefly served S2's image as the latest revision while S3's build also reported SUCCESS. Caught
  by the post-merge live `tools/list` check; fixed by redeploying the SHA-tagged main-tip image.
  Promoted to LEARNINGS (Repo & deploy hygiene).
- **⚠ BOTH migrations are merged files, NOT applied** (the recurring LEARNINGS gap, this time
  deliberate): `20260717090000_miyagi_partners_s1.sql` (tables + promoter columns +
  `partners.mcp_enabled` seeded OFF) and `20260717100000_platform_feedback.sql`. Daniel applies
  by hand (SQL editor) and verifies `to_regclass` + the flag row. Until then: partner surface
  fully dark (fail-open OFF); `send_feedback` returns a clean error.
- **All Daniel smokes owed before any flag flip** — sprint-1/2/3.md walkthroughs: claude.ai
  partner connector (2 shops, viewer-write denial, cross-shop denial, mid-session revoke, seller
  regression), real promoter close + settings revoke, send_feedback round-trip + Telegram check.
- The S2 funnel-vs-human-intent semantics decision awaits Daniel's confirmation (reversible).
- Platform-admin-over-all-shops remains the named fast-follow behind its own flag (v1 scope
  decision, 2026-07-09). The `ms_agent_` fixture gap now also covers partner grant lifecycles.
- Deferred nit: the seller + partner connector routes both double-decrement the MCP rate limit
  (parity-preserved); fix both together someday.
