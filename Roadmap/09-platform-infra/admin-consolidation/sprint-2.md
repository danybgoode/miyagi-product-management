# Sprint 2 — Migrate sections to Clerk + audit; complete the gaps

**Epic:** [Admin consolidation + tenant management](README.md) · **Repo:** `apps/miyagisanchez`
**Goal:** finish the auth migration (every admin page/route on Clerk, secret-in-URL killed for humans, audit on
every mutation) and close the section gaps (re-home `/supply`, extract Vecindario, add the Referrals UI).
Depends on S1's shell + guard.

## Stories

### S2.1 — Audit log + write it from `withAdmin` · MED
**As a** platform admin, **I want** every admin action recorded with who/what/when, **so that** platform-wide
mutations are accountable.
- New Supabase table `admin_audit_log` (non-commerce → rule 2): `{ id, actor_user_id, actor_email, action,
  target, payload_summary jsonb, created_at }`. **DB migration → Daniel-merged.**
- `withAdmin` writes a row on each mutating (`POST/PATCH/DELETE`) call: actor from the Clerk session, `action` =
  route+method, `target` = the affected id, `payload_summary` = a redacted summary (no secrets).
- **Acceptance:** performing any admin mutation inserts an audit row with the actor's Clerk id/email.
- **QA:** pure spec for the summary/redaction builder; an api spec that a mutation (against a test edition/
  coupon) writes a row. Live insert confirmation owed to Daniel (admin session).

### S2.2 — Re-home `/supply`, extract Vecindario, add Referrals UI · MED
**As a** platform admin, **I want** the scattered sections in one consistent place, **so that** there's no
top-level `/supply`, no moderation buried in Print, and no UI-less referrals config.
- **Supply:** move `app/(shell)/supply` → `app/(shell)/admin/supply` (keep `/api/supply/*` paths); register in
  the nav. Leave a redirect from old `/supply` (or remove if no inbound links — confirm).
- **Vecindario:** extract the `web_visible` moderation out of `PrintAdminClient.tsx` into its own
  `/admin/vecindario` section; register it. Print no longer carries it.
- **Referrals:** new thin `/admin/referrals` UI (one config screen) over the existing
  `GET/PATCH /api/admin/referrals/config` — **no backend change** (reward type/amount/expiry/enabled).
- **Acceptance:** Supply renders under `/admin/supply`; Vecindario moderation has its own section and works;
  Referrals settings are editable from a screen (not curl).
- **QA:** specs that each new/moved section renders inside the shell; the Referrals screen GETs + PATCHes the
  config. Authed mutation smokes owed to Daniel.

### S2.3 — Migrate all admin routes/pages to Clerk; kill secret-in-URL; audit viewer · HIGH
**As a** platform admin, **I want** the shared URL secret retired for humans, **so that** access can't leak via
history/referer/logs and is revocable per-user.
- Replace `if (secret !== env.ADMIN_SECRET) redirect('/')` in every `/admin/*` page with `requireAdmin()`;
  replace `checkAdminSecret(req)` in every `/api/admin/*` + `/api/supply/*` route with `withAdmin`.
- Remove `?secret=` from every in-app admin **link**. Then **drop human-secret acceptance** from the guard,
  leaving `ADMIN_SECRET` only on the two internal routes (`/api/admin/import` Bearer for batch scripts; the
  neighborhood-pulse smoke route) — verify the allow-list **before** flipping it off.
