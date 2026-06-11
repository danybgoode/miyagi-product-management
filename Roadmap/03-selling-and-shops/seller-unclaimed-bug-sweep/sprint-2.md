# Seller & unclaimed-shop bug sweep — Sprint 2: Delete actually deletes

**Status:** 🏗️ BUILT 2026-06-10 — awaiting Daniel merge (HIGH) · **Repos:** backend first, then frontend
> PRs: **BE [#19](https://github.com/danybgoode/medusa-bonsai-backend/pull/19)** (`dd5f207`) → merge first (Cloud Run ~12 min, no preview) ·
> **FE [#78](https://github.com/danybgoode/miyagisanchezcommerce/pull/78)** (`f1e26fe`) → after. Local gate green both repos
> (BE `tsc`; FE `tsc` + `next build` + `listing-delete.spec.ts` 6/6). **Announced** (shared product lifecycle).

> Root cause (verified 2026-06-10): the backend `DELETE /store/sellers/me/products/:id`
> (`apps/backend/.../products/[id]/route.ts:44`) is *"unpublish (draft)"* —
> `updateProducts({ id, status:'draft', metadata:{deleted:true} })`. Three states then disagree: Medusa =
> draft (manage dashboard shows "Borrador"), the mirror = `'deleted'` (`api/sell/listing/[id]/route.ts:271`),
> and the edit page filters `.neq('status','deleted')` → 404. The merged-object `updateProducts` call is
> also the documented selector bug (LEARNINGS → Medusa gotchas). **Decision (Daniel): explicit soft-delete.**

## Stories

### Story 2.1 — Native Medusa soft-delete (BE) · ✅ BUILT (`dd5f207`, PR #19)
**As a** seller, **I want** deleting a listing to soft-delete the Medusa product so it disappears
everywhere, **so that** "deleted" actually means gone — while past orders keep their product reference.
**Build:** rewrite the backend `DELETE` to use Medusa's native product soft-delete (`deleted_at`) via the
products module, with the correct `(id, data)` / delete-API signature — never the merged-object selector.
Confirm the product then drops out of `GET /store/sellers/me/products` and `/store/listings`.
**Acceptance:** after delete, `GET /store/sellers/me/products` omits the listing; `/store/listings` and
the PDP no longer show it; an order that referenced it still resolves (history intact).
**Risk:** HIGH. **Deploy:** backend merges first (Cloud Run ~12 min, no preview).

### Story 2.2 — Manage + mirror + edit all agree "gone" (FE) · ✅ BUILT (`f1e26fe`, PR #78)
**As a** seller, **I want** a deleted listing to leave my dashboard and never 404 me on edit, **so that**
the delete is clean and consistent.
**Build:** align the mirror write + the manage-dashboard list source + the edit guard so all three agree
on "deleted"; make the frontend null-safe for the backend deploy-lag window (a not-yet-deployed BE must
not break the FE). Keep the confirm-modal copy honest ("no se puede deshacer" stays true).
**Acceptance:** delete → confirm → on reload the row is **gone** from manage (not "Borrador"); visiting
`/sell/edit/<id>` for a deleted listing shows a clean "no encontrado" state, not a broken mid-flow 404.
**Risk:** HIGH.

## What shipped (impl notes)
- **BE (`dd5f207`):** `DELETE /store/sellers/me/products/:id` now calls native
  `productService.softDeleteProducts([id])` (correct array-of-ids signature — never the merged-object
  selector). `deleted_at` is set, so the product drops out of `GET /store/sellers/me/products` and
  `/store/listings` (both query the `product` entity via remoteQuery, which excludes `deleted_at`), while the
  row is kept → past order line-items still resolve.
- **FE (`f1e26fe`):** new pure seam **`lib/listing-lifecycle.ts`** (`DELETED_STATUS` / `isDeletedStatus` /
  `filterOutDeleted`). `app/shop/manage/page.tsx` loads the mirror's `'deleted'` id-set and `filterOutDeleted()`s
  the Medusa list **before both render and the `syncSupabaseListingMirror` resync** — so a deleted listing is
  hidden **and** never re-synced from a still-drafted Medusa product back to `'draft'` (the latent clobber that
  would resurrect it in the edit guard). Null-safe → deploy-lag-safe; once BE is live the set is empty (no-op).
  The edit guard was already correct (`.neq('status','deleted')` → `notFound()` → `app/not-found.tsx`).

## Sprint QA
- **api spec(s):** ✅ `e2e/listing-delete.spec.ts` — pure/state-mapping spec over `lib/listing-lifecycle.ts`
  (6/6 green): a deleted id is excluded by `filterOutDeleted` (gone from grid + not resynced); non-deleted
  passes; `isDeletedStatus` truth table. Plus the agent-owned post-merge prod API smoke that
  `GET /store/sellers/me/products` omits a freshly-deleted product. (New-route negative paths return 200 on
  prod pre-deploy — CI-vs-preview is authoritative; LEARNINGS.)
- **browser smoke owed:** **yes, to Daniel** — the authed seller flow *delete a real listing → reload
  manage → attempt edit* (he holds the seller session; soft-delete touches the live product lifecycle).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (backend has no preview — confirm post-merge against prod).
**Order matters:** merge BE #19 first, let Cloud Run finish (~12 min), then merge FE #78, then run these.

0. **(agent-owned, API-level — runs after BE #19 is live)** With a disposable seller's Clerk JWT, create a
   throwaway product, then `DELETE /store/sellers/me/products/<id>`, then `GET /store/sellers/me/products`.
   → The deleted product is **omitted** from `listings`; `GET /store/listings` doesn't return it either.
1. Sign in as a seller with a disposable test listing and go to https://miyagisanchez.com/shop/manage
   → You see the test listing in the grid. **(authed — owed to Daniel)**
2. Click delete on it and confirm the modal ("no se puede deshacer").
   → The row disappears immediately.
3. Reload https://miyagisanchez.com/shop/manage
   → The listing is **still gone** — it does **not** reappear as "Borrador".
4. Try to open its edit URL directly, e.g. https://miyagisanchez.com/sell/edit/<that-listing-id>
   → A clean "no encontrado" page, **not** a broken 404 mid-flow.
5. Open an order that referenced a previously-deleted listing (if available) in
   https://miyagisanchez.com/shop/manage/orders
   → The order still resolves; product reference intact (soft-delete keeps the row).

Steps 1–5 are the **authed seller flow owed to Daniel** (he holds the live session; this touches the live
product lifecycle). If any step fails, note the step number + what you saw — that's the bug report.
