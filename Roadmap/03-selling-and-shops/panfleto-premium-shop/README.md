---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
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

| Sprint | Story | Risk |
|---|---|---|
| 1 | Placements sell through a platform-owned seller (config-addressable) | high |
| 1 | Old miyagiprints constant unreachable; existing orders + zine pipeline intact | high |
| 2 | Rename miyagiprints → panfleto (slug 301 + subdomain grant) | low |
| 2 | Full brand dress-up (theme, hero, collections, content pages, all copy) | low |
| 3 | The horror convocatoria — created, copy drafted, submission window open | med |
| 3 | Voting/excerpt launch plan + share surfaces (announcement, mschz link) | med |
| 4 | 2–3 new premium theme presets (incl. dark/editorial for panfleto) | low |

**Content bar (S2/S3, every word):** es-MX, simple, concrete, direct address. Banned: time-to-complete
promises; "esto nos recuerda…"-shaped wrap-ups; filler intensifiers. Draft copy lands in the sprint
doc for Daniel's read before it ships.

## Deploy order

Frontend-only expected throughout (placement ownership lives in the frontend's print-server layer +
Supabase/Medusa data, not backend code — verify in S1 planning; if a backend seller change is needed,
backend merges first and the frontend degrades gracefully). S1 **blocks** S2. S3 and S4 are
independent after S2.

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
