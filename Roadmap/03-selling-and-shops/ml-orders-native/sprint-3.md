# Sprint 3 — Workflow: tags, bulk actions, agent parity

> Epic: [ml-orders-native](README.md) · Risk: **MED/LOW** · Mostly frontend; flag-flip candidacy after
> this sprint's smokes are green.

## Stories

### US-7 · Order tags: manual CRUD + automatic source tag — low
**As a** seller, **I want** to tag orders (and have ML orders auto-tagged by source), **so that** I can
organize fulfillment my way.
Tags on the Medusa order (metadata/module field — sprint plan decides); the automatic tag is the thin
automation slice (rule builder is explicitly OUT, v2 seed).
**Acceptance:** create/remove a tag on any order; every materialized ML order arrives with the source tag;
tags filter the list.

### US-8 · Bulk select + bulk fulfillment-status actions — med
**As a** seller, **I want** to select several orders and advance their status in one action, **so that**
batch days go fast.
House components; server-side validation per order (an ineligible order is skipped + reported, never
silently forced).
**Acceptance:** select 3 orders → bulk mark shipped → each eligible order advances, ineligible ones report
why; works with mixed ML + native selections.

### US-9 · Agent-surface parity — low
**As a** seller's AI agent, **I want** ML-sourced orders in the same MCP order reads, **so that** the
agent operates the whole business (AGENTS rule #3).
Verify-not-build: existing seller MCP order tools return ML orders with channel attribution; UCP manifest
stays accurate.
**Acceptance:** MCP order list for a test shop includes the sandbox ML order with its channel/tag; manifest
diff clean.

## Sprint QA

- Api specs: tag derivation fn (US-7), bulk-action eligibility fn (US-8), MCP order-read shape (US-9).
- **Owed to Daniel:** the flag-flip decision + a real batch-day walkthrough (tags + bulk ship on live data).

## Sprint 3 — Smoke walkthrough (do these in order)

_Placeholder — written by the building agent before sprint close (real URLs; money/auth steps flagged
**owed to Daniel**)._
