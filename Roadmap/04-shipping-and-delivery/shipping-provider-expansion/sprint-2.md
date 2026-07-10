# Shipping provider expansion — Sprint 2: Envía comp-grant (admin-granted platform Envía)

**Status:** 🚧 built, both PRs open — Daniel merge pending (HIGH risk, both repos)

> Platform flag `shipping.envia_enabled` stays the global master, **unchanged and OFF**. The grant
> (`metadata.envia_grant` on the Medusa seller — same grant SHAPE as the `subdomain_grant` precedent,
> `{type:'comp', granted_at, note?}`, but a different STORE: it lives on the Medusa seller itself, not
> the Supabase `marketplace_shops` mirror `subdomain_grant` writes to — confirmed with Daniel during
> planning, since the money-path routes enforcing it only ever resolve the Medusa seller, with no
> Supabase access. New `/internal/sellers/:id/grant` route, `x-internal-secret` guarded, same pattern as
> the existing `/internal/sellers`) is a per-tenant override the admin hand-sets. **Uncapped by decision
> (2026-07-05)** — the grant list + instant revoke are the guardrail; spend visibility lives in the Envía
> dashboard. Grant = real platform money per label.

## Stories

### Story 2.1 — Grant honored at the quote seam ✅ built
**As** the platform admin, **I want** `metadata.envia_grant` honored where shipping rates are quoted —
the pure gate widened from `enviaEnabled` to `enviaEnabled || sellerGranted` (backend
`lib/envia-killswitch.ts` + FE mirror, unit-specced) and threaded through `POST /store/envia/rates` —
**so that** a granted tenant's buyers see live Envía rates while everyone else keeps the
arranged-delivery fallback.
**Acceptance:** ungranted shop → today's fallback, byte-identical; granted shop → live carrier rates at
checkout. Flag stays OFF throughout.
**Risk:** HIGH (checkout money path → Daniel merge)
**Commits:** backend `b8b7d41`, frontend `9c8347b`. The quote route also now resolves the seller (for the
grant check) even when the platform flag is OFF, which it previously skipped — a restructuring the pure
gate widen forced, not a scope expansion; ungranted/malformed requests still short-circuit to the
byte-identical fallback response before any address/product validation runs.

### Story 2.2 — Grant honored at every label seam ✅ built
**As** a granted seller, **I want** label generation to work for my orders — the grant checked on the
backend ship route, the `fulfillment-envia` provider, **and the FE legacy `app/api/orders/[id]/ship`**
(trace every importer of the Envía client first — that route was a live bypass in the kill-switch epic,
LEARNINGS ~L737) — **so that** I can print real labels while ungranted sellers still get the 422 →
manual-carrier steer.
**Acceptance:** granted seller generates a real label end-to-end; ungranted seller's ship attempt still
422s with the existing es-MX message; no seam lets an agent or stale page bypass.
**Risk:** HIGH (fulfillment money path → Daniel merge)
**Commits:** backend `fe9715f`, frontend `33786db`. **Correction to the LEARNINGS ~L737 framing**: the FE
legacy route was already remediated in an earlier epic — it already called `enviaKillGate` at all 3 call
sites (POST top, GET top, inline) before this sprint. This sprint widened each of those 3 calls with
`sellerGranted`, it didn't discover/fix a live bypass. The Medusa-order branch of the POST handler now
skips its own pre-gate entirely (the backend ship route independently enforces flag+grant and this proxy
just relays the 422); the legacy Supabase-order branch (the one path with no Medusa-side enforcement)
resolves the grant via the new `/internal/sellers/:id/grant` GET, since it only has the Supabase shop
mirror on hand, not the Medusa seller.

### Story 2.3 — Admin grant/revoke toggle ✅ built
**As** the platform admin, **I want** a grant/revoke toggle per tenant on `/admin/tenants` (writes
`metadata.envia_grant`), **so that** I can comp Envía to selected shops — and pull it — with no deploy.
**Acceptance:** flip a tenant ON → **near-immediate** effect (seller-metadata reads carry no cache,
unlike the 60s `platform_flags` cache the platform kill-switch itself goes through — corrected from the
original "~1 min" estimate below, which conflated the two); flip OFF → fallback returns; granted state
visible in the tenant list.
**Risk:** med (admin-auth write to seller metadata)
**Commits:** frontend `f97056d` (backend route shipped as part of S2.2's `fe9715f`, since S2.2's legacy
ship path needed it too). `sku=envia` extends the existing `/admin/tenants` `EntitlementControls`
picker — same UI, same response shape as `custom_domain`/`subdomain`/`ml_sync` — but its read/write
special-cases to the Medusa-seller-backed internal route instead of a Supabase `metadata` column.

### Story 2.4 — Seller settings reflect granted state ✅ built
**As** a granted seller, **I want** my shipping settings (`Envios.tsx`) to say «Envía habilitado por
Miyagi» instead of the platform-off banner, **so that** the state I see matches what my buyers get.
**Acceptance:** granted seller sees the enabled state + their existing carrier preferences; ungranted
copy unchanged.
**Risk:** low
**Commits:** frontend `187220c`.

## Sprint QA
- **api spec(s):** unit specs on the widened pure gate, both apps (backend Jest
  `envia-killswitch.unit.spec.ts` +5 cases; FE Playwright `envia-killswitch.spec.ts` +4 cases, the FE
  convention for pure-lib unit tests). Admin toggle route: 2 new anonymous-401 specs in
  `admin-tenant-entitlement.spec.ts` proving `sku=envia` can't skip `withAdmin`. A dedicated
  grant-vs-ungranted spec for the quote route itself needs a seeded test seller with a real grant —
  not available in this session; **owed** (stated as a gap, not silently skipped).
- **browser smoke owed:** **yes, to Daniel** — the money path: grant a real tenant, buy against their
  shop with live rates, generate a real (platform-paid) label; then revoke and confirm fallback.
- **deterministic gate:** backend `medusa build` + `tsc` + `npm run test:unit` — green (312/312 unit
  tests, zero new failures). FE `tsc --noEmit` + `npm run build` + `npm run test:e2e` (`api` project) —
  green (1524/1524, 20 skipped as expected — unset `MS_TEST_*` creds); a full local run against a
  single shared dev backend showed unrelated flake (rate-limit/shared-state contention under repeated
  parallel runs, e.g. `launchpad-*`, `home-*` specs) — confirmed zero overlap with any file this sprint
  touched, and every touched spec passes consistently in isolation. Backend-first deploy
  (S2.1→S2.2 before S2.3/S2.4).

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
5. Back in /admin/tenants, revoke the grant; retry step 2 immediately (no ~1 min wait needed —
   seller-metadata reads carry no cache, unlike the platform flag's own 60s cache).
   → Fallback returns; label path 422s with the manual-carrier message.

If any step fails, note the step number + what you saw — that's the bug report.
