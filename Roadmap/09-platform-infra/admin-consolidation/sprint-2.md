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

## Sprint 2 — Smoke walkthrough (do these in order)
Env: branch preview → production. **All steps need an admin Clerk session — owed to Daniel.**

1. As an allow-listed admin, open `/admin/supply`.
   → The supply/import surface renders inside the admin shell (no longer at top-level `/supply`).
2. Open `/admin/vecindario`, toggle a shop's `web_visible`.
   → The toggle works here (and Print no longer shows it).
3. Open `/admin/referrals`, change the reward amount, save.
   → It persists (GET reflects the PATCH).
4. Open `/admin/audit`.
   → The toggle + the referrals change you just made appear as rows with your admin email + timestamp.
5. In a fresh/incognito window (no Clerk session), hit `/admin/coupons?secret=<ADMIN_SECRET>`.
   → **Redirected to `/`** — the human secret no longer grants access.
6. Confirm a batch-script call to `/api/admin/import` with `Bearer <ADMIN_SECRET>` still works.
   → Still authorized (internal route exception preserved).

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S2.1 — `admin_audit_log` + `withAdmin` audit writes
- [ ] S2.2 — re-home `/supply`; extract Vecindario; Referrals UI
- [ ] S2.3 — migrate all routes/pages to Clerk; kill secret-in-URL (humans); audit viewer; scraper-hop decision
