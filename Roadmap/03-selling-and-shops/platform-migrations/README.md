---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: platform-migrations
archetype: Grower
---

# Epic · Platform migrations — Shopify connector, parity score, consultant white-glove SKU

> **Area:** 03-selling-and-shops · **Risk:** HIGH · **Archetype:** Grower · **Scope seed:**
> [`00-ideas/seeds/platform-migrations.md`](../../00-ideas/seeds/platform-migrations.md)
> (approved by Daniel 2026-07-09). Includes one Bug rider (S0, ML re-auth churn — live customer pain,
> do first).

**Tagline:** *Cámbiate a Miyagi en minutos — gratis tú mismo, o con un consultor que lo hace contigo.*

## Why
Merchants stay on Shopify/Tiendanube/WooCommerce because switching means weeks of re-typing. The
import spine already shipped (Bulk Import & Express Migration); this epic adds the last three pieces:
a **Shopify connector** that pulls a live store into staging from just a shop domain, an honest
**parity report** ("this maps, this doesn't") before any money changes hands, and a **consultant
money path** — a `migration` promoter SKU at $999 MXN flat (≤150 listings), with a
platform-computed, tamper-proof **quoted estimate** above threshold and a "very custom" route to
Daniel. Success signal (Grower): completed migrations — connector batches imported + `migration`
SKU closes — not merely "the connector works."

## Medusa-first note (AGENTS rule #1)
No new commerce model. The connector is a **source adapter into the existing supply pipeline**
(`supply_batches`/`supply_items` → idempotent import → Medusa products) — same shape as the ML
import adapter. The SKU rides the shipped promoter rails (Medusa-side money via existing close
paths). The two genuinely new records — the **parity report** and the **quoted-estimate** — are
non-commerce planning artifacts → Supabase (rule #2). Shopify's Storefront MCP needs no stored
credentials (no OAuth module needed; the `mercadolibre` module stays the template if that ever
changes). Agent parity (rule #3): the connector route + estimate are reachable over the seller MCP
surface. Clerk untouched (rule #4). All new copy es-MX, not on the bilingual allow-list (rule #5).

## What already exists (reuse, don't rebuild) — code-verified at grooming
- **Bulk-import pipeline** — `lib/supply.ts`, `lib/supply-import.ts`, `lib/catalog-import.ts`,
  `app/api/supply/*` (batches/import/items/schema/status/upload): file/paste → AI parse → staging →
  review → idempotent import → R2 images. The connector feeds *this*, not new plumbing.
- **Storefront-as-Code + MCP config read/patch + `create_listing`** (photo URLs fetched into R2).
- **Storefront primitives for parity** — announcement bar, hero, theme presets, collections,
  content pages (Acerca/FAQ/Políticas). The parity *score* is new; the sections mostly aren't.
  Suspected gap: arbitrary extra static pages — **validate in S1**, slice a "custom pages" story if real.
- **Promoter rails** — `lib/promoter-skus.ts` (one-line SKU vocabulary), `lib/promoter-commission.ts`
  (per-SKU %), `lib/promoter-pricing.ts` (fixed admin-set prices — the estimate diverges here, see S2),
  `lib/promoter-close.ts` + transfer/receipt/notify; the close flow (photos, interview → shop) is
  the consultant interaction, minus the connector.
- **ML OAuth module** — `apps/backend/src/modules/mercadolibre/` (S0 bug lives here);
  `ml_sync_event` activity log is the evidence trail.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 0 | US-0.1 Bug: ML re-auth churn — reproduce → root-cause → fix + regression spec | **high** |
| 1 | US-1.1 Shopify Storefront-MCP connector → staged supply batch (flag-gated) | med |
| 1 | US-1.2 Parity score + merchant-shareable report (+ validate static-pages gap) | med |
| 2 | US-2.1 `migration` promoter SKU ($999 MXN flat, 50% commission) | **high** |
| 2 | US-2.2 Estimate generator + quoted-estimate record (close prices from the stored quote) | **high** |
| 2 | US-2.3 "Very custom" → route to Daniel with parity report (never silently quoted) | med |
| 3 | US-3.1 Per-platform migration landing/how-to pages (es-MX, recruiting language) | low |
| 3 | US-3.2 Consultant runbook + `/vende` + sell-sheet integration | low |

## Deploy order
**S0 first** — independent, live customer pain; backend-only (Cloud Run, no preview — post-merge
prod smoke split per WAYS-OF-WORKING). **S1 behind `migrations.connector_enabled`** (enablement,
default `false`, created DISABLED in every env — merge dark, flip deliberately). **S2 backend/config
first** where money is touched; the SKU dark-launches naturally via the unpriced-SKU rule (no second
flag); the quoted-estimate primitive merges before the close path that reads it. **S3 additive,
frontend-only.** HIGH stories → **Daniel merges**. Announce any shared-surface touch.

## Kill-switch (decided at grooming — Stage 6b)
`migrations.connector_enabled` — **enablement polarity, default `false`, created DISABLED in every
env**; seam: the connector import route (staging-side; the shipped importer stays always-on);
mechanism: in-house `platform_flags` via `isEnabled()` (node/server seam). The SKU needs no flag —
an unpriced SKU is unsellable.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** `migrations.connector_enabled` exists in the flag store, enablement polarity,
      created DISABLED in every env. *Verify-only — decided at grooming, not here.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — run `node scripts/build-order.mjs`)

## Sprints
- [sprint-0.md](sprint-0.md) — Bug: ML re-auth churn (do first).
- [sprint-1.md](sprint-1.md) — Shopify connector → staging + parity score.
- [sprint-2.md](sprint-2.md) — Money path: `migration` SKU + quoted estimate.
- [sprint-3.md](sprint-3.md) — Packaging: landings + consultant runbook.
