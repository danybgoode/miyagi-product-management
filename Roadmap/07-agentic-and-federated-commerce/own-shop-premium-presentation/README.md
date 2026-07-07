---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Sprint 1 shipped — PR #173 merged to main (squash 8b1abb1), 2026-07-04; cross-agent review findings fixed pre-merge (f02403d). Sprint 2 shipped — backend PR #65 (squash 667c607) + frontend PR #182 (squash ed905d7), 2026-07-07; 6 real bugs found (cross-review + fresh reviewer) and fixed pre-merge, both PRs independently re-verified safe-to-merge. Owed: Daniel's click-through smoke + real-device contrast eyeball (sprint-1.md), and the real-domain hostname-branch smoke + backend Cloud Run deploy confirmation (sprint-2.md). S3 open.
slug: own-shop-premium-presentation
---

# Epic: Own-shop premium presentation — "stepping into StickerJunkie"

> **Area:** 07 · Agentic & Federated Commerce · **Risk:** MIXED — S2 HIGH (Medusa collections + middleware pass-through, shared infra); S1/S3 LOW-MED · **Archetype:** Grower · **Scope doc:** [`00-ideas/2. readyforscope/own-shop-premium-presentation.md`](../../00-ideas/2.%20readyforscope/own-shop-premium-presentation.md)

**Tagline:** *Tu tienda se siente como TU tienda — portada, secciones y páginas propias, en tu dominio y en el marketplace.*

## Why
The own-channel *plumbing* is done (white-label shell, domain/subdomain SKUs, trust parity) but every
shop still renders as one flat listing grid under a banner — a marketplace profile row, not a brand's
store. This epic adds the presentation layer that makes `miyagiprints.miyagisanchez.com` feel like
walking into stickerjunkie.com: announcement bar, hero/featured section, seller-defined collections
with in-shop navigation, real content pages (Acerca / FAQ / Políticas), and curated theme presets —
**free for every shop, on every channel** (marketplace `/s/`, subdomain, custom domain; embed keeps
its compact grid). Flagship dogfood: miyagiprints.

## Context
| | |
|---|---|
| **Role** | Seller (configure the look), buyer (browse by section, read the shop), seller's agent (MCP-configure it all) |
| **Macro-section** | 07 · Agentic & Federated Commerce |
| **Risk** | S2 HIGH — commerce grouping model + `middleware.ts` pass-through (shared surface, announce; can break sibling PRs) |
| **Flag** | none planned — additive presentation config; absent keys render today's storefront (fail-safe by construction) |
| **Decisions** | 2026-07-03 w/ Daniel: v1 = bar + hero + collections + content pages · free for all channels · reviews = separate seed (`shop-reviews-social-proof`) · theming = curated presets only · embed unchanged |
| **Bilingual** | es-MX only; NOT added to the bilingual allow-list |

## Medusa-first note
Collections are a **native Medusa primitive** (Product Collections / Categories) — per-shop scoping
via metadata through the marketplace plugin; **no Supabase grouping table** (rules #1/#2). S2
plan-mode confirms collection-vs-category and escalates if the marketplace plugin's global namespace
fights per-shop scoping — don't guess. Everything else (bar, hero, preset, content pages) is
presentation *config* on the shop's existing `settings` metadata, so Storefront-as-Code, the seller
MCP `get/patch_store_configuration` tools, and agent-native setup inherit it with one schema
addition (rule #3 for free).

## What already exists (reuse, don't rebuild)
- `app/(shell)/s/[slug]/page.tsx` — banner/logo/tagline/social header + trust chips (hero + nav slot around it); `getShopListings()` in `lib/listings.ts`.
- `ChannelLayout.tsx` + root-layout channel detection (`x-miyagi-channel`/`x-miyagi-shop-slug`) — new routes render white-label for free once passed through.
- `middleware.ts` custom-domain pass-through list (own-shop-experience S1, PR #10) — the seam S2/S3 extend; previews can't exercise it by hostname (retro-documented: local `curl -H "Host: …"` + channel-header specs; Daniel owns the real-domain smoke).
- Settings machinery — `lib/shop-settings/taxonomy.ts` (Diseño grows), `_sections/Diseno.tsx`, settings-import (Storefront-as-Code), MCP config tools + audit log.
- Theme guardrails — seasonal-theme-engine contrast checks; the raw-color CI guard (LEARNINGS: bites brand-new client islands, only CI catches it).
- SEO — per-host robots/sitemap + canonical consolidation (custom-domain-polish); new pages join it.
- Medusa Product Collections / Categories modules; UCP catalog (`/api/ucp/*`) for agent-browsable collections.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Announcement bar (text + optional link) on all storefront channels | LOW |
| 1 | 1.2 Hero/featured section (pinned listings or promo image + CTA) | LOW |
| 1 | 1.3 Curated theme presets (font pairing + surface tone, contrast-guarded) | LOW-MED |
| 1 | 1.4 Storefront-as-Code + MCP parity for the new keys | LOW |
| 2 | 2.1 Seller creates/reorders collections + assigns listings → Medusa-native grouping | HIGH |
| 2 | 2.2 Shop nav strip + `/s/[slug]/c/[collection]` pages, white-label on subdomain/custom domain (middleware pass-through + isolation) | HIGH |
| 2 | 2.3 Collection pages in per-host sitemap/OG; UCP exposes collections | MED |
| 3 | 3.1 Content pages Acerca / FAQ / Políticas (structured editor; Devoluciones pulled from settings) | MED |
| 3 | 3.2 Storefront-as-Code/MCP parity + UCP about-shop exposure | LOW |
| 3 | 3.3 Dogfood: miyagiprints fully dressed (before/after pair) | LOW (ops) |

## Deploy order
S1 → S2 → S3. Within S2: backend grouping before the frontend nav; the middleware change is
**announced** (shared surface). Absent config keys must always render today's storefront — additive
at every step, no flag needed.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
