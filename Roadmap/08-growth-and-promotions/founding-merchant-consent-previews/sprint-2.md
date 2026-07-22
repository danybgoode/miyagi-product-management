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

## ⚠️ Blocking prerequisite for this walkthrough

`supabase/migrations/20260721150000_consent_previews_s2.sql` is **not applied in production** —
verified read-only 2026-07-21: `merchant_preview_decisions` → 404 (PGRST205),
`merchant_previews.approved_snapshot_hash` / `.activated_at` → 42703 (undefined column). S1's two
tables *are* applied.

Until it is applied, every S2 path fails **closed** (a decision can't be recorded; activation
refuses because the approved hash is unreadable) — safe, but the walkthrough cannot run. Apply it in
the Supabase SQL editor, then verify:

```sql
SELECT to_regclass('public.merchant_preview_decisions');           -- expect: merchant_preview_decisions
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'merchant_previews'
   AND column_name IN ('approved_snapshot_hash','approved_at','activated_at');  -- expect 3 rows
```

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
