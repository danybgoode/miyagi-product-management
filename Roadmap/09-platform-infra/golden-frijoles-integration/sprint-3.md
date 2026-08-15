# Golden Frijoles integration — Sprint 3: paywalls on, nobody cut off

**Status:** 🟨 subdomain applied `2dbd58c` (#364) — custom_domain + ml_sync deliberately NOT applied; partners flag owed

> **What actually happened.** The paywalls were found ALREADY ON in production and had been since
> 2026-08-01 — so this was not a flip to prepare for, it was a live exposure to fix. Five of thirty
> shops carried no `subdomain_grant`, including `ylai-studio`, a claimed merchant created five days
> earlier: they were gated out of subdomains they already had. Backfilled, 30/30, verified live.
>
> `custom_domain` (27 shops owed) and `ml_sync` (28) were **deliberately not applied**. Those are
> opt-in SKUs that **1** and **0** shops respectively use, so a blanket grant would not be
> grandfathering — it would hand a paid SKU to shops that never had it. Left for the product owner;
> one command either way.

## Stories

### Story 3.1 — Grandfather backfill for the three paywall SKUs
**As a** merchant already using a custom domain, a subdomain or ML sync for free, **I want** to keep
using it, **so that** switching the paywalls on does not take away what I already have.
**Acceptance:** a backfill grants the matching entitlement to every shop that is *currently* using
each SKU, reports the count it granted and the count it skipped as already-granted, and is
idempotent — a second run grants zero. A dry run changes nothing and prints the same plan.
**Risk:** HIGH

### Story 3.2 — Flip the paywalls, and prove nobody lost access
**As a** platform owner, **I want** the three paywall gates enforced, **so that** the paid SKUs are
actually paid for by new shops.
**Acceptance:** with the backfill verified live, `domain.paywall_enabled`,
`subdomain.paywall_enabled` and `ml.sync_paywall_enabled` all read ON; every shop that had a live
custom domain, subdomain or ML sync before the flip still resolves after it; a shop with no grant
sees the paywall.
**Risk:** HIGH

### Story 3.3 — Flip `partners.recruiting_v3_enabled` alone
**As a** platform owner, **I want** the Partners v3 surface enabled in its own step, **so that** if
`/us` misbehaves the cause is unambiguous.
**Acceptance:** the flag reads ON; `/us` renders and its operator intake is reachable; a Promotor
credential cannot reach an operator-scoped route and vice versa.
**Risk:** HIGH

## Sprint QA
- **api spec(s):** 3.1 → `e2e/paywall-grandfather-backfill.spec.ts` (pure plan derivation +
  idempotence); 3.3 → the existing partners authorization suite, re-run with the flag ON.
- **browser smoke owed:** **yes, to Daniel** — 3.2's "did any real shop lose its domain" check and
  3.3's operator-versus-Promotor authorization walk both need live authenticated sessions.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Run the backfill in dry-run and read the plan.
   → it names every shop that will be granted, and the total. Nothing has changed yet.
2. Apply it, then re-run the dry run.
   → the second run plans zero grants. That is the idempotence proof.
3. Open a shop that already had a custom domain and visit that domain.
   → it still resolves and serves the shop.
4. In https://miyagisanchez.com/admin/flags, turn on the three paywall flags.
   **Owed to Daniel — authenticated control-plane mutation.**
5. Revisit the same custom domain from step 3.
   → it still resolves. If it now shows a paywall, the backfill missed that shop — stop and report.
6. Open https://miyagisanchez.com/us
   → after 3.3 only: the operator proposition and intake render.

If any step fails, note the step number + what you saw — that's the bug report.
