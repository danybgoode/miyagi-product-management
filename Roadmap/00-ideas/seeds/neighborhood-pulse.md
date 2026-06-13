---
title: "Neighborhood Pulse — online community feed (v1 of the Neighborhood Commerce Layer)"
slug: neighborhood-pulse
status: shipped
area: "01"
type: feature
priority: null
risk: low
epic: "01-discovery-and-shopping/neighborhood-pulse"
build_order: null
updated: 2026-06-13
---

# Scope — Neighborhood Pulse (online community feed) · v1

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-08).** Gate passed. Scaffolded under
> `01-discovery-and-shopping/neighborhood-pulse/` (epic README + sprint-1..2); kickoff prompts emitted.
> **Next action: Claude Code build, Sprint 1 first** (backend-first — the `web_visible` opt-in column +
> feed read). Groomed 2026-06-08 from the "Neighborhood Commerce Layer" pitch
> (`00-ideas/2. readyforscope/socialnextdoorbutnotquite.md`) + a fresh Medusa-first code read.
> **Class: Feature** (new buyer-facing discovery surface). **Stage-2.5 bucket: mostly already-collected —
> expose, don't build.** The community *contribution* primitive already exists; v1 is the missing *online
> display* surface. **Risk: LOW** (read-only, non-commerce; one additive Supabase column isolated to Sprint 2).

> **Doc-placement note (validate):** the groom skill text says land scope docs in `2. readyforscope/`, but
> the repo's current convention (`00-ideas/README.md` + `BUILD-ORDER.md`) is **flat `seeds/<slug>.md` with
> lifecycle in frontmatter — no folder moves**. I followed the live convention and landed this as
> `seeds/neighborhood-pulse.md`. The raw pitch still sits in the legacy `2. readyforscope/` folder; flag if
> you want it tidied.

## The ask (mirrored back)
*You want the marketplace to feel like the living pulse of a local neighborhood — a place buyers come back to
even when they're not actively shopping — by surfacing what neighbors are recommending, what's trending
locally, and which merchants are worth knowing, as a lightweight "useful local awareness" layer rather than a
social network. Right?*

The pitch ("Neighborhood Commerce Layer") is a **vision / epic-of-epics**. Per groom (one ask per run, find
the thinnest shippable slice), this scope doc carves out **v1 only** and names the rest as a deferred theme.

## Daniel's decisions this groom (2026-06-08)
1. **v1 = read-only feed.** Surface what we already collect + rank existing listings. **No net-new online
   social write primitive** (recommend/endorse) in v1 — that's a later epic.
2. **One community, two outputs — web is a DELIBERATE opt-in (default OFF).** The online feed **reuses the
   existing print contribution pipeline** (`print_social_submissions` + the same admin moderation queue).
   Approving an item for print does **not** put it online; a moderator must explicitly opt it into web. Because
   the feed depends on this flag to have any content, the `web_visible` control is **Sprint 1's first story**
   (backend-first), not a Sprint 2 add-on. **Consequence Daniel accepted:** `/vecindario` starts empty and is
   populated as moderators opt approved items in (admin can seed it at launch).
3. **One feed, colonia shown — no geo filtering yet.** A single marketplace-wide feed; each item shows its
   colonia/zona tag, but v1 builds **no location primitive**. Real geo scoping is deferred.
4. **Lives under Discovery (01), distinct route.** New epic at `01-discovery-and-shopping/neighborhood-pulse`;
   public online surface at a **fresh route** (proposed `/vecindario`), separate from the existing
   `/comunidad/*` submit flow.

## Stage 2.5 — can we already do this? (the re-scope)
**Bucket: already-collected → expose.** Three of the pitch's pillars need *no new system*:

- **"Community recommendations / neighborhood pulse / participation"** → the contribution primitive is
  **already built**: `/comunidad/nuevo` → `POST /api/print/social` → `print_social_submissions` (types
  `recomendacion · reconocimiento · evento · saludo · otro`, caption/body/photos + `zone` colonia), with an
  **admin moderation queue** (`/api/admin/print/social[/[id]]`, statuses `submitted → approved → placed →
  rejected`) and a "my contributions" page (`/comunidad/mis-aportes`). **The only gap is that nothing renders
  it online** — it flows into the print magazine. v1 is the missing display surface.
- **"Trending products / popular services / what neighbors are buying"** → rank **existing** catalog data.
  Listings already track `views` (`lib/listings.ts`, on Medusa product metadata), favorites
  (`marketplace_favorites`), and orders. A ranked strip is a pure-logic view over data we have — no new system.
