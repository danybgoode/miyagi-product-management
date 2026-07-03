# Sprint 4 · Street money — net remittance + admin approval

> Epic: [Promoter Funnel v2](README.md) · Risk: **HIGH** (money path) — **Daniel merges** · Status: 🚧 in progress
> Behind new flag `promoter.transfer_enabled` (fail-open **OFF** — merges dark; run-order per
> LEARNINGS: merge → deploy → seed/config → flip). Stripe path never removed.

**The model (epic decision #1):** for cash closes, the promoter collects the merchant's cash and
transfers the platform **(price − commission)** via SPEI/DiMo/CoDi to Daniel's account — commission
never leaves their pocket, no later settlement. Card-paid closes keep today's accrual ledger +
offline settlement.

## US-4.1 — Transfer option at the promoter close checkout *(HIGH)*
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

## US-4.2 — Admin approval → activation + notification *(HIGH)*
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
- Deterministic gate green; pure-seam specs: owed-amount math, remittance state machine, activation mapping per SKU.
- **Owed to Daniel:** flag flip (seed `promoter.transfer_enabled`), live end-to-end money smoke (real
  transfer → approve → activation), and confirming the transfer-details config (CLABE etc.) in admin.

## Sprint 4 — Smoke walkthrough (do these in order)
*(placeholder — fill with real URLs at build time)*
Env: production · https://miyagisanchez.com

1. Flip `promoter.transfer_enabled` ON → open https://miyagisanchez.com/promotor/cerrar as an
   enrolled promoter → start a close with a paid SKU.
   → Payment step shows Stripe AND "Transferir a Miyagi" with your CLABE/DiMo/CoDi + the owed amount
   (price − commission — verify against the configured %).
2. Tap "Ya transferí".
   → State shows "transferencia reportada — pendiente de aprobación"; nothing is active yet; reload —
   state persists.
3. (money path) In https://miyagisanchez.com/admin/promoter approve the pending transfer.
   → The purchased service activates (e.g. subdomain serves / print submission marked paid); the
   promoter gets the auto-notification within ~1 min.
4. Repeat with a second sale → Rechazar → sale back to unpaid + promoter notified with the reason.
5. Flip the flag OFF → the transfer option disappears from the close checkout; Stripe still works.

If any step fails, note the step number + what you saw — that's the bug report.
