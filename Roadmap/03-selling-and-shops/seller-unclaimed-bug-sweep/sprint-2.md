# Seller & unclaimed-shop bug sweep — Sprint 2: Delete actually deletes

**Status:** ⬜ not started · **Risk:** HIGH (Medusa product lifecycle + Cloud Run; Daniel merges) · **Repos:** backend first, then frontend

> Root cause (verified 2026-06-10): the backend `DELETE /store/sellers/me/products/:id`
> (`apps/backend/.../products/[id]/route.ts:44`) is *"unpublish (draft)"* —
> `updateProducts({ id, status:'draft', metadata:{deleted:true} })`. Three states then disagree: Medusa =
> draft (manage dashboard shows "Borrador"), the mirror = `'deleted'` (`api/sell/listing/[id]/route.ts:271`),
> and the edit page filters `.neq('status','deleted')` → 404. The merged-object `updateProducts` call is
> also the documented selector bug (LEARNINGS → Medusa gotchas). **Decision (Daniel): explicit soft-delete.**

## Stories

### Story 2.1 — Native Medusa soft-delete (BE)
**As a** seller, **I want** deleting a listing to soft-delete the Medusa product so it disappears
everywhere, **so that** "deleted" actually means gone — while past orders keep their product reference.
**Build:** rewrite the backend `DELETE` to use Medusa's native product soft-delete (`deleted_at`) via the
products module, with the correct `(id, data)` / delete-API signature — never the merged-object selector.
Confirm the product then drops out of `GET /store/sellers/me/products` and `/store/listings`.
**Acceptance:** after delete, `GET /store/sellers/me/products` omits the listing; `/store/listings` and
the PDP no longer show it; an order that referenced it still resolves (history intact).
**Risk:** HIGH. **Deploy:** backend merges first (Cloud Run ~12 min, no preview).

### Story 2.2 — Manage + mirror + edit all agree "gone" (FE)
**As a** seller, **I want** a deleted listing to leave my dashboard and never 404 me on edit, **so that**
the delete is clean and consistent.
**Build:** align the mirror write + the manage-dashboard list source + the edit guard so all three agree
on "deleted"; make the frontend null-safe for the backend deploy-lag window (a not-yet-deployed BE must
not break the FE). Keep the confirm-modal copy honest ("no se puede deshacer" stays true).
**Acceptance:** delete → confirm → on reload the row is **gone** from manage (not "Borrador"); visiting
`/sell/edit/<id>` for a deleted listing shows a clean "no encontrado" state, not a broken mid-flow 404.
**Risk:** HIGH.

## Sprint QA
- **api spec(s):** `e2e/listing-delete.spec.ts` — pure/state-mapping spec that a soft-deleted listing maps
  to "gone" across manage list + edit guard; post-merge prod API smoke that `GET /store/sellers/me/products`
  omits a freshly-deleted product. (New-route negative paths return 200 on prod pre-deploy — CI-vs-preview
  is authoritative; LEARNINGS.)
- **browser smoke owed:** **yes, to Daniel** — the authed seller flow *delete a real listing → reload
  manage → attempt edit* (he holds the seller session; soft-delete touches the live product lifecycle).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (backend has no preview — confirm post-merge against prod)

1. Sign in as a seller with a disposable test listing and go to https://miyagisanchez.com/shop/manage
   → You see the test listing in the grid. **(authed — owed to Daniel)**
2. Click delete on it and confirm the modal.
   → The row disappears immediately.
3. Reload https://miyagisanchez.com/shop/manage
   → The listing is **still gone** — it does **not** reappear as "Borrador".
4. Try to open its edit URL directly, e.g. https://miyagisanchez.com/sell/edit/<that-listing-id>
   → A clean "no encontrado" page, **not** a broken 404 mid-flow.
5. Open an order that referenced a previously-deleted listing (if available) in
   https://miyagisanchez.com/shop/manage/orders
   → The order still resolves; product reference intact.

If any step fails, note the step number + what you saw — that's the bug report.
