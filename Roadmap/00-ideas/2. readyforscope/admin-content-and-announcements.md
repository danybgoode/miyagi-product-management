# Admin content & announcements — runtime marketing copy + platform banners (no deploy)

**Status: awaiting Daniel approval — no code yet.**
Source: Daniel's ask (2026-07-05) — as platform admin, edit marketing/promotional content on customer-
and seller-facing surfaces without a deploy: promote stores, launch promotions, announce platform
features, flash sales. Includes bulk copy export/import (work the copy externally, re-apply scoped or
in bulk), per-key manual editing, a seller-facing dismissable slim banner, an understated customer-facing
placement, and a build-vs-headless-CMS eval.
Grooming decisions (2026-07-05, confirmed by Daniel): **v1 = marketing set + homepage** (catalog/PDP get
a *banner slot* only — functional copy stays code) · **customer announcement = homepage slot only**
(understated card/strip in the flow, not a viewport bar) · **admin form per key/section** (no
click-on-page visual editing) · **copy + banners only, no structural page-building** · **bulk = CSV/XLSX
+ JSON, both directions, diff preview** · **CMS eval resolved: in-house** (rationale below).

**Proposed domain: [08 · Growth & Promotions](../../08-growth-and-promotions/README.md)** (it's a
promotion/communication capability; the editor is a means).

---

## Stage-2.5 bucket — **genuinely new** (runtime content layer), with heavy reuse
Nothing today lets copy change without a deploy: marketing copy is compile-time
(`locales/es.json`, 697 leaf keys → `getDictionary()` → e.g. `vende/_components/page-config.ts`), and
homepage/`/acerca` copy is largely **hardcoded, not keyed at all** (Daniel's "many sections may be
uncovered" — confirmed: the dictionary has NO `home` namespace; top-level namespaces are
`platformTheme, pwaSearch, sellerAcquisition, terms, sweepstakes, events`). What's NOT new: the admin
shell, the Supabase editorial store + fail-open read pattern (in-house flags), the homepage curation
precedent (`/admin/seleccion`), and the ISR/static-shell discipline the overrides must respect.

## CMS eval — resolved: build in-house (recorded per the ask; approved 2026-07-05)
- The need is **key-value copy overrides + one banner primitive** over existing, code-owned layouts —
  no structural page-building (explicitly out of scope). That's the weakest possible case for a
  headless CMS.
- An external CMS (Payload / Sanity / Strapi / Contentful) would add: separate hosting/billing, a second
  auth domain to bridge with Clerk, a second content model to keep in sync with the dictionary types,
  webhook plumbing for revalidation, and vendor copy limits — for ~hundreds of keys.
- In-house = one Supabase table + a pure merge seam + the existing admin shell; the flags epic already
  proved the exact read pattern (fail-open, in-process cache, both-app reads if ever needed).
- Revisit trigger: if scope ever grows to composable page-building (the "full page building" option
  Daniel declined for v1), re-run this eval — that's where Payload-class tools earn their keep.

## What already exists (reuse, don't rebuild) — verified 2026-07-05
| Capability | Where | Reuse for |
|---|---|---|
| Compile-time copy dictionary + types | `locales/{es,en}.json` (697 keys) + `lib/dictionary.ts` (`Dictionary` type) | The override layer's key universe + fallback values; types stay the SSOT of shape |
| Keyed marketing pages | `sellerAcquisition` namespace → `app/(shell)/vende/*` via `page-config.ts` | Already override-ready once the merge seam exists |
| Supabase editorial store, fail-open read + cache | `platform_flags` pattern (`lib/flags.ts`, feature-flags-inhouse) | Copy the read discipline: fail-open to compile-time copy, in-process cache, bounded fetch |
| Admin shell + auth | `app/(shell)/admin` (`AdminShell.tsx`, seleccion/flags/tenants precedents) | New `/admin/contenido` section — no new admin infra |
| Homepage curation precedent | `/admin/seleccion` (pin/reorder via metadata) | The interaction pattern for "admin shapes the homepage, ISR serves it" |
| Static-shell + ISR discipline | `lib/cache-policy.ts` SSOT; LEARNINGS (route-group split, time-bucket rotation) | Overrides are read server-side within ISR windows — never a per-request dynamic API on `/` |
| Bilingual allow-list rule | AGENTS rule #5 (`terms`, sweepstakes, embed) | Editor exposes `en` fields ONLY on allow-listed namespaces; everything else es-only |
| Dismissable-UI + localStorage idioms | PWA sheet/banner patterns; seasonal-theme persistence | Banner dismissal is client-side per-user (no server state) |
| Seller shell top bar | `app/(shell)/shop/manage` layout (dark brand bar) | The seller announcement strip mounts here (dynamic tree — reads are cheap) |
| xlsx/CSV handling precedent | Bulk-import epic (file parse → staging → apply) | The import UX shape: upload → diff preview → scoped apply |

