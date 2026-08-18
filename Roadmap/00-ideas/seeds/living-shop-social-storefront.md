---
title: "Living Shop — social storefront + expressive customization"
slug: living-shop-social-storefront
status: scaffolded
area: "07"
type: feature
priority: null
risk: medium
epic: "07-agentic-and-federated-commerce/living-shop-social-storefront"
build_order: null
updated: 2026-08-18
---

# Scope — Living Shop: social storefront + expressive customization

> **Status: SCAFFOLDED (2026-08-18).** Product owner set **Appetite: XL** and asked for the capability to be fully scaffolded. This scope is the end-state capability, not a pilot/MVP ladder. It evolves the shipped own-shop presentation system into a living merchant-owned social-commerce storefront across marketplace `/s/`, free subdomain and custom-domain channels. No new feature flag requested.

## The ask, mirrored back

A merchant's own shop should feel like a place they inhabit, not a branded product grid. The front page becomes a **Wall**: a merchant-owned chronological narrative where ordinary posts, products, collections and events can live together. The seller can choose a designed **Default** theme, a deliberately nostalgic **Retro Social** theme inspired by MySpace/Hi5, or **Custom**, which exposes substantial no-code visual control through a safe schema rather than arbitrary HTML/CSS.

The experience must remain Miyagi Sánchez commerce: products, checkout, offers, trust, collections, events, agent access and channel routing keep working. The seller gets expressive control over presentation and emphasis; Miyagi Sánchez keeps control of the information architecture and interaction grammar.

## Outcome

A seller can make their own shop feel recognizably theirs—social, current and expressive—without becoming a web designer, while a buyer can still immediately understand who the merchant is, what is happening now and what they can buy or do.

## Baseline

The own-shop platform is already deep:

- full shop routing on marketplace, subdomain and custom domain;
- white-label channel shell and per-shop SEO/canonical handling;
- announcement bar, hero, seller collections and collection pages;
- About, FAQ and Policies content pages;
- logo, banner, tagline, social links and accent color;
- five curated visual presets (`default`, `papel`, `pizarra`, `lienzo`, `terracota`);
- schema-backed settings import plus MCP `get/patch_store_configuration` parity;
- seller-created free events in Supabase and paid products/events in commerce;
- Neighborhood Pulse read-only social/community primitives.

The missing capability is not “custom storefront plumbing.” It is a **living homepage content model + controlled shop IA + expressive design system + seller authoring/editor experience**.

## Appetite

**XL — explicit product-owner decision, 2026-08-18.** Spend the work needed to scaffold and build the complete capability coherently. Slice by capability boundary so each sprint leaves durable final-product architecture; do not create test themes, pilot walls or temporary builders that are thrown away later.

## Content strategy

Every shop homepage should answer three questions quickly:

1. **Who are you?** Merchant identity: name, avatar/logo, tagline, location, social links and trust/fulfillment signals.
2. **What is happening here?** The Wall: current notes, releases, collections and events in a merchant-controlled chronology.
3. **What can I do or buy?** Commerce actions embedded directly inside Wall entries plus persistent access to Shop/Collections.

### Wall grammar

The Wall has exactly four public entry kinds in this epic:

| Kind | Seller intent | Canonical source | Wall stores |
|---|---|---|---|
| **Post** | Say/show something | Wall row itself | body + optional uploaded media |
| **Product** | Feature or announce an item | Medusa product/listing | reference id + optional seller note |
| **Collection** | Tell a story around a group | Medusa collection | collection reference + optional seller note |
| **Event** | Invite people somewhere | existing event primitive | event reference + optional seller note |

The Wall never copies product price/availability, collection membership or event details into its own persistence. Public rendering resolves the referenced canonical object at read time; missing/unpublished references disappear safely rather than becoming stale ghosts.

### Publishing semantics

- Entries are seller-owned and shop-scoped.
- States: `draft`, `published`, `scheduled`.
- A seller can edit, unpublish and delete their own entry.
- Exactly one entry may be pinned at the top at a time; pinning changes prominence, not chronology.
- Scheduled publication uses an explicit timezone-aware timestamp; no server-local `datetime-local` ambiguity.
- No comments, likes, reactions, reposts, public follower graph or buyer-created wall posts in this epic.
- Product/collection/event entries can be created from the Wall composer and from contextual “Share to Wall” actions on the seller's existing management surfaces.

