# Sprint 2 — Intelligence: fee estimator, solve-for-price suggester, one-click apply, insights

> Epic: [profit-analyzer](README.md) · Risk: **HIGH** (US-5 live price writes; Daniel merges) ·
> Apply-price respects the existing `ml.publish_enabled` rail.
> **Status: ✅ MERGED 2026-07-06** — Daniel authorized merge-on-green. Backend PR
> [#62](https://github.com/danybgoode/medusa-bonsai-backend/pull/62) → `8c53702`, frontend PR
> [#180](https://github.com/danybgoode/miyagisanchezcommerce/pull/180) → `38f8944` (branches deleted,
> both `feat/profit-analyzer-s2`). Deterministic gate green in both repos; a real
> local Postgres smoke validated the US-5 write path (below) — the ML-sandbox leg + a Clerk-authenticated
> browser click-through remain owed to Daniel.

## Stories

### US-4 · Fee estimator + suggester math — med ✅
**As a** seller, **I want** a recommended price for a target margin that accounts for ML's fee on that
very price, **so that** the suggestion is actually achievable.
`listing_prices` call on the ML client (+ cache; per site/category/listing-type); pure `lib/profit.ts`
seam: `price = (COGS + shipping + fixed_fee) / (1 − fee% − target_margin%)` — the PRD's additive formula
was corrected at groom. Degenerate inputs (fee% + margin% ≥ 1) surface a clear "no achievable price" state.
**Acceptance:** unit specs pin the math incl. edge cases; the estimator returns ML's own fee for a known
category/price within cache TTL; offline/ML-error degrades to estimate-marked output, never a crash.
**Built:** `getListingPrices()` (`apps/backend/src/modules/mercadolibre/client.ts`) + a per-category/
listing-type TTL cache (`listing-price-cache.ts`, mirrors `flags-cache.ts`'s shape) + service methods
`getFeeRate`/`getFeeEstimateForProduct` (resolves the category from the product's existing ML link, so
callers never need an ML category id) + `GET /store/sellers/me/profit/fee-estimate?product_id=&price_cents=`.
Pure `solveForPrice()` + degenerate-case handling in `lib/profit.ts`, pinned by
`e2e/profit-pricing.spec.ts` (7 specs). Squash-merged into backend `8c53702` / frontend `38f8944`.

### US-5 · Target-margin control + one-click Apply — high ✅
**As a** seller, **I want** to set my target margin, see the suggested price, and apply it with one
confirmed click — updating Miyagi and my linked ML listing, **so that** repricing takes seconds.
Confirm dialog (never automatic); writes via the existing publish/update parity; every apply lands in the
activity log; ML API rejections (e.g. active promotion) surface honestly.
**Acceptance:** move the control to 30% → suggestion updates live; Apply → Miyagi PDP shows the new price
and the ML listing follows; the activity log records who/what/when; a forced ML error shows in the log, and
the Miyagi price change either completes or reports — no silent half-state.
**Built:** `POST /store/sellers/me/profit/apply-price` writes the Miyagi price via the same shared
`updateSellerProduct()` the existing PATCH route uses, then — only when linked AND `ml.publish_enabled`
is on — pushes it via the existing `publishOrSyncProduct` reconcile seam (both called directly, no
self-HTTP hop). Every attempt logs a `price_apply` `ml_sync_event` (new activity-log kind). `updateMlItem`
now parses ML's error body on a rejected write and forwards the real reason (e.g. an active-promotion
block) instead of a generic failure. Added `ml.publish_enabled` to the backend's own `FlagKey` union
(previously frontend-only) since this route calls the ML write in-process. Frontend: `PricingCard.tsx`
(slider + one cached fee-rate fetch + local `solveForPrice` + confirm dialog copying `DeleteDialog`'s
shape) rendered per addressable SKU on `/shop/manage/profit`; the two proxy routes
(`app/api/sell/profit/{fee-estimate,apply-price}`). Squash-merged into backend `8c53702` / frontend `38f8944`.
**Known approximation (owed follow-up, not a blocker):** the "current price" shown is the SKU's realized
average unit price (`revenue_cents / units`), not a live catalog-price read — the ledger has no such read
today. Labeled honestly in the UI ("precio actual (promedio reciente)"). Also: the ML link's `listing_type`
isn't persisted at publish time, so the fee estimate assumes `ML_DEFAULT_LISTING_TYPE` ('bronze') — matches
what `buildMlItemPayload` itself falls back to, but isn't a live lookup of the item's actual listing type.

### US-6 · Margin insights — low ✅
**As a** seller, **I want** my "margin killers" and underpriced high-margin SKUs flagged, **so that** I
know where to act first.
Threshold classifiers over the ledger (pure fns); rendered on the dashboard with links to the suggester.
**Acceptance:** a SKU whose fee+shipping eats its margin appears under margin killers; a high-margin,
low-priced SKU appears as underpriced; thresholds unit-tested.
**Built:** `classifyMarginKillers`/`classifyUnderpriced` in `lib/profit.ts`, operating on the existing
`SkuMarginRow[]` (extended with a per-SKU `pending` field + `variant_id`, bucketed by variant rather than
product so Apply can address a specific variant). Pinned defaults: margin killer = realized margin < 5%;
underpriced = realized margin ≥ 40% **and** current price > 10% below the price achievable at an
*ambitious* 55% reference margin (deliberately ABOVE the 40% floor — comparing against a lower/equal
target can never show headroom, since the achievable-price formula is monotonic in margin%; caught and
fixed during this sprint's own unit-testing, not shipped with the bug). Rows with any pending piece are
excluded from both buckets. Rendered as two call-out sections above the per-SKU pricing cards. Commit:
squash-merged into frontend `38f8944` (classifiers + rendering).

## Sprint QA

- Api specs: solve-for-price + degenerate cases (US-4), apply-decision fn + activity-log shape (US-5),
  classifier thresholds (US-6).
- **Deterministic gate, both repos — green:**
  - Backend: `tsc --noEmit` clean; `npm run test:unit` — 180/180 passed (incl. new
    `ml-listing-price-cache.unit.spec.ts`).
  - Frontend: `tsc --noEmit` clean; `next build` clean (no warnings); `npm run test:e2e` (api project) —
    1401/1402 passed, 13 skipped (credential-gated), **1 pre-existing failure unrelated to this branch**
    (`e2e/not-found-shape.spec.ts` — a junk short-link 404 check; `git diff origin/main..HEAD` touches
    neither `middleware.ts` nor that spec, so this is a pre-existing flake, not a regression); the design-
    token raw-hex guard (`e2e/design-token-foundation.spec.ts`) passes clean on the new UI.
- **Cross-agent review (codex, both PRs):** advisory findings addressed — the fee-estimate cache-key nit;
  Apply now re-verifies the fee rate at the ACTUAL candidate price right before confirming (not just the
  cached rate from the row's average price); `apply()` checks `res.ok` explicitly; and
  `classifyUnderpriced` rounds cost-per-unit (all squash-merged into the final commits above). Two
  "blocking" findings assessed as not applicable to this PR: the two new
  `app/api/sell/profit/*` routes are Clerk-authed proxies to the Medusa Store API — the same shape as
  every existing `/api/sell/*` route in the app (AGENTS rule #1 prohibits custom Supabase/business logic
  for commerce, not a thin proxy to Medusa); and the UCP/MCP capability manifest was not extended for
  this seller-only repricing action — a real architectural question (rule #3), but out of this sprint's
  approved scope (the epic's US-4/5/6 stories never mention MCP), left as a named follow-up rather than a
  silent scope expansion.
- **Real local smoke, this session (after cross-review fixes):** provisioned a throwaway local Postgres
  (Homebrew `postgresql@14`, `initdb`+`pg_ctl`, torn down after) and booted the actual backend
  (`medusa develop`) against it. `medusa db:migrate` applied ALL migrations cleanly on a fresh DB,
  including this epic's `financial_event` (Sprint 1) and no new migration needed for Sprint 2. Confirmed
  live: (1) all three `/store/sellers/me/profit*` routes 404 by default with no Supabase credentials
  configured (`ops.profit_enabled` fails open to `false` — exactly the documented contract, and the exact
  gate Sprint 1's launch bug was about); (2) calling `updateSellerProduct()` directly (the same function
  `POST /store/sellers/me/profit/apply-price` calls) against a real seeded product moved its price
  10000→15000 centavos, confirmed by re-reading the row; (3) `recordSyncEvent`/`listSyncEvents` round-
  tripped a real `price_apply` event with `{variant_id, old_price_cents, new_price_cents,
  target_margin_pct}` metadata — the NEW activity-log kind is accepted with zero DB changes needed (kind
  is `text`, not an enum); (4) `getFeeEstimateForProduct` gracefully returned `null` (no crash) for a
  product with no ML link, exactly the designed degrade path. **Not testable locally** (no real Clerk or
  Mercado Libre sandbox credentials in this environment): the actual Clerk-authenticated HTTP round-trip
  through the two new frontend/backend proxy routes, and any real Mercado Libre API call (fee lookup or
  price push) — both remain genuinely owed to Daniel, narrower than before this local smoke.
- **Owed to Daniel:** the live apply-price money path end-to-end (Miyagi + ML both change, against the ML
  sandbox, through the real Clerk-authed UI) — the Miyagi-side write itself is now locally proven, so this
  is specifically the ML-integration leg + the real browser click-through; and confirming
  `ops.profit_enabled` + `ml.publish_enabled` still read correctly for these new surfaces in prod (both
  flags already exist and are live from Sprint 1 / mercadolibre-sync — this is a confirmation, not a
  fresh flip).

## Sprint 2 — Smoke walkthrough (do these in order)

_Steps marked **[owed to Daniel]** need a live seller session / ML sandbox / prod access — the agent
cannot run them. Run against the PR's Vercel preview before merge (`PLAYWRIGHT_BASE_URL=<preview-url>`,
or just sign in on the preview URL directly); switch to `https://miyagisanchez.com` once merged._

1. **Flag still gates the new surfaces the same way.** Signed OUT (or with `ops.profit_enabled` off),
   `/shop/manage/profit` still 404s exactly like Sprint 1 — Sprint 2 added no new bypass of that gate.
2. **[owed to Daniel] Fee estimate loads for a linked SKU.** On a seller with at least one COGS-set,
   ML-linked product, open `/shop/manage/profit` → the SKU's "Ajusta tus precios" card shows a suggested
   price (not "No hay precio posible…") within a couple seconds of load.
3. **[owed to Daniel] Slider recomputes instantly, no extra network calls.** Drag the target-margin
   slider from 25% → 40% → the suggested price updates immediately (open the browser Network tab first —
   confirm there is only the ONE `fee-estimate` call from page load, none per slider tick).
4. **Degenerate case shows the honest message.** Drag the slider high enough that fee% + margin% ≥ 100%
   (or test a SKU with a very high implied fee) → Apply is disabled and "No hay precio posible con ese
   margen y comisión" renders instead of a crash or a nonsense price.
5. **[owed to Daniel] Apply — confirm dialog, then the write.** Click Apply → confirm dialog shows
   current → new price + the target margin → confirm → **Miyagi's product/PDP price actually changes**
   to the new value (check `/s/<shop-slug>` or the listing editor).
6. **[owed to Daniel] ML follows, when linked + publish enabled.** For a `ml.publish_enabled`-on seller
   with that SKU linked to an active ML item, after step 5 the **live ML listing's price also changes**
   (check the ML permalink) — the UI reports "Precio actualizado en Miyagi y en Mercado Libre."
7. **[owed to Daniel] Unlinked / publish-off SKU skips ML honestly.** Repeat Apply on a SKU with no ML
   link (or with `ml.publish_enabled` off) → Miyagi price still changes, and the UI reports "sin
   publicación en Mercado Libre" — never a silent full-success claim.
8. **[owed to Daniel] Activity log records the attempt.** After steps 5–7, `GET /internal/ml/events?
   seller_slug=<slug>` (or the seller status surface that reads it) shows a `price_apply` entry with
   `old_price_cents`/`new_price_cents`/`target_margin_pct` in its metadata for each apply.
9. **[owed to Daniel] A forced ML rejection surfaces honestly, Miyagi still lands.** Trigger an ML-side
   rejection (e.g. apply while an active promotion blocks a price change, if reproducible in the sandbox)
   → Miyagi's price still changes, the UI shows "No se pudo actualizar en Mercado Libre: <reason>" with
   ML's real rejection text (not a generic error), and the `price_apply` log entry records `outcome: fail`
   with that reason.
10. **Insights render when the math says so.** For a seller/shop with a genuinely loss-making SKU (fees +
    COGS eating margin below 5%) and/or a comfortably-profitable one prices well below the ambitious
    reference — the "Perdiendo margen" / "Con espacio para subir precio" call-outs appear above the
    pricing cards, naming the right SKUs.
11. **Pending SKUs are excluded from insights.** A SKU still missing a COGS snapshot or an ML fee parse
    (a `pending` piece) does NOT appear in either insights bucket, even if its visible numbers would
    otherwise qualify — confirms the honesty rule holds in the live UI, not just in the unit specs.
