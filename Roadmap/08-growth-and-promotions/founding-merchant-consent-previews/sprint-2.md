# Founding merchant consent-safe previews — Sprint 2: Approval and activation

**Status:** ✅ Merged — FE #294 (`626f0b1`); flag OFF, S2 migration NOT yet applied, smoke owed to Daniel

## Stories

### Story 2.1 — Merchant-readable versioned approval

**As a** merchant, **I want** to review exactly what Miyagi will publish and approve or request changes,
**so that** activation is informed and explicit.

**Acceptance:** approval summary names shop identity and every reviewed product's title, price and image; approval
records preview version, actor/provenance, timestamp and wording; request-changes records the decision and keeps
everything private; link delivery, silence, claim and WhatsApp send never create approval.

**Risk:** high — consent/audit schema and merchant identity boundary; Daniel merges.

### Story 2.2 — Material-edit invalidation

**As the** system, **I want** material changes after approval to invalidate it, **so that** stale consent cannot
publish new claims, products or prices.

**Acceptance:** title/price/image/product membership/shop identity changes create a new snapshot and return the
preview to review; explicitly listed cosmetic changes do not; activation refuses stale approval with a clear
next action; repeated saves that do not change the snapshot are idempotent.

**Risk:** high — approval-state enforcement; Daniel merges.

### Story 2.3 — Idempotent public activation

**As a** Founding Merchant Partner, **I want** one deliberate activation action after approval, **so that** the
exact approved snapshot becomes public once.

**Acceptance:** activation requires current approval and checklist completion; public channels light up only
after the canonical Medusa write; repeat activation is idempotent; checkout remains claim-gated; failed partial
writes surface and can replay safely; `preview_activated` emits only after success.

**Risk:** high — publication, cross-store write and lifecycle event; Daniel merges.

## Sprint QA

- **api specs:** approval/create/request-changes/invalidation/activation state machine with ownership, stale
  version, 0-row write and replay cases.
- **pure spec:** deterministic snapshot hashing and material-field resolver, observed red by mutation.
- **browser smoke owed:** yes to Daniel for the real merchant approval identity and promoter activation click;
  agent owns anonymous before/after channel smoke.
- **deterministic gate:** both app gates green; Supabase migration existence verified live before flag flip.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. Open a fresh private preview link as the disposable merchant.
   → One review page lists the exact shop and three products with title, price and image.
2. Click “Solicitar cambios”.
   → The preview stays private and the promoter workspace shows changes requested.
3. Update one price, resend the preview, and click the explicit approval action.
   → A new approved version and timestamp appear; nothing is public yet.
4. Change one approved product title in the promoter workspace.
   → Approval becomes stale and “Activar” is blocked until the new version is approved.
5. Re-approve and click “Activar tienda” once, then repeat the click.
   → Public shop/products appear once; the repeated action makes no duplicate; checkout still asks the merchant
   to claim/finish setup rather than accepting an unclaimed purchase.

If any step fails, note the step number + preview version — that's the bug report.

## Migration — ✅ APPLIED + VERIFIED (2026-07-22)

`supabase/migrations/20260721150000_consent_previews_s2.sql` is **applied in production**.

**The mechanism (use this, not the SQL editor):** the Supabase CLI is authenticated and linked to
`xljxqymsuyhlnorfrnno`, and applies a single migration file through the Management API:

```bash
cd apps/miyagisanchez
supabase db query --linked --file supabase/migrations/20260721150000_consent_previews_s2.sql
supabase migration repair --status applied 20260721150000 --linked   # record it in history
```

**Do NOT use `supabase db push`** — see the migration-history warning below.

Verified end-to-end after applying (all green): table created; `approved_snapshot_hash` /
`approved_at` / `activated_at` all present; RLS `true` with `0` policies (service-role only, as
designed); both indexes and both FKs present; the app's own PostgREST path returns 200 on every new
column and the new table (it returned 404/42703 before); a decision insert round-trips its JSONB
snapshot; the CHECK constraint rejects a decision value outside
`('approved','changes_requested')` (`23514`); the FK rejects an orphan decision (`23503`). All write
tests ran inside transactions that were rolled back — 0 rows persisted.

