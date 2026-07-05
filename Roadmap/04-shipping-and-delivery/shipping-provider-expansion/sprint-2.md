# Shipping provider expansion — Sprint 2: Envía comp-grant (admin-granted platform Envía)

**Status:** ⬜ not started

> Platform flag `shipping.envia_enabled` stays the global master, **unchanged and OFF**. The grant
> (`metadata.envia_grant` on the Medusa seller — the `subdomain_grant` precedent) is a per-tenant
> override the admin hand-sets. **Uncapped by decision (2026-07-05)** — the grant list + instant revoke
> are the guardrail; spend visibility lives in the Envía dashboard. Grant = real platform money per label.

## Stories

### Story 2.1 — Grant honored at the quote seam
**As** the platform admin, **I want** `metadata.envia_grant` honored where shipping rates are quoted —
the pure gate widened from `enviaEnabled` to `enviaEnabled || sellerGranted` (backend
`lib/envia-killswitch.ts` + FE mirror, unit-specced) and threaded through `POST /store/envia/rates` —
**so that** a granted tenant's buyers see live Envía rates while everyone else keeps the
arranged-delivery fallback.
**Acceptance:** ungranted shop → today's fallback, byte-identical; granted shop → live carrier rates at
checkout. Flag stays OFF throughout.
**Risk:** HIGH (checkout money path → Daniel merge)

### Story 2.2 — Grant honored at every label seam
**As** a granted seller, **I want** label generation to work for my orders — the grant checked on the
backend ship route, the `fulfillment-envia` provider, **and the FE legacy `app/api/orders/[id]/ship`**
(trace every importer of the Envía client first — that route was a live bypass in the kill-switch epic,
LEARNINGS ~L737) — **so that** I can print real labels while ungranted sellers still get the 422 →
manual-carrier steer.
**Acceptance:** granted seller generates a real label end-to-end; ungranted seller's ship attempt still
422s with the existing es-MX message; no seam lets an agent or stale page bypass.
**Risk:** HIGH (fulfillment money path → Daniel merge)

### Story 2.3 — Admin grant/revoke toggle
**As** the platform admin, **I want** a grant/revoke toggle per tenant on `/admin/tenants` (writes
`metadata.envia_grant`), **so that** I can comp Envía to selected shops — and pull it — with no deploy.
**Acceptance:** flip a tenant ON → within ~1 min their quote behavior changes (flag cache ≤60 s); flip
OFF → fallback returns; granted state visible in the tenant list.
**Risk:** med (admin-auth write to seller metadata)

### Story 2.4 — Seller settings reflect granted state
**As** a granted seller, **I want** my shipping settings (`Envios.tsx`) to say «Envía habilitado por
Miyagi» instead of the platform-off banner, **so that** the state I see matches what my buyers get.
**Acceptance:** granted seller sees the enabled state + their existing carrier preferences; ungranted
copy unchanged.
**Risk:** low

## Sprint QA
- **api spec(s):** unit specs on the widened pure gate (both apps); one `api` Playwright spec — quote
  route grant-vs-ungranted; one on the admin toggle route (auth + effect).
- **browser smoke owed:** **yes, to Daniel** — the money path: grant a real tenant, buy against their
  shop with live rates, generate a real (platform-paid) label; then revoke and confirm fallback.
- **deterministic gate:** backend `medusa build` + `tsc` + unit; FE `tsc --noEmit` + `npm run build` +
  Playwright `api` green before merge. Backend-first deploy (S2.1→S2.2 before S2.3/S2.4).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (backend has no preview — post-merge prod confirmation)

1. Go to https://miyagisanchez.com/admin/tenants and toggle Envía grant ON for the test shop.
   → The row shows granted state.
2. Open the test shop's listing, add to cart, enter a CDMX address at checkout.
   → Live Envía rates (e.g. Estafeta) appear within ~9 s — not the arranged-delivery fallback. **(money path — Daniel)**
3. In another (ungranted) shop, repeat step 2.
   → Arranged-delivery fallback, exactly as today.
4. As the granted seller, complete a paid test order and generate the label from the order screen.
   → A real Envía label is produced. **(money path — Daniel; platform card is charged)**
5. Back in /admin/tenants, revoke the grant; retry step 2 after ~1 min.
   → Fallback returns; label path 422s with the manual-carrier message.

If any step fails, note the step number + what you saw — that's the bug report.
