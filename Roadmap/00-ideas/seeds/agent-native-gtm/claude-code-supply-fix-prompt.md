# Claude Code task — make the "Ask-Claude / Mexico 26" gem loop work end-to-end

## How to approach this
**Assume nothing.** The docs and the notes below may be stale or wrong. Treat everything
except the **Evidence** section as a *hypothesis to verify* against the real code and the
running system — including my guess at the root cause. Plan first (per `AGENTS.md`):
investigate, confirm the actual data model and flow, write user stories, get Daniel's
approval, then build on a feature branch. No commits to `main`; no commits at all without
Daniel's explicit OK.

## The goal — desired end state (define success by observable behavior, not implementation)
A curated hidden-gem seller, imported through the supply/admin tooling as an *unclaimed*
shop, results in **all** of the following being true:

1. The shop renders publicly at `https://miyagisanchez.com/s/<slug>` — HTTP 200, not 404.
2. It clearly presents as **unclaimed / claimable**, and the existing claim flow lets a real
   seller claim it for free so it becomes theirs.
3. Its listing(s) show title, description, location (state/municipio), category,
   `listing_type`, price when provided, and an image when provided.
4. It is **featurable for the magazine**: a stable `/s/<slug>` URL suitable for a QR, and it
   shows up wherever the marketplace surfaces shops/listings (search/discovery, etc.).
5. An admin or agent — **with no Clerk login** — can attach a hosted image to a pre-built
   shop's listing during or after import: either by passing a hosted `image_url`, or by
   uploading a local image file through a secret-protected path that returns a hosted URL.
6. The supply docs (e.g. `SUPPLY_IMPORT_SCHEMA.md`) and any admin UI **match the real,
   working path**, so the next import just works without tribal knowledge.

Out of scope unless you find it's genuinely required to hit the above: redesigning the claim
flow, the magazine builder, or the auth layer.

## Evidence (facts from a real run on prod, 2026-06-09 — trust these)
- Imported one gem via the supply API on prod: `POST /api/supply/batches` (one item) →
  `GET /api/supply/items?batchId=…` → `PATCH /api/supply/items {status:'approved'}` →
  `POST /api/supply/import`. Response: `{ imported: 1, duplicate: 0, failed: 0 }`.
- A row was created in **Supabase** `marketplace_shops`: slug
  `pulqueria-las-duelistas-nxwy`, `source: 'scraped'`, `clerk_user_id: null`,
  `verified: false`.
- Visiting `https://miyagisanchez.com/s/pulqueria-las-duelistas-nxwy` returns **404**
  ("Tienda no encontrada").
- **Hypothesis (verify, do not assume):** `getShop()` in `lib/listings.ts` resolves a shop
  via Medusa `GET /store/sellers/<slug>`, while `/api/supply/import` writes to Supabase
  `marketplace_shops` / `marketplace_listings`. If that's right, imported supply shops are
  invisible to the live page. Confirm where shops/sellers/listings actually live **now**,
  how `/s/[slug]` and the claim flow resolve them, and how (if at all) supply data is meant
  to reach that read model.
- **Cleanup:** this run left orphaned prod rows — Supabase batch
  `1325c9ef-2e56-44dc-ad0d-8513db22b713`, shop `5ed4890f-2363-4ac0-b69c-8231f471d96c`,
  listing `df12a345-6323-4c6f-87af-909f7b6ab28c`. Remove or repurpose them as part of this work.

## Orient first (source of truth — read before planning)
- `apps/miyagisanchez/AGENTS.md` — esp. Rule #1 (Medusa owns commerce; shops/sellers live in
  the marketplace plugin) and the gitflow / Definition-of-Done.
- `apps/miyagisanchez/SUPPLY_IMPORT_SCHEMA.md` — the documented (possibly stale) import shape.
- `Roadmap/00-ideas/seeds/agent-native-gtm/ask-claude-campaign-brief.md` — §7 is the
  gem → claimable-shop loop this fix exists to serve.
- The real code: `app/api/supply/*`, `app/supply/*`, `lib/listings.ts`, `lib/supply.ts`,
  `app/s/[slug]/*`, and the Medusa marketplace / seller modules under `apps/backend`.

## Deliverable
1. A short **findings note**: where shops/sellers/listings truly live, the actual reason the
   imported gem 404s, and the options to reach the end state — with your recommendation.
2. **Plan + user stories** for Daniel to approve before any code.
3. On approval: implement on a feature branch; **verify** by importing a fresh test gem and
   confirming all six end-state criteria (including a real `/s/<slug>` returning 200 and a
   working claim); reconcile the stale docs; clean up the orphaned rows; open a PR. Use the
   e2e / smoke harness per `WAYS-OF-WORKING.md`.
