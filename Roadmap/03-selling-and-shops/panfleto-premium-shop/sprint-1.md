# Panfleto — the first premium shop — Sprint 1: Rehome the printed edition to admin

**Status:** 🚧 in progress — both PRs open (draft), prod data step pending Daniel's go

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
**Status:** 🚧 code shipped in both PRs; the platform seller row itself + Stripe transplant not yet
created (owed — see "Prod data step" below). Until that runs + `PLATFORM_SELLER_SLUG` is flipped,
behavior is unchanged (still resolves `miyagiprints`, by design — see Story 1.2 notes).

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
- **Prod data step, not yet run.** A dry-run/APPLY script
  (`apps/backend/src/scripts/panfleto-s1-create-platform-seller.ts`) creates the `miyagi-plataforma`
  seller row and transplants `metadata.settings.stripe`. This is a real prod money/entitlement write —
  the `PANFLETO_S1_APPLY=1` run requires Daniel's explicit named go at the moment of execution (a
  broad plan approval does not cover it). Execution mechanism: a throwaway Cloud Run Job (Cloud SQL is
  private-IP only, unreachable from a laptop) — provisioned this session, dry-run output pending.

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
1. Merge backend PR #81 → confirm live (Cloud Run env var already provisioned).
2. Merge frontend PR #217 → confirm live (Vercel env var already provisioned).
3. Run the prod data script's dry-run, show Daniel the output, get an explicit named go, run
   `PANFLETO_S1_APPLY=1` (creates `miyagi-plataforma` + transplants the Stripe Connect account).
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
