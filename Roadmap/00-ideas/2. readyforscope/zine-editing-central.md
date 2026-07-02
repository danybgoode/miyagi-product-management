---
title: "Zine = the editing central — integrate the standalone zine studio with the marketplace print pipeline"
slug: zine-editing-central
status: awaiting-approval
area: "06"
type: feature
archetype: builder
risk: high
relates_to: "06-print-edition/printed-edition-builder (Maqueta, shipped) · references/zine (the studio) · references/printed-edition-builder.md + references/social-editorial.md (reference end-states, inspiration only)"
updated: 2026-07-02
---

# Zine = the editing central

**Status: awaiting Daniel approval — no code yet.** Class: **Feature** (integration epic, ~3 sprints).
Overall risk **HIGH** (new machine-auth surface + write-back to advertiser-facing status), most stories LOW.

## The ask (mirrored)

The standalone **zine studio** (`references/zine` — the real editorial + design of the printed magazine)
becomes the single editing central: it pulls the marketplace's **paid ad submissions**, **live catalog
listings**, and **approved social posts**; the **booklet's sheet count becomes variable** (editorial
sections stay fixed); features from `/admin/print` consolidate into zine; merchant ad designs are placed
verbatim (fine-tune styling only, never their content). Zine **stays standalone** as an app.

## Stage 2.5 bucket — genuinely new (bucket 3), with a caveat

The shipped **Maqueta** (`/admin/print/[id]/builder`) *already* pulls paid submissions + catalog listings +
social posts onto a canvas and exports print-ready PDF. If the outcome were only "lay out sold ads," we'd
be done today. The genuinely-new part: the real magazine design lives only in zine, and zine has no
marketplace connection at all (hand-typed JSON). This epic is the bridge — plus retiring the duplicate
layout tool so there's one builder.

## Decisions (Daniel, 2026-07-02, via groom Q&A)

1. **Architecture:** zine moves into the monorepo as **`apps/zine`** — still its own app (own port, own
   local run), sharing the repo so merchant ad render templates can be shared without drift.
2. **Runtime:** **local-only tool** on Daniel's machine. File-based editions/uploads stay. It reads/writes
   prod marketplace data via a service token.
3. **Maqueta fate:** **deprecate the layout builder** in `/admin/print`. Admin keeps the commerce +
   moderation side (editions, tiers, providers, payments, review queues, export). Layout/design happens
   only in zine.
4. **Write-back:** **yes** — placing an ad in zine flips the submission to `placed` (and un-placing
   reverts), so advertiser-facing status + capacity accounting stay truthful.

## What I validated (Stage 3 research — repo, not assumptions)

- **Merchants do NOT upload finished artwork.** The self-serve ad builder produces structured
  `PrintAdContent` (headline, subhead, body, logo, photos, contact, CTA target, `template_choice`) that
  marketplace print templates render. "Don't interfere with the merchant's design" therefore means: zine
  renders **the same template with their content**; fine-tuning = style overrides (bg/border/text-size/
  hide-fields — the existing `PrintBlockStyle` vocabulary), content read-only.
- **"Paid listings" =** `print_ad_submissions` (Supabase) with capacity-occupying status
  (`paid`/`approved`); the sold placement itself is a **Medusa product** per tier. `placed` already exists
  in the status enum — write-back is an existing transition, not a new state.
