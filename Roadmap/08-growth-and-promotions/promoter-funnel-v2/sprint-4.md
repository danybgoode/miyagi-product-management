# Sprint 4 · Street money — net remittance + admin approval

> Epic: [Promoter Funnel v2](README.md) · Risk: **HIGH** (money path) — **Daniel merges** · Status: ✅ merged
> 2026-07-03, PR [#167](https://github.com/danybgoode/miyagisanchezcommerce/pull/167) → `f81a41a`
> Behind new flag `promoter.transfer_enabled` (fail-open **OFF** — merged dark; both migrations
> already applied to prod Supabase — seed/flip + the live smoke below are owed to Daniel).
> Stripe path never removed.

**The model (epic decision #1):** for cash closes, the promoter collects the merchant's cash and
transfers the platform **(price − commission)** via SPEI/DiMo/CoDi to Daniel's account — commission
never leaves their pocket, no later settlement. Card-paid closes keep today's accrual ledger +
offline settlement.

## US-4.1 — Transfer option at the promoter close checkout *(HIGH)* ✅
**As** a promoter who collected cash, **I want** a "Transferir a Miyagi (SPEI/DiMo/CoDi)" option at
close showing exactly what I owe — the sale total minus my commission — with the transfer details,
and a "Ya transferí" button, **so that** every sale is cash in my pocket the same day.
**Build note:** alongside the existing Stripe pay-on-behalf path. The owed amount comes from the
same pricing/commission config as S3 (one deriver — advertised = charged = owed). Transfer details
(CLABE / DiMo / CoDi reference) are admin-config, not hardcoded. "Ya transferí" moves the sale into
a `transfer_reported` state — reuse the print `payment-reported` state-machine pattern (durable,
survives reload, one shared state). Nothing activates yet. Cash closes record commission as
**settled-at-source** (no accrual row); card closes keep the ledger untouched.
**Acceptance:** with the flag ON, the close checkout offers Stripe AND transfer; owed = price −
commission exactly (spec on the pure math, incl. bundle + the $0-subdomain case from S3); reporting
a transfer never activates anything by itself; flag OFF hides the option entirely.

## US-4.2 — Admin approval → activation + notification *(HIGH)* ✅
**As** Daniel, **I want** pending transfers in `/admin/promoter` where I approve after checking my
bank app — approval activates what was bought and auto-notifies the promoter — **so that** the
day-to-day is: promoter wires → I approve → done (my personal WhatsApp ping stays manual, by design).
**Build note:** approval activates per SKU via **existing** writers: print → the existing
confirm/paid path (`lib/print-server.ts` already flips attribution); domain / subdomain / ml_sync →
mint the comp/one-time grant covering the purchased period (reuse S3 + existing grant seams — no new
money paths). Auto-notify the promoter via Telegram/email (existing infra). Reject → sale returns to
unpaid with an es-MX reason; stale `transfer_reported` states are visible (age shown) so nothing
rots silently.
**Acceptance:** approve → merchant's services active (subdomain serves / domain flow proceeds /
print submission paid / ml_sync entitled) + promoter notified automatically; reject → clean unpaid
state + notification; every transition spec'd on the pure state machine; no activation path exists
that skips approval.

## Sprint QA
- **Two review passes, both with real findings, both fixed before merge:**
  1. Cross-agent (Codex, `scripts/cross-review.mjs`) — fixed: a promoter could be shown "Transferir
     a Miyagi" via a method (SPEI/DiMo/CoDi) the admin never actually configured a destination for;
     added `hasRequiredTransferDetail()` refusing (422) before a transfer request is created. Also
     tightened the `promoter.transfer_enabled` doc comment — it gates transfer creation only, not
     admin review of an already-reported transfer (real cash already collected must stay resolvable
     even if intake is later paused). Two "blocking" findings evaluated and NOT changed as deliberate
     calls matching established precedent: the Medusa/Supabase split (the existing Stripe path for
     these exact SKUs already bypasses Medusa's cart/order system entirely via a direct Stripe
     Checkout Session — confirmed by reading `lib/domain-subscription-checkout.ts` +
     `lib/stripe-subscriptions.ts`) and UCP/MCP exposure (the promoter-close flow is a Clerk-authed,
     human-only in-person-sale tool, never buyer-facing, and was never UCP-exposed before this
     sprint either). A third finding (unchecked `markAttributionPaid` return) matches
     `grantFreeSubdomainYear`'s exact existing shape, already reviewed and declined for the same
     reason in Sprint 3.
  2. A fresh Claude subagent (different agent than the builder) independently re-derived the claim/
     activate ordering, the owed-math parity against the live Stripe path, `skipAccrual` scoping,
     flag gating, ownership checks, and the new `hasRequiredTransferDetail` guard — and independently
     re-verified (by reading the cited code itself, not taking the reply on faith) that the declined
     Medusa/UCP findings hold up. No blocking bugs found. Flagged two pre-existing, non-blocking
     architecture notes for the retro: `getPromoterSettings`'s single-query column read means a
     late-applied migration would silently reset live discount/bundle config (mitigated
     procedurally — migrations applied before merge here); and a non-atomic
     read-modify-write race on `marketplace_shops.metadata` if two SKUs for the same shop are
     approved in quick succession (identical to the pre-existing Stripe-webhook pattern, not
     introduced by this sprint).
- **Both migrations applied to prod Supabase** (Daniel authorized, 2026-07-03):
  `20260703140000_promoter_transfers.sql` and `20260703150000_promoter_transfer_flag.sql` — confirmed
  live (table + column + partial unique index + the flag row seeded OFF).
- **Deterministic gate green** (local, pre-merge + CI green on the PR): `tsc --noEmit`, `next build`,
  `npm run test:e2e` (`api` project). New pure-seam specs in `e2e/promoter-transfer.spec.ts` (24 assertions): owed-amount
  math (matches `computeCommissionCents` exactly; the $0-subdomain case owes $0 with no
  special-casing; never negative), the remittance state machine (`pending → reported → approved |
  rejected`; no skip-ahead; no backward moves; terminal states enforced), the per-SKU activation
  mapping (`SKU_GRANT_KEYS` covers exactly `custom_domain`/`subdomain`/`ml_sync`, matching the exact
  metadata keys the existing entitlement readers already derive from), and flag-agnostic route guards
  (every new/extended route 401s or 404s appropriately, asserted anonymously). Also bumped
  `flags-admin.spec.ts`'s known-flag count 13→14 for the new `promoter.transfer_enabled` entry.
- **Scope note:** `print_ad` is intentionally untouched this sprint — it already has its own
  cash-report path from Sprint 3 (`/api/promoter/close/print` + `content.payment_reported` + the
  existing `/admin/print` approve flow) and isn't in the close-workspace picker until Sprint 5
  (US-5.4). The three SKUs this sprint covers (`custom_domain`/`subdomain`/`ml_sync`) are exactly the
  ones already in `CLOSE_SKUS`.
- **Owed to Daniel:** flipping `promoter.transfer_enabled` ON in `/admin/flags`, entering real
  transfer-details config (CLABE etc.) in `/admin/promoter`, and the live end-to-end money smoke
  below (real transfer → approve → activation). Migrations + merge are already done (2026-07-03).

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com — run after merge + deploy + migrations applied.

1. In `/admin/promoter`, under "Detalles de transferencia (SPEI/DiMo/CoDi)", fill in the CLABE (+
   optionally bank name / titular / DiMo / CoDi) and Guardar.
2. Flip `promoter.transfer_enabled` ON in `/admin/flags` → open `/promotor/cerrar` as an enrolled
   promoter → set up (or reuse) a test shop → in "Cobrar y pagar", pick a SKU (Dominio propio /
   Subdominio propio / Sincronización ML), choose "Transferir a Miyagi", pick SPEI/DiMo/CoDi, tap the
   pay button.
   → Shows the owed amount (price − commission for that SKU's configured rate) + the CLABE/bank/DiMo/
   CoDi details you entered in step 1, with a "Ya transferí" button.
3. Tap "Ya transferí".
   → Shows "Transferencia reportada — pendiente de aprobación"; nothing is active yet on the shop.
   Reload the page (same SKU selected) → the same "pendiente de aprobación" state re-appears (state
   persisted server-side, not just in browser memory).
4. (money path) In `/admin/promoter`, under "Transferencias pendientes", find the row (promoter code +
   SKU + owed amount + age) → Aprobar.
   → The SKU activates on the shop (e.g. the subdomain serves white-label immediately, or the domain/
   ml_sync grant shows in the shop's entitlement); the promoter receives an email
   ("✅ Transferencia aprobada — <SKU> activado") within ~1 min. The commission settlement list
   (Liquidación de comisiones) shows nothing new for this sale — settled at source, by construction.
5. Repeat step 2–3 with a second sale (different SKU or a second test shop) → in "Transferencias
   pendientes", type a reason and Rechazar.
   → The row disappears from pending; the promoter receives an email with the reason; the shop's
   entitlement is unchanged (still unpaid); re-selecting "Transferir a Miyagi" for that same shop+SKU
   starts a fresh transfer request (a rejected transfer never blocks a retry).
6. Flip `promoter.transfer_enabled` OFF in `/admin/flags` → reload `/promotor/cerrar` → the
   "Transferir a Miyagi" option disappears from the payment-method picker; Stripe still works exactly
   as before this sprint.

If any step fails, note the step number + what you saw — that's the bug report.
