# Epic: Neighborhood Pulse — online community feed

> **🚧 IN PROGRESS — S1 live, S2 unmerged.** S1 code is **merged to `main` and live on prod** (PR #55,
> `48e9fc5`; `/vecindario` returns 200, `lib/neighborhood-*`), and the **S1.1 MED migration is already
> applied** — `print_social_submissions.web_visible BOOLEAN NOT NULL DEFAULT false` exists on live Supabase
> (verified 2026-06-13) and the admin "Mostrar en línea" opt-in toggle is live in the print queue. **The feed
> is live-but-empty by design:** 0 items are opted in (`web_visible = true` count = 0), and only 1 approved
> community submission exists today. So the remaining "rollout" is an **operational opt-in** (a moderator flips
> "Mostrar en línea" on approved items) — **not a pending deploy**. **S2 (spotlight + zona grouping + UCP/MCP
> pulse) is built but NOT merged** — its commits live only on `feat/neighborhood-pulse` (prod
> `/api/ucp/neighborhood-pulse` → 404), and the branch is ~3 days behind `main`. Do **not** mark this epic ✅
> until S2 lands and the feed is smoked with real opted-in content. **What remains:** opt a batch of approved
> items in + smoke the live feed; refresh the S2 branch off `main`, re-gate, and merge S2.

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
