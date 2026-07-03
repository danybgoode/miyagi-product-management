---
status: readyforscope
slug: own-shop-premium-presentation
macro: 07-agentic-and-federated-commerce
class: feature
archetype: Grower
risk: MIXED — S2 HIGH (Medusa collections + middleware pass-through, shared infra); S1/S3 LOW-MED
---

# Own-shop premium presentation — "stepping into StickerJunkie"

> Scoped 2026-07-03 from the `1. raw` seed (split out of the `custom-print-products` groom; 4 open
> decisions resolved same-day — see *Decisions*). Sibling of shipped epics `own-shop-experience`,
> `custom-domain-polish`, `cross-channel-trust-parity`. Flagship shop: **miyagiprints**.

**Tagline:** *Tu tienda se siente como TU tienda — portada, secciones y páginas propias, en tu dominio y en el marketplace.*

## Overview — As a / I want / so that

**As a seller (any tier, any channel)**, I want my storefront to have a hero, an announcement bar,
navigable collections, real content pages (Acerca / FAQ / Políticas), and a curated theme — **so
that** a visitor on `miyagiprints.miyagisanchez.com` feels they walked into a real brand's store,
not a marketplace profile row.

**As a buyer**, I want to browse a shop by its own sections (die-cut, zines, flyers…) and read who
the shop is and how it works — **so that** I trust it enough to order custom work.