## Controlled shop information architecture

The seller does **not** create arbitrary pages. The allowed top-level sections are:

1. **Wall** — required homepage; cannot be removed.
2. **Shop** — all sellable catalog items; required; cannot be removed.
3. **Collections** — shown when the seller has at least one public collection; seller may hide it from nav without deleting collections.
4. **Events** — shown when the seller has at least one public/upcoming event; seller may hide it from nav.
5. **About** — shown only when authored and enabled.
6. **FAQ** — shown only when authored and enabled.
7. **Policies** — shown only when a real policy is derivable from existing settings and enabled.

Seller controls for optional sections: visible/hidden, nav label from a small approved synonym set where useful, and order after the required Wall/Shop anchors. No arbitrary URL slug, arbitrary custom page or nested page tree.

## Theme strategy

The public picker becomes three **theme modes**:

### 1. Default
The canonical Miyagi Sánchez owned-shop language: restrained, product-forward and familiar. It inherits the seller's existing brand assets/accent. This is the safest/default mode.

### 2. Retro Social
A deliberate early-social-web interpretation: more framed modules, profile-like identity rail, expressive borders/surfaces, compact “currently” modules and a visibly personal Wall. Nostalgia is visual—not functional regression. Navigation, forms, checkout, responsive behavior, semantics and accessibility remain modern.

### 3. Custom
A schema-driven design recipe. No arbitrary CSS, HTML, JavaScript, external font URLs or raw template editing.

Initial customization axes:

- typography family from approved stacks;
- heading/body pairing;
- page density (`compact | balanced | airy`);
- corner language (`square | soft | round`);
- surface style (`flat | bordered | elevated`);
- background treatment from approved patterns/tones;
- accent + secondary accent using validated colors;
- hero treatment (`none | compact | feature`), reusing existing hero content;
- Wall layout (`single | feed-sidebar`) where viewport allows;
- Wall card treatment (`quiet | framed | editorial`);
- product card treatment from approved variants;
- identity-module prominence;
- section ordering/visibility via the controlled IA.

All recipes resolve to CSS variables/data attributes through a typed schema and must pass contrast/token guards.

### Legacy preset compatibility

The existing `papel`, `pizarra`, `lienzo` and `terracota` values are shipped state and cannot simply become invalid. The new resolver must accept them and deterministically map each to an equivalent Custom recipe (or retain a legacy render adapter) so existing shops do not visually reset. The seller UI presents the new three-mode model; old persisted values migrate/round-trip safely.

## Architecture / reuse — Medusa/platform first

### Reuse unchanged
- `app/(shell)/s/[slug]/page.tsx` and market wrappers as the owned-shop homepage entry.
- `ChannelLayout` + root channel detection for subdomain/custom white-label parity.
- Medusa products and collections remain commerce SSOT.
- `marketplace_events` remains the free-event SSOT; paid event products remain commerce-owned.
- R2 `/api/sell/upload` for seller-owned Wall media.
- `lib/shop-settings/types.ts`, settings taxonomy, importer and MCP config machinery for presentation recipe + section config.
- design-token audit, contrast helpers and shop preset CSS-variable pattern.
- existing About/FAQ/Policies routes and collection routes; evolve, don't fork.
- live-smoke + Playwright api/browser rails; every browser-testable story adds/extends a spec.

### New persistence
A dedicated non-commerce Supabase table (proposed `shop_wall_entries`) owns merchant-authored Wall publication state. Minimum columns:

- `id uuid pk`
- `shop_id uuid not null references marketplace_shops(id) on delete cascade`
- `kind text check (post, product, collection, event)`
- `status text check (draft, published, scheduled)`
- `body text null`
- `media jsonb not null default []` (bounded uploaded URLs + alt text; post-only initially)
- `reference_id text null`
- `published_at timestamptz null`
- `scheduled_for timestamptz null`
- `pinned boolean not null default false`
- `created_by text not null`
- timestamps

Constraints/indexes enforce the grammar: reference required for product/collection/event and absent for post; one pinned published/scheduled entry per shop via partial unique index; publication/order indexes by `shop_id` + effective timestamp. RLS/service-layer ownership must prevent cross-shop writes.

## UX/UI strategy

### Buyer homepage anatomy

