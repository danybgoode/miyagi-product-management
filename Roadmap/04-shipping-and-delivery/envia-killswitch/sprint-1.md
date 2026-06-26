# Sprint 1 — Envía Flagsmith kill-switch

Epic: [Envía — platform Flagsmith kill-switch](README.md) · Scope:
[`envia-flagsmith-killswitch.md`](../../00-ideas/2.%20readyforscope/envia-flagsmith-killswitch.md)
**Branch:** `feat/envia-killswitch` · **Risk: HIGH** (checkout/shipping money path) → **Daniel-merge** ·
**Deploy order: S1.1 → S1.2 → S1.3** (backend-first).

> **Before any gating — trace importers (LEARNINGS ~L737).** Find every importer of the Envía client
> (`apps/backend/src/modules/fulfillment-envia/envia-client.ts` and `apps/miyagisanchez/lib/envia.ts`) and the
> route the buyer/seller actually awaits, so the gate lands on the real seam and not a no-op file.

---

## S1.1 — (BE) Add `shipping.envia_enabled` + gate the quote seam  *(spine — deploy first)*
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

## S1.2 — (BE) Gate label generation / shipping → manual-carrier fallback
**As** a seller fulfilling while Envía is off, **I want** the Envía label path disabled and manual carrier
offered, **so that** I can still ship without an automatic label.

- When `shipping.envia_enabled` is off, the ship route's **Envía label branch** rejects with a clear **422**
  (es-MX: *"El envío automático con Envía no está disponible por ahora. Usa paquetería manual."*); the UI
  steers to the **existing** manual-carrier path. No change to the manual path itself.
- **Acceptance:** flag OFF → seller ship screen offers only manual carrier; calling the Envía label route
  directly returns 422 (agents / stale pages can't bypass). Flag ON → label generation works as today.
- **QA:** api spec on the ship route's gated branch. **Risk: HIGH.**

## S1.3 — (FE) Seller-settings platform-off banner
**As** a seller, **I want** to see that automatic Envía shipping is paused platform-wide, **so that** I'm not
confused when my per-shop toggle has no effect.

- In `Envios.tsx`, **server-evaluate** `shipping.envia_enabled` and pass it down; when off, show an es-MX banner
  that automatic Envía shipping is paused platform-wide and the per-shop "tarifas en vivo" toggle is superseded
  for now. **Preserve** the per-seller `settings.shipping.envia_enabled` value (don't overwrite).
- **Acceptance:** flag OFF → banner shows, per-shop live-rate toggle reflects platform-off; flag ON → banner
  gone, normal behavior. **QA:** es-MX copy-completeness + visual smoke owed to Daniel. **Risk: LOW.**

---

## Sprint QA
- **Pure-logic spec:** `enviaKillGate` — off→fallback, on→passthrough (free coverage on an extracted `lib/` seam).
- **API specs:** `POST /store/envia/rates` (gated); the ship route's Envía-label branch (422 when off).
- **Copy:** es-MX completeness for the 422 message + the settings banner; no orphan/English strings.
- **Deterministic gate per PR:** `tsc --noEmit` + `npm run build` + Playwright api green before draft PR.
- **Owed to Daniel (money/auth — automated smoke can't cover):** the walkthrough below.

## Sprint 1 — Smoke walkthrough (do these in order)
> **PLACEHOLDER — the build session fills this in with real preview/prod URLs before calling the sprint done.**
Env: production · https://miyagisanchez.com (or the Vercel preview URL while pre-merge). Flag toggled in the
Flagsmith dashboard (project `miyagisanchezmarketplace`, **Production** environment).

1. In Flagsmith, set `shipping.envia_enabled` = **OFF**.
   → (expected) within ~60 s the flag propagates (local-eval refresh).
2. Go to a physical-product PDP → add to cart → checkout → enter a delivery address.
   → (money path) You see the **arranged-delivery fallback** message; **no** live carrier rates appear.
3. As the seller of a paid order, open the order → ship.
   → (money path) Only **manual carrier** is offered; the Envía label option is gone.
4. Open `…/shop/manage/settings` → Envíos.
   → The **platform-off banner** shows; the "tarifas en vivo" toggle reflects platform-off.
5. In Flagsmith, set `shipping.envia_enabled` = **ON**.
   → Repeat step 2 → **live carrier rates** return; step 3 → Envía **label generation** works; step 4 → banner gone.

If any step fails, note the step number + what you saw — that's the bug report.
**Steps 2 & 3 are the money path → owed to Daniel by name (an automated browser smoke can't fully cover them).**
