# Own-shop premium presentation — Retrospective

**Shipped:** 2026-07-07 (code) · epic close 2026-07-08 · 3 sprints · Area 07 · Risk MIXED (S2 HIGH — commerce grouping + shared middleware surface; S1/S3 LOW-MED)
**Flag:** none — additive presentation config; absent keys render today's storefront by construction (fail-safe, no kill-switch needed).

## What shipped
Every shop used to render as one flat listing grid under a banner — a marketplace profile row, not a
brand's store. It now has the presentation layer that makes a shop feel like walking into its own site,
free on every channel (marketplace `/s/`, subdomain, custom domain):
- **S1** (`8b1abb1`, PR [#173](https://github.com/danybgoode/miyagisanchezcommerce/pull/173)) — an
  announcement bar, a hero/featured section, curated theme presets (font pairing + surface tone,
  contrast-guarded), and Storefront-as-Code + MCP parity for all the new config keys.
- **S2** (backend `667c607` PR [#65](https://github.com/danybgoode/medusa-bonsai-backend/pull/65),
  frontend `ed905d7` PR [#182](https://github.com/danybgoode/miyagisanchezcommerce/pull/182)) —
  seller-defined collections on Medusa's native Product **Category** (many-to-many, seller-namespaced
  handles), a shop nav strip + `/s/[slug]/c/[collection]` pages white-labeled on every channel, and
  collections in the per-host sitemap/OG + the UCP catalog. Preceded by a preliminary fix (Story 2.1a)
  for a real risk found during planning (see below).
- **S3** (`a72bde8`, PR [#183](https://github.com/danybgoode/miyagisanchezcommerce/pull/183),
  frontend-only) — real content pages (Acerca / FAQ / Políticas, Devoluciones pulled from existing
  settings), config + agent parity for them, and the miyagiprints flagship dress-up (the dogfood
  before/after pair).

## What went well
- **Reading the installed Medusa package source before picking the data model prevented building on
  the wrong primitive.** The scope doc didn't pre-decide Collection vs. Category; S2 plan mode read
  `@medusajs/product` v2.15.3 directly and found Collection is `belongsTo` (one per product — fails
  "a listing can live in multiple collections") while Category is `manyToMany` (satisfies it). Per-shop
  scoping rode a new `seller ↔ product_category` module link mirroring the existing
  `seller-product.ts`/`seller-order.ts` pattern — a real ownership boundary, not metadata-only trust.
- **The same research pass surfaced a latent bug before any collection-creation code shipped.**
  `product_category.handle` has a global unique index, and the app already derived "the" category
  positionally (`categories?.[0]?.handle`) — which only ever worked because every product had 0-or-1
  category. Attaching seller collections to the *same* many-to-many pivot would have let `[0]`
  silently return a seller collection instead of the platform category, breaking the site's main
  category filter. Folded into scope as a standalone preliminary story (2.1a, explicit
  platform-vs-collection split) that shipped *first*, before the feature that would have triggered it.
- **A "middleware needs no edit" correction, verified rather than assumed, avoided an unnecessary
  shared-surface touch.** Story 2.2 was scoped assuming `middleware.ts`'s custom-domain pass-through
  needed an allow-list extension for the new `/c/[collection]` routes. Direct verification found the
  real model is an inverted **deny-list** (`/s`, `/s/*`, `/l`, `/l/` redirect home; everything else,
  including `/c/[collection]`, already passes through) — so no edit was needed. Still announced as
  shared-surface territory, since a sibling PR could reasonably have assumed otherwise.
- **Cross-agent review found real bugs on every sprint that shipped code** — S1's findings fixed
  pre-merge in `f02403d`; S2 found 6 real bugs across both PRs, independently re-verified safe-to-merge;
  S3 found 3 (hardcoded English "FAQ" copy — a real es-MX-default violation per AGENTS rule #5 — a FAQ
  authored-state defensive gap, and an unused import), with a fresh `pr-reviewer` pass clean after.

## What we learned
- **A positional array read (`arr[0]`) that "works" because of an unstated cardinality assumption is a
  landmine for the next feature that shares the same array.** The category bug wasn't a bug when
  written — every product genuinely had 0-or-1 category at the time. It became a real, silent-failure
  risk the moment a *second* feature (seller collections) started writing to the same many-to-many
  relationship. When extending a data model another feature already reads positionally, grep for every
  `[0]`/`.first()`-style read on that relationship before assuming the existing code is safe to extend.
- **Verify a scoped architectural assumption (middleware allow-list, model cardinality) against the
  actual installed source before writing the story that depends on it — a wrong assumption caught in
  plan mode is free; caught in review is a fix; caught in prod is an incident.** Both the Category
  decision and the "middleware needs no edit" correction happened in **plan mode**, before code, which
  is why neither cost a review round or a revert.

## Gaps / follow-ups
- **Owed: Daniel's live smokes**, per sprint doc — S1's click-through + real-device contrast eyeball;
  S2's real-domain hostname-branch smoke + backend Cloud Run deploy confirmation; S3's miyagiprints
  dress-up + full flagship real-device walkthrough + before/after screenshots (Story 3.3's checklist).
  All 3 sprints are already merged and live (no flag gates any of this — additive-by-construction), so
  these are visual/UX confirmations, not activation gates.
- **`shop-reviews-social-proof` was deliberately carved out as a separate seed at grooming** (2026-07-03
  decision w/ Daniel) — not in this epic's scope, not a gap.
- **Theming stays curated-presets-only by design** (no freeform CSS/color picker) — a deliberate v1
  scope boundary, not a deferred feature.
