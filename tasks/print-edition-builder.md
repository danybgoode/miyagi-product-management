# Printed-Edition Builder — "Maqueta" (Phase 4)

Area: Monetization / Print · Priority: P1 · Status: ✅ FULLY SHIPPED + DEPLOYED 2026-06-03 (US-0→US-6; frontend `32e43d8`→`30a7f77` → Vercel; migration applied). Cloud Run PDF service **live** (`print-pdf` in project miyagisanchezback-497722, us-east4) + `PRINT_PDF_URL`/`PRINT_PDF_SECRET` set in Vercel prod. End-to-end verified in prod: `/api/admin/print/editions/[id]/pdf` → 2.1MB, 3 pages, Carta+3mm bleed. Nothing pending.
Parent: `tasks/print-edition.md` (Phases 1–3.3 shipped). Reference (end-state only, NOT signed off): `references/printed-edition-builder.md`.

## Shipped (Sprint 1) — `/admin/print/[editionId]/builder`
tsc + eslint + `npm run build` clean on every story. Migration `20260603000000_print_layouts.sql` live in linked Supabase (xljxqymsuyhlnorfrnno).
- **US-0** `32e43d8` — `print_layouts` table (1 JSONB doc/edition), `lib/print-layout.ts` (+`-server.ts`), layout API (`GET|PUT /api/admin/print/editions/[id]/layout`, secret-gated), builder shell + debounced autosave, "✎ Maquetar" entry link.
- **US-1** `32e43d8` — fractional CSS-grid pages at paper aspect-ratio, per-page density toggle (4-grid/8-grid), ⚡ Auto-acomodar batch packing, per-block size (¼/½/plana), shared hook-free `app/components/PrintAdBlock.tsx`.
- **US-2** `b4a1f01` — `@dnd-kit/core` drag-reorder within/across pages (`moveBlock` insert-with-shift), Fusionar (grow+absorb), editorial inserts (cover/section/filler) + approved social injection.
- **US-3** `84cb868` — floating right-side inspector: retro bg palette, border style, text size (wires `style.text_size`), per-field visibility (`hidden_fields`).
- **US-5a** `ce697d8` — `/admin/print/[editionId]/print`: @page Carta/Media-Carta + 3mm bleed + crop marks, `@media print` isolation from site chrome, reuses `PrintAdBlock` (screen = print), hi-res R2 images + vector text → browser "Save as PDF". `PrintToolbar` + "🖨 Vista de impresión" builder button.
- **US-4** `1e7bb21` — live catalog curation drawer: `/api/admin/print/catalog` (searchListings), modal → place a listing as courtesy ad or its shop spotlight; `listingToBlock`/`shopToBlock`; "Cortesía"/"Tienda" badge; `ensureLayoutQrs` fills real UTM QRs for all CTA blocks at print time.
- **US-5b** `17cf495` — print-ready PDF via a **separate Cloud Run service** (`services/print-pdf/`: puppeteer-core + apt Chromium; `preferCSSPageSize`+`printBackground`). Vercel proxy `/api/admin/print/editions/[id]/pdf` (inert 503 until env set) + "⬇ Descargar PDF". Fixed a blank-page bug (chrome reserved space → `display:none` on non-`<main>`). **Verified locally**: rendered the real 3-page edition → 3 pages, 221.9×285.4mm (Carta+3mm bleed). Deploy: `services/print-pdf/DEPLOY.md`.
- **US-6** `566a364` — production lock: "🔒 Enviar a imprenta" → `print_layouts.locked_at` + edition `in_production`; "🔓 Reabrir" clears it. Locked = read-only (banner, autosave + all mutators guarded, DnD/controls/inspector hidden). `setLayoutLock` + `POST|DELETE …/lock`.

## What this is

Miyagi's editorial/layout tool to **compose the actual magazine on the web layer**, replacing the manual InDesign step. Today the Phase-2 export ZIP feeds a hand layout (Option A, "designer-in-the-loop"); `PrintAdPreview` is explicitly *not* a print proof. This builder is the backlog item *"programmatic ad-tile rendering (Option B/C)"* — it lays ads onto modular grid pages and produces the print file directly.

## Grounding decisions (locked with Daniel 2026-06-02)

