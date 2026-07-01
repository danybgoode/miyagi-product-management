# Sprint 2 — Admin control surface

**Status: ✅ BUILT 2026-07-01** (draft PR, risk **LOW**) — deterministic gate green (tsc + build + 35 pure api
specs). Authed 200-upsert + `admin_audit_log` render + the `checkout.stripe_enabled` money flip are **owed to
Daniel** (smoke §3–§5). Stories: S2.0 `204ea23` · S2.1 `187171f` · S2.2 `838bc3b`.

> **Note — 11 flags, not 10.** `ml.sync_enabled` (ML S4, #148) joined `FlagKey` after this doc's scaffold;
> the S1 `platform_flags` table already seeds all 11 with `polarity` + `description` columns, so the admin
> page renders them straight from the table (no hardcoded 10-flag list).

**Epic:** [In-house feature flags](README.md) · **Goal:** flip any flag from the existing admin shell, audited, with
no deploy — the "plug into the existing admin view" Daniel asked for. Depends on Sprint 1 (readers live).

> **Reuse before rebuild.** No new auth, no new audit plumbing: `requireAdmin()` gates the page, `withAdmin()` gates
> the write route and writes the `admin_audit_log` row automatically. Follow the `admin/coupons` / `admin/referrals`
> page shape.

## Stories

### S2.0 — (FE) pure flag-admin validator seam — **LOW** ✅ `204ea23`
**As** the platform, **I want** the write route's key/body validation in a next-free module, **so that** the
"reject unknown key / non-boolean" logic is unit-tested in the api gate (the authed 200/400 path can't run
anonymously — see Sprint QA).
- `lib/flags-admin.ts` (mirrors `lib/flags-cache.ts`): `FLAG_META` (per-key polarity + fail-open default,
  typed `Record<FlagKey>` so it can't drift from the seam — a new flag without a meta entry fails `tsc`),
  `FLAG_KEYS`, `isKnownFlagKey`, `parseFlagWriteBody`.
- **Spec** `e2e/flags-admin.spec.ts` (pure): 11-flag coverage + reject unknown key / non-boolean / missing.

### S2.1 — (FE) `/admin/flags` page in `AdminShell` — **LOW** ✅ `187171f`
**As** the admin, **I want** a page listing every flag with its live state, **so that** I can see and reach the
switches in one place.
- New `app/(shell)/admin/flags/page.tsx` (`requireAdmin`) + `FlagsAdminClient.tsx`, rendered in `AdminShell` via a new high-risk `ADMIN_SECTIONS` entry (flipping `checkout.stripe_enabled` is a money path). Direct server read of `platform_flags` (`key, enabled, polarity, description, updated_at, updated_by`) via `db`, **unioned with `FLAG_KEYS`** so an absent-row flag still renders its fail-open default (tagged "por defecto"). Shows key · polarity · live state · last change · toggle.
- es-MX copy (admin-only surface; not on the bilingual allow-list) + a "~60 s cache" propagation note. `admin-sections.spec.ts` updated for the new ordered registry + the `flags` entry.
- **Acceptance (Daniel):** an admin sees all **11** flags with live values + polarity; a non-admin visiting `/admin/flags` is redirected to `/`.

### S2.2 — (FE) `POST /api/admin/flags` write + wire the toggles — **LOW** ✅ `838bc3b`
**As** the admin, **I want** to flip a flag from the page, **so that** the change takes effect within one cache TTL
with no deploy and is recorded.
- `app/api/admin/flags/route.ts` wrapped in `withAdmin` (→ auto-audited on the 2xx POST). `GET` lists rows; `POST` validates via `parseFlagWriteBody` (unknown key / non-boolean `enabled` → **400**, a mutation rejects), then upserts `{ key, enabled, updated_at, updated_by }` to `platform_flags` (`updated_by` = Clerk `userId` via `auth()`).
- Each row's toggle POSTs `{ key, enabled: !current }` (no auth header — same-origin cookie); reflects the new state on success; `confirm()` on the `checkout.stripe_enabled` money path.
- **Acceptance (Daniel):** flipping `pdp_redesign` OFF on `/admin/flags` reverts the PDP within ~60 s (no deploy); an `admin_audit_log` row records the flip with the admin's identity; flipping back restores it.

## Sprint QA
- **The 200/400 logic is NOT anonymously testable in the api gate.** `withAdmin` 401s before the handler runs
  and the `api` project runs anonymous (no header/secret admin path — retired in admin S2.3), so an api spec
  can only prove the **401 gate**. The split:
  - **`e2e/flags-admin.spec.ts` (pure)** proves the **400 logic** — `parseFlagWriteBody` rejects unknown key /
    non-boolean / missing, `isKnownFlagKey`, `FLAG_META` 11-flag coverage. This is where the "reject unknown
    key → 400" acceptance actually lives.
  - **`e2e/admin-flags-api.spec.ts` (api, anonymous)** proves the **401 gate** — `GET` → 401; `POST` with a
    valid body → 401; `POST` with an unknown key → 401 (auth precedes validation — flag→auth→validate, per
    LEARNINGS); retired `?secret=` / `x-admin-secret` arm → still 401.
  - The **authed 200 upsert + `admin_audit_log` render** needs an admin Clerk session → **owed to Daniel**
    (smoke §2–§4), or a later opt-in `admin-flags.browser.spec.ts` gated on `MS_TEST_ADMIN_EMAIL`.
- **Reuse:** the S1 fail-open behavior + existing flag e2e specs (`flags-cache`, `checkout-killswitch`,
  `envia-killswitch`) still green after the swap.
- **Deterministic gate:** `tsc --noEmit` + `npm run build` + `npm run test:e2e` api specs. **Green 2026-07-01**
  (35 pure specs pass locally; the `admin-flags-api` 401 arm rides CI-vs-preview — an unknown prod route
  returns 200 not 401, so it can't be verified against prod pre-merge, per LEARNINGS).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production `https://miyagisanchez.com` once deployed.

1. As a non-admin, open `https://miyagisanchez.com/admin/flags`.
   → You're redirected to `/` (no admin access).
2. **(owed to Daniel — authed)** As an admin, open `https://miyagisanchez.com/admin/flags`.
   → You see all **11** flags with their current state (`checkout.stripe_enabled`, `pdp_redesign` **Activa**;
   the other 9 **Apagada**, most tagged "por defecto" until first flipped). "Flags" appears in the admin nav.
3. **(owed to Daniel — authed)** Toggle `pdp_redesign` → **Apagar**. Wait ~60 s, open
   `https://miyagisanchez.com/l/<test-listing>`.
   → The PDP reverts to the previous layout — no deploy. Toggle back → **Activar** → it returns within ~60 s.
4. **(owed to Daniel — authed)** Open `https://miyagisanchez.com/admin/audit`.
   → The flip you just made appears as an `admin_audit_log` entry (`POST /api/admin/flags`) with your identity
   + timestamp.
5. **(owed to Daniel — money path)** Toggle `checkout.stripe_enabled` → confirm the warning → **Apagar**,
   wait ~60 s, start a checkout on a test shop.
   → The Stripe rail disappears and a direct `start-checkout` returns 422 `PAYMENT_METHOD_DISABLED`.
   Toggle back → **Activar** → rail returns.

If any step fails, note the step number + what you saw — that's the bug report.