**As a seller's AI agent**, I want the whole presentation configurable through the existing config
surface — **so that** "dale un look premium a mi tienda" is one MCP call away (AGENTS rule #3).

## Stage-2.5 bucket — mostly genuinely new presentation on heavy existing plumbing

- **Already possible today (don't rebuild):** banner image + logo (Perfil), accent color + tagline +
  socials (Diseño), contact chips, trust/payment chips, white-label shell on all channels
  (`ChannelLayout` + root-layout channel detection), Storefront-as-Code + MCP
  `get/patch_store_configuration`, per-host robots/sitemap/canonical, seasonal-theme contrast
  guardrails + raw-color CI guard.
- **Genuinely new:** in-shop collections + nav + collection pages; hero/featured section;
  announcement bar; content pages rendered on the storefront; curated theme presets.
- **Explicitly out → seeded separately:** shop reviews / social proof primitive
  (`1. raw/shop-reviews-social-proof.md`).

## Decisions (resolved with Daniel, 2026-07-03)

1. **v1 blocks = collections + in-shop nav · hero + announcement bar · content pages.** Reviews are
   a separate future groom (new order-verified primitive; the storefront leaves a designed-in slot).
2. **Free for every shop, every channel** — mission-aligned; marketplace `/s/` pages get the
   upgrade too. Paid SKUs keep selling the address, not the look.
3. **Theming = curated presets** (font pairing + surface tones) on top of accent + banner, with the
   seasonal-theme-engine contrast guardrails. No free-form font/palette controls in v1.
4. Scope of channels: marketplace `/s/`, subdomain, custom domain. **Embed keeps today's flat grid**
   (its job is compactness); revisit post-v1.

## Medusa-first reframe (the step that shrinks it)

- **Collections are a native Medusa primitive** (Product Collections / Categories). Per-shop scoping
  via collection `metadata.shop_slug` (or category tree per seller — build plan confirms which reads
  cleaner through the marketplace plugin). **No Supabase table for grouping products** (rule #1/#2).
- **Hero, announcement bar, content pages, theme preset** are presentation *config*, not commerce →
  they live in the shop's existing `settings` metadata (like `theme.banner_url` today), which makes
  them automatically: importable via **Storefront-as-Code**, patchable via the **seller MCP config
  tools**, and included in agent-native setup. One schema addition, three surfaces for free.
- **Routing:** new shop pages (`/s/[slug]/c/[collection]`, `/s/[slug]/acerca|faq|politicas`) must be
  added to the custom-domain middleware **pass-through allow-list** (own-shop-experience S1 pattern).
  Middleware = shared surface → HIGH, announce per WAYS-OF-WORKING.

## What already exists (reuse, don't rebuild)

- `app/(shell)/s/[slug]/page.tsx` — banner/logo/tagline/social header + trust chips (keep; hero and
  nav slot in around it), `getShopListings()` in `lib/listings.ts`.
- `ChannelLayout.tsx` + root-layout channel detection (`x-miyagi-channel`/`x-miyagi-shop-slug`) —
  new pages render white-label for free once routed.
- `middleware.ts` custom-domain branch + its pass-through list (own-shop-experience S1, PR #10).
- Settings: `lib/shop-settings/taxonomy.ts` (Diseño section grows), `_sections/Diseno.tsx`,
  settings-import (Storefront-as-Code) + MCP `get/patch_store_configuration` + audit log.
- Theme guardrails: seasonal-theme-engine contrast checks + the raw-color CI guard (LEARNINGS: it
  bites brand-new client islands — only CI catches it).
- SEO: per-host `robots`/`sitemap` + canonical consolidation (custom-domain-polish) — collection +
  content pages join the sitemap.
- Medusa Product Collections / Categories modules (native grouping).
- UCP catalog (`/api/ucp/*`) — collections should surface so agents can browse by section.

## v1 scope boundary

**In:** announcement bar (text + optional link, per-shop); hero/featured section (pinned listings
or promo image + CTA); seller-defined collections with assignment UI + shop nav strip + collection
pages; content pages Acerca / FAQ / Políticas (Devoluciones data merchandised, not duplicated);
~4–6 curated theme presets with contrast guardrails; all channels except embed; Storefront-as-Code +
MCP config parity for every new key; sitemap/OG for new pages; es-MX only (no allow-list addition);
miyagiprints dogfood setup.

**Out (explicit):** reviews/social proof (seeded); free-form theming; embed-channel presentation;
per-collection pricing/promos; page-builder/drag-drop layouts; custom nav links to external URLs;
blog/long-form content; multi-language shops.

## Slices (skateboard → car)

### Sprint 1 — Instant premium: announcement bar + hero + theme presets — LOW
| # | Story | Risk |
|---|---|---|
| 1.1 | As a seller, I set an announcement bar (Diseño): short text + optional link; renders on all storefront channels. | LOW |
| 1.2 | As a seller, I pin up to N listings (or a promo image + CTA) as a hero/featured section above the grid. | LOW |
| 1.3 | As a seller, I pick a curated theme preset (font pairing + surface tone); contrast guardrails enforced; accent/banner unchanged. | LOW-MED (design tokens; raw-color CI guard) |
| 1.4 | Storefront-as-Code + MCP `patch_store_configuration` accept the new keys (schema + validation + audit). | LOW |

### Sprint 2 — Collections: in-shop nav + collection pages — HIGH
| # | Story | Risk |
|---|---|---|
| 2.1 | As a seller, I create/rename/reorder collections and assign listings (manage UI) → Medusa-native grouping. | HIGH (commerce model) |
| 2.2 | As a buyer, the shop shows a nav strip; `/s/[slug]/c/[collection]` renders the filtered grid, white-label on subdomain + custom domain (middleware pass-through + isolation 404s). | HIGH (middleware, shared infra — announce) |
| 2.3 | Collection pages join per-host sitemap + canonical/OG; UCP catalog exposes collections for agent browsing. | MED |

### Sprint 3 — Content pages + flagship dogfood — LOW-MED
| # | Story | Risk |
|---|---|---|
| 3.1 | As a seller, I author Acerca / FAQ / Políticas (simple structured editor, no page builder); pages render white-label on all channels; Devoluciones pulls from existing settings. | MED (new routes on middleware pass-through) |
| 3.2 | Storefront-as-Code/MCP parity for content pages; UCP `about-shop` exposure so agents can answer "¿quién es esta tienda?" | LOW |
| 3.3 | Dogfood: miyagiprints fully dressed (bar, hero, collections die-cut/kiss-cut/sheets/zines/flyers, Acerca/FAQ, preset) — the before/after screenshot pair for the poster. | LOW (ops/content) |

**Deploy order:** S1 → S2 → S3. S2 backend (collections) before frontend nav; middleware change
announced (shared surface — can break sibling PRs).

## QA / smoke commitments

- Pure seams + api specs: preset resolver (contrast assertions), announcement/hero config
  validation, collection grouping deriver, pass-through route list spec (nav can't drift — mirror
  the seller-nav spec pattern).
- Known constraint (own-shop-experience retro): the middleware custom-domain branch can't be
  exercised by hostname on Vercel previews → local `curl -H "Host: …"` + channel-header Playwright
  specs; **Daniel owns the real-domain browser smoke** post-merge.
- Browser smokes owed to Daniel: real-domain white-label collection browse (S2), theme-preset
  contrast eyeball on a real device (S1), miyagiprints before/after (S3).

## Open risks

- Per-shop scoping of Medusa collections through the marketplace plugin (global namespace) — S2
  plan-mode confirms collection-vs-category; escalate, don't guess.
- Preset fonts: loading strategy (self-host vs system stacks) to avoid CLS/perf regression on the
  static shell — respect the marketplace-static-shell work.
- Middleware pass-through growth — every new public shop route widens the custom-domain surface;
  keep the allow-list spec authoritative.
- Hero/pins vs homepage Selección semantics — different features (shop-level vs marketplace-level);
  name fields distinctly to avoid metadata collisions (`featured` is taken at product level).

## Kickoff prompts (emitted at scaffold, per sprint — Stage 8)
*Placeholder — generated when the epic is scaffolded on approval.*
