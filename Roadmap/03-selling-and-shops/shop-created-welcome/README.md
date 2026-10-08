---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
phase: Verifying       # the executive ladder — Shaping | Locking architecture | Building | Verifying | In review | Shipped.
                     # WRITTEN at each cadence event, never inferred. Shipped = merged AND deployed.
slug: shop-created-welcome
title: "Shop-created welcome by market"
area: 03-selling-and-shops
risk: low
type: feature
sprints_total: 1
stories_total: 1   # the sum of every sprint's stories_total — keep it in step when a story is added
intent_match: null   # copied from the seed by scaffold-epic (intent-match); the reader at the lock may update it
quote_low_usd: 5    # ≈ API $ — copied from the seed's `quote:` by scaffold-epic (finops); null = not quoted, never 0
quote_high_usd: 40
quote_basis: "S, n=0, wide"
hypothesis: null   # the result record — copied from the seed by scaffold-epic; null = no target (never an error)
target_metric: null   # which number: a North Star input key (grounded) or free text (not grounded)
target_from: null   # from what, a number
target_to: null       # to what, a number
read_date: null       # YYYY-MM-DD; null = 30 days after shipping, derived by the extract and never written back
verdict: null        # proven | disproven | unclear — stamped by `node scripts/epic-read.mjs --epic <slug> --write`
verdict_actual: null
verdict_evidence: null   # https:// link · north-star:<input>@YYYY-MM-DD · ab:<experiment> (unclear: the reason)
verdict_at: null
flag_key: null   # the epic's flag, decided at groom Stage 6b and copied from the seed; null = no flag. The epic page shows its state
build_order: 8       # integer position in the ONE global build sequence — the SSOT once the epic
                     # exists (the seed's value is only a fallback). Fill it in at the betting
                     # table; plain integers, no "#2a" suffixes. See 00-ideas/README.md → Ordering.
---

# Epic: Shop-created welcome by market

> **Area:** 03-selling-and-shops · **Risk:** low · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/shop-created-welcome.md`](../../00-ideas/seeds/shop-created-welcome.md)
<!-- Class (above) is the Stage-2 classification: Feature, Spike, Bug, or Chore — see SKILL.md's
     Stage 2 table; sourced from scaffold-epic.mjs's --type flag (a fixed 4-value enum, not free
     text — a longer description belongs in the Why section below, not here; this comment never names
     that heading literally, so an edit anchored on it cannot land inside the comment).
     Optional: if this epic was ALSO tagged with an archetype at grooming (see spike-role-archetypes.md),
     append " · **Archetype:** <Prototyper|Builder|Sweeper|Grower|Maintainer>" after Class. Omit entirely
     for the Builder default — untagged is fine.
     Scope-seed link: always points at seeds/ — lifecycle lives in the seed's `status:` frontmatter, not
     in a folder path (see 00-ideas/README.md). If this epic was scaffolded from a doc that has no seeds/
     entry, link that doc instead and migrate it to seeds/ when convenient — don't fabricate a seeds/ file
     that doesn't exist. -->

## Why
A new shop owner should receive their shop link, a useful first step, and a short map of what they can do now in the language of the market where they opened the shop.

## Platform-first note
Medusa already stores the immutable operating market on the seller. Its returned seller record selects the email version. The existing app email transport and notification catalog carry delivery and previews.

## Architecture lock

- **D1.** Send only after a newly owned shop is created in either seller creation path; an existing seller response does not send.
- **D2.** Read `seller.metadata.operating_market` from Medusa. An invalid or absent market is an explicit unavailable state, never a locale-based guess.
- **D3.** Keep `lib/email.ts` as the production HTML source and use two unpublished Resend Templates for product-owner review. Resend idempotency uses the seller ID.

## What already exists (reuse, don't rebuild)
- `lib/ensure-shop.ts` and `app/api/sell/create/route.ts` create owned shops.
- `apps/backend/src/api/store/sellers/me/route.ts` persists `operating_market` and returns the seller.
- `lib/email.ts` provides the Resend transport, text-first layout, and support Reply-To.
- `lib/notifications/catalog.ts` and `fixtures.ts` provide admin sample sends.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | S1 Market-aware shop welcome | low |

## Deploy order
The current backend already stamps the seller market. Merge and deploy the frontend branch, then create one MX and one US test shop through a controlled account and check the received version. The dashboard drafts require no publishing because the app sends code-rendered HTML.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated — `node scripts/owed-ledger.mjs` counts what is still owed)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (only if one was planned at grooming — Stage 6b):** the flag slice shipped, the flag
      exists **in Golden Frijoles, in every env**, with the stated polarity, **and is ACTIVATED there** —
      `gf flags get <key>` must not print `—` in its PRODUCTION row. Creating a definition is not
      turning it on, and a flag that is synced but never activated serves compile-time defaults while
      every dashboard says it exists. *Verify-only — not a new gate; whether a high-risk epic needs one
      is decided at grooming, not here.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
