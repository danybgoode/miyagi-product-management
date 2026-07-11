# Panfleto — the first premium shop — Sprint 1: Rehome the printed edition to admin

**Status:** 🚧 in progress — both PRs open (draft); prod platform-seller row created + Stripe
transplanted (Daniel's go given, done); cutover (the env var flip) not yet done — still dark.

## Stories

### Story 1.1 — Placements sell through a platform-owned seller
**As a** platform admin, **I want** print-ad placements minted and sold under a platform-owned seller
(resolved from config, not a merchant-shop constant), **so that** the printed edition is an admin
feature that survives any merchant shop's rename, migration, or closure.
**Acceptance:** buying a placement (`/sell/print/[editionId]` and the promoter close path) produces an
order under the platform seller; the miyagiprints/panfleto storefront lists **no** placement products
(the `is_print_placement` leak guard still holds); `/admin/print` and the zine studio read paid
submissions exactly as before against a real edition.
**Risk:** high
**Status:** 🚧 code shipped in both PRs (not yet merged); the platform seller row
(`sel_01KX7XP45BM9JWCP77Y9JRT7VE`, slug `miyagi-plataforma`) exists in prod with the old
`miyagiprints` seller's Stripe Connect account transplanted onto it. Until `PLATFORM_SELLER_SLUG` is
flipped (the cutover, still owed), behavior is unchanged — everything still resolves `miyagiprints`,
by design (see Story 1.2 notes).

### Story 1.2 — Old constant unreachable, history intact
**As a** developer, **I want** `getMiyagiprintsSellerId()` gone and every call site on the new
config-addressable resolver, **so that** two placement-owner paths can never coexist.
**Acceptance:** `grep -ri miyagiprints apps/miyagisanchez/lib apps/miyagisanchez/app --include='*.ts*'`
returns only content/copy references (no seller-resolution logic); existing placement orders, referral
print-ad credits, and prior editions render unchanged; a regression spec pins the new resolver.
**Risk:** high
**Status:** ✅ shipped in code (frontend PR #217) — `getMiyagiprintsSellerId()` deleted;
`resolvePlatformSellerSlug()`/`getPlatformSellerId()` land in a next-free `lib/platform-seller.ts`
(the Playwright `api` project can't import `lib/print-server.ts` directly — it pulls in
email/telegram/promoter modules). A 4th hardcoded call site the epic doc's own inventory missed
(`PrintAdBuilder.tsx`'s coupon-preview call) is included. The acceptance grep is clean except one
unrelated hit (`PrintAdminClient.tsx`'s "slug (ej. miyagiprints)" placeholder — a Supabase
`print_providers` example string, nothing to do with Medusa seller resolution).

## Implementation notes (real findings from building this sprint)

- **The epic README's "frontend-only expected" assumption was wrong.** Two backend routes
  (`internal/platform-coupons/route.ts`, `internal/print/placement-product/route.ts`) also hardcoded
  `'miyagiprints'` as their seller-resolution default — backend PR
  [`medusa-bonsai-backend#81`](https://github.com/danybgoode/medusa-bonsai-backend/pull/81) ships
  first, per the epic's own documented fallback clause for this case.
- **Config, not a code fallback.** Both apps read `PLATFORM_SELLER_SLUG` with **no** `?? 'miyagiprints'`
  fallback in source — the dark/backward-compatible value (`miyagiprints`) is an env var, provisioned
  in Cloud Run (backend, confirmed live) and Vercel (frontend, Production+Preview+Development,
  confirmed present). This keeps Story 1.2's grep clean and avoids two coexisting seller-resolution
  paths, per the epic's kill-switch note.
- **Payout mechanics: transplant, not a new Connect account.** Placement checkout resolves the seller's
  Stripe Connect account via `seller.metadata.settings.stripe` → `transfer_data.destination` — the exact
  same path any merchant sale uses (confirmed: no `is_print_placement` branch exists in payment code).
  So the new platform seller (`miyagi-plataforma`) gets the OLD `miyagiprints` seller's *same* connected
  Stripe account copied onto it — no new onboarding, zero payment-code changes.
- **Prod data step — done.** The dry-run/APPLY script
  (`apps/backend/src/scripts/panfleto-s1-create-platform-seller.ts`) needed a real execution mechanism
  since Cloud SQL is private-IP only (unreachable from a laptop) — a throwaway Cloud Run Job
  (`medusa-web`'s image built off this branch, same VPC connector/secrets/SA), run once as a dry-run
  (shown to Daniel, explicit go given), once as `PANFLETO_S1_APPLY=1` (created
  `sel_01KX7XP45BM9JWCP77Y9JRT7VE` / `miyagi-plataforma` with the transplanted Stripe metadata), and
  once more re-run dry as a no-op check (confirmed idempotent). Job + throwaway image deleted after.
  This only creates the row — no traffic routes to it until the cutover below.

## Sprint QA
- **api spec(s):** `e2e/print-platform-seller-resolver.spec.ts` (new, pure — resolver unset/set/
  override/blank cases) + `e2e/shop-listings-placement-filter.spec.ts` (extended with a
  seller-independence case) on the frontend; `platform-seller.unit.spec.ts` (new, pure) on the
  backend.
- **browser smoke owed:** yes, to Daniel — the **money step**: buy one real placement post-cutover.
- **deterministic gate:** both repos green — backend `medusa build` → `tsc --noEmit` →
  `npm run test:unit` (370 tests); frontend `tsc --noEmit` → `npm run build` → Playwright `api`
  (1884 passed; 6 pre-existing unrelated local-env failures confirmed identical on unmodified `main`).

## Run order before the smoke walkthrough below makes sense
1. ✅ Prod data step — the `miyagi-plataforma` seller row + transplanted Stripe Connect account exist
   in prod (done ahead of the PR merges; safe, since the script only depends on the `Seller` model
   already live in prod, not on either PR's code).
2. Merge backend PR #81 → confirm live (Cloud Run env var already provisioned).
3. Merge frontend PR #217 → confirm live (Vercel env var already provisioned).
4. Flip `PLATFORM_SELLER_SLUG` from `miyagiprints` → `miyagi-plataforma` in both Cloud Run and
   Vercel (backend first, then frontend) — **this is the actual cutover**; steps 1-3 alone change
   nothing user-visible.

## Sprint 1 — Smoke walkthrough (do these in order, AFTER the cutover above)
Env: production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/sell/print/[current-edition-id] and buy the cheapest placement
   (card, Stripe test → then one real MXN pass). **(money step — Daniel)**
   → Checkout completes; the order exists under `miyagi-plataforma`, not `miyagiprints`.
2. Open https://miyagisanchez.com/admin/print
   → The new submission appears in the queue like any pre-change submission.
3. Open the zine studio and pull paid submissions for the open edition.
   → The new placement is present; prior-edition placements unchanged.
4. Open https://miyagisanchez.com/s/miyagiprints (soon `/s/panfleto`, post Sprint 2)
   → No placement products anywhere in the storefront or its collections.

If any step fails, note the step number + what you saw — that's the bug report.