1. optional announcement bar;
2. shop identity/header + controlled nav;
3. optional hero (seller may use it as a brand statement, but Wall remains primary content);
4. Wall with pinned entry then reverse-chronological entries;
5. theme-dependent supporting rail containing identity/trust, collections or next event—never a generic widget sandbox;
6. terminal commerce/section CTA where useful.

Product, collection and event entries render as native commerce/content cards inside the Wall. The buyer never has to decode whether an object is “social” or “commerce”; the affordance is the object itself.

### Seller authoring

Create a dedicated **Tienda → Apariencia y contenido** experience rather than continuing to inflate the current `Diseno.tsx` section. The existing anti-monolith guard makes this a product and engineering constraint.

Suggested seller IA:

- **Wall** — compose, schedule, pin, reorder only via pin/chronology, edit/unpublish; contextual object picker.
- **Sections** — control visibility/order of the approved IA.
- **Theme** — choose Default / Retro Social / Custom and edit Custom recipe.
- **Brand** — existing logo/banner/tagline/social/accent controls, moved/reused rather than duplicated.
- **Preview** — responsive live preview with Desktop/Mobile toggles and a direct “View live shop” path.

The editor is form/schema driven, not a canvas page builder. Changes have immediate preview and explicit Save/Publish semantics; the public shop never renders unsaved local state.

## In scope

- Wall persistence, seller CRUD, scheduling, pinning and media.
- Wall public rendering with Post/Product/Collection/Event entries.
- contextual Share-to-Wall from product/collection/event management.
- controlled section/nav system and shop-level public Events index.
- new three-mode theme architecture with legacy compatibility.
- Custom no-code recipe schema + editor.
- Default and Retro Social finished themes, responsive and accessible.
- seller content/theme management IA and live responsive preview.
- marketplace/subdomain/custom-domain parity; embed remains compact and does not gain the Wall in this epic.
- Storefront-as-Code settings parity and seller MCP parity for presentation + Wall CRUD/read tools.
- UCP/public agent read representation of Wall/sections where appropriate.
- SEO/metadata/sitemap treatment for controlled sections and public Wall content.
- accessibility, performance, empty/error states, deterministic/browser QA and flagship dogfood.

## Explicitly out of scope

- buyer comments/replies on Wall entries;
- likes/reactions/reposts;
- follower graph or notifications for new Wall posts;
- buyer-authored merchant Wall content;
- direct messages changes;
- arbitrary custom pages, nested menus or arbitrary CMS blocks;
- merchant-written CSS/HTML/JS;
- arbitrary webfont URLs or third-party scripts/widgets;
- a drag-anything-anywhere canvas editor;
- changing checkout/payment mechanics;
- turning `/vecindario` into a personalized social network;
- embed Wall rendering (compact embed stays product-oriented).

## Risks and decisions

- **Migration / live data: MED.** New Supabase table and any backfill/mapping for legacy theme values must be additive/reversible where possible; product owner applies shared-live migrations per repo rules.
- **Cross-channel routing: LOW-MED.** Reuse existing relative routes and channel headers; no new middleware shape should be necessary unless Events index reveals a missing pass-through—disprove at build before editing middleware.
- **Theme entropy: MED product risk.** The typed recipe is the guardrail. No arbitrary style escape hatch.
- **Performance: MED.** A Wall can become media-heavy. Define image limits, lazy loading and bounded initial page size; paginate/load-more rather than rendering an unbounded history.
- **Stale references: LOW.** Wall entries dereference canonical commerce/event data and hide unavailable references; they do not snapshot money/inventory.
- **No flag.** Product owner asked for the capability, not a runtime rollout switch; current operating posture defaults to no new flag.

## Definition of Ready

- [x] Outcome, baseline and XL appetite are explicit.
- [x] Existing own-shop, theme, collection, event and Neighborhood primitives were code-read before shaping.
- [x] Content grammar is fixed to Post / Product / Collection / Event.
- [x] Shop IA is constrained to Wall / Shop / Collections / Events / About / FAQ / Policies.
- [x] Theme model is fixed to Default / Retro Social / Custom, with legacy preset compatibility named.
- [x] Presentation, commerce and social-content persistence homes are separated.
- [x] In/out boundaries prevent accidental CMS/social-network expansion.
- [x] Seven capability-boundary sprints are scaffolded with testable user stories, acceptance and smoke paths.
- [x] No new feature flag is requested.