## Medusa-first note
No commerce data anywhere in this epic → **Supabase is correct** (AGENTS rule #2: editorial/marketing
content is exactly its lane). Two tables: `platform_copy_overrides` (namespace, key, locale, value,
updated_at/by) and `platform_announcements` (audience: seller|buyer, placement, copy, cta, starts/ends,
active). Clerk untouched (admin-gated via existing admin auth). UCP/MCP: no commerce surface changes;
announcements are presentational (agents unaffected). es-MX default; `en` only via the allow-list rule.

## UX heuristics
- **Editor:** `/admin/contenido` lists pages → sections → keys (grouped by namespace path), inline edit
  with the live value + compile-time default visible; "restaurar" per key (delete override). Overrides
  apply within the page's ISR window (+ on-demand revalidate on save — target: visible in ≤1 min).
- **Bulk:** export a page/section/namespace as CSV/XLSX (flattened key paths) or JSON (structure-true);
  import either → **diff preview** (added/changed/skipped-unknown-keys) → apply scoped. Unknown keys
  never create new content — the dictionary defines the universe.
- **Seller banner:** slim dismissable strip atop the seller shell — one active campaign max, quiet
  styling on the dark bar, dismiss persists per campaign (localStorage).
- **Buyer announcement:** an understated card/strip *inside* the homepage flow («catálogo limpio»
  aesthetic — no viewport-wide bar, no motion), dismissable, scheduled (starts/ends), one active max.
- **Coverage honesty:** the editor only shows keyed copy; Sprint 2 closes the gaps that matter (homepage
  editorial strings, `/acerca`) rather than pretending everything is editable.

## Scope — sprints & stories
> Epic risk: **LOW overall** (copy + non-commerce UI; no payments/checkout/auth/migrations in the Medusa
> sense — the Supabase DDL is additive editorial tables). Kill-switch (Stage 6b):
> **`content.overrides_enabled`** — kill-switch polarity, **default ON, created enabled**; OFF ⇒ every
> surface renders pure compile-time copy + no banners (the merge seam is fail-open by design anyway).

### Sprint 1 — the override layer + editor (the skateboard)
| # | Story | Surface | Risk |
|---|---|---|---|
| S1.1 | As admin, I want a runtime copy-override store + a pure merge seam (`applyCopyOverrides(dict, overrides)` — fail-open, cached, flag-gated), so any keyed surface can render edited copy with no deploy. **Acceptance:** override a `sellerAcquisition` key in the table → `/vende` shows it within ~1 min; Supabase down ⇒ compile-time copy, page never errors; `/` build stays static (`○`). Unit specs on the merge seam. | FE lib + Supabase | low |
| S1.2 | As admin, I want `/admin/contenido` — pages → sections → per-key form editing (default value shown, restore-per-key, `en` fields only on allow-listed namespaces), save → on-demand revalidate. **Acceptance:** edit + save a key → live page updates ≤1 min; restore returns the compile-time value. | FE | low |
| S1.3 | As admin, I want export (CSV/XLSX + JSON, scoped page/section/namespace) and import (either format) with a diff preview before apply, so I can work copy externally and re-apply in bulk or scoped. **Acceptance:** round-trip export→edit 3 keys→import shows exactly 3 changes in preview → apply → live; unknown keys are listed + skipped, never created. | FE | low |

