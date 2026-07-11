---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: panfleto-premium-shop
---

# Epic: Panfleto — the first premium shop

> **Area:** 03-selling-and-shops · **Risk:** high · **Scope seed:** [`00-ideas/seeds/panfleto-premium-shop.md`](../../00-ideas/seeds/panfleto-premium-shop.md)

## Why

miyagiprints becomes **panfleto** — the flagship premium shop and the first real audience for the
Bookshop Launchpad's publishing loop, opening with a call for horror stories from Mexican and Latin
American authors. Before the rename, the printed edition's ad placements (today hard-wired to the
miyagiprints seller) move to a platform/admin home, so the magazine's money path stops living inside a
merchant shop. Subdomain now; `panfleto.com.mx` later (Daniel sets DNS).

## Medusa-first note

Everything commerce-shaped is already Medusa-native: placements are Medusa products under a seller,
the rename is the shipped custom-slugs path, collections are Medusa Product Categories, launchpad
publishing mints Medusa digital products. **No new commerce primitives.** The only structural change
is *which* seller owns placement products (S1) — a data/ownership move, not a new model.

## What already exists (reuse, don't rebuild)

- `lib/print-server.ts` `getMiyagiprintsSellerId()` — the exact coupling S1 replaces with a
  platform-owned seller resolved from config, not a merchant-shop constant.
- Bookshop Launchpad end-to-end (`/convocatoria` intake, review queue, publish-as-digital, excerpts,
  `/v/[slug]` voting, threshold→coupon) — `launchpad.enabled` **ON since 2026-07-09**; the
  vote→coupon→redeem money smoke has never run live and becomes S3's walkthrough.
- Custom-slugs rename + 90-day 301 alias; subdomain SKU + admin grant; custom-domain SKU for later.
- Own-shop premium presentation: `theme_preset` (`lib/shop-settings/theme-presets.ts` +
  `[data-shop-preset]` CSS blocks, contrast-guarded by `e2e/theme-preset-contrast.spec.ts`), hero,
  announcement bar, collections, content pages — Storefront-as-Code + MCP parity throughout.
- Custom print products (sticker configurator) — stays functional on the renamed shop; catalog
  curation is a content call in S2.

## Scope — stories

| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | Placements sell through a platform-owned seller (config-addressable) | high | ✅ shipped + live |
| 1 | Old miyagiprints constant unreachable; existing orders + zine pipeline intact | high | ✅ shipped + live |
| 2 | Rename miyagiprints → panfleto (slug 301 + subdomain grant) | low | 🚧 built + QA'd; the two live actions are Daniel's (see sprint-2.md) |
| 2 | `create_collection` MCP tool (closes a real gap — collections were list-only) | low | 🚧 built + QA'd |
| 2 | Full brand dress-up (theme, hero, collections, content pages, all copy) | low | 🚧 copy drafted, awaiting Daniel's approval before execution |
| 3 | The horror convocatoria — created, copy drafted, submission window open | med | ⬜ not started |
| 3 | Voting/excerpt launch plan + share surfaces (announcement, mschz link) | med | ⬜ not started |
| 4 | 2–3 new premium theme presets (incl. dark/editorial for panfleto) | low | ⬜ not started |

**Sprint 1** (2026-07-11): backend PR [#81](https://github.com/danybgoode/medusa-bonsai-backend/pull/81)
(squash `3b252c1`) + frontend PR [#217](https://github.com/danybgoode/miyagisanchezcommerce/pull/217)
(squash `6c42c43`), both merged and live; cutover complete (`PLATFORM_SELLER_SLUG` →
`miyagi-plataforma` on both Cloud Run services). Details + smoke walkthrough: `sprint-1.md`. Owed:
Daniel's live money-step smoke (buy one real placement).

**Content bar (S2/S3, every word):** es-MX, simple, concrete, direct address. Banned: time-to-complete
promises; "esto nos recuerda…"-shaped wrap-ups; filler intensifiers. Draft copy lands in the sprint
doc for Daniel's read before it ships.

## Deploy order

S1 was frontend-only. **S2 is not** — closing the MCP `create_collection` gap (list-only before)
needs a small additive backend route (`internal/seller-collections`, mirrors
`internal/seller-products`); backend merges first, frontend (the MCP tool + rename/dress-up doc)
after. S1 **blocks** S2. S3 and S4 are independent after S2.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** carve-out recorded at grooming for S1 (ownership move, old path removed in the
      same change; `launchpad.enabled` already gates the S3 surface). Verify-only.
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
