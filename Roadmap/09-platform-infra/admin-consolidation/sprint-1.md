# Sprint 1 — Admin shell + Clerk-gated hub (the chassis)

**Epic:** [Admin consolidation + tenant management](README.md) · **Repo:** `apps/miyagisanchez`
**Goal:** one in-repo admin shell with a real `/admin` hub and a section registry, gated by **Clerk admin
identity** — shipped **thin**: route guards stay **dual-accepted** (Clerk *or* `ADMIN_SECRET`) so consolidation
isn't blocked on migrating all ~25 routes. The external redirect dies; the orphaned scrape client is deleted.

## Stories

### S1.1 — Clerk admin identity + dual-accept guard · HIGH
**As a** platform admin, **I want** to reach the admin as my signed-in Clerk self, **so that** access isn't a
shared URL secret and every action can be attributed to a person.
- New pure `lib/admin/identity.ts` `isAdminUser({ userId?, email? })` — **target:** Clerk
  `publicMetadata.role === 'admin'`; **bridge MVP:** a `MIYAGI_ADMIN_EMAILS` comma-list env (so it works before
  any Clerk role config). Pure + next-free → unit-testable.
- New `lib/admin/guard.ts`: `requireAdmin()` (server pages — resolves the Clerk user, calls `isAdminUser`,
  `redirect('/')` if not) and `withAdmin(handler)` (API wrapper). **Dual-accept this sprint:** a valid Clerk
  admin **OR** a valid `ADMIN_SECRET` passes — so existing routes/scripts keep working untouched.
- **Acceptance:** signing in as an allow-listed Clerk user reaches `/admin`; a non-admin Clerk user is
  redirected; `?secret=<ADMIN_SECRET>` still works (dual-accept). A pure spec covers `isAdminUser` (allow/deny).
- **QA:** `lib/admin/identity` unit spec (api/pure). Authed admin render = local `@clerk/testing` browser smoke
  or **owed to Daniel** (he holds an admin Clerk session).

### S1.2 — Admin shell + section registry + real hub · MED
**As a** platform admin, **I want** one admin home with a nav of every section, **so that** I stop chasing an
external redirect and disconnected URLs.
- New `lib/admin/sections.ts` — the nav SSOT: `{ key, label (es-MX), href, icon, risk, external? }[]`.
- New `AdminShell` (left-nav + es-MX chrome) under `app/(shell)/admin/`, rendered from the registry.
- Rewrite `app/(shell)/admin/page.tsx`: **remove the `redirect()` to `miyagisanchez-scraper.vercel.app`** →
  render the hub (section cards/links). The scraper becomes one **`external: true`** registry entry
  (link-out, opens the scraper app).
- **Acceptance:** `/admin` (as an admin) shows a hub listing the sections; the scraping entry links out to the
  external app; no auto-redirect off `/admin`.
- **QA:** a spec asserts the hub renders the registry entries + that the scraper entry is an external link;
  `sections.ts` is pure → unit-test it.

### S1.3 — Register existing sections + delete the orphan · LOW
**As a** platform admin, **I want** the sections that already exist wired into the new nav, **so that** the
shell is real on day one.
- Add registry entries for **Coupons** (`/admin/coupons`) and **Print** (`/admin/print`) — both already exist;
  this only lists them and renders them inside `AdminShell`.
- **Delete** the orphaned `app/(shell)/admin/AdminScrapeClient.tsx` (imported by nothing — confirmed in the spike).
- **Acceptance:** Coupons + Print are reachable from the hub nav and render inside the shell; `grep` finds no
  import of the deleted client and the build is clean.
- **QA:** build + a spec asserting the deleted file's symbol is gone from the tree (anti-resurrection, cheap).

## Sprint QA
- Pure/api deterministic gate: `lib/admin/identity` + `lib/admin/sections` specs; hub-render spec. No money path
  in S1 (dual-accept means no route loses its current guard). The authed **admin** browser render is owed to
  Daniel (or a local `@clerk/testing` smoke once an admin fixture exists).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (then production after merge).

1. As a signed-out / non-admin user, go to `<preview>/admin`.
   → You are redirected to `/` (not shown the hub).
2. Sign in as an allow-listed admin, go to `<preview>/admin`. **[owed to Daniel — admin session]**
   → You see the **admin hub**: a nav listing Coupons, Print, and a "Scraping ↗" link-out. No auto-redirect to the scraper.
3. Click "Scraping ↗".
   → Opens the external scraper app (`miyagisanchez-scraper.vercel.app`).
4. Click "Coupons" then "Print".
   → Each renders inside the admin shell (left-nav present), not as a bare page.
5. Sanity: hit `<preview>/admin/coupons?secret=<ADMIN_SECRET>` (dual-accept).
   → Still works — existing secret access is not broken this sprint.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S1.1 — `lib/admin/identity.ts` + dual-accept `requireAdmin`/`withAdmin`
- [ ] S1.2 — `AdminShell` + `lib/admin/sections.ts` + hub (external redirect removed)
- [ ] S1.3 — register coupons/print; delete orphaned `AdminScrapeClient.tsx`
