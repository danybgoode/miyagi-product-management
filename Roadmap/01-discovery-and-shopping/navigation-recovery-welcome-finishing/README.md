---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
phase: Verifying       # the executive ladder — Shaping | Locking architecture | Building | Verifying | In review | Shipped.
                     # WRITTEN at each cadence event, never inferred. Shipped = merged AND deployed.
slug: navigation-recovery-welcome-finishing
title: "Navigation, recovery, and welcome finishing"
area: 01-discovery-and-shopping
risk: low
type: bug
sprints_total: 1
stories_total: 3   # the sum of every sprint's stories_total — keep it in step when a story is added
intent_match: 86   # copied from the seed by scaffold-epic (intent-match); the reader at the lock may update it
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
build_order: 7       # integer position in the ONE global build sequence — the SSOT once the epic
                     # exists (the seed's value is only a fallback). Fill it in at the betting
                     # table; plain integers, no "#2a" suffixes. See 00-ideas/README.md → Ordering.
---

# Epic: Navigation, recovery, and welcome finishing

> **Area:** 01-discovery-and-shopping · **Risk:** low · **Class:** Bug · **Scope seed:** [`00-ideas/seeds/navigation-recovery-welcome-finishing.md`](../../00-ideas/seeds/navigation-recovery-welcome-finishing.md)
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
Buyers should find their account actions where they opened the menu, recover from a missing or failed page, and recognize the shop named in their claim confirmation. The general account welcome remains the approved message.

## Platform-first note
The work reuses the existing native popover, Next error conventions, Clerk and claim event hooks, and code-rendered Resend email transport. No new data model or flag is required.

## Architecture lock

- **D1.** Clear the native popover's opposing insets and auto margins while keeping CSS anchor placement and the non-anchor fallback. The existing `CuentaMenu` remains the one account menu.
- **D2.** Share one recovery UI between 404, route errors and root-layout errors. Keep it channel-safe and point browsing to the canonical platform origin so it works from merchant domains.
- **D3.** Keep `lib/email.ts` as the send source. Change only the MX shop-claimed headline, with HTML escaping in code and `SHOP_NAME` in the unpublished Resend review draft. Leave new-account copy unchanged.

## What already exists (reuse, don't rebuild)
- `app/components/CuentaMenu.tsx` and `app/globals.css` own the account popover.
- `app/not-found.tsx`, `lib/contact.ts`, and `lib/shortlink.ts` provide the recovery entry, contact address, and canonical platform origin.
- `lib/email.ts`, `app/api/webhooks/clerk/route.ts`, and `app/api/claim/complete/route.ts` implement the two welcome sends on the existing feature branch. `campaigns/claim-shop-2026-10/README.md` links their review drafts.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Account menu placement; recovery pages; MX claim welcome headline | low |

## Deploy order
The existing claim feature branch has backend and frontend changes. The backend's `newly_claimed` response must deploy before the frontend first-transfer email trigger is live. This polish changes only the frontend and the unpublished Resend draft; merge it with the frontend claim branch after its full gate, then confirm the Cloud Build production deploy.

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
