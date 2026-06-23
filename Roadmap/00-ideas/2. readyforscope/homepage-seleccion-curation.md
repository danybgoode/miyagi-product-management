# Homepage Selección — bug sweep + admin curation + dynamic rotation

**Status: awaiting Daniel approval — no code yet.**
Source: Daniel grooming session 2026-06-23 (four homepage asks). Macro-section: **01 · Discovery & Shopping**
(where `homepage-polish-b` shipped). Builds directly on the shipped **Homepage Polish «Dirección B»** curation
and the shipped **Static marketplace shell** (the `(site)` static CDN tree + client-island personalization).

> **Packaging (Daniel, 2026-06-23):** *bugs first, then curation epic.* Sprint 1 (the two bugs + auth audit) is
> independently shippable and should land first as quick wins; Sprints 2–3 (admin curation + dynamic) follow. At
> scaffold time this can be **one epic with the sprint order below**, or **split into two epics** (a `homepage-auth-bug-sweep`
> shipped first, then `homepage-seleccion-curation`). Recommendation: **one epic, sprint 1 first** — they share the
> same surface and reuse list. Decide at approval.

---

## Stage-2.5 buckets (per ask)

| Ask | Class | Bucket | Why |
|---|---|---|---|
| #4 Categorías hover | **Bug** | — (defect) | Trivial CSS: rows live inside one `.card-tile` whose `:hover` lights the whole card. |
| #3 Logged-in sees signed-out CTAs + sweep | **Bug** | — (defect) | Static-shell de-personalization dropped the auth branch; signed-out CTAs were never gated. `AuthShow` already exists. |
| #1 Admin-manage Selección (pin/unpin + reorder) | **Feature** | **Light enhancement** | The pin primitive (`metadata.featured`) + admin shell + Clerk guard + curation seam already exist. We add a UI + a write path + an order field. No new tables, no new auth. |
| #2 Make selection change dynamically (shuffle per refresh) | **Feature** | **Light enhancement** | Pure-logic change in the existing next-free `home-curation.ts` seam. **No GCP job needed** (see decision below). |

---

## Key decision — "shuffle per refresh" on a static page