- New `/admin/audit` read-only viewer over `admin_audit_log`.
- **Decide the external scraper hop:** document it as the one remaining `ADMIN_SECRET` exception (link-out), or
  federate Clerk cross-origin — default to **documented exception** unless cheap (Daniel's call, his repo).
- **Acceptance:** no `/admin/*` page or `/api/{admin,supply}/*` route accepts a human `?secret=`; an audit viewer
  lists actions; `grep -rn "ADMIN_SECRET\|checkAdminSecret\|?secret="` returns only the two internal routes
  (+ the documented scraper hop).
- **QA:** api specs that each migrated route 401s without a Clerk admin session and 200s with one (dual-accept
  removed). The full authed sweep across every section is owed to Daniel. **HIGH — Daniel-merged.**

## Sprint QA
- Deterministic gate: per-route auth specs (401 without admin / pass with admin), audit-summary pure spec,
  section-render specs. **DB migration (S2.1) + the secret-retirement (S2.3) are HIGH → Daniel-merged.** State
  the authed-sweep gap honestly in the PR (agent owns api-level; Daniel owns the live admin-session sweep).

## Build decisions (confirmed with Daniel, 2026-06-22)
1. **Scrape routes** (`/api/admin/scrape`, `/api/admin/runs`, `/api/admin/runs/[id]/csv`) were dead in-repo
   (their only caller, `AdminScrapeClient`, was deleted in S1) → **migrated to Clerk** like every other route.
2. **neighborhood-pulse smoke route** → refactored its internal HTTP PATCH to **direct `db` writes** of
   `web_visible`; it no longer needs `ADMIN_SECRET`.
3. **`admin_audit_log` migration** applied to prod via the **Supabase MCP** (`apply_migration`, project
   `bonsaiClerk` / `xljxqymsuyhlnorfrnno`) — additive `CREATE TABLE`, table-first before the code deploys.

### Final `ADMIN_SECRET` surface (grep-confirmed)
Human admin paths are **Clerk-only**. `ADMIN_SECRET` survives **only** on documented MACHINE paths that have
no Clerk session:
- `/api/admin/import` — Bearer, for batch scripts.
- The **PDF render path** (a discovery, not in the original sprint scope): `/api/admin/print/editions/[id]/pdf`
  builds the secret URL that **headless Chromium** loads, and `/admin/print/[editionId]/print` accepts it (OR a
  Clerk admin, for the human "Vista de impresión"). The US-5b renderer is inert until `PRINT_PDF_URL` is set.
- (`/api/cron/print-pending` uses a separate `CRON_SECRET`, unrelated to admin auth.)

## Sprint 2 — Smoke walkthrough (do these in order)
Env: branch preview → production. **All steps need an admin Clerk session — owed to Daniel.** An allow-listed
admin = an email in `MIYAGI_ADMIN_EMAILS` (or a Clerk `publicMetadata.role = 'admin'`). No `?secret=` anywhere.

1. As an allow-listed admin, open `/admin` → the hub lists Cupones, Edición impresa, Importar oferta,
   Vecindario, Referidos, Auditoría, and Scraping (external ↗).
   → All seven cards render; the left-nav mirrors them.
2. Open `/admin/supply` (was top-level `/supply`).
   → The import surface renders inside the admin shell. Visiting old `/supply` redirects here.
3. Open `/admin/vecindario`, toggle an aporte's **“Mostrar en línea”** (`web_visible`).
   → The toggle persists. Open `/admin/print` → it shows only **Ediciones / Proveedores** (no social tab).
4. Open `/admin/referrals`, change the reward amount, **Guardar**.
   → It persists (reload reflects the new value).
5. Open `/admin/audit`.
   → The vecindario toggle + the referrals change appear as rows with **your admin email + timestamp**, and
     the `payload_summary` carries **no secret values**.
6. In a fresh/incognito window (no Clerk session), hit `/admin/coupons?secret=<ADMIN_SECRET>`.
   → **Redirected to `/`** — the human secret no longer grants access. **[owed to Daniel — auth path]**
7. `curl` any migrated API anonymously, e.g. `GET /api/admin/referrals/config` (and again with
   `?secret=<ADMIN_SECRET>` / `x-admin-secret`).
   → **401** in all three cases — the URL/header secret is retired. *(Covered by `admin-auth-migration.spec.ts`.)*
8. Confirm a batch-script call to `/api/admin/import` with `Authorization: Bearer <ADMIN_SECRET>` still works.
   → Still authorized (internal machine exception preserved). **[owed to Daniel — money/auth path]**

If any step fails, note the step number + what you saw — that's the bug report.

## Status
**Status:** ✅ shipped — merged as PR #109 (`8927965`).
- [x] S2.1 — `admin_audit_log` + `withAdmin` audit writes *(table live via Supabase MCP; commit `253bd25`)*
- [x] S2.2 — re-home `/supply`; extract Vecindario; Referrals UI *(commit `cac5fd9`)*
- [x] S2.3 — migrate all routes/pages to Clerk; kill secret-in-URL (humans); audit viewer; scraper-hop
      decision *(scraper stays external link-out; commit `e332792`)* — **HIGH → Daniel-merged**
