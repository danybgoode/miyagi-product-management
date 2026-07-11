# Sprint 1 — The web path (seller declares → buyer checks out arranged-only)

**Epic:** [Arranged-only delivery](README.md) · **Risk: HIGH — Daniel merges** ·
**Status: 🟢 built, CI green on both PRs, awaiting Daniel's merge (HIGH risk).**
Backend PR [danybgoode/medusa-bonsai-backend#84](https://github.com/danybgoode/medusa-bonsai-backend/pull/84)
(S1.1+S1.2) · Frontend PR [danybgoode/miyagisanchezcommerce#223](https://github.com/danybgoode/miyagisanchezcommerce/pull/223)
(S1.1+S1.2+S1.3). Both branches: `feat/arranged-only-delivery`, cut off latest `origin/main` in each repo
(isolated worktrees — the shared checkouts were parked on sibling sessions' branches). Deterministic gate
green on both (`tsc` + build + unit/api tests) before opening either PR. Mid-flight, a sibling epic
(`onboarding-three-doors`, PR #221) merged to `main` first — merged `origin/main` into the frontend branch,
resolved a `FlagKey`-union conflict + a `platform_flags` migration-timestamp collision (re-stamped ours
`20260711140000`→`20260711150000`) + a stale flag-count drift-guard assertion (27→28). CI (`Type-check +
build`, `Playwright vs preview`) green on the frontend PR after the merge; backend PR stayed mergeable
throughout (no backend-side conflict).

The thinnest end-to-end slice that ships and is Daniel-testable: a seller marks a listing arranged-only, a
buyer checks out seeing only the coordinated delivery + pago directo, and the order completes. All three
stories are backend-first, then the FE reads them; the whole slice sits behind `shipping.arranged_only_enabled`
(default off) so it merges dark.

---

## Stories

### S1.1 — Backend emits arranged-only *(HIGH — Daniel merges)* ✅ built — commit `2dd9a97` (backend) + `3816adb` (frontend flag mirror)
> **As a** buyer on an arranged-only listing, **I want** checkout-options to offer only the coordinated
> delivery + manual payment, **so that** I'm not asked for a shipping address or a card that the seller
> can't honor.
- `checkout-options/route.ts` reads a new per-listing `delivery_mode` query param (`carrier | arranged`,
  default `carrier`), gated by `isEnabled('shipping.arranged_only_enabled')`.
- For `arranged`: push a `coord` delivery method (`{ id:'coord', label:'Entrega acordada con vendedor', note:… }`),
  **suppress** the carrier `shipping` method, and set `onlyCoordinated = true` (the existing branch already
  filters instant/card payments at :185-186 and returns `only_coordinated` at :217).
- Extract the delivery-method + `onlyCoordinated` derivation into a **pure, next-free seam** so it can be
  unit-tested without booting Medusa.
- **Flag OFF (or `delivery_mode` absent) ⇒ byte-identical to today.**
- **`both` (stretch):** if it falls out cheaply, `both` = carrier method **and** coord method, card allowed
  (not `onlyCoordinated`). Only if near-free; else defer.
- **Acceptance:** `GET /store/sellers/:slug/checkout-options?...&delivery_mode=arranged` (flag on) returns a
  single `coord` delivery method, `only_coordinated:true`, and **zero** instant payment methods (manual
  only). Same call with `delivery_mode=carrier` or the flag off is unchanged from today.

### S1.2 — Seller declares `delivery_mode` per listing *(HIGH — Daniel merges)* ✅ built — commit `76ed0cd` (backend) + `c4705de` (frontend)
> **As a** seller, **I want** to mark a listing as delivered only by coordination, **so that** I can publish
> a service / rental / local-only item without faking a carrier or a pickup spot.
- A per-listing "Entrega" control in the listing create/edit form (a `carrier | arranged` choice) writes
  `delivery_mode` to **product metadata** via `_utils/seller-product-create.ts` / `seller-product-update.ts`.
- The **publish-readiness gate** accepts `arranged` as a valid published state — **no** carrier origin and
  **no** pickup spot required — **but** still requires the seller to have ≥1 manual payment method (SPEI /
  cash) configured, else the arranged listing can't be paid (honors the existing 04-poster claim).
- Control is hidden / inert when `shipping.arranged_only_enabled` is off.
- **Acceptance:** creating/updating a listing with `delivery_mode=arranged` persists it to product metadata;
  a seller **with** a manual method can publish an arranged listing that has no carrier/pickup; a seller
  **without** one is blocked with a clear reason.

### S1.3 — Web checkout honors arranged-only *(HIGH — Daniel merges)* ✅ built — commit `e104af2` (frontend)
> **As a** buyer, **I want** the checkout page to show the arranged delivery + pago directo cleanly, **so
> that** I can complete the purchase without a dead-end.
- Options proxy (`app/api/checkout/options/route.ts`) + `checkout/page.tsx` derive `delivery_mode` from the
  listing metadata and pass it through.
- `CheckoutExperience.tsx` renders the `coord` delivery method **first-class** (today `coord` appears only via
  the S3.2 quote-failure fallback); the `only_coordinated` empty-payment copy (:631) becomes reachable; the
  page sends `fulfillment_method:'coord'` (:811) → the existing `start-checkout` 422 guard enforces manual.
- **Acceptance:** on an arranged listing (flag on), the checkout page shows "Entrega acordada" as the delivery
  method and only pago directo (SPEI/efectivo) as payment; selecting card is impossible; placing the order
  routes through `fulfillment_method:'coord'` and completes as a manual order.

---

## Sprint QA
- **Pure-logic spec** on the S1.1 derivation seam: `arranged` ⇒ `coord`-only delivery + `onlyCoordinated:true`
  + zero instant payments; `carrier`/flag-off ⇒ unchanged. (Free coverage, no Medusa boot.)
- **API spec** asserting the `checkout-options` response for an arranged listing (delivery + payment shape),
  and that `delivery_mode=arranged` with the flag **off** is identical to today.
- **API spec** (S1.2) asserting create/update persists `delivery_mode` and the publish gate accepts
  arranged-with-manual / rejects arranged-without-manual.
- **Extend** `e2e/checkout-fallback.spec.ts` (or a sibling) for the S1.3 arranged option shape.
- **Anonymous browser smoke** for the rendered arranged delivery + manual-only payment (works without login).
- **Backend prod smoke** (S1.1/S1.2) — no per-branch preview; API-level curl post-merge by the agent.
- **Money-path browser smoke — OWED TO DANIEL** (placing a real arranged order via pago directo; auth + money).

---

## Sprint 1 — Smoke walkthrough (do these in order)
Env: **preview** (pre-merge) — `https://miyagisanchez-i12l4fkoq-danybgoodes-projects.vercel.app`
(the frontend PR's Vercel preview for `feat/arranged-only-delivery`, commit `e104af2`). Backend has no
per-branch preview (Cloud Run, post-merge only) — steps 1–3 below need the flag ON and a live backend, so
they can only run for real **after both PRs merge and the backend finishes deploying**. Money/publish steps
are flagged **owed to Daniel** — an automated browser smoke can't fully cover auth + money + a real publish.

1. **(post-merge, flag ON)** As a seller, go to `/sell` → fill in a listing with **Tipo de anuncio: Producto**.
   → You see a new **"Entrega"** toggle: **📦 Paquetería** / **🤝 Acordada con el comprador**.
2. Click **🤝 Acordada con el comprador**.
   → A small note appears: *"El comprador verá solo pago directo (SPEI / efectivo) — necesitas un método de
   pago manual configurado para publicar."*
3. **(money/publish — owed to Daniel)** With a manual payment method (SPEI or local pickup + cash) already
   configured on the shop, publish the listing.
   → It publishes successfully with no carrier/pickup address required.
4. **(money/publish — owed to Daniel)** Try publishing an arranged listing on a shop with **no** manual
   payment method configured.
   → Publish is blocked with: *"Para activar este anuncio con entrega acordada, configura al menos un
   método de pago manual (SPEI o recolección con efectivo)."*
5. As a buyer (or anonymously), open the arranged listing's checkout page (`/checkout?listingId=...`).
   → The delivery section shows only **"Entrega acordada con vendedor"** (no "Envío a domicilio" option).
6. Select it as the delivery method.
   → The payment section auto-selects **"Pago directo al vendedor"**; a banner reads *"Este vendedor
   coordina la entrega — el pago se acuerda directamente (SPEI / efectivo)."* Any other payment button
   (if the shop has one) appears greyed out/disabled.
7. **(money — owed to Daniel)** Place the order using SPEI or cash.
   → The order completes; the seller's order screen shows a manual/coordinated order, same as today's
   S3.2 coordinated-fallback orders.
8. Confirm the kill-switch: with `shipping.arranged_only_enabled` OFF (its default, pre-flip state), repeat
   steps 1 and 5 on the SAME listing/shop.
   → Step 1: no "Entrega" toggle appears at all. Step 5: checkout is byte-identical to before this epic
   (carrier/shipping option shown as usual, no "Entrega acordada con vendedor" entry).

If any step fails, note the step number + what you saw — that's the bug report.
