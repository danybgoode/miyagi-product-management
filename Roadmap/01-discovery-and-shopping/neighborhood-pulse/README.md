# Epic: Neighborhood Pulse — online community feed

> **🚧 IN PROGRESS — not shipped.** S1 code is **merged to `main`** (PR #55, `48e9fc5`; `/vecindario`,
> `lib/neighborhood-*`), but **rollout is pending** — the MED migration (S1.1) + the seed/opt-in step
> haven't been run, so the feed isn't live-rolled-out — and **S2 (ranking/feed enrichment) is built but not
> yet merged** (its commits aren't on `origin/main`). Do **not** mark this shipped until the rollout is done
> and S2 lands. **What remains:** run the S1.1 migration + opt-in seed, smoke the live feed, merge S2.

> **Area:** 01-discovery-and-shopping · **Risk:** low (one MED migration story, S1.1) · **Scope seed:** [`00-ideas/seeds/neighborhood-pulse.md`](../../00-ideas/seeds/neighborhood-pulse.md)

## Why
Make the marketplace a recurring destination — somewhere buyers come back to even when they aren't shopping —
by surfacing the living pulse of their local community: what neighbors recommend, what's trending locally, and
which merchants are worth knowing. This is **v1 of the larger "Neighborhood Commerce Layer" vision** and is
deliberately a *useful local awareness* layer, **not a social network** (no threads, no follow graph, no
engagement loops). It ships read-only: it *exposes* community content we already collect and *ranks* listings
on signals we already track.

## Medusa-first note
Medusa stays the owner of all commerce — this epic only **reads** catalog/order signals (listing `views`,
`marketplace_favorites`, orders) to rank existing listings/shops. The community content is **non-commerce**, so
it correctly lives in the existing Supabase `print_social_submissions` table (AGENTS rule #2). The single schema
change is an additive `web_visible` column on that non-commerce table. No new commerce primitive, no new
commerce persistence.

## What already exists (reuse, don't rebuild)
- **Community contribution pipeline** — `/comunidad/nuevo` → `POST /api/print/social` → `print_social_submissions`
  (types `recomendacion · reconocimiento · evento · saludo · otro`, caption/body/photos + `zone` colonia), with
  the **admin moderation queue** (`/api/admin/print/social[/[id]]`, statuses `submitted → approved → placed →
  rejected`) and `/comunidad/mis-aportes`. **Gap:** it only feeds the print magazine — nothing renders it online.
- **Ranking signals already on the data** — listing `views` (`lib/listings.ts`, `lib/types.ts`), favorites
  (`marketplace_favorites`), Medusa orders, shop `description`/`tagline`/origin colonia (`ShopSettings`).
- **R2 photo uploads** (`/api/sell/upload`) already back contribution photos — the feed just renders the URLs.
- **UCP/MCP catalog** already exposes a `location` (city/neighborhood) param and a `views` field — the agent
  pulse view extends this existing read API, it isn't new.
- **es-MX copy** convention: keep new strings in a next-free `lib/` module so the UI and the spec read one source.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | S1.1 Moderator web opt-in flag (`web_visible`, default OFF) + admin toggle | MED |
| 1 | S1.2 Public `/vecindario` feed of opted-in approved community items | low |
| 1 | S1.3 Trending-listings strip (`lib/neighborhood-rank.ts`) | low |
| 1 | S1.4 Entry points + contribute loop | low |
| 2 | S2.1 Merchant-spotlight strip ("merchants gaining attention") | low |
| 2 | S2.2 Colonia/zona presentational grouping | low |
| 2 | S2.3 Read-only UCP/MCP pulse view (agent surface) | low |

## Deploy order
**Backend-first.** S1.1 ships the `web_visible` column + admin toggle **before** the feed read (S1.2) — the feed
degrades gracefully (`web_visible ?? false`) so the ~12-min Cloud Run / frontend deploy-lag window never shows
un-opted-in content. The feed starts **empty** by design (deliberate opt-in) and fills as moderators opt items
in — seed a batch at launch. S1.2–S2.3 are LOW-risk frontend/read work with per-branch Vercel previews; merge
latest `main` before opening the PR.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated (01 · Discovery feature line + Recent highlights)
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; seed frontmatter `status: shipped`
