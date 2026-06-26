# Sprint 1 — Envía Flagsmith kill-switch

Epic: [Envía — platform Flagsmith kill-switch](README.md) · Scope:
[`envia-flagsmith-killswitch.md`](../../00-ideas/2.%20readyforscope/envia-flagsmith-killswitch.md)
**Branch:** `feat/envia-killswitch` · **Risk: HIGH** (checkout/shipping money path) → **Daniel-merge** ·
**Deploy order: S1.1 → S1.2 → S1.3/S1.4** (backend-first).

**Build status (2026-06-26):** all built, draft PRs open, awaiting Daniel-merge + live smoke.
- **Backend** (S1.1, S1.2): `danybgoode/medusa-bonsai-backend` **PR #41** — `tsc` clean, `test:unit` green.
- **Frontend** (S1.3, S1.4): `danybgoode/miyagisanchezcommerce` **PR #131** — `tsc` clean, Playwright `api`
  921✓ / 8 skip / 1 env-only fail (`not-found-shape` `/l/wp-admin` prod-WAF 403 — documented, unrelated).
- **S1.4 was added during the build** after tracing every Envía importer (the L737 gotcha): the seller order
  screen's `app/api/orders/[id]/ship` route calls `lib/envia.ts` directly for legacy Supabase orders (POST) and
  re-quotes (GET), bypassing the backend gate — so it's gated too. Confirmed in scope with Daniel.

> **Before any gating — trace importers (LEARNINGS ~L737).** Find every importer of the Envía client
> (`apps/backend/src/modules/fulfillment-envia/envia-client.ts` and `apps/miyagisanchez/lib/envia.ts`) and the
> route the buyer/seller actually awaits, so the gate lands on the real seam and not a no-op file.

---

## S1.1 — (BE) Add `shipping.envia_enabled` + gate the quote seam  *(spine — deploy first)*  ✅ built (PR #41)
**As** the admin, **I want** live-rate quoting to stop calling Envía when the flag is off, **so that** checkout
falls back to arranged delivery without hitting an unfunded carrier.

- Add `FlagKey 'shipping.envia_enabled'` + `DEFAULT_FLAGS['shipping.envia_enabled'] = false` to **both**
  `apps/miyagisanchez/lib/flags.ts` and `apps/backend/src/lib/flags.ts`. **Enablement polarity, default OFF** —
  document inline like `domain.paywall_enabled`.
- Gate `POST /store/envia/rates`: when off, short-circuit **before** the Envía call to the existing graceful
  response (`{ rates: [], message: 'Las paqueterías… coordina la entrega directamente con el vendedor.' }`).
- Extract the decision into a **pure `enviaKillGate`** seam (mirror `lib/checkout-killswitch.ts`) for unit coverage.
- **Acceptance (Daniel-testable):** flag OFF in Flagsmith → checkout shows the arranged-delivery fallback and
  **no** Envía API call is made; flag ON → live carrier rates return. With **no** `FLAGSMITH_ENVIRONMENT_KEY`
  set (local/preview), Envía is OFF (fail-open default).
- ⚠️ **Behavior-change:** default OFF flips current prod behavior — **Production Flagsmith key must set the flag
  ON to keep live rates** for funded sellers (here, intentionally left OFF until funded). Any e2e exercising
  live rates must force the flag on.
- **QA:** pure-logic spec on `enviaKillGate` (off→fallback, on→passthrough) + an api spec on the rates route.
  **Risk: HIGH.**

## S1.2 — (BE) Gate label generation / shipping → manual-carrier fallback  ✅ built (PR #41)
**As** a seller fulfilling while Envía is off, **I want** the Envía label path disabled and manual carrier
offered, **so that** I can still ship without an automatic label.

- When `shipping.envia_enabled` is off, the ship route's **Envía label branch** rejects with a clear **422**
  (es-MX: *"El envío automático con Envía no está disponible por ahora. Usa paquetería manual."*); the UI
  steers to the **existing** manual-carrier path. No change to the manual path itself.
