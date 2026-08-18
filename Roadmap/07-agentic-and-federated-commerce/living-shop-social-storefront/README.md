---
status: shipped
slug: living-shop-social-storefront
---

# Epic: Living Shop — social storefront + expressive customization

> **Area:** 07 · Agentic & Federated Commerce · **Appetite:** XL (product-owner decision, 2026-08-18) · **Risk:** MIXED, mostly LOW-MED; S1 has a shared-live Supabase migration · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/living-shop-social-storefront.md`](../../00-ideas/seeds/living-shop-social-storefront.md)

**Tagline:** *Tu tienda no parece una plantilla: se siente habitada por ti.*

## Why

Miyagi Sánchez already gives every seller a real owned shop: full commerce on marketplace, subdomain and custom domain; white-label routing; collections; content pages; announcement/hero; brand controls; theme presets; Storefront-as-Code and agent configuration. What it does not yet give them is the quality that made early social profile pages compelling: **a place that feels alive and unmistakably personal**.

This epic makes the seller's **Wall** the own-shop homepage narrative and lets commerce live inside it. A seller can publish a note, feature a product, tell a story around a collection or invite buyers to an event. They can choose the canonical Default look, an intentionally nostalgic Retro Social look, or a powerful schema-driven Custom recipe. Miyagi Sánchez controls the interaction grammar and section vocabulary so every shop remains understandable, accessible and commerce-capable.

## Product decisions already made

1. **The Wall is the homepage**, not an optional social tab.
2. **Wall kinds = Post · Product · Collection · Event.** No arbitrary block library.
3. **Controlled shop sections = Wall · Shop · Collections · Events · About · FAQ · Policies.** No custom pages in this epic.
4. **Theme modes = Default · Retro Social · Custom.** Custom is schema/no-code, never arbitrary CSS/HTML/JS.
5. **Legacy presets remain valid.** `papel/pizarra/lienzo/terracota` must migrate or resolve compatibly.
6. **Presentation stays in shop settings; commerce stays in Medusa; merchant Wall content gets a dedicated Supabase table.** References, never duplicated product/event truth.
7. **All own-shop channels get the same experience** (`/s/`, subdomain, custom domain). Embed remains compact/product-first.
8. **No comments, reactions, follows or buyer posts** in this epic.
9. **No new feature flag.** Additive capability, current operating posture.

## What already exists — reuse, don't rebuild

- `app/(shell)/s/[slug]/page.tsx` + market wrappers, `ChannelLayout`, custom/subdomain headers and white-label routing.
- `settings.theme`, `announcement`, `hero`, `theme_preset`, `about`, `faq` in `lib/shop-settings/types.ts`.
- `lib/shop-settings/theme-presets.ts` + `[data-shop-preset]` CSS-variable pattern + contrast/design-token guards.
- seller collections and `/c/[collection]` pages backed by Medusa-native collections.
- free seller events (`marketplace_events`) + paid event/product rails.
- R2 seller upload route.
- settings importer + MCP `get/patch_store_configuration`.
- `/vecindario` social-card/rendering precedents, but **not its moderation model**: a seller owns their own Wall.
- shop-settings anti-monolith guard; do not dump this capability back into `Diseno.tsx`.

## Sprint map

| Sprint | Capability | Risk |
|---|---|---|
| [1](./sprint-1.md) | Wall foundation: persistence, seller CRUD, scheduling/pinning, object references | MED |
| [2](./sprint-2.md) | Living homepage: public Wall + Default theme + native commerce/event cards | LOW-MED |
| [3](./sprint-3.md) | Controlled shop IA: sections, nav, Events index, section configuration | LOW-MED |
| [4](./sprint-4.md) | Theme engine v2: Default / Retro Social / Custom schema + legacy compatibility | MED |
| [5](./sprint-5.md) | Seller studio: Wall + Sections + Theme + Brand + responsive live preview | MED |
| [6](./sprint-6.md) | Agent/config parity: Storefront-as-Code, MCP Wall tools, public agent representation | LOW-MED |
| [7](./sprint-7.md) | Cross-channel finish: SEO, accessibility, performance, edge states, dogfood | MED |

## Architecture boundaries

### Wall content
Proposed `shop_wall_entries` Supabase table, shop-scoped and seller-authored. It stores publication semantics, body/media and a typed reference. Product price/inventory, collection membership and event details are always resolved from their canonical systems.

### Shop presentation
A typed presentation schema under `metadata.settings` owns `theme_mode`, `theme_recipe` and `sections`. The renderer resolves those settings to data attributes/CSS variables. Invalid or absent values fail safely to Default.

### Public rendering
The homepage becomes a composition surface, not a free-form layout engine. Theme controls **how** approved modules render; section config controls **which approved destinations** exist and in what nav order.

## Architecture decisions — locked by the architect before any builder started (2026-08-18)

Read against the live code and the live Supabase database, not against the scope doc. Builders **cite**
these; they never re-derive them. Where a decision corrects a scaffolded premise, the correction is
stated out loud.

**D1 · `shop_wall_entries` is a new, empty table — so its constraints are strict from birth.**
`select count(*) from information_schema.tables where table_name='shop_wall_entries'` = 0. Nothing to
migrate, nothing to grandfather. CHECK constraints, the reference/kind pairing rule and the partial
unique pin index all go in the first migration, because the free window for a strict schema is exactly
now. Columns are the scope seed's list verbatim. **The orchestrator applies it (Supabase MCP
`apply_migration`), realigns `supabase_migrations.schema_migrations` to the filename, and verifies live
BEFORE the code that reads it merges.** Never `supabase db push`.

**D2 · The ownership boundary is the service layer, and `shop_id` is never read from the request body.**
This app talks to Supabase through one service-role client (`lib/supabase.ts`), which bypasses RLS by
construction — so an RLS policy here would be decorative, not a control. Every seller write resolves
the shop from `clerk_user_id` server-side (`select id from marketplace_shops where clerk_user_id = ?`)
and uses that id; the body may not name a shop. RLS is still enabled with a deny-all default (the
`notification_log` convention, the only marketplace table that has it) so a future anon/authed client
cannot reach the table by accident — defence in depth, explicitly *not* the boundary.

**D3 · A reference is ownership-checked at WRITE and re-resolved at READ.** The write refuses a
product/collection/event that does not belong to the caller's shop; the public read resolves the
canonical object again and omits the card when it is gone, unpublished or foreign. Both checks name the
**same identifier the render consumes** (`reference_id`), which is the failure mode
`an-admission-proof-must-match-what-is-consumed` records: a check on one id and an effect on another is
decoration.

**D4 · Presentation lives in `metadata.settings`, written through the existing PATCH deep-merge.**
`settings.theme_mode`, `settings.theme_recipe`, `settings.sections` are siblings of the shipped
`theme`, `announcement`, `hero`, `about`, `faq`, `theme_preset` keys. `PATCH /api/sell/shop`
deep-merges (`route.ts:303`), so writing one block preserves every sibling. One new pure module,
`lib/shop-presentation/`, owns the schema, the normalizer and the resolver; the route validates through
it and never hand-rolls a second copy of the rules.

**D5 · Legacy presets are mapped at READ time. There is NO backfill.** Supabase counts: `papel` 1
(`panfleto`), `pizarra` 1 (`champions-not`), `terracota` 1 (`autos-demo-miyagi-sanchez`), `lienzo` 0,
none 27.

> ⚠️ **CORRECTED AT LIVE VERIFICATION (2026-08-19).** Those are the counts in
> `marketplace_shops` — who *chose* a preset. The public shop page reads its settings from the
> **Medusa seller**, and only **one** of the three (`champions-not`) has `theme_preset` there.
> `panfleto` and `autos-demo-miyagi-sanchez` have been rendering *without* their chosen preset since
> before this epic — a pre-existing divergence between the two stores, not something this epic
> caused or changed. It makes D5 more right, not less: a backfill would have been even emptier. The
> premise as written ("three live shops") was true of the table and false of the storefront, which is
> exactly the distinction `LEARNINGS.md` keeps recording. A data migration over three rows buys nothing and risks the one thing S4.2 forbids — a silent
visual reset. Instead: `theme_preset` stays persisted and untouched, the `[data-shop-preset]` CSS blocks
in `globals.css` stay exactly as they are, and the resolver treats a shop with a legacy preset and no
`theme_mode` as *Custom, pinned to that preset's compatibility recipe*. Choosing a new mode in the UI is
the only thing that ever overwrites it. Reversible by definition, because nothing was written.

**D6 · No middleware change. Verified, not assumed.** S3 asks to disprove this before editing
`middleware.ts`. Both owned-host branches (subdomain, `middleware.ts:168`; custom domain, `:315`) end in
`NextResponse.next({ request: { headers } })` for every path except `/` and `/convocatoria`, which are
rewritten. So a new root route that reads `x-miyagi-shop-slug` already serves on both owned hosts with
zero middleware work — exactly how `/acerca`, `/faq`, `/politicas` and `/c/[collection]` already work.
New root routes this epic adds: `/tienda` (Shop index) and `/eventos` (Events index). `middleware.ts`
is not edited.

**D7 · PREMISE CORRECTED — the events primitive exists and holds ZERO rows.**
`select count(*) from marketplace_events` = 0, upcoming = 0. S2.4 and S3.4 are buildable against a real
primitive (`lib/events.ts`, `lib/events-types.ts`, `/api/sell/events`), but nothing renders until an
event exists, and the S3.4 "hide the section when there are no public events" branch is therefore the
*only* branch a live smoke can currently observe. The S7 dogfood must **create a real event** on the
dogfood shop or state the gap by name. Do not write a fixture-only Events index to make a screenshot.

**D8 · The seller studio is a NEW guarded root, not more `Diseno.tsx`.** New surface at
`/shop/manage/tienda` with its own directory, added to `lib/shop-settings/monolith-guard.ts` as a third
guarded root beside `SETTINGS_DIR` and `CANAL_PROPIO_DIR` — otherwise it grows unguarded, which is the
exact failure `CanalPropioClient.tsx` already had once (977 lines before re-extraction). The **Brand**
tab **mounts the existing `Diseno` component**; it does not copy its persistence. `Diseno.tsx` itself is
not deleted and its route keeps working.

**D9 · No new feature flag.** Product owner scoped none; operating posture is no-flag-by-default. Ships
enabled, reverted with `git revert` if wrong.

**D10 · Wall media reuses `/api/sell/upload` (R2, 8 MB cap, JPEG/PNG/WEBP/GIF/AVIF).** No new upload
route, no remote-URL fetch — an agent may only attach a URL this platform already issued.

**D11 · A recipe resolves to CSS custom properties through a typed resolver. No seller string reaches
markup.** Colors are validated to `#rrggbb`, every other axis is a closed enum, and the output is a
`data-shop-theme` attribute plus a fixed set of `--shop-*` variables — the pattern the shipped presets
already use. There is no field that can carry CSS, HTML, JS or a font URL, and the absence is asserted
by a spec over the schema, not by a comment.

