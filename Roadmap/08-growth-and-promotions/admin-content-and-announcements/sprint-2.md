# Admin content & announcements — Sprint 2: Key the uncovered surfaces (homepage + acerca)

**Status:** ⬜ not started

> Daniel's "many sections may be uncovered" — confirmed at grooming: the dictionary has NO `home`
> namespace; homepage editorial copy and `/acerca` content are hardcoded. This sprint keys them so
> Sprint 1's editor reaches them. **Editorial strings only** — functional/commerce copy stays code.
> The hard constraint: `/` stays static (`○`); overrides read at ISR revalidate, per the static-shell
> LEARNINGS (route-group split; no per-request dynamic API).

## Stories

### Story 2.1 — Coverage audit + keying map (doc-first)
**As** the platform admin, **I want** a written audit of the v1 scope (homepage, `/vende` family,
`/acerca`) listing every hardcoded editorial string and the proposed key for each (`home.*`, `acerca.*`),
with functional/commerce strings explicitly excluded, **so that** we key exactly what should be
marketing-editable and nothing that shouldn't — confirmed by Daniel before any code.
**Acceptance:** the keying map lands in this epic folder; Daniel confirms in/out per section; the
`sellerAcquisition` coverage is verified complete as a baseline.
**Risk:** low (docs only)

### Story 2.2 — Key homepage + `/acerca` editorial strings
**As** the platform admin, **I want** the approved map applied — homepage editorial strings (value-prop
ribbon, section titles «Selección de la semana» / «Categorías con vida» / Vecindario strip heading,
terminal CTA) under a new `home.*` namespace, and `/acerca` via its content lib (`lib/about-content.ts`)
— all flowing through `getDictionary()` + the Sprint-1 merge seam, **so that** the highest-traffic
marketing surfaces are editable from `/admin/contenido`.
**Acceptance:** edit the homepage ribbon in admin → visible within the ISR window (≤~1 min with
on-demand revalidate); `next build` route table shows `/` unchanged (`○`); es-MX copy-completeness CI
guard green (no orphan strings introduced); `/acerca` bilingual behavior unchanged (it's on the
allow-list via its own es/en structure — the editor exposes both).
**Risk:** low (wide-but-shallow diff; audit-first contains it)

## Sprint QA
- **api spec(s):** one `api` spec asserting a `home.*` override renders on `/`; the existing
  seller-acquisition copy specs stay green (regression net for the keying churn).
- **browser smoke owed:** yes, to Daniel — a visual pass of the homepage after keying (nothing shifted,
  nothing orphaned) on desktop + mobile.
- **deterministic gate:** `tsc --noEmit` + `npm run build` (route-table `/` = `○` asserted) + Playwright
  `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/admin/contenido
   → A new «Inicio» (home) page group lists the ribbon, section titles, and CTA keys with their current values.
2. Edit the value-prop ribbon text; save; open https://miyagisanchez.com in a private window after ~1 min.
   → The new ribbon text renders; the rest of the homepage is pixel-unchanged.
3. Edit an `/acerca` paragraph (es) and its en counterpart; save; reload https://miyagisanchez.com/acerca and /acerca?lang=en.
   → Both locales show the edits.
4. Restore all edited keys.
   → Both pages return to the original copy.

If any step fails, note the step number + what you saw — that's the bug report.