Note the verification queries below are **`SELECT`s — they only check, they never apply.** Running
them against an unmigrated database correctly returns `NULL` / 0 rows.

```sql
SELECT to_regclass('public.merchant_preview_decisions');           -- expect: merchant_preview_decisions
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'merchant_previews'
   AND column_name IN ('approved_snapshot_hash','approved_at','activated_at');  -- expect 3 rows
```

## ⚠️ Migration-history drift (project-wide, predates this epic)

`supabase migration list --linked` reports **44 local migration files as not applied remotely** —
including S1's `20260721140000`, which is demonstrably applied (its tables exist and serve traffic).
The cause: migrations here are applied by hand, which never records them in
`supabase_migrations.schema_migrations`. So the schema is fine; the **history table** is what's
wrong.

**Consequence: `supabase db push` is unsafe in this repo** — it would try to replay all 44
unrecorded migrations. Only the two consent-preview migrations have been repaired (after verifying
they are genuinely applied). The other 42 were deliberately left alone: marking a migration
`applied` without verifying it permanently hides a real gap, which is exactly the failure this
project has already hit three times. Reconciling them is its own task — verify each against live
schema first, then repair.

## What shipped (implementation notes)

- **2.1** `POST /api/preview/[token]/decision` — opaque-token authed (the merchant has no Clerk
  account), with an `expectedHash` guard so a decision can never apply to a proposal the merchant
  didn't see. `/preview/[token]` renders the approve / request-changes island and marks the anchor
  `delivered` on open (draft → delivered only; never rewinds a later status).
- **2.2** The close/listing route calls `invalidateIfMaterialChange` after each new draft product.
  Adding a product is material, so a current approval goes stale and returns to review; a cosmetic
  or no-op save leaves consent untouched (structural snapshot hash).
- **2.3** `POST /api/promoter/preview/activate` — owner-scoped, requires a current approval.
  **Run order is the safety property:** publish the exact approved set first, then flip the anchor
  to `activated` (the flip is what un-hides the public shell). A partial publish leaves the anchor
  `approved`, so nothing is ever half-public and a retry is safe; re-activation is a no-op.
  Checkout stays claim-gated throughout.
- The promoter workspace gained a preview/activation step, and `GET /api/promoter/preview` is the
  single server-derived consent state the merchant page, the workspace and the activation route all
  read — so they cannot disagree about whether consent is current.

### Post-merge correctness fix (landed in S3's PR #295, `c444dc6`)

Self-review found that 2.3's own acceptance — "failed partial writes surface and can replay
safely" — was **not** met as first shipped. The publish set was derived from the shop's DRAFT
products, so activation *consumes* it, producing two unrecoverable states:

1. **Partial publish** — the live set shrinks, its hash stops matching the approved hash, and
   `canActivate` refuses "la propuesta cambió" forever.
2. **`markActivated` fails after all publishes succeed** — the live set is *empty*, so the retry
   refuses with "no hay productos que publicar".

Neither had a recovery path: a merchant's approval could never be acted on again.

The fix adds a pure `isResumableActivation` (is the live proposal the approved one *minus products
we already published*?) and makes `checkActivation` publish the **approved snapshot** from the
stored decision row rather than the live draft list. It is strict and one-directional — a changed
title/price/image/currency, a changed shop identity, or an ADDED product is still material and
still invalidates.

**Accepted limit (documented in the code):** a promoter-*deleted* product is indistinguishable from
one we published, so it would not invalidate on this path. Safe today because no promoter delete
path exists for a previewed shop, and publishing a subset of what the merchant approved never
publishes anything unapproved. **If a delete path is ever added, it must invalidate the approval
explicitly at its call site.**
