# Zine editing central — Sprint 2: variable sheets + the other two sources

**Status:** ✅ Sprint 2 complete — all 3 stories built and verified

## Stories

### Story 2.1 — Variable booklet sheets ✅
**As** Daniel (editor), **I want** the booklet to grow/shrink in pliegos (multiples of 4 pages — one
folded oficio sheet = 4 pages) instead of the hardcoded 12, with the editorial sections staying
fixed/pinned, **so that** an issue with more or fewer sold ads still imposes and prints correctly.
**Acceptance:** add a pliego → 4 new ad-capable pages appear in reading order; remove one (only if
its pages are empty) → back down; editorial sections keep their positions; the imposition view and
exported PDF pair pages correctly for 8, 12, 16, 20 pages (saddle-stitch: first↔last, etc.).
**Note:** booklet-only — the trifold's sheet count is fixed by the physical fold.
**Risk:** LOW (vitest-heavy: imposition pairing is a pure function)
**Done:** commits `757458e` (Story 2.1) + `9788750` (a real bug the live smoke caught: growing
autosaved a 500 because a neutral extra page had `body:""`, and the zod schema required non-empty —
relaxed to match `clearAdSlot`'s existing intent) in `apps/zine`. `lib/imposition.ts`
(`buildImposition`/`buildReadingSpreads`, regression-pinned against the exact prior 12pp hardcode) +
`lib/booklet-layout.ts` (`resolvePinnedPages`/`extraAdPageNumbers`/`growBooklet`/`shrinkBooklet`/
`canShrinkBooklet`). 8pp floor drops guest column, neighborhood briefs, 2nd classifieds page, and the
full-page ad (confirmed with Daniel) — a strict subset of 12pp, content hidden not deleted; shrinking
12→8 is blocked while `ads.fullPage` still holds a placement. 41→45 vitest green through this story's
two commits. Live-verified end-to-end in the browser: grow 12→16pp recomputed the imposition guide to
exactly `buildImposition(16)`'s output (16/1, 2/15, 14/3, 4/13, 12/5, 6/11, 10/7, 8/9, sums to 17);
shrink round-tripped back to the byte-identical original 12pp layout.

### Story 2.2 — Catalog pull: live listings as house-ads ✅
**As** Daniel (editor), **I want** to search live marketplace listings from zine and drop one in as
a courtesy/house ad with auto-generated QR + `mschz.org` short link, **so that** I can fill unsold
space with real catalog the way Maqueta's curation drawer did.
**Acceptance:** search by keyword returns live listings (title, price, photo, shop); placing one
auto-fills a house-ad block with QR resolving to the listing; snapshot + `ref_id` kept.
**Risk:** LOW
**Done:** commit `ae98029` in `apps/zine`. No new backend route needed — `studio/catalog` shipped
ahead of schedule in Sprint 1. `CatalogDrawer.tsx` (search + place/unplace, no server-side status to
flip — a listing pull is content-only) + `lib/catalog-mapping.ts` (content-lossless, 4 vitest cases).
QR rendering was genuinely new work (no ad slot rendered a QR before this): `BookletAdSlot.ctaUrl` +
`lib/qr.ts` `createBookletAdQrMap` + a `qrSvgs` prop threaded through `BookletPreview` into every
`AdSlot` call site + a `.booklet-qr-box` CSS rule. **QR/CTA uses the canonical `${siteUrl}/l/[id]`
URL, not an `mschz.org` short link** — matches the existing `listingToBlock` precedent on the
marketplace side and satisfies the acceptance text ("QR resolving to the listing"); short codes live
only in a Supabase mirror table the catalog route doesn't join, so wiring one would have been real
added scope for a LOW-risk story (flagging since the epic README's phrasing implies mschz.org).
45/45 vitest green. Live-verified: the drawer renders and degrades gracefully (502 + Spanish message)
without `PRINT_STUDIO_TOKEN`, same pattern as Sprint 1's `PaidAdsDrawer`.

### Story 2.3 — Social pull: community submissions into the social section ✅
**As** Daniel (editor), **I want** approved community submissions (recomendaciones, eventos,
saludos…) pulled into the zine's community/social editorial section, **so that** the reader-facing
section fills from real submissions instead of hand-typing.
**Acceptance:** approved social submissions for the edition are listable and placeable into the
social section blocks (caption, body, photos, zone, type label); placement snapshots content.
**Risk:** LOW
**Done:** backend-first. **PR #164**:
https://github.com/danybgoode/miyagisanchezcommerce/pull/164 — **merged** (squash `55bdce9`,
branch `feat/zine-editing-central-s2` deleted), built in an isolated worktree (the shared checkout
was on a sibling epic's branch). CI green (`Type-check + build`, `Playwright vs preview`). Sprint 1's
own route comments assumed a `studio/social/[id]` write-back existed; it didn't — this PR adds it
(`isValidStudioSocialTransition` + `toStudioSafeSocialSubmission`, modeled on the ad-submission
sibling), fixes a PII leak on `studio/social` GET (bare `select('*')` → the safe projection), and
adds `?editionId=` filtering. **7 rounds of advisory codex cross-review** (`scripts/cross-review.mjs`,
posted as a PR comment) surfaced real issues beyond the initial build, all fixed before merge: a
read-then-write race on the PATCH (guarded on prior status/edition_id), an unvalidated `editionId`
reaching a raw PostgREST filter, `studio/social` GET excluding `placed` rows (a submission the
studio just placed would vanish from its own list), a placed-but-unassigned row leaking into every
edition's queue once `placed` was included, placing being able to silently reassign an already-
assigned row to a different edition, a JSON `null` body 500ing instead of 400ing, plus a PII-safe-
projection regression test that didn't exist before. zine-side: commits `de413ca` + `d638e73` (a
matching round of zine-side cross-review fixes — see below). **`BookletData.extraAdPages` became a
discriminated union** (`{kind:"ad",slot}|{kind:"social",item}`) rather than a separate "community
section" — a placed social submission occupies the same generic extra page Story 2.1 introduced,
reverting to a neutral ad slot when un-placed (no neutral "social" state — the schema now enforces
this too, `source` is required on a social item, not nullable). `lib/social-mapping.ts`
(content-lossless + write-time slot-occupancy validation, 9 vitest cases) + `SocialDrawer.tsx`
(edition-scoped list, page-number slot picker, shows "agrega un pliego" at 12pp per Decision 3;
place/unplace confirm the remote write-back before mutating local state, so a network failure can't
leave a page occupied with no way to undo it). 57/57 vitest green. Live-verified: the "agrega un
pliego" message disappears exactly when growing past 12pp, and the extra pages keep rendering
correctly through the type refactor.

## Sprint QA
- **unit (apps/zine vitest):** imposition pairs for 8/12/16/20 pages (regression-pinned against the
  prior 12pp hardcode) · `resolvePinnedPages`/`extraAdPageNumbers` combined coverage invariant ·
  listing→house-ad mapping · social→extra-page mapping · grow/shrink state transitions incl. a placed
  page blocking shrink · a schema round-trip regression test (caught a real bug, see Story 2.1's
  done-note). 52/52 green across the sprint's 3 commits.
- **api spec(s):** extended (not new, per this doc's original plan) — Story 2.3's backend PR adds
  401/wrong-token coverage + the `isValidStudioSocialTransition` truth table to Sprint 1's
  `e2e/print-studio-api.spec.ts`. 15/15 green (13 passed, 2 skipped pending owed token/id
  provisioning) on that spec; full `api` suite 1211/1224 (13 pre-existing "no local Medusa backend"
  failures, unrelated).
- **browser smoke:** live-verified in this sprint (grow/shrink round-trips, imposition guide
  recompute, both drawers rendering) — see each story's done-note. **Still owed to Daniel:** the
  actual place-a-real-ad/listing/submission-into-a-real-slot round trip (needs a real open edition
  with real approved content in prod, same gap Sprint 1 had) + a physical fold-and-check of an
  exported PDF at a non-12pp size.
- **deterministic gate:** `tsc --noEmit` + builds + suites green before merge — confirmed for both
  repos (zine locally, marketplace via PR #164's CI).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: local `apps/zine` (`npm run dev` → http://localhost:3000) + production marketplace for the
studio API.

**Before you start (one-time, owed — same as Sprint 1's walkthrough):**
- `PRINT_STUDIO_TOKEN` must be set as a Vercel env var on `miyagisanchez` (Sprint 1 already asked for
  this) and match the value in `apps/zine/.env.local`; `PRINT_STUDIO_API_BASE` in that same file
  should point at `https://miyagisanchez.com` (post-merge of PR #164).
- In the admin console (`/admin/print`), have at least one **open** edition with at least one
  **approved** ad submission, one live **catalog listing** (any published listing works), and one
  **approved** social/community submission. An empty drawer at steps 3–5 below usually just means
  this step was skipped, not a bug.

1. `cd apps/zine && npm run dev` → open http://localhost:3000, load the `el-barrio-issue-03` booklet
   edition.
   → Header reads "CARTA · 12 PAGINAS · ..."; the section rail includes "Catálogo" and "Comunidad"
   (new this sprint) alongside Sprint 1's "Anuncios pagados".
2. Open "Comunidad" in the rail.
   → It reads "Sin páginas de comunidad todavía — agrega un pliego en 'Cabecera del booklet'." (no
   community-capable page exists at 12pp — this is correct, not a bug).
3. Open "Cabecera del booklet" → click "+" next to "Páginas (3 pliegos)".
   → Header updates to "16 PAGINAS"; the on-screen reader shows two new blank "Anuncio" pages at
   pp. 10–11 (extra pages split symmetrically around the center spread, NOT appended at the end);
   status reads "Autosaved" with no error.
4. Scroll to the print/imposition view's "Imposicion para imprimir" guide.
   → Reads "4 pliegos encartados... los pares suman 17", with the grid: 16/1, 2/15, 14/3, 4/13,
   12/5, 6/11, 10/7, 8/9.
5. Re-open "Comunidad" — the "agrega un pliego" message is gone, replaced by an edition selector +
   a list of approved submissions (or "Sin aportaciones aprobadas" if step "Before you start" was
   skipped for this edition).
6. Pick an approved submission → choose a page from the "Página" dropdown (shows the real page
   numbers, e.g. "p. 10") → click "Colocar".
   → The chosen extra page fills with the submission's caption/body/photo/zone; the row now reads
   "placed". Back in `/admin/print`, that submission shows **placed**. Click "Quitar" in zine → it
   reverts to **approved** in both places.
7. Open "Catálogo" → search a keyword that matches a live listing → click "Colocar" on a result into
   one of the 8 named ad slots (e.g. "Cuarto de plana · p.8").
   → The slot fills with the listing's title/price/photo; a QR appears in the ad block, scanning to
   the listing's canonical page (`miyagisanchez.com/l/<id>` — not an `mschz.org` short link, see
   Story 2.2's done-note).
8. Try to remove the added pliego (the "-" button next to "Páginas") while the community page placed
   in step 6 is still occupied.
   → The button is disabled ("Quitar pliego" greyed out) — a placed page blocks shrink, same as a
   placed ad.
9. Click "Quitar" on the community placement (undoes step 6) → click "-" again.
   → Back to 12 pages (3 pliegos); the imposition guide recomputes to the original 12pp layout
   (12/1, 2/11, 10/3, 4/9, 8/5, 6/7) byte-identical to pre-Sprint-2.
10. Export the PDF (Descargar PDF) at 16pp (grow once more first if you shrank back).
    → **Owed to Daniel:** fold the printed/exported proof and confirm the physical page order
    matches step 4's imposition grid.

If any step fails, note the step number + what you saw — that's the bug report.
