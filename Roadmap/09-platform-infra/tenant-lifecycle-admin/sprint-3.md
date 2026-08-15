# Tenant lifecycle — Sprint 3: the admin surface

**Status:** ✅ shipped — `9193100` (#368)

## Stories

### Story 3.1 — The registration email, read from Clerk ✅ `9193100`
**As a** platform owner, **I want** to see the email each merchant signed up with, **so that** I can
reach a shop's actual owner without leaving the admin.
**Acceptance:** every claimed shop in `/admin/tenants` shows its Clerk registration email; an
unclaimed shop shows *unclaimed*; a Clerk outage shows *no disponible* — never a blank cell that
reads as "this merchant has no email". The email is never written into `marketplace_shops`.
**Risk:** LOW

### Story 3.2 — Filter and sort by the platform's own heuristics ✅ `9193100`
**As a** platform owner, **I want** to slice the directory the way I actually think about shops,
**so that** I can find the ones that need attention.
**Acceptance:** the directory filters by status, market, claimed/unclaimed, custom-domain state and
entitlement, and sorts by listing count, created-at and last activity, in both directions. Sorting and
filtering run over every shop, not just the visible page.
**Risk:** LOW

### Story 3.3 — Edit, pause, unpause, delete ✅ `9193100`
**As a** platform owner, **I want** to act on a shop from the directory, **so that** managing tenants
does not require a database client.
**Acceptance:** I can edit a shop's name, description, location and slug; pause and unpause it;
and delete it. Every action asks for confirmation naming the shop, writes an `admin_audit_log` row
with my Clerk identity, and reports partial failure as *partial* rather than success. Delete is a
soft delete — the shop's orders remain readable afterwards.
**Risk:** HIGH

## Sprint QA
- **api spec(s):** 3.2 → `e2e/tenant-directory-sort-filter.spec.ts` over the pure shaper;
  3.3 → `e2e/tenant-actions-authz.spec.ts` (a non-admin gets 401 *before* any validation runs).
- **browser smoke owed:** **yes, to Daniel** — every action on this surface needs a Clerk admin
  session, which an anonymous smoke cannot hold against production.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com/admin/tenants

1. Open the directory.
   → every shop lists its status and, where claimed, the registration email.
2. Sort by listing count, descending.
   → the shop with the most listings is first, and the order is over all shops, not just the page.
3. Filter to unclaimed shops.
   → only unclaimed shops remain, and the count matches.
4. Edit a disposable shop's description and save.
   → the change shows immediately, and the shop's public page reflects it.
5. Pause that shop from the directory, confirming when asked.
   → its row shows *pausada*, and its public URL 404s.
6. Unpause it.
   → its row shows *activa* and the public URL is back.
7. Delete a second disposable shop.
   → its row shows *eliminada*; its public page is gone; opening one of its past orders in the admin
   still shows the order.

If any step fails, note the step number + what you saw — that's the bug report.