- **Social posts =** `print_social_submissions`, status `approved`, via existing admin routes.
- **Catalog pulls =** live Medusa listings via `/api/admin/print/catalog` (`searchListings`, rule #1 clean).
- **Zine today:** standalone Next 16 app (`miyagi-trifold-studio`), file-based store
  (`data/editions/*.json` + `public/uploads/`), zod schema, vitest suite, pdf-lib/playwright export.
  Two formats: **trifold** (6 fixed panels A–F) and **booklet** (**hardcoded 12 pages = 3 pliegos
  oficio**, saddle-stitch imposition in `BookletPreview.tsx`). Ad slots are fixed named slots
  (`halfPage`, `quarterPage`, `fullPage`, `backCover`, `centerSpread`).
- **Machine-auth precedent exists:** `withSupplyAdmin` (Clerk admin OR shared `ADMIN_SECRET`) is the
  documented pattern for headless paths with no Clerk session — the zine bridge mirrors it with a
  dedicated `PRINT_STUDIO_TOKEN`.

## What already exists (reuse, don't rebuild)

| Piece | Where | Reuse as |
|---|---|---|
| Print domain types + status enums | `apps/miyagisanchez/lib/print.ts` | the wire contract (submissions, social, tiers) |
| Admin read routes: submissions / social / catalog | `app/api/admin/print/{submissions,social,catalog}` | thin token-gated wrappers or a guard variant — no new queries |
| Submission status PATCH | `app/api/admin/print/submissions/[id]` | the `placed` write-back |
| Ad-block render + style vocabulary | `lib/print-layout.ts` + builder/print components | shared merchant-ad renderer in zine |
| Machine-auth guard pattern | `lib/admin/guard.ts` (`withSupplyAdmin`) | `withPrintStudio` (Clerk admin OR `PRINT_STUDIO_TOKEN`) |
| QR + short links | `lib/print-qr.ts`, `mschz.org` codes | catalog house-ads in zine |
| Zine editor, geometry, PDF export, vitest suite | `references/zine` | moves as-is to `apps/zine` |
| Content snapshot + `source.ref_id` pattern | `lib/print-layout.ts` | zine blocks snapshot content + keep a ref to re-pull |

**Medusa-first note:** zero new Medusa work and zero new Supabase tables. Placements are already Medusa
products; editorial state is already Supabase; zine's layout state stays in its local files. The whole
epic is a bridge + a page-model generalization. (Rule #3: this is admin-internal tooling, same
agent-exposure posture as the shipped Maqueta epic — not a UCP surface.)

## Scope — sprints & stories

### Sprint 1 — the bridge (skateboard: a real paid ad lands in zine)
| # | Story | Risk | QA |
|---|---|---|---|
| 1.1 | **Move zine into the monorepo as `apps/zine`**, behavior-identical (unique package name — see LEARNINGS workspace-resolution gotcha; excluded from the frontend Playwright gate; its own vitest green) | LOW | zine vitest suite green post-move |
| 1.2 | **Print-studio API**: token-gated read endpoints (editions, paid/approved submissions, approved social, catalog search) + `placed`/un-place write-back, via a `withPrintStudio` guard (Clerk admin OR `PRINT_STUDIO_TOKEN`) | **HIGH** (new auth surface + advertiser-facing status mutation — Daniel merges) | one Playwright `api` spec per endpoint: 401 without token, correct shape with |
| 1.3 | **"Anuncios pagados" drawer in zine**: browse an edition's paid ads, place one into a booklet ad slot rendered with the merchant's template + content verbatim; placing/un-placing writes back | LOW (zine-side) | vitest: submission→block mapping is content-lossless |

### Sprint 2 — variable sheets + the other two sources
| # | Story | Risk | QA |
|---|---|---|---|
| 2.1 | **Variable booklet sheets**: page count grows/shrinks in pliegos (multiples of 4), editorial sections stay fixed/pinned, ad pages repeatable; imposition + PDF export generalize from the hardcoded 12 | LOW | vitest: imposition pairs correct for 8/12/16/20 pages; export snapshot |
| 2.2 | **Catalog pull**: search live listings from zine, drop as house-ads with auto QR + short link | LOW | vitest: listing→block mapping; api spec reuses 1.2 |
| 2.3 | **Social pull**: approved community submissions into the community/social editorial section | LOW | vitest mapping spec |

### Sprint 3 — consolidation
| # | Story | Risk | QA |
|---|---|---|---|
| 3.1 | **Deprecate the Maqueta layout builder**: remove/hide builder UI from `/admin/print` (editions/tiers/providers/submissions/review/export stay), pointer to zine; announce (touches a shipped admin surface) | LOW | api spec: admin print pages still serve; builder route gone/redirects |
| 3.2 | **Fine-tune guardrails**: merchant-ad blocks expose style overrides only; content fields visibly locked with "diseño del anunciante" affordance | LOW | vitest: style override never mutates content snapshot |
| 3.3 | Epic close: poster update, retro, LEARNINGS promotion | LOW | `build-order.mjs` regen in same PR (guard fires on status flip) |

**Trifold:** sheet count is fixed by the physical fold — variable sheets is booklet-only (assumption
stated, Daniel can override).

## In / out (v1 boundary)

**In:** monorepo move · token bridge · paid-ad pull + write-back · catalog pull · social pull · variable
booklet sheets · Maqueta layout-builder deprecation · fine-tune-only guardrails.

**Out (explicitly):** deploying zine anywhere · auth/multi-user in zine · migrating zine storage off local
files · advertiser-facing changes to the ad builder · new Medusa/Supabase schema · digital edition
(separate raw idea `digital-edition-mx26.md`) · QR-scan analytics · trifold sheet-count changes ·
agent/UCP exposure of the print-studio API.

## Open risks

1. **Template sharing across two Next apps** — the merchant-ad renderer must be one source (small shared
   package or extracted component + a parity vitest). If sharing proves heavy, fallback: copy + a
   byte-parity spec that fails on drift. Decide in Sprint 1 planning.
2. **Local zine → prod writes**: `PRINT_STUDIO_TOKEN` lives in zine's local `.env` and prod Vercel env.
   Mutations limited to the `placed`⇄`approved` transition — nothing money-touching is writable.
3. **Merchant photos are R2 URLs** — zine's PDF export must fetch remote images at export time (today it
   assumes local uploads). Covered inside story 1.3.
4. **Maqueta removal orphans `print_layouts`** — data stays (harmless), UI goes; note in the deprecation
   story so the doc-hygiene sweep doesn't flag it as drift.

## Acceptance (epic-level, Daniel-runnable)

1. Run `apps/zine` locally → open an edition → the paid ads of the current marketplace edition are
   browsable and placeable; the placed ad looks exactly like the merchant built it.
2. Placing/un-placing an ad flips its status in `/admin/print` submissions (and back).
3. A booklet grows from 12 to 16 pages (one more pliego) and exports a correctly imposed PDF; editorial
   sections stayed where they were.
4. A live catalog listing and an approved social post can each be placed from zine.
5. `/admin/print` no longer offers a layout builder; everything else there still works.

**Smoke walkthrough owner:** Daniel (local zine run + prod status flip are his sessions); agents own the
vitest + Playwright `api` gates. Sprint docs will carry the numbered walkthrough per WAYS-OF-WORKING.