**D12 · The agent surface consumes the SAME validator as the human API.** MCP Wall tools and
`patch_store_configuration` call the identical pure normalizer; if they diverge, the schema has forked
and one of the two is wrong. Public agent reads expose published-and-effective entries only.

### Model routing

The whole run is orchestrated and built by one Opus session. S1 (the migration + the ownership
boundary) and S4 (the resolver every later sprint imports) are the contract-defining sprints and stay on
the strong model end-to-end; nothing is delegated to a workhorse pool in this run.

### Risk tier per PR

S1 LOW (schema addition + authenticated seller routes, no money path) · S2 LOW · S3 LOW · S4 LOW ·
S5 LOW · S6 LOW · S7 LOW. **No sprint touches Stripe, checkout, capture, refund or an authorization
boundary that money depends on**, so per *Review & merge* the deterministic gate is the gate and no
cross-family pass is required. The seller-ownership boundary in S1/S6 is an authorization boundary in
the ordinary sense; it gets its own foreign-shop refusal specs rather than a review pass.

## Deploy / build order

S1 → S2 → S3 → S4 → S5 → S6 → S7.

- S1 migration first, then CRUD route/UI shell. Product owner applies the shared-live migration.
- S2 consumes the Wall foundation; no fake fixture-only Wall implementation should ship first.
- S3 establishes the controlled IA before the Custom editor exposes ordering controls.
- S4 establishes the typed theme resolver before S5 builds the no-code editor against it.
- S6 follows the stable human schemas so agent tools do not fossilize an interim shape.
- S7 hardens the complete surface and dogfoods one Default, one Retro Social and one Custom shop configuration.

