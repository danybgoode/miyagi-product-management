# MCP parity core — Sprint 1: Unblock the launchpad + cheap hygiene wins

**Status:** ✅ MERGED + LIVE — PR [#237](https://github.com/danybgoode/miyagisanchezcommerce/pull/237)
(squash `ddb8773`), merged 2026-07-12. All 6 stories shipped. All LOW risk — no money touched, no
new kill-switch (launchpad tools inherit the existing `launchpad.enabled`, already ON). This sprint
directly unblocked `panfleto-premium-shop` Sprint 3, which was paused waiting on it — the 4 new
write tools + the `launchpad` config block were used live immediately after merge (see that sprint's
doc). Cross-agent (codex) advisory review + an independent fresh `pr-reviewer` pass both ran before
merge; the reviewer independently re-derived the id-space correctness claim (see S1.1 below) against
the real code and confirmed it, found zero blocking issues, one non-blocking coupling nit (importing
`campaignErrorMessage` from a route file — fine, already exported, not worth a refactor). CI
(Playwright vs preview, type-check+build, Vercel) all green. No browser smoke owed — every story
here was fully automatable.

## Stories

### Story 1.1 — Campaign CRUD over MCP
**As a** shop agent, **I want** to create, edit, activate, and cancel launchpad campaigns via MCP,
**so that** I can run an open call end-to-end without the seller portal.
**Acceptance:** four new tools — `create_campaign`, `update_campaign`, `activate_campaign`,
`cancel_campaign` — each auths via `resolveAgentShop`, scoped to one shop. `create_campaign`
accepts `title`(required)/`description?`/`terms?`/`vote_threshold`/`ends_at?`/`reward_percent?`/
`reward_product_id?`/`work_product_ids?`; faithfully surfaces `title_required`/`work_not_owned`/
`reward_not_owned`/`reward_not_configurable` as `isError` text. `update_campaign` only edits
`draft` campaigns (`not_editable` surfaced). `activate_campaign` performs only `draft→active` and
on incomplete returns the exact `missing: string[]` from `validateCampaignActivation`.
`cancel_campaign` does `draft/active→cancelled`.
**Reuses:** `createCampaign`/`updateCampaign`/`activateCampaign`/`cancelCampaign` in
`lib/launchpad-campaigns.ts` (`:192,332,281,379`) — the exact functions
`app/api/sell/launchpad/campaigns/**` already calls.
**Risk:** low

### Story 1.2 — Manuscript review + publish over MCP
**As a** shop agent, **I want** to move a manuscript through review and publish an approved one,
**so that** editorial review is agent-operable.
**Acceptance:** two tools — `review_submission` (transition, respects the state machine, forces a
non-empty `note` on reject/changes-requested — surfaces `note_required`) and `publish_submission`
(requires `status==='approved'`, idempotent — surfaces `already_publishing` rather than
double-minting, creates the product as DRAFT).
**Reuses:** `transitionSubmission`/`publishSubmission` in `lib/launchpad.ts` (`:299,388`).
**Risk:** low

### Story 1.3 — `launchpad` block in `patch_store_configuration`
**As a** shop agent, **I want** to toggle "acepta manuscritos" and set submission guidelines via
config, **so that** a shop can opt into the launchpad without a portal visit.
**Acceptance:** `validateConfig`/`CONFIG_BLOCKS` recognize a `launchpad` block
(`accepts_manuscripts: boolean`, `guidelines: string|null` ≤2000 chars); invalid guidelines length
is rejected per-block without failing the whole manifest patch; `null` guidelines clears it.
**Reuses:** the length check currently only in `app/api/sell/shop/route.ts:205-208`, lifted into
`lib/settings-import.ts` alongside the existing 8 blocks.
**Risk:** low — **this is the literal blocker for panfleto-S3's Daniel-action #1.**

### Story 1.4 — Manifest sync (permanent drift guard)
**As an** agent discovering capabilities, **I want** the manifest to list every dispatched tool,
**so that** I don't under-call a surface that actually exists.
**Acceptance:** `lib/ucp/capabilities.ts`'s `MCP_SELLER_TOOLS`/`MCP_TOOL_NAMES` gain the 4
already-drifted tools (`list_launchpad_campaigns`, `stage_bulk_action`, `apply_bulk_action`,
`start_shopify_migration`) plus the 6 new tools from 1.1/1.2. `e2e/mcp-tool-dispatch-parity.spec.ts`
extended to assert the manifest array and the real dispatch cases are the **same set in both
directions** — so this class of drift becomes a permanently red build, not a one-time fix.
**Risk:** low

### Story 1.5 — Fix `update_listing`'s title-validation drift
**As a** shop agent, **I want** an oversized or empty title rejected with a clear error, **so
that** it isn't silently truncated behind my back.
**Acceptance:** `validateListingTitle` (mirrors `lib/collection-derive.ts`'s
`validateCollectionName`) enforces max-100/min-1-non-whitespace; `handleUpdateListing`
(`app/api/ucp/mcp/route.ts:1740-1827`) calls it and returns `{isError:true}` 422 *before* the
backend call — today it silently truncates via `seller-product-update.ts:370`'s `.slice(0,100)`.
**Risk:** low

### Story 1.6 — e2e coverage for the two untested read tools
**As a** maintainer, **I want** behavioral specs for `list_launchpad_campaigns` and
`list_manuscript_submissions`, **so that** the launchpad read surface has a regression net.
**Acceptance:** one spec per tool: auth-required (no/invalid token → `isError`), correct response
shape, shop-scoping (shop A's token can't see shop B's data).
**Risk:** low

## Sprint QA
- **api spec(s):** one per story (1.1 campaign lifecycle incl. every named error; 1.2 review
  state-machine + publish idempotency; 1.3 launchpad config round-trip + length rejection; 1.4
  manifest⇄dispatch parity in both directions; 1.5 title min/max rejection; 1.6 the two read tools).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **browser smoke owed:** none — every story here is fully automatable (no money, no new
  side-effecting external write).

## Sprint 1 — Smoke walkthrough
Fully covered by the deterministic gate + new e2e specs — no manual walkthrough owed. Once merged,
this directly unblocks `panfleto-premium-shop` Sprint 3's Daniel-actions #1 (launchpad opt-in via
MCP instead of the portal, if desired) — though the portal path stays available regardless.
