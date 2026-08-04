# US operator commerce pilot — Sprint 3: Activate three catalogs and the parallel proof cockpit

**Status:** ⬜ not started

## Outcome

The three consented shops have reviewed USD catalogs through the locked intake paths, and the operator has
one honest readiness/reconciliation cockpit. One Shopify import and one native setup are proven without
automated incumbent sync, implicit publication or cross-market exposure.

## Build contract — architect must lock before delegation

Before a builder starts, cite the epic's `D1…Dn` and the merged Sprint 2 contracts here. Name the literal
three shops and intake map, current `start_shopify_migration`/supply-batch/parity/import seams, every writer of
price/inventory/channel/publication, native builder contract, required catalog fields/tax inputs, retained
inventory authority/safety buffers, partner-portfolio projection and storage boundary for the public-safe
reconciliation record. Replace smoke placeholders with literal cohort URLs and disposable records.

## Stories

### Story 3.1 — Import one Shopify catalog through the shipped batch

**As the operator, I want** one incumbent catalog staged and reviewed **so that** import speed is proved
without overwriting live merchant work.

**Acceptance:**

- `start_shopify_migration` resolves the granted target shop and stages the source through the existing supply
  batch. It creates no product before explicit review/import and stores no external secret.
- The parity report covers ownership/identity, title, description, media, variants, SKU, USD price, inventory,
  weight/dimensions and the Sprint 1 original-product complexity. Unsupported fields stay visible gaps.
- Retry is idempotent; denied/revoked shops cannot stage, review or import. Concurrent confirm cannot import
  twice.
- Imported products are assigned only to the US operating channel and remain unpublished until explicit
  operator confirmation.

**Risk:** high — catalog migration/mutation. **QA:** connector fixtures, parity/idempotency/concurrent-confirm,
denied-shop and channel-isolation tests; Daniel reviews the live staged batch before any import.

### Story 3.2 — Create the native shop and complete all three readiness records

**As the operator, I want** one native catalog and the third locked intake path completed **so that** the
proof covers creation as well as migration.

**Acceptance:**

- One merchant uses the native Miyagi path; the third uses the Sprint 1-selected path.
- Every sellable variant has USD price, SKU, inventory authority/buffer, package weight/dimensions, origin,
  entered COGS, the named tax input/code and shipping eligibility. Missing is unavailable/incomplete, not zero.
- Publishing is an explicit per-shop confirmation and cannot expose a product outside the US owned-shop
  channel. Bulk/agent actions show a preview and use the same confirmation/auth rails.
- US cohort copy says USD/dollars and the selected provider; MX Spanish/peso behavior remains unchanged.

**Risk:** high — product/inventory/price/channel writes. **QA:** required-field/currency tests, native creation,
bulk preview/confirm/idempotency, market/channel leak and merchant catalog sign-off.

### Story 3.3 — Give the operator one readiness/reconciliation cockpit

**As the operator, I want** one three-shop view with clear next actions **so that** parallel operation is
observable without pretending to replace accounting or the incumbent platform.

**Acceptance:**

- The existing `/partner` portfolio shows each granted shop's catalog, payment, tax, shipping, inventory-buffer
  and live-order readiness plus a named next action/owner.
- The daily checklist records comparison time, incumbent/Miyagi sellable quantity, unresolved order
  disposition, exception owner and resolution without customer PII or credentials.
- The view says this is daily reconciliation, not real-time sync. Stale/unavailable evidence is distinct from
  zero exceptions and names the last successful check.
- Viewer reads; manager records the explicit checklist action; revoked/ungranted actors receive no cohort data.

**Risk:** low for a read-oriented cockpit over existing high-risk seams. **QA:** pure readiness three-state
logic, role/auth matrix, privacy allowlist and Daniel three-shop browser smoke.

## Sprint QA

- **Backend specs:** migration batch target auth/idempotency/concurrency, product market/channel ownership,
  readiness projection and unavailable states.
- **Frontend specs:** staged review/confirm, native required fields, publish preview/confirm, three-shop cockpit,
  role behavior and USD/MXN copy continuity.
- **Mutation proof:** new specs observed red once; explicit negations for import-before-review, publish-before-
  confirm, cross-channel exposure and unavailable-as-zero.
- **Owner smoke owed:** Daniel reviews/imports one disposable Shopify batch, creates one native product, confirms
  channel isolation and walks the three-shop cockpit/reconciliation record.
- **Review:** stacked HIGH PR(s) for catalog mutations; mandatory cross-family/fresh review and Daniel merge.

## Sprint 3 — Smoke walkthrough

Env: preview/staging before merge · literal cohort URLs locked in the Build contract

1. Sign in as the disposable operator at https://miyagisanchez.com/partner and open the locked Shopify shop.
   → The shop is granted and shows its catalog-import next action; no other shop's data appears.
2. Start the Shopify migration and inspect its staged batch before confirming.
   → The parity report shows identity, media, variants, SKU, USD price, stock, package data and named gaps;
   the owned shop still has no newly imported product.
3. Confirm the reviewed batch once, then retry the same confirm.
   → Products import exactly once, remain US-channel-only and stay unpublished until separate confirmation.
4. Switch to the locked native shop and create the disposable proof product.
   → USD price, SKU, stock/buffer, dimensions/weight, origin, COGS, tax input and shipping eligibility are
   required before it is ready.
5. Preview then confirm publication for the disposable products and open each literal owned-shop URL.
   → Each shows only its own US-channel catalog in USD; the locked MX shop remains MXN and unchanged.
6. Return to https://miyagisanchez.com/partner and inspect all three readiness rows.
   → Each row names completed/blocking facts, owner and last successful check; unavailable never reads as zero.
7. Record one reconciliation exception as manager, retry as viewer, then revoke the manager grant.
   → Manager write succeeds once; viewer/revoked writes are denied; the public-safe record contains no PII.

If any step fails, record the URL, shop/grant, intake batch, market/channel and confirmation state.
