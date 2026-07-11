# Panfleto — the first premium shop — Sprint 1: Rehome the printed edition to admin

**Status:** ✅ shipped — both PRs merged + live in prod; cutover complete; placement checkout now
attributes to `miyagi-plataforma`. Owed: Daniel's live money-step smoke (buy one real placement).

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
**Status:** ✅ shipped + live. `sel_01KX7XP45BM9JWCP77Y9JRT7VE` (slug `miyagi-plataforma`) is the
platform seller, Stripe Connect account transplanted from `miyagiprints`. `PLATFORM_SELLER_SLUG` is
flipped in prod (Cloud Run `medusa-web` + `miyagi-web`) — confirmed via `GET /api/print/editions`
live returning `platform_seller_id: sel_01KX7XP45BM9JWCP77Y9JRT7VE`. Owed: Daniel's live money-step
smoke (buy one real placement, confirm the resulting order/product attributes to the new seller).

### Story 1.2 — Old constant unreachable, history intact
**As a** developer, **I want** `getMiyagiprintsSellerId()` gone and every call site on the new
config-addressable resolver, **so that** two placement-owner paths can never coexist.
**Acceptance:** `grep -ri miyagiprints apps/miyagisanchez/lib apps/miyagisanchez/app --include='*.ts*'`
returns only content/copy references (no seller-resolution logic); existing placement orders, referral
print-ad credits, and prior editions render unchanged; a regression spec pins the new resolver.
**Risk:** high
**Status:** ✅ shipped + merged (frontend PR #217, backend PR #81) — `getMiyagiprintsSellerId()`
deleted; `resolvePlatformSellerSlug()`/`getPlatformSellerId()` land in a next-free
`lib/platform-seller.ts` (the Playwright `api` project can't import `lib/print-server.ts`
directly — it pulls in email/telegram/promoter modules). A 4th hardcoded call site the epic doc's
own inventory missed (`PrintAdBuilder.tsx`'s coupon-preview call) is included. The acceptance grep
is clean except one unrelated hit (`PrintAdminClient.tsx`'s "slug (ej. miyagiprints)" placeholder —
a Supabase `print_providers` example string, nothing to do with Medusa seller resolution).

## Implementation notes (real findings from building this sprint)

- **The epic README's "frontend-only expected" assumption was wrong.** Two backend routes
  (`internal/platform-coupons/route.ts`, `internal/print/placement-product/route.ts`) also hardcoded
  `'miyagiprints'` as their seller-resolution default — backend PR
  [`medusa-bonsai-backend#81`](https://github.com/danybgoode/medusa-bonsai-backend/pull/81) ships
  first, per the epic's own documented fallback clause for this case.
- **Config, not a code fallback.** Both apps read `PLATFORM_SELLER_SLUG` with **no** `?? 'miyagiprints'`
  fallback in source — the dark/backward-compatible value (`miyagiprints`) is an env var. This keeps
  Story 1.2's grep clean and avoids two coexisting seller-resolution paths, per the epic's kill-switch
  note.
- **Near-miss: the frontend ops action initially targeted the wrong prod runtime.** First pass
  provisioned `PLATFORM_SELLER_SLUG` in Vercel Production — but per this org's own deploy topology,
  Vercel prod deploys have been OFF since 2026-07-10 (`frontend-vercel-to-cloudrun` epic); the real
  prod frontend is Cloud Run `miyagi-web`, and Vercel now serves previews only. Left as-is, every
  placement checkout would have resolved `sellerId: undefined` the moment PR #217 merged — caught by
  the fresh pr-reviewer pass (not CI, not the cross-agent pass) before merge. Fixed: provisioned on
  Cloud Run `miyagi-web` directly (revision `miyagi-web-00030-gnz`); Vercel Preview/Development kept
  for this PR's own preview verification. **Generalizable lesson**: an env var "provisioned in Vercel"
  is not equivalent to "provisioned in prod" for this app anymore — always target Cloud Run for
  anything that must be live, Vercel only for PR previews.
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

## Run order (all steps complete)
1. ✅ Prod data step — the `miyagi-plataforma` seller row + transplanted Stripe Connect account
   created in prod (done ahead of the PR merges; safe, since the script only depends on the
   `Seller` model already live in prod, not on either PR's code).
2. ✅ Backend PR #81 merged (squash `3b252c1`) → Cloud Build `backend-main-deploy` → `medusa-web`
   revision `medusa-web-00159-8m5` confirmed serving 100% traffic at the merge commit.
3. ✅ Frontend PR #217 merged (squash `6c42c43`) → Cloud Build `frontend-main-deploy` → `miyagi-web`
   revision `miyagi-web-00031-jqx` confirmed serving 100% traffic at the merge commit.
4. ✅ Cutover — `PLATFORM_SELLER_SLUG` flipped `miyagiprints` → `miyagi-plataforma` on Cloud Run
   `medusa-web` (revision `medusa-web-00160-rct`) then `miyagi-web` (revision `miyagi-web-00032-klv`).
   Verified live: `GET /store/sellers/miyagi-plataforma` resolves `sel_01KX7XP45BM9JWCP77Y9JRT7VE`;
   `GET https://miyagisanchez.com/api/print/editions?status=open` returns
   `platform_seller_id: sel_01KX7XP45BM9JWCP77Y9JRT7VE` with editions still loading correctly.

## Sprint 1 — Smoke walkthrough (do these in order — cutover is live)
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