- **Acceptance:** flag OFF → seller ship screen offers only manual carrier; calling the Envía label route
  directly returns 422 (agents / stale pages can't bypass). Flag ON → label generation works as today.
- **QA:** api spec on the ship route's gated branch. **Risk: HIGH.**

## S1.3 — (FE) Seller-settings platform-off banner  ✅ built (PR #131)
**As** a seller, **I want** to see that automatic Envía shipping is paused platform-wide, **so that** I'm not
confused when my per-shop toggle has no effect.

- In `Envios.tsx`, **server-evaluate** `shipping.envia_enabled` and pass it down; when off, show an es-MX banner
  that automatic Envía shipping is paused platform-wide and the per-shop "tarifas en vivo" toggle is superseded
  for now. **Preserve** the per-seller `settings.shipping.envia_enabled` value (don't overwrite).
- **Acceptance:** flag OFF → banner shows, per-shop live-rate toggle reflects platform-off; flag ON → banner
  gone, normal behavior. **QA:** es-MX copy-completeness + visual smoke owed to Daniel. **Risk: LOW.**
- **Built:** flag added to `lib/flags.ts`; `[section]/page.tsx` evaluates it for the `envios` section (mirrors
  the `domainEntitled`/`Canal` precedent) → `platform_envia_enabled` prop; banner + disabled toggle in
  `Envios.tsx`, per-seller value untouched.

## S1.4 — (FE) Close the FE bypass (legacy ship + re-quote)  ✅ built (PR #131)  *(added in build — see top note)*
**As** the platform admin, **I want** the kill to also cover the in-app seller order routes that call the Envía
client directly, **so that** the DoD's "agents / stale pages can't bypass" actually holds.

- `app/api/orders/[id]/ship/route.ts` is live (called from `OrderDetail.tsx`). POST proxies *Medusa* orders to
  the (now-gated) backend ship route, but calls FE `lib/envia.ts createShipment` **directly for legacy Supabase
  orders**; GET re-quotes via FE `quoteShipments` **directly**. Both bypass the backend gate.
- **Built:** gate both verbs on FE `isEnabled('shipping.envia_enabled')` → POST **422** (same es-MX
  manual-carrier message as S1.2), GET graceful `{ rates: [], message }` (mirrors S1.1). New pure FE seam
  `lib/envia-killswitch.ts` (mirror of the backend seam) + Playwright `api` spec.
- **Acceptance:** flag OFF → legacy ship returns 422 / re-quote returns no rates; flag ON → unchanged. **Risk: HIGH.**

---

## Sprint QA
- **Pure-logic spec:** `enviaKillGate` — off→fallback, on→passthrough (free coverage on an extracted `lib/` seam).
- **API specs:** `POST /store/envia/rates` (gated); the ship route's Envía-label branch (422 when off).
- **Copy:** es-MX completeness for the 422 message + the settings banner; no orphan/English strings.
- **Deterministic gate per PR:** `tsc --noEmit` + `npm run build` + Playwright api green before draft PR.
- **Owed to Daniel (money/auth — automated smoke can't cover):** the walkthrough below.

## Sprint 1 — Smoke walkthrough (Daniel — do these in order)
**Prereqs / env:**
- Merge order: **backend PR #41 first** (Cloud Run, ~12 min, no preview — confirm the live revision rolled),
  then **frontend PR #131** (Vercel prod). Pre-merge you can exercise the FE on the **Vercel preview linked on
  PR #131** (see the Vercel bot comment), but the backend gate only applies once #41 is live.
- **Create the flag first:** in Flagsmith → project `miyagisanchezmarketplace` → **Production** environment,
  create feature `shipping.envia_enabled`. **Until it exists the code default is OFF (fail-open)** — so live
  Envía is already disabled the moment #41 deploys; creating + turning it **ON** is what re-enables Envía.
- Target: production · https://miyagisanchez.com. Flag propagates within ~60 s (local-eval refresh).

1. In Flagsmith, set `shipping.envia_enabled` = **OFF** (or leave it uncreated — same effect).
2. Physical-product PDP → add to cart → checkout → enter a delivery address.
   → **(money path)** You see the **arranged-delivery fallback** message; **no** live carrier rates appear.
3. As the seller of a paid order, open the order → **ship** (both a Medusa `order_*` order and, if any exist, a
   legacy order).
   → **(money path)** Only **manual carrier** is offered; the Envía label option errors out cleanly (422 →
   "Usa paquetería manual"). Re-quoting rates on the order returns **no** carrier options.
4. `…/shop/manage/settings` → **Envíos**.
   → The **platform-off banner** shows; the "tarifas en vivo" toggle is **disabled**, and your saved value is
   intact (toggle state unchanged after save).
5. In Flagsmith, set `shipping.envia_enabled` = **ON**.
   → Repeat step 2 → **live carrier rates** return; step 3 → Envía **label generation** works + re-quote returns
   rates; step 4 → banner gone, toggle re-enabled.

If any step fails, note the step number + what you saw — that's the bug report.
**Steps 2 & 3 are the money path → owed to Daniel by name (an automated browser smoke can't fully cover them).**
Automated coverage already green: pure `enviaKillGate` seam (backend Jest `test:unit` + FE Playwright `api`),
backend `tsc`, FE `tsc` + the full FE `api` project.
