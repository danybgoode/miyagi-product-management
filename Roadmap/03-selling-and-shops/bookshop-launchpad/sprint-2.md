# Bookshop launchpad — Sprint 2: The excerpt + the shelf

**Status:** ✅ built on `feat/bookshop-launchpad` (frontend-only) — awaiting PR review + merge.
- Story 2.1 ✅ — excerpt "Lee un adelanto" on digital PDPs (commit `29eafe1`)
- Story 2.2 ✅ — the "Convocatoria" launchpad shelf (commit `3dc9e26`)
- Gate green: `tsc --noEmit` + `next build` + Playwright `api` (excerpt.spec.ts + launchpad-shelf.spec.ts, 23 pure tests).
- Behind `launchpad.enabled` (default OFF). Real-phone reading UX + the money path are **owed to Daniel**.

**Plan-mode decisions (2026-07-07):**
- **Excerpt = text only.** Best mobile-data UX — no pdf.js, no binary, no server rasterization. Stored inline
  on `product.metadata.excerpt = { text }` (the backend seller-product PATCH shallow-merges metadata, so no
  backend change). "PDF pages / pdf.js" rejected for perf on the make-or-break mobile reading flow.
- **Any digital listing** gets the excerpt (naturally covers launchpad books, reuses cleanly). Seller editor
  gated behind `launchpad.enabled`; the PDP viewer renders whenever an excerpt is present (dark until a seller
  adds one with the flag on).

## Stories

### Story 2.1 — Excerpt on digital PDPs ✅
**As a** reader, **I want** a free "Lee un adelanto" sample inline on the listing page, **so that** I can taste the work before buying or voting.
**Acceptance:** seller pastes an excerpt (text) separate from the full file; inline collapsible viewer works on
mobile (text prose — instant, no viewer library); full file stays private-bucket; excerpt presence exposed on
UCP (`has_excerpt`); absent excerpt = today's PDP.
**Shipped:** `lib/excerpt.ts` (pure normalize/read seam) · excerpt on the existing `/api/sell/listing/[id]`
PUT (behind flag; one composed metadata object so it never collides with `custom_fields`) · textarea in
`EditForm` (digital + flag) · `ExcerptPanel` collapsible island on the PDP (channel-agnostic) · `has_excerpt`
in `toUcpListing` (both catalog routes).
**Risk:** MED

### Story 2.2 — The launchpad shelf ✅
**As a** bookshop, **I want** published submissions auto-suggested into a "Convocatoria" collection (OSPP), hero-able on my storefront, **so that** the launchpad has a visible home.
**Acceptance:** suggestion, not force (seller confirms); shelf renders via existing collection pages; works listed with excerpt badges.
**Shipped:** `lib/launchpad-shelf.ts` (pure deriver) · `GET/POST /api/sell/launchpad/shelf` (find-or-create
the collection + assign each missing work, UNION with its existing seller collections — the **first**
product→collection membership path in the app, reusing OSPP S2's backend `collection_ids`) · `ShelfCard`
suggestion on the convocatoria page · "📖 Adelanto" badge on shop/collection listing cards. Hero-able via
OSPP's existing collection tooling (the shelf is an ordinary collection).
**Risk:** LOW

## Sprint QA
- **api spec(s):** `e2e/excerpt.spec.ts` (normalize / read predicates / UCP `has_excerpt`) · `e2e/launchpad-shelf.spec.ts` (shelf-suggestion deriver).
- **browser smoke owed:** yes, to Daniel — excerpt reading flow on a real phone (the make-or-break UX) + the shelf confirm on a live shop.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge. ✅

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the branch preview URL while testing pre-merge)
**Precondition (owed to Daniel):** flip `launchpad.enabled` **ON** in `/admin/flags` — the excerpt editor +
shelf card are hidden while it's OFF (fail-safe). You need at least one **published digital listing** (use an
S1 launchpad publication, or any digital listing).

1. As the seller, open **Editar anuncio** on a digital listing (`/sell/edit/<id>`).
   → An **"Adelanto — Lee un adelanto"** textarea appears (only for digital listings, only with the flag ON).
2. Paste a few paragraphs (e.g. the first chapter), **Guardar cambios**.
   → "Cambios guardados". Reopen the editor → the text is still there (persisted on the product metadata).
3. Open the listing's PDP on a **phone** (private window): `https://miyagisanchez.com/l/<id>`.
   → A **"Lee un adelanto"** panel shows below the digital "Entrega al instante" banner; tapping it expands
     the sample inline, smooth on mobile data. The full manuscript file is NOT reachable (still private).
4. `GET https://miyagisanchez.com/api/ucp/catalog/<id>` (or `/api/ucp/catalog`).
   → `has_excerpt: true` for that listing (and `false` for a digital listing with no excerpt).
5. Back in the seller shell → **Convocatoria** (`/shop/manage/convocatoria`).
   → A **"Crea tu estante «Convocatoria»"** card appears when you have published launchpad works not yet
     shelved. Click **"Crear estante Convocatoria"**.
   → Success state: "Estante Convocatoria listo — agregamos N obras". A **"Ver estante ↗"** link opens the
     collection page (`/s/<shop>/c/convocatoria`) listing the works, each carrying a **📖 Adelanto** badge
     when it has an excerpt.
6. Reload the Convocatoria page.
   → The suggestion card is **gone** (everything is shelved). Re-running the action is a safe no-op.

If any step fails, note the step number + what you saw — that's the bug report.
