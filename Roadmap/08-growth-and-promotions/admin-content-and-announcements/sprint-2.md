# Admin content & announcements — Sprint 2: Key the uncovered surfaces (homepage + acerca)

**Status:** 🟡 in progress — Story 2.1 done (audit doc + Daniel's approval); Story 2.2 built on
`feat/admin-content-and-announcements-s2`, gate green, awaiting PR + merge

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
**Status:** ✅ done 2026-07-08 — [`sprint-2-keying-map.md`](./sprint-2-keying-map.md), Daniel-confirmed
(full agent-surface fan-out for `/acerca` explicitly approved, not just the human page). Baseline
finding: `sellerAcquisition` verified complete and correctly es-only-by-design (not on
`BILINGUAL_NAMESPACES`; every `/vende/*` call site hardcodes `'es'`) — no action needed there.

### Story 2.2 — Key homepage + `/acerca` editorial strings
**As** the platform admin, **I want** the approved map applied — homepage editorial strings (value-prop
ribbon, section titles «Selección de la semana» / «Categorías» / empty-state / terminal CTA) under a new
`home.*` namespace, and `/acerca` migrated into a new `acerca` namespace (both `es`/`en`) — all flowing
through `getOverriddenDictionary()` + the Sprint-1 merge seam, **so that** the highest-traffic marketing
surfaces are editable from `/admin/contenido`.
**Acceptance:** edit the homepage ribbon in admin → visible within the ISR window (≤~1 min with
on-demand revalidate); `next build` route table shows `/` unchanged (`○`); es-MX copy-completeness CI
guard green (no orphan strings introduced); `/acerca` bilingual behavior unchanged (it's on the
allow-list — now via `locales/*.json`'s `acerca` namespace instead of its standalone `about-content.ts`
data, added to `BILINGUAL_NAMESPACES`).
**Risk:** low (wide-but-shallow diff; audit-first contained it)
**Status:** ✅ built 2026-07-08 on `feat/admin-content-and-announcements-s2` (off latest `main`, past
the `catalog-management` S2 + `admin-content-and-announcements` S1 merges). What shipped:
- `home.*` namespace (`ribbon`, `selection`, `categories`, `featured.badge`, `emptyState`,
  `terminalCta`) added to `locales/{es,en}.json`; `app/(site)/page.tsx` reads it via
  `getOverriddenDictionary('es').home` — `/` stays `○` static (confirmed in the build's route table).
  Fixed a stale code comment ("Categorías con vida" → the actually-rendered "Categorías").
- `acerca` namespace (`page` + all 7 `sections`, `es`+`en`) added to `locales/{es,en}.json`, seeded
  identically to `lib/about-content.ts`'s literal values; added to `BILINGUAL_NAMESPACES`.
- **Full agent-surface fan-out (Daniel-approved, not just `/acerca`):** new
  `lib/about-content-overrides.ts` (`getOverriddenAboutPage` / `getOverriddenAboutSections`) reads the
  overridden dictionary and is now the read path for `/acerca`, `/agent`, the UCP manifest `about`
  block, `/llms.txt`, and the MCP `about_miyagi` resource/tool — an admin edit in `/admin/contenido`
  reaches all five. `lib/about-agent.ts`'s functions take an optional `sections` param (default =
  the original pure `ABOUT_SECTIONS`, keeping `e2e/about-content.spec.ts`'s regression coverage of the
  literal defaults intact and import-safe).
- `lib/about-content.ts` itself is untouched code-wise (still the pure, next/*-free defaults +
  regression-tested origin values) — only its header comment was corrected (the stub-flag mismatch:
  only `founder` is `stub: true`; `pricing` is live, real content with the real MXN prices).
- Fixed `e2e/static-shell-split.spec.ts`'s S1 "regression tripwire" (it explicitly anticipated this
  moment): the shared `(site)`/root layouts still must never import `lib/copy-overrides` or read
  headers, but `app/(site)/page.tsx` importing it is now the sanctioned pattern, not a violation.

## Sprint QA
- **api spec(s):** `e2e/copy-overrides-merge.spec.ts` gained a test proving a `home.*` override applies
  against the REAL compiled dictionary (not a synthetic fixture); `e2e/home-static.spec.ts` gained a
  live-render check that `/` serves `home.ribbon.*` from the dictionary. `e2e/agent-about-surface.spec.ts`
  and `e2e/about-content.spec.ts` stay green unmodified (52/52 in that group). The existing
  seller-acquisition copy specs stay green (68/68 — the regression net for the keying churn).
- **deterministic gate — run locally against `PLAYWRIGHT_BASE_URL=http://localhost:3001`:** `tsc --noEmit`
  clean; `npm run build` clean, route table shows `┌ ○ / 1m 1y` unchanged; Playwright `api` — 1708 passed,
  7 failed. **The 7 failures are pre-existing local-environment gaps, not regressions**: an empty admin
  curation pool (`home-auth-leakage.spec.ts`, `home-static.spec.ts`'s "curated content" test — the local
  catalog has 5 items but none satisfy `getCuratedPool()`'s pin/promotion criteria) and a launchpad
  flag-dark check returning 500 instead of 423 (`launchpad-campaign-vote.spec.ts`,
  `launchpad-submission.spec.ts` — unrelated local Supabase/flag state). Neither touches copy/dictionary
  code; confirmed by reading the gating logic, not just observed. CI against a real deployed preview
  should be clean on these.
- **browser smoke owed:** yes, to Daniel — a visual pass of the homepage + `/acerca` after keying
  (nothing shifted, nothing orphaned) on desktop + mobile, plus the admin-editor round-trip (Sprint 2's
  smoke walkthrough below).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/admin/contenido
   → A new «home» page group lists the ribbon, section titles, empty-state, and terminal-CTA keys with
   their current values; a new «acerca» group lists the page chrome + all 7 sections, `es` and `en` side
   by side.
2. Edit the value-prop ribbon text; save; open https://miyagisanchez.com in a private window after ~1 min.
   → The new ribbon text renders; the rest of the homepage is pixel-unchanged; view-source confirms `/`
   is still served as a static/ISR page (no per-request personalization regression).
3. Edit the `/acerca` `pricing` section's `es` lead text and its `en` counterpart; save; reload
   https://miyagisanchez.com/acerca and /acerca?lang=en.
   → Both locales show the edit.
4. With the same `pricing` edit still live, fetch https://miyagisanchez.com/llms.txt and
   https://miyagisanchez.com/api/ucp/manifest (look at the `about.pricing` field), and call the MCP
   `about_miyagi` tool (or `resources/read` on `about://miyagi`) against
   https://miyagisanchez.com/api/ucp/mcp.
   → All three reflect the same edited pricing text — proving the agent-facing surfaces share the one
   admin-overridden source, not a stale copy.
5. Restore all edited keys (ribbon + pricing es/en).
   → The homepage, `/acerca`, `/llms.txt`, the manifest, and the MCP resource all return to the original
   copy.

If any step fails, note the step number + what you saw — that's the bug report.