- **"Neighborhood events & markets"** → the `evento` contribution type already exists **and** there's an
  in-flight Events & Ticketing epic (#7, macro 10). v1 **reuses** the `evento` items already in the feed and
  **does not** rebuild events. Deep event surfacing is left to #7.

What is **genuinely new** (and therefore mostly deferred): online social *reactions* (recommend/endorse/save),
a real neighborhood/location primitive, local buying requests (want-ads), and a community-signal reputation
system. None are in v1.

## Medusa-first reframe — what already exists (reuse, don't rebuild)
- **`print_social_submissions` (Supabase, non-commerce — correct per AGENTS rule #2)** is the community store.
  v1 **reads** it (status `approved`/`placed`); the existing moderation queue is the gate. No new table for v1.
- **The contribution flow** (`/comunidad/nuevo`, `POST /api/print/social`, R2 photo upload) is the input — v1
  adds the *output*, and a CTA loop back into it.
- **Ranking signals already on the data:** listing `views` (`lib/listings.ts`/`lib/types.ts`), favorites
  (`marketplace_favorites`), Medusa orders, shop `description`/`tagline`/colonia. Extract a pure
  **`lib/neighborhood-rank.ts`** seam over these — no new persistence.
- **Shop profiles** (`ShopSettings` `description`/`tagline`/origin colonia) back the "merchant spotlight"
  strip — read-only, no profile rebuild.
- **UCP/MCP catalog** already supports a `location` (city/neighborhood) param and a `views` field — the agent
  surface extends the existing read API, it isn't new.
- **es-MX copy** lives in next-free `lib/` so the spec and UI read one source (per LEARNINGS).

**AGENTS five-rule check:** Medusa still owns all commerce (the feed only *reads* catalog/orders; no commerce
in Supabase) ✅ · Supabase used only for the existing non-commerce community table ✅ · **UCP/MCP** gets a
read-only community/trending view (rule #3) ✅ · Clerk untouched (feed is public/anon-readable) ✅ · **es-MX**
for all new copy; not added to the bilingual allow-list (rule #5) ✅.

## UX heuristics this epic is held to
- **Alive on arrival.** The feed must look populated on day one — hence reusing already-approved content +
  ranked live listings, not an empty "be the first to post" shell.
- **Useful local awareness, not a social network.** Read-first; lightweight; no comment threads, no follow
  graph, no infinite engagement loops (the pitch is explicit on this).
- **Honest to the data.** "Colonia: …" shows only when the contribution carried a zone; "trending" reflects a
  stated, simple signal (views/favorites/recency), not a fabricated score.
- **No dead ends.** Every card links somewhere real (a listing, a shop, the contribute flow).

## Proposed slices (skateboard → car) — 2 sprints, all LOW unless noted
> Reference end-state only; the building agent confirms the plan in plan mode. Each story names its QA.

**Sprint 1 — The feed exists, opt-in-gated, and feels alive (skateboard).**
- **S1.1** *As a moderator, I deliberately opt an approved item into the online feed* — extend the existing
  moderation row with an additive `web_visible` flag (**default OFF**) + a "Mostrar en línea" toggle in the
  admin social queue (`/api/admin/print/social/[id]` PATCH). Approving for print never auto-publishes to web.
  **Acceptance:** a freshly approved item is NOT web-visible until a moderator toggles it on; toggling off
  re-hides it (print availability unaffected). **QA:** api spec on the admin PATCH (flag round-trips; default
  off). **Risk: MED** — the one additive **schema change** (nullable column on a non-commerce table);
  **Daniel reviews/merges** (DB migration per the risk rules). *Backend-first — deploy before the feed read.*
- **S1.2** *As a buyer, I can open a public neighborhood feed and see what my community is sharing* — a new
  public route (`/vecindario`) renders `print_social_submissions` where `web_visible = true` **and** status is
  `approved`/`placed`, newest first: type chip, caption, body, photos, colonia/zona tag, submitter name.
  Read-only; degrades gracefully (`web_visible ?? false`) so it's a safe no-op across the deploy-lag window.
  **Acceptance:** the page lists only opted-in approved items and **never** shows `submitted`/`rejected`/
  not-opted-in ones. **QA:** api spec (route returns opted-in-approved-only). **Risk: LOW.**
- **S1.3** *As a buyer, I see what's trending locally without searching* — a "Trending / Popular" strip on the
  same page ranks **existing** listings via a pure `lib/neighborhood-rank.ts` seam (views + favorites +
  recency), null-safe. **Acceptance:** the strip shows real listings ordered by the stated signal; with no
  signals it falls back to recency, never errors. **QA:** pure-logic spec on `lib/neighborhood-rank.ts`. **Risk: LOW.**
- **S1.4** *As a buyer/contributor, I can find the feed and add to it* — entry points: link `/vecindario` from
  discovery nav + the mobile tab/menu; a "Comparte con tu colonia" CTA on the feed → existing `/comunidad/nuevo`;
  and the contribution success screen links to the live feed. es-MX copy in a next-free `lib/`. **Acceptance:**
  the feed is reachable from the marketplace and the contribute loop is two clicks each way. **QA:** anonymous
  browser smoke (feed renders cards + CTA visible). **Risk: LOW.**

**Sprint 2 — Richer pulse + agents. All LOW.**
- **S2.1** *As a buyer, I see merchants worth knowing* — a "Merchants gaining attention" strip ranking shops by
  recent activity (orders / new listings / views), reusing shop `description`/`tagline`/colonia. Read-only.
  **Acceptance:** the strip shows real shops with their tagline + colonia, ordered by the stated signal.
  **QA:** pure-logic spec on the shop-ranking branch of `lib/neighborhood-rank.ts`. **Risk: LOW.**
- **S2.2** *As a buyer, the feed reads as "my neighborhood"* — visually group/label feed items by colonia/zona
  (presentational only — **no filtering engine**, honoring decision #3). **Acceptance:** items cluster under
  their zona label; items with no zona fall under a neutral "Tu comunidad" group. **QA:** api/unit spec on the
  grouping helper; anonymous browser smoke. **Risk: LOW.**
- **S2.3** *As an AI agent, I can read the neighborhood pulse* — expose the feed (opted-in community items +
  trending) as a **read-only** view on the existing UCP/MCP discovery surface (additive; behind the existing
  public read API). **Acceptance:** an agent call returns the trending listings + the opted-in community items;
  the manifest stays accurate. **QA:** api spec on the UCP route. **Risk: LOW** (additive read tool).

## In / Out of scope (v1)
**In:** a moderator web opt-in flag (`web_visible`, default OFF — one additive column, **Sprint 1**); a public
read-only `/vecindario` feed of **opted-in** approved community contributions; a trending-listings strip + a
merchant-spotlight strip over existing signals (`lib/neighborhood-rank.ts`); colonia/zona display +
presentational grouping; entry points + the contribute loop; a read-only UCP/MCP pulse view; one api/unit spec
per testable story; es-MX copy.

**Out (deferred — future epics of the Neighborhood Commerce Layer):** online social *reactions*
(recommend/endorse/save as marketplace actions); a real **neighborhood/location primitive** + geo filtering
(v1 shows colonia, doesn't filter on it); **local buying requests / want-ads**; a **community-signal
reputation** system (badges from endorsements/repeat-buyers beyond today's trust signals); deep **events &
markets** surfacing (owned by #7 / macro 10 — v1 only reuses `evento` contributions already in the feed);
personalized/per-user recommendations.

## Open risks / questions
- **Approve-for-print ≠ approve-for-web — RESOLVED (Daniel, 2026-06-08): deliberate opt-in, default OFF.**
  A moderator must explicitly opt an approved item into web (S1.1). **Accepted consequence:** `/vecindario`
  **starts empty** and fills as moderators opt items in — admin can seed it at launch by opting in a batch of
  existing approved items. This is why S1.1 (the flag) is backend-first, ahead of the feed read.
- **One additive migration (S1.1).** Nullable `web_visible` column on `print_social_submissions` (default OFF).
  Additive and non-commerce, but it's a schema change → tiered **MED, Daniel merges**. Every other story is LOW.
- **"Trending" needs a sane signal + thresholds.** Views/favorites/order counts can be thin on a young
  marketplace; the rank helper must fall back to recency and never render an empty/janky strip. Tune weights at
  build; confirm the feel with Daniel on the preview.
- **Naming.** Proposed route `/vecindario` ("neighborhood"); the existing `/comunidad/*` is the submit flow.
  Confirm the public name (Vecindario / Explorar / Comunidad-online) at scaffold.
- **No external-fact research needed.** v1 is entirely internal (our own Supabase community data + Medusa
  catalog signals); no external standard or provider capability is in play. Verified against current code this pass.

## Definition of Ready check
- [x] As-a/I-want/so-that clear per story; acceptance checks Daniel-runnable.
- [x] Class = Feature; Stage-2.5 bucket = already-collected → expose (heavily reuse-shrunk from the pitch).
- [x] v1 in/out boundary written; the vision's remainder named as deferred future epics.
- [x] Daniel's 4 decisions captured (read-only feed · reuse print pipeline · colonia-shown-no-filter · Discovery/01 new route).
- [x] Medusa-first reuse list produced (`print_social_submissions` + moderation queue · listing views/favorites/orders · shop profile · UCP read surface · `lib/neighborhood-rank.ts` seam).
- [x] Each story risk-tiered; QA stage named; the one MED/migration story (S1.1) flagged as Daniel-merge; browser-smoke owner identified (anonymous specs — no auth owed).
- [x] **Daniel approved this scope doc (2026-06-08)** ← gate passed, with the web opt-in default flipped to OFF (deliberate opt-in). Scaffolded `01-discovery-and-shopping/neighborhood-pulse/` (README + sprint-1..2) + committed path-scoped; kickoff prompts emitted.