- **Layout = editorial, non-commerce data → Supabase** (AGENTS rule #2, same basis as `print_ad_submissions`). Blocks *reference* commerce; listings/sellers are read via the Medusa Store API (rule #1). No new Medusa concepts.
- **PDF engine: browser print-CSS first (Vercel), headless-Chromium-on-GCP later** (US-5a → US-5b). US-5a ships a real artifact this sprint with zero new infra. US-5b offloads the heavy render to **Cloud Run** (paid — no free-tier timeout/size ceilings that have bitten us before): puppeteer renders the *same* `/print` route, so the print-CSS page is the **single source of truth (screen = print)** and we avoid rebuilding blocks in a second primitive set. (`@react-pdf/renderer` on Vercel remains the no-Chromium fallback.) **CMYK is left to the printer** — true CMYK separation isn't achievable in an in-browser/RGB pipeline; the spec sheet already states CMYK and most MX digital printers accept hi-res RGB PDF/X and convert. State this honestly in the export UI.
- **First cut = paid/approved ad submissions only.** The live listing/shop "house ad" curation drawer is a later story (US-4). Rationale: paid placements are the revenue — give them a layout tool first.
- The existing **export ZIP stays** as a fallback handoff until the PDF path is trusted. Additive, not a replacement.
- Strings hardcoded `es-MX` (de-facto pattern; AGENTS rule #5 is stale per parent doc).
- New deps, introduced only when their story lands: `@dnd-kit/core` (+ sortable) on the frontend for US-2; `puppeteer-core` + `@sparticuz/chromium` (or full `puppeteer`) on the **backend / Cloud Run** for US-5b. None for US-0/1/3/5a — **Sprint 1 is unconstrained on Vercel** (client-side builder + small Supabase autosave; no heavy server work).

## Data model (US-0)

New migration `supabase/migrations/2026XXXXXXXXXX_print_layouts.sql` — one layout document per edition:

```
print_layouts
  id          UUID PK
  edition_id  UUID UNIQUE REFERENCES print_editions(id) ON DELETE CASCADE
  page_size   TEXT  -- 'carta' | 'media_carta'
  document    JSONB -- { density_default, pages: PrintPage[] }
  locked_at   TIMESTAMPTZ  -- set when sent to print (US-6)
  created_at / updated_at (reuse update_updated_at() trigger)
```

`lib/print-layout.ts` types (snapshot-with-ref model — block carries a content snapshot for reproducibility + a `source.ref_id` so the admin can re-pull):

```
PrintBlockSource = { type: 'submission'|'listing'|'shop'|'social'|'custom', ref_id?: string }
PrintBlockStyle  = { bg?: string, border?: 'thick'|'dotted'|'double'|'none', text_size?: 'xs'|'sm'|'base'|'lg', hidden_fields?: string[] }
PrintBlock       = { id, source, span: { w:1|2|4, h:1|2 } /*grid units*/, slot: number, content: PrintAdContent & {title?,price?}, style: PrintBlockStyle }
PrintPage        = { id, kind: 'grid'|'cover'|'editorial', density: 4|8, blocks: PrintBlock[] }
```

---

## User stories

### US-0 · Layout foundation & builder shell  *(enabler)*
**As** the admin, **I want** a per-edition builder workspace that persists, **so that** layout work survives reloads.
- [ ] Migration `print_layouts` + seed nothing (lazy-created on first open).
- [ ] `lib/print-layout.ts` (types above) + `lib/print-layout-server.ts` (load/upsert helpers).
- [ ] Route `app/admin/print/[editionId]/builder/page.tsx` (secret-gated via `?secret=`, full-width — not the `max-w-4xl` admin shell) + `BuilderClient.tsx`.
- [ ] API `GET|PUT /api/admin/print/editions/[id]/layout` (secret-gated; PUT autosaves debounced).
- [ ] "Maquetar" link on each `EditionRow` in `PrintAdminClient.tsx`.
- [ ] Tray panel listing the edition's **approved** submissions (unplaced vs placed).
- **Acceptance:** open builder → approved ads show in the tray → drop one on a page → reload → it's still there.

### US-1 · Modular grid + auto-pack from paid ads  *(ref US2 §1, US1 grid)*
**As** the admin, **I want** to auto-fill pages from approved ads on a fractional grid, **so that** I skip manual typesetting.
- [ ] Page grid renders fractions: 1/1 full, 1/2 (H & V), 1/4 box. Geometric alignment via CSS grid.
- [ ] Density toggle per page: **4-grid** (2×2) / **8-grid** (2×4).
- [ ] "Auto-acomodar" ingests all approved submissions sequentially, spinning up N pages, distributing into slots.
- [ ] Auto-sizing in 8-grid: hide `body`, smaller type, so micro-boxes don't clip.
- [ ] Block render = print-faithful variant of `PrintAdPreview` (reuse retro tokens).
- **Acceptance:** 6 approved ads → auto-pack creates pages and fills slots; toggling density re-packs without data loss.

### US-2 · Manual override — drag/drop · merge · editorial blocks  *(ref US2 §2)*
**As** the admin, **I want** to break the auto-grid by hand, **so that** the magazine reads like a publication, not a database dump.
- [ ] `@dnd-kit` drag a block between slots/pages; surrounding grid swaps/shifts.
- [ ] Merge two adjacent ¼ (or ⅛) blocks → single ½ block; product image scales up to new canvas.
- [ ] Inject custom non-product blocks: full-page cover, section header, retro filler.
- [ ] Inject social-section items (reuse `print_social_submissions`, approved + assigned to edition).
- **Acceptance:** drag a block from page 1 → page 2 (swap works); merge two cells → ½ spotlight; add a cover page at the front.

### US-3 · Floating inspector — per-block style  *(ref US1 §4)*
**As** the admin, **I want** quick non-destructive style tweaks per block, **so that** I hit the retro aesthetic fast.
- [ ] Floating inspector on block select: curated retro **bg palette** (hex swatches), **border style** (thick/dotted/double/none), **text size**, **field visibility** toggles (hide description, hide price, etc.).
- [ ] Persisted in `block.style`; reflected live in the block + carried to export.
- **Acceptance:** recolor a block + hide its description → persists across reload and appears in the print view.

### US-4 · Live listing/shop curation drawer  *(ref US1 §1–2)* — **Sprint 2**
**As** the admin, **I want** to pull live marketplace listings/shops into ad blocks, **so that** I can add editorial/house ads beyond paid placements.
- [ ] Side drawer: search/filter live Medusa listings + shops (Store API; `lib/medusa`).
- [ ] Auto-map a selected listing → block: main photo, title, description excerpt, price, `/l/[id]` (or `/s/[slug]`) CTA + generated QR (generalize `print-qr` to a standalone url→R2 helper).
- [ ] Visually distinguish **paid placement** vs **editorial/house** blocks; reflect in export spec.
- **Acceptance:** search → pick a live listing → block appears auto-populated; its QR resolves with the edicion-impresa UTM.

### US-5 · Print-ready output  *(ref US3)*
**5a — browser print-CSS (this sprint)**
- [ ] Route `app/admin/print/[editionId]/print/page.tsx` renders the full magazine with exact `@page` size: **Carta** 21.59×27.94cm / **Media Carta** 13.97×21.59cm, **3mm bleed**, crop marks.
- [ ] Hi-res asset swap (original uploads, not web thumbs); web fonts → vector text on Save-as-PDF.
- [ ] Export-config UI in the builder (dimension preset · bleed · density) + "Abrir vista de impresión".
- **Acceptance:** open print view → browser Save-as-PDF → dimensions/bleed correct, QR scannable, text crisp.

**5b — headless-Chromium PDF on GCP Cloud Run (later)**
- [ ] New internal endpoint on the Medusa backend (or a small dedicated Cloud Run service), `x-internal-secret`-gated like `/internal/print/*`: puppeteer + Chromium loads the secret-gated `/print` route (passed the edition + layout), waits for fonts/images, `page.pdf({ preferCSSPageSize: true, printBackground: true })`.
- [ ] PDF streamed back to the builder or staged to R2 (`print/pdf/<editionId>.pdf`); builder shows "Descargar PDF".
- [ ] Single renderer = the US-5a print-CSS page → screen and print are identical; no block rebuild. Runs on paid Cloud Run (comfortable memory/timeout for Chromium) — not Vercel.
- [ ] CMYK note surfaced (printer-side conversion). `@react-pdf/renderer` is the no-Chromium fallback.

### US-6 · Production lock & polish  *(backlog)*
- [ ] "Enviar a imprenta" snapshots + sets `print_layouts.locked_at`, flips edition → `in_production`.
- [ ] ZIP export remains as fallback; optional QR-scan analytics tie-in (GA/Clarity already wired).

---

## Sequencing
**Sprint 1:** US-0 → US-1 → US-2 → US-3 → US-5a  (a usable builder + a real print PDF over paid ads).
**Sprint 2:** US-4 (live-listing drawer) → US-5b (server PDF) → US-6 (lock/polish).

## Honest constraints / risks
- **CMYK**: not produced in-browser; printer converts from hi-res RGB PDF/X. Stated in UI.
- **Heavy PDF render runs on GCP Cloud Run, not Vercel** (US-5b) — paid, comfortable memory/timeout for Chromium; sidesteps the Vercel free-tier limits that bit us before. Sprint 1 + US-5a stay on Vercel (no heavy server work). Stage large PDFs to R2.
- **Snapshot vs live**: blocks snapshot content; a "re-pull from submission/listing" action keeps them fresh without surprise edits.
- **Capacity/monetization integrity**: only `approved` submissions auto-pack (they paid + passed editorial); house ads are clearly non-paid.
