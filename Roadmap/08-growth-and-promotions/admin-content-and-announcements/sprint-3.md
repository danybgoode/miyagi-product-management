# Admin content & announcements — Sprint 3: Announcements — seller strip + homepage card

**Status:** ✅ merged + live 2026-07-09 — PR #200 (`78b1430`)

> One primitive, two placements: `platform_announcements` (audience: seller|buyer, copy + optional CTA,
> starts/ends, active; one active per audience). Seller = slim dismissable strip atop the seller shell.
> Buyer = understated dismissable card *inside* the homepage flow («catálogo limpio» — no viewport bar,
> no motion, no layout shift). Dismissal is client-side per campaign (localStorage). Buyer placement is
> homepage-only in v1; the placement enum is designed to extend (catalog/PDP slots later).
> Gated by the same `content.overrides_enabled` kill-switch (OFF ⇒ no banners).

## Stories

### Story 3.1 — Announcement CRUD in admin ✅ built
**As** the platform admin, **I want** to create/edit announcements in `/admin/contenido` — audience
(vendedores/compradores), text + optional CTA label/link, schedule (starts/ends), active toggle, with
one-active-per-audience enforced — **so that** I can run platform comms (feature launches, flash sales,
promoted stores) without a deploy.
**Acceptance:** create → appears listed with status (programado/activo/expirado); activating a second
campaign for the same audience prompts to replace the current one; schedule boundaries respected.
**Risk:** low
**Built:** `platform_announcements` table (migration applied to the live Supabase project, RLS on/no
policies, partial unique index enforcing one-active-per-audience as a DB backstop) +
`lib/announcements-merge.ts` (pure status/decision logic) + `lib/announcements.ts` (fail-open cached
reader) + `lib/announcements-admin.ts` (pure body validator) + `app/api/admin/announcements/route.ts`
(GET/POST/DELETE, `withAdmin`-gated, 409-on-conflict + `replaceExisting`) + `AnunciosAdminClient.tsx`
wired into the existing `/admin/contenido` page. Reuses `content.overrides_enabled` — no new flag.

### Story 3.2 — Seller strip ✅ built
**As a** seller, **I want** a slim, quiet, dismissable strip at the top of the seller shell
(`/shop/manage`) while a seller campaign is active, **so that** platform news reaches me in context
without nagging — dismissed stays dismissed for that campaign.
**Acceptance:** activate a seller campaign → strip renders atop /shop/manage (dark-bar styling, one
line, dismiss ×); dismiss → gone for that campaign across reloads (localStorage, per campaign id);
expire/deactivate → gone for everyone; CTA link works.
**Risk:** low
**Built:** `SellerAnnouncementStrip.tsx` (client, receives the server-fetched active campaign as a
prop — no client fetch), mounted in `SellerManageLayout` between the sticky brand bar and the
rail/content, non-white-label branch only. Calm `--bg-sunk`/`--border` styling (not the brand
`--accent`, to read as a distinct info strip rather than an extension of the top bar).

### Story 3.3 — Buyer homepage card ✅ built
**As a** buyer, **I want** an understated, dismissable announcement card inside the homepage flow while
a buyer campaign is active — beautiful, non-intrusive, matching the «catálogo limpio» direction —
**so that** the platform can speak to me without cheapening the storefront.
**Acceptance:** activate a buyer campaign → the card renders in its slot on `/` within the ISR window;
no layout shift (slot reserved or below-fold placement per design); dismiss persists per campaign;
`next build` route table shows `/` still `○`; flag OFF ⇒ no card.
**Risk:** low
**Built:** `HomeAnnouncementCard.tsx` (client, receives the server-fetched active campaign as a prop,
read inside `HomePage`'s existing `Promise.all` via the same ISR-safe `unstable_cache` primitive
`getOverriddenDictionary` already uses) mounted right after the value-prop ribbon. `.card-panel` (no
motion) styling. Verified via `next build`: `/` is still `┌ ○ /` with a 1-minute revalidate window.

## Sprint QA
- **api spec(s):** `e2e/announcements-merge.spec.ts` (25 pure specs — status resolution, active
  resolution, one-active-per-audience decision), `e2e/announcements-admin.spec.ts` (pure body-validator
  specs, incl. reject-`javascript:`-CTA and reject-bad-schedule), `e2e/admin-announcements-api.spec.ts`
  (anonymous-401 gate on the new route), `e2e/home-announcement.spec.ts` (structural: card absent by
  default on `/`, chrome unaffected). **Ran locally against a real production build** (`npm run build` +
  `next start`) plus the full existing `api` suite as a regression check: 1738 passed, 7 pre-existing
  failures unrelated to this change (local Medusa backend not running on :9000 → empty catalog reads;
  confirmed via `curl` against `MEDUSA_STORE_URL`, not caused by this diff).
- **Note (not this sprint's bug, surfaced for awareness):** the live Supabase project was missing
  `platform_copy_overrides` (S1's table) entirely — `to_regclass('public.platform_copy_overrides')`
  returned `null`. The copy-override layer has been running fail-open-to-compile-time-copy in
  production the whole time since S1 merged, silently, because the table was never actually created
  live (the migration file exists in git but apparently was never run). Flagged for Daniel — likely
  wants the S1 migration applied too. `platform_announcements` (this sprint's table) **was** applied
  live via the Supabase MCP (`apply_migration`), confirmed present with RLS on and the partial unique
  index in place.
- **browser smoke owed:** yes, to Daniel — dismiss-persistence on a real device (seller strip + buyer
  card) and the aesthetic sign-off on the buyer card. The activate-a-real-campaign step itself is also
  owed to Daniel: the agent's attempt to seed even a single test row directly into the shared
  production Supabase table was correctly blocked by the auto-mode permission classifier (surfacing
  real content to live buyers/sellers isn't a call the agent should make) — the intended path is the
  audited Clerk-gated admin API, which needs a real admin session.
- **deterministic gate:** `tsc --noEmit` clean, `npm run build` green (route-table `/` = `┌ ○ /`,
  1m revalidate — confirmed unchanged), Playwright `api` project green on every new spec.
- **Cross-agent review (codex, 2 passes) + independent `pr-reviewer` subagent, both on PR #200:**
  codex caught (and fixes landed for) a real timezone bug in the admin schedule picker, missing
  render-time CTA-link re-validation, half-filled-CTA acceptance, a non-atomic replace-swap (added a
  best-effort reactivate-on-failure rollback), a silent-success DELETE on an unknown id, and duplicated
  status logic. The independent `pr-reviewer` subagent then verified every PR claim against the diff
  and approved — CI green, all fixes present and correct.
- **Merged 2026-07-09** — PR #200, squash commit `78b1430`, branch deleted (local + remote).

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. In https://miyagisanchez.com/admin/contenido → Anuncios, create a seller campaign (text + CTA), active now.
   → It lists as «activo».
2. Open https://miyagisanchez.com/shop/manage as a seller.
   → The slim strip renders at the top with your text; click the CTA → it navigates; click × → gone, and stays gone after reload.
3. Create a buyer campaign; wait ~1 min; open https://miyagisanchez.com in a private window.
   → The understated card renders in its homepage slot; no layout shift; dismiss works and persists.
4. Set the buyer campaign's end date in the past.
   → Card disappears for a fresh visitor within ~1 min.
5. Flip `content.overrides_enabled` OFF.
   → Both placements render nothing; pages are otherwise unchanged. Flip back ON.

If any step fails, note the step number + what you saw — that's the bug report.