Daniel chose **shuffle per refresh**. The homepage is a **static CDN asset** (`app/(site)/page.tsx`, ISR
`revalidate = 60`) — the same HTML serves every visitor until it revalidates. A literal per-browser-refresh
shuffle would require a per-request function, which **LEARNINGS explicitly forbids** ("don't un-static the
shell"; a static homepage exists to kill the ~30 s cold-start).

**Resolution (in scope):** shuffle the **unpinned** pool **deterministically per ISR window** — seed the shuffle
by the current time-bucket so the order is stable within a revalidation cycle (no hydration mismatch, render is
deterministic) but **rotates roughly every cycle**. Pinned / admin-ordered items stay fixed and in admin order;
only the auto-filled remainder rotates. This honors the intent (the selection visibly changes over time),
**needs no GCP job**, and keeps `/` at `○` static.

> Daniel's steer was "leverage GCP not Vercel **if any processing is needed**." This slice needs no server
> processing — so the correct answer is **no new infra at all**. If Daniel later wants true per-visitor variety,
> that's a separate epic (a Cloud Run endpoint + client island, like the existing `HomePersonalizationProvider`),
> explicitly **out of scope** here.

---

## Why

1. The Selección is purely auto-curated today (pinned-first then freshest, 14-day cutoff) with **no admin UI** to
   control it — Daniel wants a human hand on the homepage merchandising.
2. It feels static between visits; Daniel wants it to rotate.
3. Two real defects degrade the homepage right now: signed-in users see signed-out CTAs (a regression from the
   static-shell migration), and the Categorías list has a broken hover affordance.

## Medusa-first reframe (AGENTS five-rule check)

- **Rule 1 (Medusa owns commerce):** the "pin" is **Medusa product metadata** (`metadata.featured`, already the
  primitive). Reorder rides a sibling field **`metadata.featured_rank`** (number, asc) on the same Medusa product —
  **no new table, no Supabase**. The admin write goes through a Medusa product-metadata update, **not** `db.from()`.
- **Rule 2 (Supabase = non-commerce only):** nothing here goes to Supabase.
- **Rule 3 (UCP/MCP):** featured/pinned is a discovery signal — **pre-flight**: check whether the UCP catalog
  (`/api/ucp/catalog`) should expose `featured`; if so, surface it so agents see the same curation (per-story check).
- **Rule 4 (Clerk):** the admin section reuses `requireAdmin`/`withAdmin` — no new auth. The bug-fix #3 reuses
  the existing client `AuthShow`/`useAuth` — no `currentUser()` re-introduced.
- **Rule 5 (es-MX):** admin copy es-MX only (admin is **not** on the bilingual allow-list, consistent with the
  admin-consolidation note). Homepage copy es-MX. **No new bilingual surface.**

## What already exists (reuse, don't rebuild)

- **`lib/home-curation.ts`** — `isPinned` (reads `metadata.featured === true`), `pickFeatured`, `curateGrid`,
  `isQualifying`, `byPinnedThenFresh`. Next-free seam, already unit-tested by `e2e/home-curation.spec.ts`. The
  reorder + shuffle land here as pure logic (free coverage).
- **`lib/listings.ts`** — `getCuratedPool` (one cached Medusa fetch), `getFeaturedListing`, `getCuratedListings`.
- **`metadata.featured`** on the Medusa product — the existing pin primitive. Add `metadata.featured_rank`.
- **Admin shell** `app/(shell)/admin/*` + **`lib/admin/guard.ts`** (`requireAdmin`/`withAdmin`) +
  **`lib/admin/identity.ts`** (`isAdminUser`) + the **`lib/admin/sections.ts`** nav registry — register a new
  `/admin/seleccion` section here.
- **`app/(shell)/admin/vecindario/`** — the closest analog (admin curating/moderating a homepage content surface):
  copy its client + route shape.
- **`AuthShow`** (`app/components/AuthShow.tsx`, `when="signed-in" | "signed-out"`) — the **exact** drop-in for
  bug #3. Already used in `PlatformShell`; the homepage just never wrapped its signed-out CTAs in it.
- **`HomePersonalizationProvider` / `useHomePersonalization` / `HomeSellerModule`** — the client-island idiom, if
  any gating needs the seller-snapshot data (not just signed-in/out).
- **`.card-tile` / `.card-panel`** CSS + design tokens (`--surface-muted`, `--bg-sunk`, `--border`, `--accent`) —
  for the hover fix. `card-panel` is the no-hover container variant.
- **Medusa admin products API / `apps/backend/src/api/admin/`** — the product-metadata write path (pre-flight S2.0).

---

## Stories — sprints, risk, QA

### Sprint 1 — Homepage bug sweep *(ship first; LOW)*

**S1.1 — Categorías per-row hover**
- **As a** buyer on the homepage, **I want** each Categorías row to highlight on hover (and look individually
  clickable), **so that** I can tell I'm selecting one category, not the whole list.
- **Root cause:** the section wraps N `<Link>` rows in one `<div className="card-tile">`; `.card-tile:hover` lights
  the whole card (border-accent + shadow + translateY), and the rows carry no per-row hover. (`app/(site)/page.tsx`
  Categorías block; `.card-tile` rules `app/globals.css:687-704`.)
- **Fix:** make the container a non-hover surface (e.g. `card-panel`, or strip the hover transition from this
  instance) and add a **per-row hover** (`background: var(--surface-muted)` / `--bg-sunk`) on each row `<Link>`,
  with the row keyboard-focusable too.
- **Acceptance:** hovering one row highlights **only that row**; the container no longer lifts/▸borders as one
  block; click target per row unchanged; keyboard focus shows the same row highlight.
- **QA:** anonymous browser smoke (Claude-in-Chrome hover on a row) — the highlight is visual, owed as an eyeball
  to Daniel on preview. **Risk: LOW.**

**S1.2 — Gate signed-out CTAs on the homepage**
- **As a** signed-in user on the homepage, **I want** the "Únete a la comunidad / Crear cuenta" terminal CTA and
  any "Abre tu tienda"-type signed-out prompt to **not** show, **so that** the page reflects that I'm logged in.
- **Root cause:** static-shell S2 removed the homepage auth branch; the signed-in modules returned as client
  islands (`HomeSellerModule`), but the **signed-out** terminal CTA (`page.tsx` "Únete a la comunidad" block) and
  the empty-state CTAs render server-side for **everyone**, never wrapped in `AuthShow`.
- **Fix:** wrap the signed-out-only blocks in **`<AuthShow when="signed-out">`** (drop-in; keeps the page static —
  signed-out HTML prerenders, then hydrates away for signed-in sessions). Confirm `next build` still emits `○ /`.
- **Acceptance:** signed-out visitor sees the terminal CTA exactly as today; a signed-in visitor sees it gone (and
  sees their `HomeSellerModule` island instead, no duplicate recruit prompt). `next build` keeps `/` static.
- **QA:** the SSR-marker + decision pattern from `home-static.spec.ts` / `home-personalization` specs; an **authed
  browser smoke** (signed-in → CTA absent) is **owed to Daniel on prod** (the island/auth path can't false-pass on a
  preview, per LEARNINGS). **Risk: LOW** (display gating only — no auth mutation).

**S1.3 — Full signed-out/in leakage audit + fixes**
- **As a** signed-in user, **I want** no public surface to show me signed-out-only prompts (and vice-versa), **so
  that** the app is consistent post static-shell migration.
- **Scope:** grep every `(site)` static surface + shared chrome for hardcoded signed-out/in CTAs not gated by
  `AuthShow` — homepage empty-state CTAs, `PlatformShell` nav, `MobileTabBar`, `/vende`, `/acerca`, the
  seller-acquisition landing pages, `/l`. Produce a short findings list; fix each leak by wrapping in `AuthShow`
  (or the island idiom where seller data is needed).
- **Acceptance:** a written audit table (surface · leak · fix) in `sprint-1.md`; every identified leak gated; no
  surface shows both states; `next build` keeps `(site)` static.
- **QA:** per-surface anonymous SSR assertion where a spec exists; authed eyeballs owed to Daniel. **Risk: LOW.**

### Sprint 2 — Admin curation (pin/unpin + reorder) *(LOW–MED)*

**S2.0 — Pre-flight (no code):** read `apps/backend/src/api/admin/` + Medusa admin products API — confirm the
product-metadata write path (`metadata.featured`, `metadata.featured_rank`) and whether a custom admin route is
needed or native Medusa admin update suffices. Confirm whether UCP catalog should expose `featured` (Rule 3).
Record the finding in `sprint-2.md`. **Gates S2.1.**

**S2.1 — Admin write path: toggle + rank a product's featured state**
- **As an** admin, **I want** to set/unset a product's featured pin and its order, **so that** I control the
  Selección. Write `metadata.featured` (bool) + `metadata.featured_rank` (number) on the **Medusa product** via the
  path confirmed in S2.0, behind `withAdmin`. Bust the `listings` cache tag on write so the homepage reflects it.
- **Acceptance:** an admin call pins/unpins a product and sets its rank; an unauthorized call is rejected;
  homepage curation reflects the change within the ISR window. **QA:** route spec (auth + write + cache-bust). **Risk: MED** (admin mutation; reviewer or Daniel merge — Daniel's call).

**S2.2 — `/admin/seleccion` UI (pin/unpin + drag-reorder), registered in admin nav**
- **As an** admin, **I want** a screen listing candidate products with pin toggles and reorder, **so that** I can
  curate without touching Medusa admin directly. Build on the `/admin/vecindario` client shape; register in
  `lib/admin/sections.ts`. es-MX copy. (Reorder UI may use a small drag lib — allowed per Daniel.)
- **Acceptance:** admin pins, unpins, and reorders; saves persist (S2.1); reflected on the homepage next window.
  **QA:** Clerk-gated admin spec (auth harness `e2e/_helpers/auth.ts`) + admin browser smoke owed to Daniel.
  **Risk: LOW** (admin UI).

**S2.3 — Curation reads honor admin order**
- Update `home-curation.ts` so pinned items sort by `featured_rank` asc (then fresh) and the featured pick is the
  lowest-rank pin. **Acceptance:** pure-logic spec covers rank ordering + tie-break. **Risk: LOW.**

### Sprint 3 — Dynamic rotation (shuffle per ISR window) *(LOW)*

**S3.1 — Deterministic per-window shuffle of the unpinned remainder**
- **As a** returning buyer, **I want** the Selección to rotate over time, **so that** the homepage feels alive.
  In `home-curation.ts`, shuffle the **unpinned qualifying** pool with a seed derived from the current ISR
  time-bucket; pinned/admin-ordered items stay fixed. Stable within a window (deterministic render), rotates across
  windows. Keep `/` static.
- **Acceptance:** pure-logic spec — same seed ⇒ same order (deterministic); different buckets ⇒ different order;
  pinned items never move; featured pick stable per window. `next build` keeps `/` at `○`. **QA:** the api gate
  (free coverage on the seam) + a "looks different later" eyeball owed to Daniel. **Risk: LOW.**

---

## In scope (v1)
- Categorías per-row hover fix.
- Homepage signed-out-CTA gating + a full cross-surface auth-leak audit & fixes (via `AuthShow`).
- Admin pin/unpin + reorder of the Selección, on Medusa product metadata, behind the existing admin shell/guard.
- Curation honoring admin order; deterministic per-window shuffle of the unpinned remainder.

## Out of scope (routed out)
- **True per-visitor / per-refresh shuffle** (would need a per-request function / Cloud Run island — defer to its
  own epic; would un-static the shell).
- **Any GCP Cloud Scheduler / Cloud Run job** — not needed for per-window shuffle.
- **Scheduled/timed campaigns** (e.g. "feature X only next week") — future enhancement on top of the pin model.
- **Per-shop / seller-facing featuring controls** — this is admin-only v1.
- **Suspend/visibility or other tenant actions** — owned by the `admin-consolidation` epic.

## Open risks / watch-items
- **Static-shell guardrail:** every change must keep `/` at `○` in `next build` — verify in S1.2, S1.3, S3.1.
- **Authed smokes can't false-pass on previews** (LEARNINGS): the signed-in eyeballs (S1.2, S1.3, S2.2) are owed
  to Daniel on **prod**.
- **S2.0 pre-flight** must confirm the Medusa-first write path before any admin write is built (don't invent a
  Supabase pin).
- **Cache coherence:** the admin write must bust the `listings` tag or curation lags a full ISR window.
- **Hydration determinism:** the S3 shuffle must be seed-stable per render or it'll throw a hydration mismatch.

## Research citations
- LEARNINGS.md (2026-06-22): static-shell pattern, "don't un-static the shell," GCP-island personalization,
  client-side gating to add surfaces without un-static-ing (lines ~492–532).
- README.md poster: Homepage Polish «Dirección B» (Selección de la semana) + Static marketplace shell entries.
- Code: `app/(site)/page.tsx`, `lib/home-curation.ts`, `lib/listings.ts:188-235`, `app/components/AuthShow.tsx`,
  `app/components/HomePersonalizationProvider.tsx`, `app/(shell)/admin/*`, `lib/admin/guard.ts`.

## Definition of Ready check
- [x] "As a / I want / so that" + testable acceptance per story.
- [x] Stage-2.5 bucket named per ask.
- [x] v1 in/out boundary written; "shuffle per refresh" reconciled with the static shell.
- [x] Reuse list produced (Medusa-first reframe done; pin = `metadata.featured` + `featured_rank`).
- [x] Each story risk-tiered; QA stage named; smoke-eyeball owners identified.
- [ ] **Daniel approves this scope doc** → then scaffold epic + sprint docs (commit path-scoped) and emit the
      per-sprint Claude Code kickoffs.
