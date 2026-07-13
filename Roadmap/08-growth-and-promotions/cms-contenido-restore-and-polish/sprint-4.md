# CMS restore & polish — Sprint 4: nav clarity + destination accuracy (Daniel fast-follow, requested 2026-07-13)

**Status:** 🚧 built, deterministic gate green, PR open — browser/visual smoke owed to Daniel (same
split this epic has used every sprint: no money/auth path, UX confirmation only)

Daniel's fast-follow ask after Sprint 3 shipped: screenshot review (`references/cms.png`) showed the
page-nav's parent group and every child section rendering the SAME label text — so nothing visually
distinguishes one section from another, and nothing tells you where an edit actually lands. Digging
into the real data surfaced something bigger than a labeling bug: `sweepstakes` and `events` each fan
out into `seller`/`public`/`email` sections that live on THREE genuinely different surfaces (a seller-
portal page, a public participant page, and a transactional email template respectively), but the
routing map (`lib/copy-overrides-routes.ts`) sent all three to the same public URL — a real "where will
this show up" correctness gap, not just a cosmetic one. Confirmed against the actual `getDictionary()`
call sites (not guessed): `sweepstakes.seller` → `/shop/manage/sweepstakes`; `events.seller` →
`/shop/manage/eventos` (+ its `/[id]` roster sub-route); `sweepstakes.email`/`events.email` →
`lib/email.ts` (no page at all — sent as mail).

Installed the official `anthropics/skills@frontend-design` skill this session (`.agents/skills/
frontend-design`, symlinked at `skills/frontend-design`, matching the existing Stripe-skill vendoring
convention). Its structural/visual guidance targets net-new distinctive-identity builds and doesn't
apply to an existing, token-locked internal admin tool that must stay consistent with the rest of the
product — but its writing guidance (name things by what people recognize, treat empty/error states as
moments for clear direction, keep action names consistent through a flow) informed the label and
copy choices below directly.

## Stories

