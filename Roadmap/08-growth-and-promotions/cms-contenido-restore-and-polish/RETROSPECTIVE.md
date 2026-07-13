# CMS restore & polish — /admin/contenido saves again, then gets previews — Retrospective

_Closed: 2026-07-13_

## What shipped
- **Sprint 1** (merged 2026-07-12, PR #236): applied the `platform_copy_overrides` migration to
  prod — born-inert since the admin-content-and-announcements epic (2026-07-09), silently fail-open
  to compile-time copy the whole time. `classifyOverrideStoreError()` makes an inert store fail loud
  (503 + an actionable es-MX message) instead of a silent generic 500. A live before/after preview
  reuses the exact merge seam production reads through.
- **Sprint 2** (merged 2026-07-12, PR #238, Daniel fast-follow): server-side search/filter/sort/
  pagination for the key list (mirroring `/admin/flags`'s already-shipped pattern), plus each
  section's real page/URL shown next to it. Bulk export/import's free-text scope fields became
  dropdowns with a default + a live plain-language summary sentence.
- **Sprint 3** (merged 2026-07-12, PR #242): a full redesign from Daniel's own React prototype
  (`references/cms_redesign.tsx`) — a page-first nav replacing the flat 1,121-key list, batched
  multi-field save riding the *existing* bulk-upsert route (zero new backend surface), and a
  token/Iconoir re-skin with an `AdminShell` section-grouping + sticky-rail overflow fix. The
  prototype's raw Tailwind palette and lucide icons were deliberately NOT carried over.
- **Sprint 4** (merged 2026-07-13, PR #246, Daniel fast-follow from a screenshot review): what
  looked like a labeling bug ("every nav item shows the same text") turned out to be a real routing
  bug underneath — `sweepstakes`/`events` each fan into `seller`/`public`/`email` sections rendering
  on 3 genuinely different surfaces, but the CMS told you the wrong one for two of them. Traced
  every section to its real `getDictionary()` call site (not guessed), gave each its own accurate
  destination, and made the nav show real, DIFFERENT destinations per section instead of one
  repeated label. Added per-field destination context and a sticky page header.

**Net capability:** `/admin/contenido` is a real page-first CMS — pick a page, see only its fields,
edit several, save once, and know exactly where and what kind of surface each change lands on
(a public page, a seller-portal page, or a transactional email), with an actionable error instead of
a silent failure if the store ever goes down again. All 4 sprints' live smokes confirmed green by
Daniel, 2026-07-13.

## What went well
- **A pure-lib-first discipline made every story reviewable and mutation-checkable in isolation.**
  Every new decision (`humanizeKeyPath`, `buildPageNavGroups`, `buildBatchApplyRows`,
  `updateDraftLocale`, `humanizeSectionName`, the routing maps) lived in a next-free `lib/*.ts` module
  with its own Playwright `api` spec, exercised with zero live Supabase/Clerk dependency. This is the
  same convention the epic inherited from Sprint 1/2 and it held for all 4 sprints without exception —
  every cross-agent review finding across the whole epic (S2's 3 missing route mappings, S3's
  edit-then-revert false-dirty bug, S4's label regression) was fixable as a change to one pure
  function plus new unit tests, never a wiring rewrite.
- **Cross-agent review earned its keep twice in exactly the way it's designed to.** S3's codex pass
  caught a real UX bug (dirty-tracking counted every *touched* draft, not actually-dirty ones — typing
  a field then reverting it still triggered the unsaved-changes warning). S4's codex pass caught a
  real regression the SAME sprint introduced (the new generic section-label humanizer had overwritten
  `sellerAcquisition`'s already-good curated Spanish labels with plain English word-splits) — a bug an
  independent same-family `pr-reviewer` pass approved right past, because it read as "intentional,
  documented behavior" rather than a regression against a *better* prior state. A different model
  family catching what a same-family reviewer missed is the whole reason this layer exists.
  Attempting Antigravity as a second cross-agent opinion failed both times it was tried this epic
  (`Agent execution terminated due to error`) — codex carried the cross-agent signal alone both times;
  worth a closer look if a genuinely different perspective becomes wanted again.
- **Building UI on top of already-shipped backend primitives, sprint after sprint, cost zero new
  backend surface.** S3's batched save and S4's whole routing fix are 100% frontend — the S1-era
  bulk-apply route (`POST /api/admin/content-overrides/import/apply`) absorbed a materially different
  UI pattern (per-field save → one batched save across pages) without a single line of route code
  changing. Reuse-first isn't just a principle here; it measurably kept 3 of 4 sprints backend-free.
- **The screenshot-driven fast-follow (S4) is the fastest and cheapest bug this epic found.** Daniel
  didn't file a ticket describing symptoms — he pasted a screenshot and said "the parent looks like
  every child." That one image was enough to (a) name a real, reproducible UI bug precisely, and (b)
  motivate tracing the actual dictionary/route data, which surfaced a genuine routing-correctness gap
  three sprints of prior work had shipped without anyone noticing (because the bug was invisible unless
  you looked at more than one section of the same fan-out namespace side-by-side).

## What we learned
- **`playwright.config.ts`'s `api` gate project defaults `baseURL` to LIVE PRODUCTION
  (`https://miyagisanchez.com`), not a local dev server.** A full local `npm run test:e2e` run during
  S4 showed a large, DIFFERENT set of unrelated failures on every re-run (`nav-entry-points.spec.ts`
  one run, `static-shell-split.spec.ts`/`platform-theme.spec.ts` the next) — an earlier session
  (Sprint 3) mischaracterized an identical pattern as generic "environment flakiness." The real
  mechanism: these specs hit real production over the network via the `request` fixture, and
  production was being actively worked on the same day by concurrent sessions
  (`home-dynamic-rows-restore-and-polish`, `nextpublic-docker-buildargs-hardening` both shipped fixes
  2026-07-13). **Generalizable rule:** before trusting a full local `api` run as a signal about your
  own branch, confirm which specs use the `request` fixture (network-dependent, targets whatever
  `PLAYWRIGHT_BASE_URL`/the default resolves to — prod unless overridden) versus which are pure/local
  (zero network, the real signal for a lib-only PR). CI's own run against the PR's Vercel preview
  remains authoritative for anything that does need the network.
- **A generic "humanize this" fallback can silently regress an already-good curated label if applied
  indiscriminately.** S4's fix for "every sibling section looks identical" (a real bug, in `home`/
  `terms`/`platformTheme`/`pwaSearch`) was first applied to EVERY namespace, including
  `sellerAcquisition` — which never had that bug, because its per-section route labels were already
  curated and already distinct ("Vende — Autos", "Vende — Creadores", …). The fix should have asked
  "does this namespace's route label already differentiate its siblings?" before reaching for the
  generic humanizer, not "does every namespace deserve the same treatment?". The eventual correct rule
  — prefer a section's own curated route label whenever the group isn't uniform (it already
  differentiates), reserve the generic humanizer for the uniform-group case that actually needs it —
  reads obvious in hindsight but wasn't the first design reached for under time pressure to ship the
  headline fix. **Generalizable rule: before extending a "make X consistent" fix to every case in
  scope, check whether some of those cases are already correct — a uniform fix applied to a
  non-uniform problem is itself a regression.**
- **A migration file merging is not evidence it ran against prod — this epic exists BECAUSE of that
  exact gap, and it's worth re-stating even though LEARNINGS already carries the rule.** Sprint 1 of
  this epic was entirely "go apply the migration the admin-content-and-announcements epic's own
  retrospective already flagged as owed" — a rule already promoted to LEARNINGS from that epic's
  close, but the gap sat unaddressed for 3 days until this epic explicitly scoped fixing it. Promoting
  a rule to LEARNINGS doesn't retroactively fix an already-shipped gap; it only prevents the *next*
  one. Someone (here: Daniel, opening this epic) still has to notice the flagged gap and schedule the
  fix.

## Gaps / follow-ups
- **Revisit trigger for the CMS build-vs-buy call** (from the original scope doc, re-confirmed at S3
  grooming, still valid): if scope ever grows to composable page-building — not key-value overrides,
  not derived section/field labels — re-run the Payload-class CMS eval. Nothing across all 4 sprints
  came close to that line; the redesign stayed entirely within "a nicer editor for the same key-value
  model."
- **`events.seller` spans two real routes** (`/shop/manage/eventos` list/create page and its
  `/shop/manage/eventos/[id]` roster sub-route) sharing one dictionary section — the routing map names
  the list page as the primary destination and documents the roster sub-route in a code comment,
  rather than modeling a route as `RouteInfo | RouteInfo[]`. Revisit if a future namespace fans a
  single section across genuinely disjoint surfaces in a way a single label+path can't honestly
  represent.
- **Derived field/section labels are English-shaped when uncurated** (a deliberate, re-confirmed
  grooming decision, not an oversight): `humanizeKeyPath`/`humanizeSectionName` fall back to
  word-splitting a camelCase key rather than a fully curated es-MX label map, because grooming
  explicitly declined to hand-curate 1,121 keys. A small, bounded override map covers the handful of
  section keys that repeat as raw English across namespaces (`seller`/`public`/`email`/`toggle`/
  `shared`); nothing else is curated. Codex's S4 review flagged this as worth a second look if this
  surface is meant to be fully polished — noted, not acted on, since it's the direct, intentional
  consequence of the grooming call, not a bug.
- **The official `anthropics/skills@frontend-design` skill was installed this epic (S4) but never
  actually exercised for anything visual** — the whole polish pass turned out to be information-
  architecture and data-correctness work, not a re-skin, so only its writing-guidance section (plain-
  language naming, clear error framing) ended up informing anything. It's vendored and ready
  (`.agents/skills/frontend-design`) for a future pass that's genuinely visual/brand-identity work.
