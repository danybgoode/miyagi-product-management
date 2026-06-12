# Cowork kickoff — Ask-Claude / "Mexico 26" gem curation (one-by-one)

## Mission
Turn a curated FEW hidden-gem CDMX sellers into **unclaimed, claimable shops** on
miyagisanchez.com. We pre-build each one, feature it in the "Mexico 26" magazine, and the
seller claims their shop free (0% commission). Quality over quantity. We go **one gem at a
time** — Daniel hands you the source material for each; you don't move to the next until the
current one is live and approved.

## Re-orient FIRST — the pipeline was just changed, so verify it; assume nothing
The supply import was recently fixed in Claude Code (it previously wrote to a model the live
`/s/[slug]` page couldn't read, so imports 404'd — now resolved and verified). Because it
just changed, **read the current code/docs and confirm the real import path yourself** before
importing anything. Don't rely on memory or the steps below if they conflict with what you find.
- `apps/miyagisanchez/AGENTS.md` (Rule #1, gitflow, DoD)
- `apps/miyagisanchez/SUPPLY_IMPORT_SCHEMA.md` (should now reflect the working path)
- `apps/miyagisanchez/app/api/supply/*`, `app/supply/*`, `lib/supply.ts`, `lib/listings.ts`, `app/s/[slug]/*`
- `Roadmap/00-ideas/seeds/agent-native-gtm/ask-claude-campaign-brief.md` (§6–7) and `creative-variant-matrix.md`

## Per-gem workflow (the loop)
1. **Extract** Daniel's source material into the supply schema fields (source_url, title,
   description, price, shop_name, location, state, municipio, image_url, category,
   listing_type, condition). **Never invent prices/details** — leave blank and mark anything inferred.
2. **Show Daniel the staged row(s) for approval** before importing (quality gate).
3. On approval, **import via the current supply pipeline** and **attach the image**.
4. **Verify**: load `https://miyagisanchez.com/s/<slug>` — must return **HTTP 200** and show
   as **unclaimed/claimable** (not 404). Only then is it done.
5. **Hand Daniel the `/s/<slug>` claim link** to feature in the magazine.

## Operational facts learned the hard way (treat as constraints)
- **Photos go in the connected folder, not chat.** Chat attachments do NOT reach the
  filesystem. Daniel drops each gem's photos in `medusa-bonsai/gems/<slug>/`; read them from there.
- **The sandbox has no external network** (DNS fails). You cannot host images or hit prod
  APIs from bash. **Do all imports + image hosting through the browser on prod** (Claude-in-Chrome),
  calling the site's own API same-origin with the admin secret in an `x-admin-secret` header
  (read `ADMIN_SECRET` from `apps/miyagisanchez/.env.local`; keep it out of URLs).
- **Resolve the slug** after import by whatever the current code exposes; verify by actually
  loading the page, don't assume the slug.
- **Consent posture:** public info only; link back to the gem's original content; opt-out
  available. Lighter touch for individual artists/collectors than for public venues/markets.
- **No git commits without Daniel's OK.**

## The batch (candidate archetypes — confirm/adjust with Daniel, don't assume)
| # | Gem | Proposed listing_type | Proposed category |
|---|---|---|---|
| 1 | Lagunilla Sunday michelada/party stand | service | servicios |
| 2 | Mercado San Juan gourmet/exotic vendor | product | otros |
| 3 | Taquería/fonda, San Rafael | service | servicios |
| 4 | Lucha-libre + tacos/mezcal tour operator | service | servicios |
| 5 | Pulquería Las Duelistas, Centro Histórico | service | servicios |
| 6 | Tianguis Cultural del Chopo stall / artist | product | moda (apparel) or otros |
| 7 | Tianguis del Arte (Monumento a la Madre) artist | product | otros |
| 8 | Comics/MTG/vinyl seller (Rockshop / Comic's Rock Show, Metro Hidalgo) | product | otros |

Note: Las Duelistas (#5) was prepped earlier and its photos are already in
`gems/las-duelistas/` (facade = primary). Its first import went through the old broken path;
confirm whether that orphan was cleaned up, then do a clean import via the fixed pipeline as
the first real gem.

## Start here
Re-orient on the current pipeline, confirm this per-gem workflow + the schema mapping with
Daniel, then wait for him to hand you the first gem's source material (likely Las Duelistas).
Take them one at a time.
