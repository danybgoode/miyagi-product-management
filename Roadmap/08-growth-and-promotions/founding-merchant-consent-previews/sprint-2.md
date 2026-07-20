# Founding merchant consent-safe previews — Sprint 2: Approval and activation

**Status:** ⬜ not started

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
