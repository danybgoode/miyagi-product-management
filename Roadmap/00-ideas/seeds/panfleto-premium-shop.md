---
title: "Panfleto — the first premium shop (miyagiprints → panfleto.com.mx, launchpad live, horror convocatoria)"
slug: panfleto-premium-shop
status: scaffolded
area: "03"
type: feature
priority: wave-1
risk: high
epic: "03-selling-and-shops/panfleto-premium-shop"
build_order: null
updated: 2026-07-09
---

# Panfleto — the first premium shop

**As** the platform, **we want** miyagiprints reborn as **panfleto** — the flagship premium shop that
runs the wattpad-style publishing loop, opening with a horror-stories call for Mexican and Latin
American authors — **so that** the premium-shop tier has a living reference and the Bookshop Launchpad
machinery earns its first real audience.

## Decision (Daniel, 2026-07-09): rename/redress the existing miyagiprints shop
Same seller + Medusa entity; slug change (the shipped custom-slugs 90-day 301 alias covers old links);
subdomain now, `panfleto.com.mx` custom domain later (Daniel sets DNS; both SKUs + admin grants exist).

## Stage-2.5 bucket: mostly already-possible — one genuinely new story
The wattpad layer **is the shipped Bookshop Launchpad** (no-account manuscript intake at
`/convocatoria`, review queue, publish-as-digital, excerpts, voting → print-coupon) behind
`launchpad.enabled` — **ON since 2026-07-09**. Theming exists (`theme_preset` CSS-variable presets + hero + collections +
content pages, contrast-guarded). The genuinely new piece: **print-edition ad placements are
hard-wired to the miyagiprints seller** (`getMiyagiprintsSellerId()` in `lib/print-server.ts` — the
constant selling seller for every placement). That coupling must move to a platform/admin home
*before* the shop becomes panfleto, or the magazine's money path tags along into a fiction shop.

## What already exists (reuse, don't rebuild)
- Bookshop Launchpad end-to-end (flag ON; the vote→coupon→redeem money smoke hasn't run live yet —
  it becomes S3's walkthrough).
- Theme presets + hero + announcement bar + collections + content pages; Storefront-as-Code + MCP
  parity (the whole dress-up is agent-doable).
- Custom-slugs 301 alias; subdomain SKU + admin grant; custom-domain SKU for later.
- Custom print products (the sticker configurator) — stays functional on the renamed shop; whether the
  sticker catalog stays public or gets pruned into a collection is a content call at dress-up time.

## Scope boundary
**In:** placement rehoming; rename/redress; launchpad activation for panfleto; the horror convocatoria
with all content drafted; 2–3 new premium theme presets; subdomain.
**Out:** `panfleto.com.mx` DNS (Daniel, later — everything must render correctly on the subdomain in
the meantime); print-edition *feature* changes beyond rehoming; paid author royalties (the launchpad's
existing coupon/print unlock is the v1 reward loop).

## Sprint slicing
1. **S1 — rehome the printed edition to admin.** Placements sell through a platform-owned seller (or
   an admin-config key naming it) instead of the miyagiprints constant; existing placement orders and
   the zine pipeline keep working untouched. Risk: **HIGH** (print money path + the zine studio reads
   this data). QA: api spec on placement minting under the new home; zine-side read confirmed against
   a real edition. *Blocks S2.*
2. **S2 — rename + dress-up.** Slug → `panfleto`, brand/name/logo, theme preset, collections
   (Historias · Convocatorias · Stickers…), Acerca/FAQ/Políticas, subdomain grant. Risk: LOW (all
   shipped primitives). QA: e2e on 301 alias + white-label subdomain render.
3. **S3 — the horror convocatoria.** `launchpad.enabled` is already **ON** (Daniel, 2026-07-09) — the
   work is the launch itself: create the call (horror stories, Mexican/Latin American authors,
   submission window, excerpt + voting plan) with all copy drafted. The previously-owed
   vote→coupon→redeem money smoke still runs as this sprint's walkthrough — first live pass on the
   real shop. Risk: MED (first production use of a money-adjacent surface).
4. **S4 — premium theme presets.** 2–3 new contrast-guarded presets (one dark/editorial for panfleto
   itself), pickable + customizable per shop. Risk: LOW. QA: the existing preset-contrast spec extends.

## Content acceptance criteria (applies to every word in S2/S3)
es-MX, simple and concrete, direct address. **Banned:** time-to-complete promises; wrap-up sentences
of the "esto nos recuerda…" / "this is a reminder of…" shape; filler intensifiers; em-dash chains
standing in for structure. Every sentence earns its place or goes. Draft copy lands in the sprint doc
for Daniel's read before it ships.

## Kill-switch decision (risk: high — S1 money path)
The natural switch already exists: `launchpad.enabled` gates the whole S3 surface. For S1, **carve-out**
— the rehoming is a data/ownership move with the old path removed in the same change (two constant-
seller paths at once is the riskier state); reversal is `git revert` + the placement seller is
config-addressable afterward anyway.

## Smoke walkthrough owner: Daniel (buy a placement post-rehoming; open an old miyagiprints URL → 301; submit a horror manuscript on the subdomain; run one vote → coupon → redeem pass).