## Definition of Done (epic)

- [x] All seven sprints merged to `main` and smoke-tested; any environment/account gap stated by name.
      Storefront PR [#391](https://github.com/danybgoode/miyagisanchezcommerce/pull/391) → `02804ba`.
- [x] Each sprint file has its fool-proof production smoke walkthrough with one action + expected
      result per step; every authed step is marked **OWED (Daniel)** by name.
- [x] Marketplace `/s/`, free subdomain and custom-domain own-shop surfaces have parity; the embed is
      intentionally unchanged, and that exclusion is asserted by a spec rather than left to memory.
- [x] Legacy theme presets round-trip without visual reset — at READ time, with no backfill (D5).
- [x] Wall never duplicates mutable commerce truth and cannot write across shop ownership boundaries.
- [x] Custom mode exposes no arbitrary CSS/HTML/JS/webfont escape hatch — asserted over the schema.
- [x] New browser/API specs were observed red at least once; the deterministic gate is green.
      Two specs SURVIVED their mutation and were rewritten (see `RETROSPECTIVE.md`).
- [x] `RETROSPECTIVE.md` written; four durable learnings promoted to `LEARNINGS.md`.
- [x] Product poster and team memory updated.
- [x] This README frontmatter moved `scaffolded → in-progress → shipped`; generated build-order
      refreshed, never hand-edited.

### Still owed to Daniel — not gates, but not done either

- The **authed seller walkthrough** (local Clerk is `pk_test_`, production is `pk_live_`).
- The **authed cross-shop reference refusal** with two real shops.
- 🚨 **One real event.** `marketplace_events` holds ZERO rows platform-wide, so the Events section
  never renders for any shop and its 404 is correct rather than a bug.
- The **three-way visual dogfood** across shops that have catalogs. Deliberately not done unattended:
  the platform's own demo shops have no products, and publishing Wall content onto a real merchant's
  live storefront is not the builder's call. `prueba` carries a seeded Wall + Retro Social instead.