### Sprint 2 — key the uncovered surfaces
| # | Story | Surface | Risk |
|---|---|---|---|
| S2.1 | Coverage audit: sweep the v1 scope (homepage, `/vende` family, `/acerca`) for hardcoded editorial strings; land the keying map (which strings become keys under `home.*` / `acerca.*`; functional/commerce strings stay code). Doc-first, confirmed with Daniel before S2.2. | docs | low |
| S2.2 | Key the homepage editorial strings (`home.*` namespace: ribbon, section titles, CTAs) + `/acerca` (via its content lib) so they're editable through S1's editor — **without un-static-ing `/`** (overrides read at ISR revalidate, per the static-shell learnings). **Acceptance:** edit the homepage ribbon in admin → visible ≤ ISR window; `next build` route table for `/` unchanged (`○`). | FE | low |

### Sprint 3 — announcements (the promo banners)
| # | Story | Surface | Risk |
|---|---|---|---|
| S3.1 | As admin, I want announcement CRUD in `/admin/contenido` — audience (sellers/buyers), copy + optional CTA link, schedule (starts/ends), active toggle, one-active-per-audience — so I can run platform comms without a deploy. | FE + Supabase | low |
| S3.2 | As a seller, I see a slim dismissable strip atop the seller shell while a seller campaign is active; dismissal persists per campaign. **Acceptance:** activate → strip appears in `/shop/manage`; dismiss → stays gone for that campaign; expire/deactivate → gone for everyone. | FE | low |
| S3.3 | As a buyer, I see an understated dismissable card in the homepage flow while a buyer campaign is active — «catálogo limpio» styling, no layout shift, static `/` preserved. **Acceptance:** same as S3.2 on `/`; route stays `○`. | FE | low |

**Deploy order:** S1.1 → S1.2 → S1.3 → S2 → S3 (each sprint independently shippable; S3 depends only on S3.1's table, could swap ahead of S2 if a campaign is urgent).
**QA:** unit specs on the pure merge seam + diff/import parser (free coverage); one `api` Playwright spec
per story (admin routes + a rendered-override check); browser smokes: banner render/dismiss + a
`next build` static-route assertion. **Smoke walkthroughs per sprint; admin click-throughs owed to
Daniel** (no money path in this epic).

## Out of scope (v1)
- Click-on-page / visual WYSIWYG editing (explicitly deferred; revisit after v1 use).
- Structural page-building (add/remove/reorder sections, new layouts) — the CMS-eval revisit trigger.
- Catalog/PDP functional copy; catalog/PDP banner *placements* (buyer announcements are homepage-only
  in v1 — placement enum is designed to extend later).
- New-key creation from imports; editing non-marketing surfaces (checkout, seller portal operational copy).
- External CMS integration (eval resolved: in-house).
- Media/image management (copy + CTA links only; images stay code/R2 as today).

## Open risks
- **Keying churn:** S2 turns hardcoded strings into keys — a wide-but-shallow diff across homepage
  components; the audit-first story (S2.1) + the es-MX copy-completeness CI guard contain it.
- **Static-shell regression** is the one real technical risk — every override read must live behind the
  ISR/route-group discipline; the `next build` route-table assertion is in the QA gate for exactly this.
- **Type drift:** overrides are values-only keyed by the dictionary's shape; if a key is renamed in code,
  its override silently orphans — the editor should flag orphaned overrides (cheap: diff against the
  dictionary at load).

## Epic Definition of Done (draft — final lives in the epic README)
- All three sprints merged; `content.overrides_enabled` exists (default ON, created enabled); OFF kills
  overrides + banners cleanly.
- `/` still `○` static in the build route table; es-MX copy-complete; allow-list respected in the editor.
- Poster (08 domain) updated; RETROSPECTIVE + LEARNINGS promotion; admin walkthrough smokes done.
