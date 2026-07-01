# Sprint 2 — Admin control surface

**Epic:** [In-house feature flags](README.md) · **Goal:** flip any flag from the existing admin shell, audited, with
no deploy — the "plug into the existing admin view" Daniel asked for. Depends on Sprint 1 (readers live).

> **Reuse before rebuild.** No new auth, no new audit plumbing: `requireAdmin()` gates the page, `withAdmin()` gates
> the write route and writes the `admin_audit_log` row automatically. Follow the `admin/coupons` / `admin/referrals`
> page shape.

## Stories

### S2.1 — (FE) `/admin/flags` page in `AdminShell` — **LOW**
**As** the admin, **I want** a page listing every flag with its live state, **so that** I can see and reach the
switches in one place.
- New `app/(shell)/admin/flags/page.tsx` (`requireAdmin`) + client component, rendered in `AdminShell` with a nav entry. Reads all rows from `platform_flags` (via the S1 reader or a direct server read), shows key · polarity · description · current state.
- es-MX copy (admin-only surface; not on the bilingual allow-list).
- **Acceptance (Daniel):** an admin sees all 10 flags with live values + polarity; a non-admin visiting `/admin/flags` is redirected to `/`.

### S2.2 — (FE) `POST /api/admin/flags` write + wire the toggles — **LOW**
**As** the admin, **I want** to flip a flag from the page, **so that** the change takes effect within one cache TTL
with no deploy and is recorded.
- `app/api/admin/flags/route.ts` wrapped in `withAdmin` (→ audited). Upserts `{ key, enabled }` to `platform_flags`, sets `updated_at = now()` and `updated_by` from the Clerk admin identity. Validates `key` against the known `FlagKey` set (reject unknown keys).
- Wire each row's toggle to the route; reflect the new state on success.
- **Acceptance (Daniel):** flipping `pdp_redesign` OFF on `/admin/flags` reverts the PDP within ~60 s (no deploy); an `admin_audit_log` row records the flip with the admin's identity; flipping back restores it.

## Sprint QA
- **New api spec:** `POST /api/admin/flags` — non-admin → 401; admin with a valid key → 200 + row upserted; unknown key → 400. (Assert `[200,401]`-style where the live flag value is irrelevant, per the LEARNINGS flag→auth ordering.)
- **Reuse:** the S1 fail-open behavior + existing flag e2e specs still green.
- **Deterministic gate:** `tsc --noEmit` + `npm run build` + `npm run test:e2e` api specs. Green before draft PR.
- **Owed to Daniel (money path):** the live `checkout.stripe_enabled` flip via the new UI (smoke step 4) — his to run against prod.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production `https://miyagisanchez.com` once deployed.

1. As a non-admin, open `https://miyagisanchez.com/admin/flags`.
   → You're redirected to `/` (no admin access).
2. As an admin, open `https://miyagisanchez.com/admin/flags`.
   → You see all 10 flags with their current state (`checkout.stripe_enabled`, `pdp_redesign` ON; the rest OFF).
3. Toggle `pdp_redesign` OFF. Wait ~60 s, open `https://miyagisanchez.com/l/<test-listing>`.
   → The PDP reverts to the previous layout — no deploy. Toggle back ON → it returns within ~60 s.
4. Open `https://miyagisanchez.com/admin/audit`.
   → The flip you just made appears as an `admin_audit_log` entry with your identity + timestamp.
5. (money path — Daniel) Toggle `checkout.stripe_enabled` OFF, wait ~60 s, start a checkout on a test shop.
   → The Stripe rail disappears and a direct `start-checkout` returns 422 `PAYMENT_METHOD_DISABLED`. Toggle back ON → rail returns.

If any step fails, note the step number + what you saw — that's the bug report.
