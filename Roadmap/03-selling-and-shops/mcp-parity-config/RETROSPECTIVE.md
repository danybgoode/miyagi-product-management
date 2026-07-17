# MCP seller-surface parity — config — Retrospective

_Closed: 2026-07-16_

> Built in the four-epic batch session (Fable 5 multi-epic experiment); both sprints in ONE PR pair.

## What shipped
Frontend PR [#271](https://github.com/danybgoode/miyagisanchezcommerce/pull/271) + backend PR
[#100](https://github.com/danybgoode/medusa-bonsai-backend/pull/100): all 12 config-wrapper
seller tools (44 → 56), built directly by the coordinating session (not a subagent) since every
story is the same mechanical shape — `resolveAgentShop` → ownership → wrap the portal route's
exact logic. Backend: 3 thin internal doors (collection rename/delete/reorder + slug change), all
reusing the existing shared `_utils/seller-collections.ts` / store-route logic verbatim. No
kill-switch (as groomed — uniformly LOW). Live-verified: all 12 in prod `tools/list`, 21/21 spec
assertions green vs prod post-deploy.

## What went well

Overlap validation paid for itself (the batch's mandate):
- **S2.2 notification prefs**: the sprint doc's "read both code paths before building" instruction
  was load-bearing — the `notifications` config block covers only two email booleans in
  `metadata.settings`; the granular grid is a different store (`notification_preferences` table +
  `telegram_links`) → dedicated tool, block untouched.
- **S2.3 CMS content**: about/faq is ALREADY agent-writable via the `content` config block — the
  net-new scope was only `marketplace_subscription_content` CRUD. Without the pre-build overlap
  check both stories would have been built twice or wrongly.

## What we learned
- **Extract-the-shared-pure-function beats copy-parity**: `set_shop_slug` needed the portal's
  alias-history computation; extracting `buildSlugAliasHistory` into `lib/slug.ts` and refactoring
  the portal route onto it made parity structural instead of copied (the fresh reviewer diffed the
  extraction against the original inline block — zero drift).
- **The audit invariant is easy to miss on "config-only" tools**: the fresh reviewer caught that
  `set_listing_repuve` (a buyer-facing trust claim) and `set_shop_slug` (the shop's public URL)
  shipped without `recordAgent*` calls while every other listing mutation has one. Fixed pre-merge.
  Rule of thumb: audit-worthiness follows what the mutation MEANS (trust/URL/money), not which
  epic risk-tier it rode in on.
- **Reserved-word policy: reuse beat both alternatives** — codex flagged the internal slug door
  trusting the caller for reserved words; the right fix was exporting the store route's existing
  `validateSlug` (one backend copy), not a third list and not the original decline.
- One codex "blocking" was the reviewer's miss (an import that exists) — the green-tsc rule held.

## Gaps / follow-ups
- The `ms_agent_` test-token fixture gap now covers 12 more tools (boundary-tested only). Flagged
  since mcp-parity-core S1 — a dedicated QA story is overdue.
- First real-token smoke of `update_collection` / `set_shop_slug` / `set_listing_repuve` on a test
  shop: owed, listed in the sprint docs' walkthroughs.
