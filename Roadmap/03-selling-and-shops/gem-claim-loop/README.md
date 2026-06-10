# Epic · Gem → Claimable Shop Loop (Ask-Claude / Mexico 26)

> Scoped 2026-06-09 from [`00-ideas/2. readyforscope/gem-claim-loop-fix.md`](../../00-ideas/2.%20readyforscope/gem-claim-loop-fix.md)
> and the campaign brief §7 (`00-ideas/seeds/agent-native-gtm/ask-claude-campaign-brief.md`).
> **✅ EPIC COMPLETE 2026-06-09 — all 3 sprints shipped to prod + verified (backend #18 · frontend #66 · despachobonsaiVercel #1). Las Duelistas live at `/s/pulqueria-las-duelistas`. Owed Daniel: live email-claim browser smoke.** Risk: MED (no money mutation; touches seller schema + claim path + a small despachobonsai PR).

**Tagline:** *Una joya escondida se vuelve una tienda reclamable — gratis, con un QR.*

## The loop this serves
Curate a hidden gem (pulquería, tianguis stall, gallery) → import it through the supply tooling as
an **unclaimed shop** → feature it in the magazine with a **QR → `/s/[slug]`** → the real owner
claims it free → their agent maintains it (Onboarding-0).

## Why it's broken today (findings, verified 2026-06-09)
1. **`/s/[slug]` renders from Medusa** (`getShop()` → `GET /store/sellers/:slug`); the supply import
   still writes the **legacy** Supabase `marketplace_shops`/`marketplace_listings` — now a mirror
   nothing renders from. Imported gems 404.
2. **Claim is silently broken**: the claim JWT carries the Medusa seller id, but despachobonsai's
   `claim/complete` updates Supabase by that id (matches 0 rows, reports ok) and never sets the
   Medusa seller's `clerk_user_id` — the field the storefront badge and `/shop/manage` read.
3. **Schema gap**: Medusa `seller.clerk_user_id` is `NOT NULL` — an unclaimed seller can't exist yet.

## Definition of success (observable behavior)
An imported gem: (1) renders 200 at `/s/[slug]`; (2) shows as unclaimed + claimable, and claiming
transfers it; (3) listing shows title/description/state+municipio/category/listing_type/price/image;
(4) stable URL for the magazine QR + appears in marketplace search; (5) admin/agent can attach a
hosted image with no Clerk login (URL pass-through or secret-gated upload); (6) docs match reality.

## Sprints
- [Sprint 1 — an imported gem renders live](sprint-1.md): nullable `clerk_user_id` + `POST /internal/sellers` (BE) · import hop rewritten to Medusa + mirror (FE) · secret-gated `POST /api/supply/upload` (FE).
- [Sprint 2 — claim actually transfers the shop](sprint-2.md): `POST /internal/sellers/:id/claim` (BE) · `POST /api/claim/complete` (FE) · despachobonsai delegates (cross-repo PR).
- [Sprint 3 — docs, cleanup, the real gem](sprint-3.md): `SUPPLY_IMPORT_SCHEMA.md` reconciled · orphan rows from the 2026-06-09 run removed/repurposed · Las Duelistas imported live · 6-criteria verification.

## Reuse (don't rebuild)
`createSellerProduct()` via `POST /internal/seller-products` (secret-gated, hosted image URLs OK) ·
`lib/provisioning.ts` mirror helpers (short-code minting) · supply staging UI + normalization ·
`/api/sell/upload`'s R2 logic (secret-gated sibling).

## Out of scope
Claim-flow redesign · magazine builder · auth changes · scraped-listing expiry cron parity with
Medusa (flagged as follow-up idea).
