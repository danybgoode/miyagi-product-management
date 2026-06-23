---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. (✅ ALL 3 SPRINTS SHIPPED 2026-06-23: S1 #112 `1a4c4a4` · S2 #113 `4a59644`/BE #37 `815994f` · S3 #114 `a5b23ca`)
slug: homepage-seleccion-curation
---

# Epic — Homepage Selección: bug sweep + admin curation + dynamic rotation

**Macro-section:** 01 · Discovery & Shopping.
**Class:** Mixed — two **bugs** (Sprint 1) + a **light-enhancement feature** (Sprints 2–3) on the already-shipped
Selección curation. Risk spans LOW (CSS, display gating, pure-logic) → MED (one admin product-metadata write).
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/homepage-seleccion-curation.md`](../../00-ideas/2.%20readyforscope/homepage-seleccion-curation.md) — **APPROVED 2026-06-23**.

## Why

The homepage "Selección de la semana" is purely auto-curated (pinned-first then freshest, 14-day cutoff) with
**no admin UI** to control it, and it feels static between visits. Daniel wants a human hand on the merchandising
and visible rotation. Two real defects also degrade the page today: after the static-shell migration, **signed-in
users still see signed-out CTAs**, and the **Categorías list highlights the whole card on hover** instead of the
individual row.

## Context

| | |
|---|---|
| **What it is** | Homepage bug fixes (hover + auth-leak) → admin pin/reorder of the Selección → per-window rotation |
| **Repos touched** | `apps/miyagisanchez` (all). Possibly a tiny `apps/backend` read/route for the product-metadata write (S2.0 pre-flight decides). |
| **Output** | Per-row Categorías hover · signed-out CTAs gated everywhere · `/admin/seleccion` (pin/unpin + reorder) · deterministic per-ISR-window shuffle of the unpinned remainder |
| **SSOT** | `lib/home-curation.ts` (curation/sort/shuffle logic) · `metadata.featured` + `metadata.featured_rank` on the Medusa product (the pin) · `lib/admin/sections.ts` (admin nav) |

## Decisions (grooming, 2026-06-23)

1. **Admin control v1 = pin/unpin + reorder**, building on the existing `metadata.featured` pin; auto-curation
   fills any remaining grid slots.
2. **"Dynamic" = shuffle per refresh**, reconciled with the static shell as a **deterministic per-ISR-window
   shuffle of the unpinned pool** — pinned/admin-ordered items stay fixed. **No GCP job, no new infra** (this
   slice needs no server processing). True per-visitor shuffle is **out of scope** (would un-static the shell).
3. **Packaging = bugs first.** Sprint 1 (bugs + auth audit) ships first; Sprints 2–3 follow. Kept as **one epic**
   (shared surface + reuse list).
4. **Auth sweep = full signed-out/in audit** across public surfaces, not just the homepage.

## Medusa-first note (AGENTS five-rule check)

- **Rule 1 (Medusa owns commerce):** the pin is **Medusa product metadata** — `metadata.featured` (existing) +
  `metadata.featured_rank` (new, number, asc). The admin write goes through a Medusa product-metadata update
  (path confirmed in **S2.0 pre-flight**) — **never** a Supabase pin table.
- **Rule 2 (Supabase = non-commerce only):** nothing here touches Supabase.
- **Rule 3 (UCP/MCP):** featured is a discovery signal — S2.0 checks whether `/api/ucp/catalog` should expose it.
- **Rule 4 (Clerk):** admin section reuses `requireAdmin`/`withAdmin`; bug #3 reuses client `AuthShow`/`useAuth`.
  No `currentUser()` re-introduced on the static homepage.
- **Rule 5 (es-MX):** admin copy es-MX only (admin not on the bilingual allow-list); no new bilingual surface.

## What already exists (reuse, don't rebuild)

- **`lib/home-curation.ts`** — `isPinned` (`metadata.featured === true`), `pickFeatured`, `curateGrid`,
  `isQualifying`, `byPinnedThenFresh`. Next-free seam, unit-tested by `e2e/home-curation.spec.ts`. Reorder +
  shuffle land here (free coverage).
- **`lib/listings.ts`** (`:188-235`) — `getCuratedPool` (one cached Medusa fetch), `getFeaturedListing`,
  `getCuratedListings`.
- **`metadata.featured`** on the Medusa product — the existing pin primitive. Add `metadata.featured_rank`.
- **Admin shell** `app/(shell)/admin/*` + **`lib/admin/guard.ts`** (`requireAdmin`/`withAdmin`) +
  **`lib/admin/identity.ts`** + **`lib/admin/sections.ts`** registry. **`app/(shell)/admin/vecindario/`** is the
  closest analog client to copy.
- **`AuthShow`** (`app/components/AuthShow.tsx`, `when="signed-in" | "signed-out"`) — drop-in for bug #3; already
  used in `PlatformShell`.
- **`HomePersonalizationProvider` / `useHomePersonalization` / `HomeSellerModule`** — client-island idiom.
- **`.card-tile` / `.card-panel`** + tokens (`--surface-muted`, `--bg-sunk`, `--border`, `--accent`) for the hover.
- **Auth-smoke harness** (`@clerk/testing`, `e2e/_helpers/auth.ts`) for the Clerk-gated admin spec.

## Scope — sprints, stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 Categorías per-row hover fix | LOW |
| **[S1](sprint-1.md)** | S1.2 Gate signed-out homepage CTAs in `AuthShow` (keep `/` static) | LOW |
| **[S1](sprint-1.md)** | S1.3 Full signed-out/in leakage audit + fixes across public surfaces | LOW |
| **[S2](sprint-2.md)** | S2.0 **Pre-flight:** confirm Medusa product-metadata write path + UCP featured question | — |
| **[S2](sprint-2.md)** | S2.1 Admin write path: toggle `metadata.featured` + `featured_rank`, bust `listings` tag | MED |
| **[S2](sprint-2.md)** | S2.2 `/admin/seleccion` UI (pin/unpin + reorder), registered in admin nav | LOW |
| **[S2](sprint-2.md)** | S2.3 Curation reads honor admin order (`featured_rank` asc) | LOW |
| **[S3](sprint-3.md)** | S3.1 Deterministic per-ISR-window shuffle of the unpinned remainder | LOW |

> **Out of scope / routed out:** true per-visitor shuffle (own Cloud Run + island epic) · any GCP scheduler ·
> timed campaigns · seller-facing featuring · tenant suspend/visibility (→ `admin-consolidation`).

## Deploy order & dependencies

- **Frontend-led**, single repo (`apps/miyagisanchez`). Branch `feat/homepage-seleccion-curation` off latest `main`.
- **S1 first** (independently shippable; LOW). May merge on its own as the quick-win drop.
- **S2 after S1.** **S2.0 pre-flight gates S2.1.** If S2.0 finds a backend route is needed, **merge backend first**
  (Cloud Run ~12 min, no preview) and degrade the frontend gracefully.
- **S3 after S2** (the shuffle must respect S2's admin order).
- **Risk tiers:** S2.1 is **MED** (admin product-metadata mutation) — reviewer may auto-merge on green CI, or
  Daniel merges (his call). Everything else LOW. No payments/checkout/fulfillment/auth-mutation/DB-migration.
- **Static-shell guardrail:** S1.2, S1.3, S3.1 must keep `next build` emitting `○ /`.

## Definition of Done (epic) — ✅ COMPLETE 2026-06-23

- [x] Categorías rows highlight individually on hover/focus; the container no longer lifts as one block. (S1.1)
- [x] No public surface shows signed-out-only CTAs to a signed-in user (or vice-versa); audit table recorded in
      `sprint-1.md`; `next build` keeps `(site)` static. (S1.2/S1.3, `e2e/home-auth-leakage.spec.ts`)
- [x] An admin can pin/unpin and reorder the Selección from `/admin/seleccion`; writes persist on **Medusa
      product metadata** (Medusa-first, S2.0 recorded — admin-scoped backend route reusing `updateSellerProduct`),
      are behind `requireAdmin`/`withAdmin`, and bust the `listings` cache; the homepage reflects changes within
      the ISR window. (S2.1–S2.3)
- [x] The Selección rotates across ISR windows (unpinned remainder shuffled, pinned/admin-ordered fixed);
      `next build` keeps `/` at `○`. (S3.1, `windowSeed` + `seededShuffle` in `lib/home-curation.ts`)
- [x] Each `sprint-N.md` has its smoke walkthrough; signed-in/admin steps flagged **owed to Daniel** (prod);
      status ticked with commit refs.
- [x] This `README.md` marked ✅ (`status: shipped`); `RETROSPECTIVE.md` written; durable learnings promoted to
      `Roadmap/LEARNINGS.md`.
- [x] Poster updated — `Roadmap/README.md` 01 · Discovery & Shopping line; ran `node scripts/build-order.mjs`;
      staged `BUILD-ORDER.md`. Team memory + index updated.
- [x] Kill-switch check: **none planned at grooming** (no high-risk money/auth path; admin write is additive
      behind existing auth) — confirmed at close, none needed.

**Owed to Daniel (operational, prod — none block the epic):** S1 signed-in CTA + per-row hover eyeball ·
S2 admin Clerk-session pin/reorder smoke + UCP `featured` metadata check · S3 cross-window "looks alive" eyeball.