### Story 4.1 — Fix the routing map: real per-section destinations + honest "no page" labels
**As** Daniel, **I want** the CMS to tell me the TRUE destination of an edit, **so that** I never
mistake a seller-portal change or an email-template change for a public-page change.
**How:** `lib/copy-overrides-routes.ts` gains `SWEEPSTAKES_SECTIONS`/`EVENTS_SECTIONS` maps (same shape
as the existing `SELLER_ACQUISITION_SECTIONS` fan-out), each section resolving to its real, confirmed
surface — `seller` → its portal page, `public` → the existing public route (unchanged), `email` → a
descriptive non-URL "path" stating it's a transactional email. The 3 other legitimately-no-single-page
cases (`platformTheme`, `pwaSearch`, `sellerAcquisition.shared`) get the same treatment — a real,
descriptive `RouteInfo` instead of `null` — so `NO_SINGLE_PAGE_LABEL`'s generic fallback becomes
reserved for a genuinely UNRECOGNIZED namespace (a real drift signal), not conflated with known,
intentional no-page cases.
**Acceptance:** every known namespace/section resolves to a real, accurate `RouteInfo`; only an
unrecognized namespace/section falls back to the generic label; `events.seller` documents (via code
comment, matching the file's existing convention) that it also renders on the `/[id]` roster route.
**Risk:** low
**✅ Done 2026-07-13** (commit `a3cac4a` on `feat/cms-contenido-restore-and-polish-s4`) — confirmed the
real surface for every section via an Explore agent reading the actual `getDictionary()` call sites
(not guessed): `sweepstakes.seller`/`events.seller` → their seller-portal pages,
`sweepstakes.email`/`events.email` → `lib/email.ts` (no page). 12 spec cases, all green.

### Story 4.2 — Nav: distinct section names + real destinations shown inline
**As** Daniel, **I want** each item in the page-nav to look and read differently from its siblings,
**so that** I can tell at a glance which section does what, without opening it.
**How:** each `NavSectionEntry` gains a friendly `label` (`lib/copy-overrides-labels.ts`'s new
`humanizeSectionName()` — a small curated map for the handful of genuinely-unclear section keys
`seller`/`public`/`email`/`toggle`/etc., falling back to the same word-splitting humanizer
`humanizeKeyPath` already uses, so any future namespace stays covered with zero code changes).
`NavNamespaceGroup` gains `uniformRoute: RouteInfo | null` — set only when every section in the group
shares the exact same destination (true for `home`, `terms`, `acerca`, …), left `null` when sections
genuinely differ (true for `sweepstakes`, `events`). `ContenidoPageNav.tsx` shows the shared
destination ONCE at the group header when uniform; when NOT uniform, each section item shows its own
real destination inline (e.g. "Panel de tienda · /shop/manage/sweepstakes" vs "Correos · correo
transaccional").
**Acceptance:** no two sibling nav items render identical text; a fan-out namespace's items show their
real, DIFFERENT destinations without opening them.
**Risk:** low
**✅ Done 2026-07-13** (commit `3c2984b`) — `humanizeSectionName()` + `uniformRoute` computation, both
mutation-checked (observed red on the override lookup and the uniformity check, then reverted). 18 spec
cases across the extended `copy-overrides-labels.spec.ts`/`copy-overrides-page-nav.spec.ts`.

### Story 4.3 — Per-field destination context + a sticky page header
**As** Daniel, **I want** to see exactly where an edit will land right next to the before/after preview,
and never lose that context scrolling a long field list, **so that** I always know what I'm about to
change and where.
**How:** the existing Antes/Después dirty-preview block (already shown only for a field you're actively
editing, Story 1.3) gains a line naming the resolved destination — reusing the SAME route data the page
header already computes, so a null-route case (an unrecognized namespace, now rare after 4.1) is the
only one that ever falls back to the generic label. The page-context header (page/section name + route)
becomes `position: sticky` at the top of the editor column, so it survives scrolling past field #20.
**Acceptance:** an actively-edited field's preview names its real destination; the page header stays
visible while scrolling the field list.
**Risk:** low
**✅ Done 2026-07-13** (commit `10160be`) — presentational-only change (sticky positioning + reusing
already-computed route data); no new pure-logic surface to unit-test, so no new spec — same shape as
Sprint 3's Story 3.3 re-skin/sticky-rail fix. Visual confirmation owed to Daniel.

## Sprint QA
- **api spec(s) — all new/extended, all green (133 pure specs total across the touched files):**
  - `copy-overrides-routes.spec.ts` extended: sweepstakes/events per-section routes, descriptive
    no-page `RouteInfo` for platformTheme/pwaSearch/sellerAcquisition.shared, the tightened
    unrecognized-only `null` semantics.
  - `copy-overrides-labels.spec.ts` extended: `humanizeSectionName` (curated overrides +
    word-splitting fallback) — mutation-checked.
  - `copy-overrides-page-nav.spec.ts` extended: per-section `label`, `uniformRoute` (both the
    uniform and non-uniform cases) — mutation-checked.
- **browser smoke owed:** yes, to Daniel — the sticky header and the nav's visual differentiation are
  best confirmed by eye (same split this epic has used every sprint: no money/auth path involved).
- **deterministic gate:** ✅ green 2026-07-13 — `tsc --noEmit` clean, `npm run build` clean, all 133
  copy-overrides/admin-sections pure specs green. **Note on the full `api` suite:** `playwright.config.ts`'s
  `baseURL` defaults to LIVE PRODUCTION (`https://miyagisanchez.com`) — a full-suite run this session
  showed a large, fluctuating set of unrelated failures (different specs each run, e.g.
  `nav-entry-points.spec.ts`, `static-shell-split.spec.ts`, `platform-theme.spec.ts` — all hitting `/`
  or other pages over the network), consistent with prod itself being actively worked on concurrently
  (see `home-dynamic-rows-restore-and-polish` + `nextpublic-docker-buildargs-hardening` epics' fixes
  landing the same day) rather than anything this PR touched. None of the copy-overrides specs use the
  `request` fixture — they're 100% pure/local and unaffected either way; they're the real signal here.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com/admin/contenido (preview URL pre-merge)

1. Open `/admin/contenido`.
   → Under "Sorteos", the three items ("Público", "Panel de tienda", "Correos" — exact wording may
     differ slightly) show clearly different destinations, not the same repeated text.
2. Click the "Panel de tienda" item under Sorteos.
   → The page header shows `/shop/manage/sweepstakes`, not `/g/[slug]`.
3. Click the "Correos" item under Sorteos.
   → The header explains this is a transactional email, not a page with a URL.
4. Edit any field, watch the before/after preview appear.
   → The preview names the exact destination the edit will land on.
5. With enough fields on screen to require scrolling, scroll down.
   → The page-context header (page/section name + destination) stays visible at the top.

If any step fails, note the step number + what you saw — that's the bug report.
